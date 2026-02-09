
import React, { useState } from 'react';
import { generateSustainabilityPlan } from '../services/geminiService';
import { Button } from './Button';

interface SustainabilityPlannerProps {
  language: string;
  onSearch?: (query: string) => void;
}

export const SustainabilityPlanner: React.FC<SustainabilityPlannerProps> = ({ language, onSearch }) => {
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) return;

    // If onSearch is provided, trigger the global page-switching logic
    if (onSearch) {
      onSearch(goal);
      return;
    }

    // Fallback logic if for some reason we stay in-place
    setLoading(true);
    try {
      const result = await generateSustainabilityPlan(goal, language);
      setPlan(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-2xl space-y-8">
      <div className="space-y-2">
        <h3 className="text-2xl font-black text-slate-950 tracking-tighter">Impact Strategy</h3>
        <p className="text-sm font-bold text-slate-400">Inquire and receive immediate remediation research.</p>
      </div>

      {!plan ? (
        <form onSubmit={handleGenerate} className="space-y-6">
          <input 
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Solve microplastic pollution..."
            className="w-full bg-slate-50 border border-slate-200 p-5 rounded-2xl text-lg font-bold focus:outline-none focus:ring-4 focus:ring-emerald-100"
          />
          <Button loading={loading} className="w-full py-5 text-[10px] font-black uppercase tracking-widest bg-emerald-600">
            Research
          </Button>
        </form>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-700">
          <div className="flex items-center justify-between">
            <h4 className="text-xl font-black text-emerald-600">{plan.title}</h4>
            <button onClick={() => setPlan(null)} className="text-[10px] font-black text-slate-300 hover:text-slate-600 uppercase tracking-widest">Reset</button>
          </div>
          <div className="space-y-4">
            {plan.days.map((d: any) => (
              <div key={d.day} className="flex gap-6 p-5 bg-slate-50 rounded-2xl group hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-emerald-100">
                <span className="text-3xl font-black text-emerald-200">0{d.day}</span>
                <div className="space-y-1">
                  <p className="font-black text-slate-900">{d.task}</p>
                  <p className="text-xs font-bold text-emerald-500 italic">{d.impact}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
