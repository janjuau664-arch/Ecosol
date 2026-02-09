
import React, { useState } from 'react';
import { ImageSize, ImageGenerationResult } from '../types';
import { generateProImage } from '../services/geminiService';
import { Button } from './Button';

interface ImageGeneratorToolProps {
  initialPrompt: string;
  hasApiKey: boolean;
  onOpenKeySelector: () => void;
  onClose?: () => void;
}

export const ImageGeneratorTool: React.FC<ImageGeneratorToolProps> = ({ 
  initialPrompt, 
  hasApiKey, 
  onOpenKeySelector,
  onClose 
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [size, setSize] = useState<ImageSize>('1K');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImageGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    if (!hasApiKey) {
      onOpenKeySelector();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const url = await generateProImage(prompt, size);
      setResult({ url, prompt, size });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[4rem] shadow-3xl border border-rose-100 overflow-hidden animate-in zoom-in-95 duration-700">
      <div className="p-12 md:p-20 space-y-12">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h3 className="text-3xl font-black text-slate-950 tracking-tighter">Image Laboratory</h3>
            <p className="text-slate-400 font-bold text-sm">Powered by Nano Banana Pro Rendering Engine</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-4 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        <form onSubmit={handleGenerate} className="space-y-10">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-rose-500 to-purple-600 rounded-3xl blur opacity-10 group-focus-within:opacity-25 transition-opacity"></div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter visual coordinates for synthesis..."
              className="relative w-full bg-slate-50 border border-slate-200 rounded-3xl p-8 text-xl font-bold focus:outline-none focus:ring-4 focus:ring-rose-100 min-h-[120px] resize-none"
            />
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-3 bg-slate-100/50 p-2 rounded-2xl">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Resolution:</span>
              {(['1K', '2K', '4K'] as ImageSize[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${size === s ? 'bg-rose-600 text-white shadow-lg scale-110' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {s}
                </button>
              ))}
            </div>

            <Button 
              type="submit" 
              loading={loading}
              className="bg-rose-600 hover:bg-rose-700 text-white px-12 py-5 rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl"
            >
              Start Rendering
            </Button>
          </div>
        </form>

        {loading && (
          <div className="aspect-video bg-slate-950 rounded-[3rem] flex flex-col items-center justify-center space-y-8 animate-pulse border-[10px] border-white">
            <div className="w-16 h-16 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-rose-400 font-black text-xs uppercase tracking-[0.5em]">Synthesizing Visual Matter...</p>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="relative group rounded-[3rem] overflow-hidden border-[16px] border-white shadow-3xl aspect-video bg-slate-900">
              <img src={result.url} alt={result.prompt} className="w-full h-full object-cover" />
              <div className="absolute bottom-0 inset-x-0 p-10 bg-gradient-to-t from-slate-950/80 to-transparent">
                <p className="text-white text-lg font-bold italic opacity-90 line-clamp-1">"{result.prompt}"</p>
              </div>
            </div>
            <div className="flex justify-center">
               <a 
                 href={result.url} 
                 download={`eco-vision-${Date.now()}.png`}
                 className="flex items-center gap-4 px-10 py-4 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
               >
                 💾 Archive High-Res Visual
               </a>
            </div>
          </div>
        )}

        {error && (
          <div className="p-6 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-bold flex items-center gap-4">
            <span className="text-2xl">⚠️</span> {error}
          </div>
        )}
      </div>
    </div>
  );
};
