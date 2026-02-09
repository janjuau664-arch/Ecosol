
import React from 'react';

interface Alert {
  title: string;
  location: string;
  severity: string;
  sourceUrl: string;
}

interface EmergencyAlertsProps {
  alerts: Alert[];
}

export const EmergencyAlerts: React.FC<EmergencyAlertsProps> = ({ alerts }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-black text-slate-900 tracking-tight">Live Eco Alerts</h3>
        <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
      </div>
      <div className="grid gap-4">
        {alerts.length === 0 ? (
          <div className="p-8 bg-slate-50 rounded-3xl text-center border border-slate-100">
            <p className="text-sm font-bold text-slate-400">Scanning for environmental anomalies...</p>
          </div>
        ) : (
          alerts.map((alert, i) => (
            <a 
              key={i} 
              href={alert.sourceUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="group block p-5 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-xl hover:border-red-100 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    alert.severity === 'High' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    {alert.severity} Risk
                  </span>
                  <h4 className="text-lg font-black text-slate-900 leading-tight group-hover:text-red-600 transition-colors">
                    {alert.title}
                  </h4>
                  <p className="text-sm font-bold text-slate-400 flex items-center gap-2">
                    📍 {alert.location}
                  </p>
                </div>
                <div className="text-2xl group-hover:translate-x-1 transition-transform">🚨</div>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
};
