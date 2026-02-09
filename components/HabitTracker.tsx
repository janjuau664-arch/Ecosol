
import React, { useState, useEffect } from 'react';
import { EcoHabit } from '../types';

export const HabitTracker: React.FC = () => {
  const [habits, setHabits] = useState<EcoHabit[]>(() => {
    const saved = localStorage.getItem('eco-habits');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'Reusable Bottle', completed: false, streak: 3 },
      { id: '2', name: 'Composting', completed: false, streak: 12 },
      { id: '3', name: 'Cold Wash Only', completed: false, streak: 0 }
    ];
  });

  useEffect(() => {
    localStorage.setItem('eco-habits', JSON.stringify(habits));
  }, [habits]);

  const toggleHabit = (id: string) => {
    setHabits(prev => prev.map(h => {
      if (h.id === id) {
        const completed = !h.completed;
        return { ...h, completed, streak: completed ? h.streak + 1 : Math.max(0, h.streak - 1) };
      }
      return h;
    }));
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-slate-800">My Eco Habits</h3>
        <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">Daily Progress</span>
      </div>
      <div className="space-y-4">
        {habits.map(habit => (
          <div key={habit.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => toggleHabit(habit.id)}
                className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                  habit.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-white'
                }`}
              >
                {habit.completed && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <div>
                <p className={`font-medium text-sm ${habit.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                  {habit.name}
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Streak: {habit.streak} days</p>
              </div>
            </div>
            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
               <div className="h-full bg-emerald-400" style={{ width: `${Math.min(habit.streak * 8, 100)}%` }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
