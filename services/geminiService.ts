
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { EnvironmentalSolution, Category, SectionType, EcoStatus, ImageSize } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Handles API errors gracefully, specifically detecting 429 Quota issues and JSON parsing issues.
 */
async function safeGenAIRequest<T>(requestFn: () => Promise<T>): Promise<T> {
  try {
    return await requestFn();
  } catch (error: any) {
    const errorMsg = error?.message || "";
    if (errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("API_QUOTA_EXCEEDED");
    }
    console.error("GenAI Request Error:", error);
    throw error;
  }
}

/**
 * Attempts to repair common JSON truncation issues if the model hits token limits.
 */
function tryRepairJson(jsonStr: string): string {
  let cleaned = jsonStr.trim();
  // If it doesn't end with }, it's likely truncated
  if (!cleaned.endsWith('}')) {
    // If it's inside an array of strings (like 'causes' or 'solutions'), close the string and array first
    if (cleaned.endsWith('"')) {
      // It's truncated right after a string ended but before commas/brackets
    } else {
      // It's truncated inside a string
      cleaned += '"';
    }
    
    // Attempt to close common structures based on a simple count
    // This is a naive repair for high-stress truncation
    if ((cleaned.match(/\[/g) || []).length > (cleaned.match(/\]/g) || []).length) cleaned += ']';
    if ((cleaned.match(/\{/g) || []).length > (cleaned.match(/\}/g) || []).length) cleaned += '}';
  }
  return cleaned;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface EnvironmentalSolutionWithGrounding extends EnvironmentalSolution {
  sources?: GroundingSource[];
}

export const getEnvironmentalSolution = async (prompt: string, section: SectionType, languageName: string): Promise<EnvironmentalSolutionWithGrounding> => {
  return safeGenAIRequest(async () => {
    // Using gemini-3-pro-preview with thinking budget for high quality scientific analysis.
    // Explicitly limiting field lengths to prevent the 'Unterminated string' JSON error caused by truncation.
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Act as a world-class environmental scientist. Analyze the following environmental problem: "${prompt}" in the context of "${section}".
      
      Use Google Search to find current scientific data and statistics.
      
      Response requirements in ${languageName}:
      1. Topic: Professional title.
      2. Summary: Simple 2-sentence overview.
      3. Introduction: 2-3 paragraph overview.
      4. Explanation: Provide a deep technical analysis. IMPORTANT: Keep this field under 3000 characters to ensure the JSON remains valid and fits within the response window.
      5. Background: Context and history.
      6. Causes: Primary drivers.
      7. Impacts: Biological and societal impacts.
      8. Solutions: Practical remediation steps.
      9. Examples: Global case studies.
      10. Prevention Tips: Long-term strategies.
      11. Conclusion: Future outlook.
      12. Visual Prompt: Detailed ENGLISH prompt for a scientific diagram.
      
      CRITICAL: Ensure the response is VALID JSON. Do not let strings exceed 3000 characters.`,
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 4000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            summary: { type: Type.STRING },
            introduction: { type: Type.STRING },
            explanation: { type: Type.STRING },
            background: { type: Type.STRING },
            causes: { type: Type.ARRAY, items: { type: Type.STRING } },
            impacts: { type: Type.ARRAY, items: { type: Type.STRING } },
            solutions: { type: Type.ARRAY, items: { type: Type.STRING } },
            examples: { type: Type.ARRAY, items: { type: Type.STRING } },
            preventionTips: { type: Type.ARRAY, items: { type: Type.STRING } },
            conclusion: { type: Type.STRING },
            visualPrompt: { type: Type.STRING },
            category: { type: Type.STRING, enum: Object.values(Category) },
            section: { type: Type.STRING, enum: ['Climate', 'Water', 'Air', 'Noise', 'Vision'] }
          },
          required: ["topic", "summary", "introduction", "explanation", "background", "causes", "impacts", "solutions", "examples", "preventionTips", "conclusion", "visualPrompt", "category", "section"]
        }
      }
    });

    let jsonText = response.text || '{}';
    try {
      const data = JSON.parse(jsonText);
      
      // Extract grounding sources
      const sources: GroundingSource[] = [];
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks) {
        groundingChunks.forEach((chunk: any) => {
          if (chunk.web?.uri && chunk.web?.title) {
            sources.push({ title: chunk.web.title, uri: chunk.web.uri });
          }
        });
      }

      return { ...data, sources };
    } catch (parseError) {
      console.warn("Initial JSON parse failed, attempting repair...", parseError);
      const repairedJson = tryRepairJson(jsonText);
      return JSON.parse(repairedJson);
    }
  });
};

export const generateSustainabilityPlan = async (goal: string, languageName: string): Promise<any> => {
  return safeGenAIRequest(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create a personalized 7-day sustainability plan for: "${goal}". Language: ${languageName}. Return JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            days: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.INTEGER },
                  task: { type: Type.STRING },
                  impact: { type: Type.STRING }
                }
              }
            }
          },
          required: ["title", "days"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  });
};

export const generateSpeech = async (text: string): Promise<AudioBuffer> => {
  return safeGenAIRequest(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Audio synthesis failed");

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const data = decode(base64Audio);
    return await decodeAudioData(data, ctx, 24000, 1);
  });
};

function decode(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, rate: number, channels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const buffer = ctx.createBuffer(channels, dataInt16.length / channels, rate);
  for (let c = 0; c < channels; c++) {
    const channelData = buffer.getChannelData(c);
    for (let i = 0; i < channelData.length; i++) channelData[i] = dataInt16[i * channels + c] / 32768.0;
  }
  return buffer;
}

export const generateVisualIllustration = async (visualPrompt: string): Promise<string> => {
  return safeGenAIRequest(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Educational diagram: ${visualPrompt}. Focus on clarity and labeling.` }] }
    });
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:image/png;base64,${part.inlineData.data}` : '';
  });
};

export const generateProImage = async (prompt: string, size: ImageSize): Promise<string> => {
  return safeGenAIRequest(async () => {
    const aiPro = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await aiPro.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: { aspectRatio: "1:1", imageSize: size },
      },
    });
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    return part ? `data:image/png;base64,${part.inlineData.data}` : '';
  });
};

export const getEcoStatus = async (lat: number | undefined, lng: number | undefined, languageName: string): Promise<EcoStatus> => {
  return safeGenAIRequest(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Fetch current planetary status and environmental news. Coordinates: ${lat},${lng}. Return JSON in ${languageName}.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            localTemp: { type: Type.STRING },
            localCondition: { type: Type.STRING },
            globalAvgTemp: { type: Type.STRING },
            news: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, url: { type: Type.STRING } } } }
          },
          required: ["localTemp", "localCondition", "globalAvgTemp", "news"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  });
};
