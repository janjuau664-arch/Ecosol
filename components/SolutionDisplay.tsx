
import React, { useState, useRef } from 'react';
import { EnvironmentalSolutionWithGrounding } from '../services/geminiService';
import { SECTIONS } from '../constants';
import { generateSpeech } from '../services/geminiService';

interface SolutionDisplayProps { 
  solution: EnvironmentalSolutionWithGrounding; 
  imageUrl?: string;
  hasApiKey: boolean;
  onOpenKeySelector: () => void;
}

export const SolutionDisplay: React.FC<SolutionDisplayProps> = ({ 
  solution, 
  imageUrl, 
  hasApiKey,
  onOpenKeySelector
}) => {
  const [playing, setPlaying] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('scientific');
  
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const sectionInfo = SECTIONS.find(s => s.id === solution.section);
  
  const handlePlayAudio = async () => {
    if (playing) {
      audioSourceRef.current?.stop();
      setPlaying(false);
      return;
    }

    setLoadingAudio(true);
    try {
      const textToSpeak = `${solution.topic}. ${solution.summary}. ${solution.explanation}`;
      const buffer = await generateSpeech(textToSpeak);
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setPlaying(false);
      audioSourceRef.current = source;
      source.start();
      setPlaying(true);
    } catch (err) {
      console.error("Speech generation failed", err);
    } finally {
      setLoadingAudio(false);
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  const openDiagramInNewTab = () => {
    if (imageUrl) {
      const win = window.open();
      if (win) {
        win.document.write(`
          <html>
            <head><title>Scientific Diagram: ${solution.topic}</title></head>
            <body style="margin:0; background:#000; display:flex; align-items:center; justify-content:center; height:100vh; overflow:hidden;">
              <img src="${imageUrl}" style="max-width:100%; max-height:100%; object-fit:contain;" />
            </body>
          </html>
        `);
      }
    }
  };

  return (
    <div className="space-y-24 pb-64">
      <div className={`bg-white rounded-[5rem] p-16 md:p-32 shadow-[0_80px_120px_-40px_rgba(0,0,0,0.12)] border border-slate-100 relative overflow-hidden transition-all duration-1000`}>
        <div className="absolute top-0 right-0 w-[50rem] h-[50rem] bg-emerald-500/5 blur-[150px] -mr-[25rem] -mt-[25rem] pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-12 mb-20 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-12">
            <div className="p-7 rounded-[2.5rem] border-[5px] border-slate-900 bg-white shadow-3xl scale-125 transition-transform hover:rotate-6">
              <span className="text-6xl block transform transition-all duration-700">{sectionInfo?.icon}</span>
            </div>
            
            <button 
              onClick={handlePlayAudio}
              disabled={loadingAudio}
              className={`flex items-center gap-4 px-10 py-5 rounded-full shadow-2xl transition-all active:scale-95 ${playing ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white hover:bg-black'}`}
            >
              {loadingAudio ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : playing ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              )}
              <span className="text-[11px] font-black uppercase tracking-[0.3em]">
                {loadingAudio ? 'Synthesizing...' : playing ? 'Stop Audio' : 'Play Audio Brief'}
              </span>
            </button>
          </div>
        </div>

        <h2 className="text-7xl md:text-[8rem] font-black text-slate-950 mb-16 tracking-tighter leading-[0.8]">{solution.topic}</h2>
        
        <div className="max-w-5xl space-y-12">
          <div className="space-y-4">
             <div className="text-emerald-500 font-black text-[11px] uppercase tracking-[0.6em] border-b border-emerald-100 pb-4 inline-block">Normal Answer (Concise Summary)</div>
             <p className="text-3xl md:text-5xl text-slate-800 font-bold leading-relaxed tracking-tight">
               {solution.summary}
             </p>
          </div>
          
          <div className="space-y-4 pt-8 border-t border-slate-100">
             <div className="text-slate-400 font-black text-[11px] uppercase tracking-[0.6em] border-b border-slate-100 pb-4 inline-block">Introduction & Context</div>
             <p className="text-xl md:text-2xl text-slate-500 font-medium leading-relaxed">
               {solution.introduction}
             </p>
          </div>
        </div>

        {solution.sources && solution.sources.length > 0 && (
          <div className="mt-16 pt-12 border-t border-slate-100 space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-400">Grounding Research Sources</h4>
            <div className="flex flex-wrap gap-4">
              {solution.sources.map((source, i) => (
                <a 
                  key={i} 
                  href={source.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-slate-50 border border-slate-200 rounded-full text-[10px] font-black text-slate-600 hover:bg-slate-100 hover:border-emerald-300 transition-all shadow-sm"
                >
                  🔗 {source.title}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-12 gap-20">
        <div className="lg:col-span-8 space-y-8">
          <div className={`transition-all duration-700 ${expandedSection === 'scientific' ? 'scale-100' : 'scale-[0.98]'}`}>
            <button 
              onClick={() => toggleSection('scientific')}
              className="w-full text-left bg-white p-12 md:p-16 rounded-[4rem] border border-slate-100 shadow-xl flex items-center justify-between group hover:border-emerald-200 transition-colors"
            >
              <div className="space-y-2">
                 <h3 className="text-4xl font-black text-slate-950 tracking-tighter flex items-center gap-6">
                    <span className="text-emerald-500">01.</span> Long Answer (Scientific Explanation)
                 </h3>
                 <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">In-depth Technical Synthesis</p>
              </div>
              <span className={`text-4xl transition-transform duration-500 ${expandedSection === 'scientific' ? 'rotate-180' : ''}`}>👇</span>
            </button>
            {expandedSection === 'scientific' && (
              <div className="mt-4 bg-white p-16 md:p-24 rounded-[4rem] border border-slate-100 shadow-2xl animate-in slide-in-from-top-4 duration-500">
                <div className="prose prose-slate prose-2xl max-w-none text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">
                  {solution.explanation}
                </div>
              </div>
            )}
          </div>

          <div className={`transition-all duration-700 ${expandedSection === 'context' ? 'scale-100' : 'scale-[0.98]'}`}>
            <button 
              onClick={() => toggleSection('context')}
              className="w-full text-left bg-slate-50 p-12 md:p-16 rounded-[4rem] border border-slate-200/50 shadow-sm flex items-center justify-between group hover:bg-slate-100 transition-colors"
            >
              <div className="space-y-2">
                 <h3 className="text-4xl font-black text-slate-950 tracking-tighter flex items-center gap-6">
                    <span className="text-blue-500">02.</span> Technical Background
                 </h3>
                 <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Historical Data & Mechanisms</p>
              </div>
              <span className={`text-4xl transition-transform duration-500 ${expandedSection === 'context' ? 'rotate-180' : ''}`}>👇</span>
            </button>
            {expandedSection === 'context' && (
              <div className="mt-4 bg-slate-50 p-16 md:p-24 rounded-[4rem] border border-slate-200 shadow-inner animate-in slide-in-from-top-4 duration-500">
                <p className="text-2xl text-slate-500 leading-relaxed font-medium whitespace-pre-wrap">
                  {solution.background}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-12">
          <div className="relative group rounded-[4rem] overflow-hidden shadow-2xl bg-slate-100 border-[12px] border-white aspect-[3/4]">
            {imageUrl ? (
              <div className="w-full h-full relative cursor-zoom-in" onClick={openDiagramInNewTab}>
                <img src={imageUrl} alt="Scientific Diagram" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                <div className="absolute top-4 right-4">
                  <span className="bg-white/90 backdrop-blur px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-900 shadow-xl">Open in New Page</span>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-50 p-12 text-center">
                <div className="flex flex-col items-center gap-6">
                  <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rendering Diagram...</p>
                </div>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60 pointer-events-none"></div>
            <div className="absolute bottom-10 left-10 right-10 pointer-events-none">
              <p className="text-white font-black text-[10px] uppercase tracking-widest mb-2 opacity-80">Research Visualization</p>
              <p className="text-white text-lg font-bold italic">Generated diagram for {solution.topic}</p>
            </div>
          </div>

          <section className="bg-rose-50/50 p-12 rounded-[3.5rem] border border-rose-100">
             <h4 className="text-rose-900 font-black text-[10px] uppercase tracking-widest mb-8 flex items-center gap-3">
               <span className="w-2 h-2 rounded-full bg-rose-500"></span> Primary Drivers
             </h4>
             <ul className="space-y-6">
               {solution.causes.map((c, i) => (
                 <li key={i} className="text-rose-950 font-bold text-lg leading-tight flex gap-4">
                   <span className="text-rose-300">•</span> {c}
                 </li>
               ))}
             </ul>
          </section>

          <section className="bg-amber-50/50 p-12 rounded-[3.5rem] border border-amber-100">
             <h4 className="text-amber-900 font-black text-[10px] uppercase tracking-widest mb-8 flex items-center gap-3">
               <span className="w-2 h-2 rounded-full bg-amber-500"></span> Ecological Impacts
             </h4>
             <ul className="space-y-6">
               {solution.impacts.map((imp, i) => (
                 <li key={i} className="text-amber-950 font-bold text-lg leading-tight flex gap-4">
                   <span className="text-amber-300">•</span> {imp}
                 </li>
               ))}
             </ul>
          </section>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-20">
        <section className={`bg-emerald-50/40 p-16 md:p-24 rounded-[5rem] border border-emerald-100 shadow-2xl`}>
          <div className="flex items-center gap-10 mb-16">
            <span className="w-20 h-20 rounded-[2rem] bg-emerald-600 text-white flex items-center justify-center text-4xl shadow-xl">🛠️</span>
            <div>
               <h3 className="text-emerald-950 font-black text-xs uppercase tracking-[0.5em] mb-2">Practical Solutions</h3>
               <p className="text-emerald-600 font-bold text-lg opacity-60">Action Framework</p>
            </div>
          </div>
          <ul className="grid gap-8">
            {solution.solutions.map((item, i) => (
              <li key={i} className="bg-white p-10 rounded-[3rem] border border-emerald-100 shadow-sm flex gap-8 items-center group hover:scale-[1.02] transition-transform">
                <span className="text-3xl font-black text-emerald-100">0{i+1}</span> 
                <p className="text-emerald-950 font-black text-2xl leading-tight">{item}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={`bg-blue-50/40 p-16 md:p-24 rounded-[5rem] border border-blue-100 shadow-2xl`}>
          <div className="flex items-center gap-10 mb-16">
            <span className="w-20 h-20 rounded-[2rem] bg-blue-600 text-white flex items-center justify-center text-4xl shadow-xl">🛡️</span>
            <div>
               <h3 className="text-blue-950 font-black text-xs uppercase tracking-[0.5em] mb-2">Prevention & Policy</h3>
               <p className="text-blue-600 font-bold text-lg opacity-60">Future Resilience</p>
            </div>
          </div>
          <ul className="grid gap-8">
            {solution.preventionTips.map((tip, i) => (
              <li key={i} className="bg-white p-10 rounded-[3rem] border border-blue-100 shadow-sm flex gap-8 items-center group hover:scale-[1.02] transition-transform">
                <span className="text-3xl font-black text-blue-100">P-{i+1}</span>
                <p className="text-blue-950 font-black text-2xl leading-tight">{tip}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className={`text-center py-32 bg-slate-950 rounded-[6rem] text-white space-y-12 relative overflow-hidden shadow-3xl`}>
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-40"></div>
         <h4 className="text-emerald-400 font-black text-[12px] uppercase tracking-[0.7em]">Final Synthesis</h4>
         <div className="max-w-6xl mx-auto px-16">
            <p className="text-3xl md:text-5xl font-bold leading-tight tracking-tight italic text-slate-200">
              "{solution.conclusion}"
            </p>
         </div>
      </div>

      {/* Duplicate block corrected for balanced tags */}
      <div className="grid lg:grid-cols-2 gap-20">
        <section className={`bg-emerald-50/40 p-16 md:p-24 rounded-[5rem] border border-emerald-100 shadow-2xl`}>
          <div className="flex items-center gap-10 mb-16">
            <span className="w-20 h-20 rounded-[2rem] bg-emerald-600 text-white flex items-center justify-center text-4xl shadow-xl">🛠️</span>
            <div>
               <h3 className="text-emerald-950 font-black text-xs uppercase tracking-[0.5em] mb-2">Practical Solutions</h3>
               <p className="text-emerald-600 font-bold text-lg opacity-60">Action Framework</p>
            </div>
          </div>
          <ul className="grid gap-8">
            {solution.solutions.map((item, i) => (
              <li key={i} className="bg-white p-10 rounded-[3rem] border border-emerald-100 shadow-sm flex gap-8 items-center group hover:scale-[1.02] transition-transform">
                <span className="text-3xl font-black text-emerald-100">0{i+1}</span> 
                <p className="text-emerald-950 font-black text-2xl leading-tight">{item}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={`bg-blue-50/40 p-16 md:p-24 rounded-[5rem] border border-blue-100 shadow-2xl`}>
          <div className="flex items-center gap-10 mb-16">
            <span className="w-20 h-20 rounded-[2rem] bg-blue-600 text-white flex items-center justify-center text-4xl shadow-xl">🛡️</span>
            <div>
               <h3 className="text-blue-950 font-black text-xs uppercase tracking-[0.5em] mb-2">Prevention & Policy</h3>
               <p className="text-blue-600 font-bold text-lg opacity-60">Future Resilience</p>
            </div>
          </div>
          <ul className="grid gap-8">
            {solution.preventionTips.map((tip, i) => (
              <li key={i} className="bg-white p-10 rounded-[3rem] border border-blue-100 shadow-sm flex gap-8 items-center group hover:scale-[1.02] transition-transform">
                <span className="text-3xl font-black text-blue-100">P-{i+1}</span>
                <p className="text-blue-950 font-black text-2xl leading-tight">{tip}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};
