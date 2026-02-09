
import React, { useState, useRef, useEffect } from 'react';
import { SectionType, EnvironmentalSolution, EcoStatus, Language } from './types';
import { SECTIONS, LANGUAGES } from './constants';
import { getEnvironmentalSolution, generateVisualIllustration, getEcoStatus, encode, EnvironmentalSolutionWithGrounding } from './services/geminiService';
import { Button } from './components/Button';
import { SolutionDisplay } from './components/SolutionDisplay';
import { HabitTracker } from './components/HabitTracker';
import { SustainabilityPlanner } from './components/SustainabilityPlanner';
import { GoogleGenAI, Modality, Blob } from '@google/genai';

type ViewMode = 'Dashboard' | 'Research';

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>('Dashboard');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [recording, setRecording] = useState(false);
  const [solution, setSolution] = useState<EnvironmentalSolutionWithGrounding | null>(null);
  const [illustrationUrl, setIllustrationUrl] = useState<string | undefined>();
  const [activeSection, setActiveSection] = useState<SectionType>('Climate');
  const [ecoStatus, setEcoStatus] = useState<EcoStatus | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(LANGUAGES[0]); 
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [quotaError, setQuotaError] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const checkApiKey = async () => {
      // @ts-ignore
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(hasKey);
    };
    checkApiKey();
  }, []);

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        setQuotaError(false);
        const status = await getEcoStatus(undefined, undefined, selectedLanguage.name);
        setEcoStatus(status);
      } catch (err: any) {
        if (err.message === "API_QUOTA_EXCEEDED") setQuotaError(true);
        console.error(err);
      }
    };
    fetchTelemetry();
  }, [selectedLanguage]);

  const handleOpenKeySelector = async () => {
    // @ts-ignore
    await window.aistudio.openSelectKey();
    setHasApiKey(true); 
    setQuotaError(false);
  };

  const stopLiveTranscription = () => {
    if (liveSessionRef.current) {
      liveSessionRef.current.close();
      liveSessionRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setRecording(false);
  };

  const startLiveTranscription = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = inputAudioContext;
      
      if (inputAudioContext.state === 'suspended') {
        await inputAudioContext.resume();
      }

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob: Blob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (message) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              setInput(prev => prev + text);
            }
          },
          onerror: (e) => {
            console.error('Live session error:', e);
            stopLiveTranscription();
          },
          onclose: () => {
            setRecording(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
        }
      });

      liveSessionRef.current = await sessionPromise;
      setRecording(true);
    } catch (err) {
      console.error('Failed to start live transcription:', err);
    }
  };

  const handleMicToggle = () => {
    if (recording) stopLiveTranscription();
    else startLiveTranscription();
  };

  const performGlobalSearch = async (query: string) => {
    if (!query.trim()) return;
    
    if (recording) stopLiveTranscription();

    setView('Research');
    setLoading(true);
    setResearchError(null);
    setQuotaError(false);
    setSolution(null);
    setIllustrationUrl(undefined);
    
    try {
      setLoadingStep('Consulting Global Environmental Database...');
      const result = await getEnvironmentalSolution(query, activeSection, selectedLanguage.name);
      setSolution(result);
      
      setLoadingStep('Synthesizing Scientific Visualizations...');
      const img = await generateVisualIllustration(result.visualPrompt);
      setIllustrationUrl(img);
    } catch (error: any) {
      if (error.message === "API_QUOTA_EXCEEDED") setQuotaError(true);
      else setResearchError("The environmental research node is currently unresponsive. Please refine your query parameters.");
      console.error(error);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    performGlobalSearch(input);
  };

  const handleSectionChange = (id: SectionType) => {
    setActiveSection(id);
    setView('Dashboard');
    setSolution(null);
    setInput('');
    inputRef.current?.focus();
  };

  // Simplified styles: Clean colors, visible dark text
  const getSectionActiveStyles = (id: SectionType) => {
    switch (id) {
      case 'Climate': return 'bg-emerald-100 border-emerald-500 text-slate-950 shadow-md ring-1 ring-emerald-500';
      case 'Water': return 'bg-blue-100 border-blue-500 text-slate-950 shadow-md ring-1 ring-blue-500';
      case 'Air': return 'bg-indigo-100 border-indigo-500 text-slate-950 shadow-md ring-1 ring-indigo-500';
      case 'Noise': return 'bg-rose-100 border-rose-500 text-slate-950 shadow-md ring-1 ring-rose-500';
      default: return 'bg-slate-200 border-slate-500 text-slate-950';
    }
  };

  const getSectionInactiveStyles = (id: SectionType) => {
    return 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50 hover:border-slate-300';
  };

  const renderCategoryButton = (s: typeof SECTIONS[0]) => (
    <button 
      key={s.id} 
      onClick={() => handleSectionChange(s.id)} 
      className={`flex items-center gap-3 px-8 py-4 rounded-2xl border-2 transition-all duration-300 font-bold text-sm tracking-wide 
        ${activeSection === s.id ? getSectionActiveStyles(s.id) : getSectionInactiveStyles(s.id)}`}
    >
      <span className="text-xl">{s.icon}</span>
      <span>{s.label}</span>
    </button>
  );

  return (
    <div className={`min-h-screen bg-[#FDFDFF] text-slate-900 selection:bg-emerald-100 font-sans transition-all duration-700 pb-20 ${selectedLanguage.code === 'ur' || selectedLanguage.code === 'ar' ? 'rtl' : 'ltr'}`}>
      
      {quotaError && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-lg">
          <div className="bg-white rounded-[3rem] p-12 max-w-lg w-full shadow-3xl text-center space-y-8 animate-in zoom-in-95">
             <div className="w-24 h-24 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto text-5xl">⚡</div>
             <div className="space-y-4">
                <h3 className="text-3xl font-black text-slate-950 tracking-tighter leading-none">High Resource Demand</h3>
                <p className="text-slate-500 font-medium">Global research nodes are at capacity. Priority access is granted to premium telemetry keys.</p>
             </div>
             <div className="flex flex-col gap-4">
                <Button onClick={() => setQuotaError(false)} variant="primary" className="py-5 bg-slate-950">Continue Free</Button>
                <Button onClick={handleOpenKeySelector} variant="outline" className="py-5 border-slate-200 text-slate-500">Enable High-Capacity Key</Button>
             </div>
          </div>
        </div>
      )}

      <nav className="fixed top-0 left-0 right-0 z-[100] bg-white/80 backdrop-blur-2xl border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto h-20 flex items-center justify-between px-6 sm:px-12">
          <div className="flex items-center gap-6">
            <h2 className="text-2xl font-black text-slate-950 tracking-tighter cursor-pointer flex items-center gap-2" onClick={() => { setView('Dashboard'); setSolution(null); }}>
              <span className="text-emerald-600">Eco</span>Solve
            </h2>
            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
            <button onClick={() => { setView('Dashboard'); setSolution(null); }} className={`text-[10px] font-black uppercase tracking-[0.3em] transition-all hover:text-emerald-600 ${view === 'Dashboard' ? 'text-emerald-600 underline underline-offset-8 decoration-2' : 'text-slate-400'}`}>Dashboard</button>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-emerald-50 rounded-full border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700">Planetary Sync Active</span>
            </div>
            <select value={selectedLanguage.code} onChange={(e) => { const lang = LANGUAGES.find(l => l.code === e.target.value); if (lang) setSelectedLanguage(lang); }} className="appearance-none bg-white px-5 py-2.5 rounded-full border border-slate-200 text-[10px] font-black uppercase tracking-widest outline-none transition-all cursor-pointer shadow-sm hover:ring-2 hover:ring-emerald-100">
                {LANGUAGES.map(lang => <option key={lang.code} value={lang.code}>{lang.nativeName}</option>)}
            </select>
          </div>
        </div>
      </nav>

      <main className="pt-32 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto">
          {view === 'Dashboard' && (
            <div className="space-y-16 animate-in fade-in duration-1000">
              <section className="text-center space-y-12 py-8">
                <div className="space-y-4 max-w-5xl mx-auto">
                  <h1 className="text-6xl md:text-[8rem] font-black text-slate-950 tracking-tighter leading-[0.85] animate-in slide-in-from-top-12 duration-1000">
                    Environment <br /><span className="text-emerald-600">Problem Solving.</span>
                  </h1>
                </div>

                <div className="max-w-4xl mx-auto space-y-12">
                  <form onSubmit={handleSubmit} className="relative group scale-100 hover:scale-[1.005] transition-all duration-500">
                    <div className="absolute -inset-2 bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-[4.5rem] blur-[32px] opacity-10 group-focus-within:opacity-20 transition-all"></div>
                    <div className="relative bg-white rounded-[4rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] border border-slate-200/50 p-4 sm:p-5 transition-all">
                      <div className="flex items-center">
                        <div className="pl-6 pr-4 hidden sm:block">
                           <span className="text-4xl filter grayscale group-focus-within:grayscale-0 transition-all duration-700">🛰️</span>
                        </div>
                        <input ref={inputRef} autoFocus type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={recording ? "Transcribing mission parameters..." : "environment problem solving."} className="w-full py-6 text-slate-950 placeholder-slate-300 font-black focus:outline-none text-xl sm:text-3xl bg-transparent px-4" />
                        <button type="button" onClick={handleMicToggle} className={`ml-4 p-5 rounded-full transition-all flex items-center justify-center ${recording ? 'bg-rose-500 animate-pulse ring-8 ring-rose-100 text-white shadow-lg' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'}`}>
                          {recording ? <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-20a3 3 0 00-3 3v8a3 3 0 006 0V5a3 3 0 00-3-3z" /></svg>}
                        </button>
                      </div>
                      <div className="mt-4 flex justify-end items-center px-4">
                         <Button type="submit" loading={loading} className="px-14 py-6 rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.4em] bg-slate-950 text-white hover:bg-black shadow-2xl hover:-translate-y-1 transition-all">
                            Research
                         </Button>
                      </div>
                    </div>
                  </form>

                  {/* Redesigned Button Layout: 3 in line, 1 centered below */}
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                    <div className="flex flex-wrap justify-center gap-4">
                      {SECTIONS.slice(0, 3).map(s => renderCategoryButton(s))}
                    </div>
                    <div className="flex justify-center">
                      {SECTIONS.slice(3, 4).map(s => renderCategoryButton(s))}
                    </div>
                  </div>
                </div>
              </section>

              <div className="grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-8 space-y-12">
                  <div className="grid grid-cols-1 gap-8">
                    <HabitTracker />
                  </div>
                </div>
                <div className="lg:col-span-4 space-y-12">
                   <SustainabilityPlanner language={selectedLanguage.name} onSearch={performGlobalSearch} />
                </div>
              </div>
            </div>
          )}

          {view === 'Research' && (
            <div className="animate-in fade-in slide-in-from-bottom-16 py-10">
              {loading && (
                <div className="min-h-[65vh] flex flex-col items-center justify-center text-center space-y-16 animate-in zoom-in-95 duration-700">
                  <div className="relative w-72 h-72">
                    <div className="absolute inset-0 border-[24px] border-slate-100 rounded-full"></div>
                    <div className="absolute inset-0 border-[24px] border-emerald-500 border-t-transparent rounded-full animate-spin shadow-[0_0_40px_rgba(16,185,129,0.2)]"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-[5rem] drop-shadow-2xl">🌍</div>
                  </div>
                  <div className="space-y-6">
                    <h2 className="text-6xl md:text-7xl font-black text-slate-950 tracking-tighter leading-tight">Syncing Research <br />Parameters...</h2>
                    <p className="text-emerald-600 font-black uppercase tracking-[0.6em] animate-pulse text-sm">{loadingStep}</p>
                  </div>
                </div>
              )}
              
              {!loading && researchError && (
                <div className="min-h-[55vh] flex flex-col items-center justify-center text-center space-y-12 bg-white rounded-[5rem] border border-slate-100 shadow-2xl p-20 animate-in zoom-in-95">
                   <div className="text-[10rem] animate-bounce">📡</div>
                   <div className="space-y-6">
                      <h2 className="text-6xl font-black text-slate-950 tracking-tighter">Transmission Failed</h2>
                      <p className="text-xl text-slate-500 max-w-xl mx-auto font-medium">{researchError}</p>
                   </div>
                   <Button onClick={() => setView('Dashboard')} className="px-16 py-6 bg-slate-950 rounded-full text-[11px] font-black uppercase tracking-[0.4em]">Restart Terminal</Button>
                </div>
              )}

              {!loading && solution && !researchError && (
                <div className="animate-in fade-in slide-in-from-bottom-12 duration-1000">
                  <div className="flex flex-col sm:flex-row justify-between items-center mb-20 gap-8">
                    <button onClick={() => setView('Dashboard')} className="group flex items-center gap-6 px-12 py-5 bg-white border border-slate-200 hover:border-slate-950 text-slate-950 rounded-full text-[11px] font-black uppercase tracking-widest shadow-xl transition-all hover:-translate-x-2">
                      <span className="text-xl group-hover:scale-125 transition-transform">←</span> Back to Terminal
                    </button>
                    <div className="flex flex-wrap justify-center gap-3">
                      {SECTIONS.map((s) => (
                        <button key={s.id} onClick={() => handleSectionChange(s.id)} className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeSection === s.id ? 'bg-slate-950 text-white shadow-lg scale-105' : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-200'}`}>{s.icon} {s.label}</button>
                      ))}
                    </div>
                  </div>
                  <SolutionDisplay solution={solution} imageUrl={illustrationUrl} hasApiKey={hasApiKey} onOpenKeySelector={handleOpenKeySelector} />
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="mt-32 border-t border-slate-200/60 py-16 text-center">
         <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-12">
            <h2 className="text-2xl font-black text-slate-950 tracking-tighter">Eco<span className="text-emerald-600">Solve</span> AI</h2>
            <div className="flex flex-wrap justify-center gap-8">
               <a href="#" className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-emerald-600 transition-colors">Framework</a>
               <a href="#" className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-emerald-600 transition-colors">Global Telemetry</a>
               <a href="#" className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-emerald-600 transition-colors">Open Systems</a>
            </div>
            <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.4em]">© 2025 PLANETARY TERMINAL</p>
         </div>
      </footer>
    </div>
  );
};

export default App;
