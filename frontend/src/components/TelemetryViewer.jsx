import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Plane, TrainFront, Hotel, 
  CloudSun, Newspaper, Utensils, 
  Landmark, Map, ChevronDown, 
  Search, MapPin, Hash, Activity,
  SlidersHorizontal, Globe, Clock, Zap
} from 'lucide-react';
import './TelemetryViewer.css';

const AGENT_CONFIG = {
  orchestrator:     { icon: Brain,     color: '#556B2F', label: 'Orchestrator' },
  flight_agent:     { icon: Plane,     color: '#556B2F', label: 'Flights' },
  train_agent:      { icon: TrainFront, color: '#84cc16', label: 'Trains' },
  hotel_agent:      { icon: Hotel,     color: '#d946ef', label: 'Hotels' },
  weather_agent:    { icon: CloudSun,  color: '#06b6d4', label: 'Weather' },
  news_agent:       { icon: Newspaper, color: '#f59e0b', label: 'News' },
  restaurant_agent: { icon: Utensils,  color: '#ef4444', label: 'Restaurants' },
  site_seeing_agent: { icon: Landmark,  color: '#556B2F', label: 'Sightseeing' },
  itinerary_agent:  { icon: Map,       color: '#10b981', label: 'Itinerary' },
};

const StatCard = ({ label, value, icon: Icon }) => (
  <div className="tm-stat-card">
    <div className="flex items-center justify-between mb-1">
      <span className="tm-stat-label">{label}</span>
      {Icon && <Icon size={10} className="text-slate-500" />}
    </div>
    <div className="tm-stat-value">{value}</div>
  </div>
);

const FunnelVisual = ({ raw, filtered }) => {
  const percentage = raw > 0 ? Math.round((filtered / raw) * 100) : 0;
  return (
    <div className="tm-funnel-container">
      <div className="flex justify-between items-end mb-2">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Data Efficiency</span>
          <span className="text-[18px] font-black text-emerald-400">{percentage}%</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 font-medium">{filtered} / {raw} items kept</span>
        </div>
      </div>
      <div className="tm-funnel-bar-bg">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className="tm-funnel-bar-fill"
          style={{ background: `linear-gradient(90deg, #556B2F, #10b981)` }}
        />
      </div>
    </div>
  );
};

const SmartBadge = ({ type, value }) => {
  const config = {
    location: { icon: MapPin, className: 'tm-location-badge' },
    param:    { icon: SlidersHorizontal, className: 'tm-param-badge' },
    generic:  { icon: Hash, className: 'tm-chip' }
  }[type] || { icon: Activity, className: 'tm-chip' };
  
  return (
    <div className={`tm-chip ${config.className}`}>
      <config.icon size={12} />
      <span>{value}</span>
    </div>
  );
};

const MetadataInspector = ({ metadata, agent }) => {
  // Logic to categorize metadata
  const stats = {};
  const locations = [];
  const params = [];
  const others = [];
  let reasoning = null;
  
  Object.entries(metadata).forEach(([k, v]) => {
    if (k.includes('count')) stats[k] = v;
    else if (['city', 'destination', 'origin', 'location'].includes(k)) locations.push(v);
    else if (['units', 'vibe', 'class', 'tier', 'preference'].some(p => k.includes(p))) params.push({k, v});
    else if (k === 'outputs' && Array.isArray(v) && typeof v[0] === 'string') reasoning = v[0];
    else if (k.toLowerCase().includes('reason')) reasoning = String(v);
    else if (typeof v !== 'object') others.push({k, v});
  });

  const showFunnel = stats.raw_count !== undefined && (stats.filtered_count !== undefined || stats.final_count !== undefined);
  const filteredValue = stats.filtered_count ?? stats.final_count;

  return (
    <div className="tm-metadata-card animate-in fade-in slide-in-from-top-2">
      {/* Visual Statistics Row */}
      <div className="tm-insight-grid">
        {locations.map((loc, i) => <SmartBadge key={i} type="location" value={loc} />)}
        {params.map((p, i) => <SmartBadge key={i} type="param" value={`${p.k}: ${p.v}`} />)}
      </div>

      {showFunnel && <FunnelVisual raw={stats.raw_count} filtered={filteredValue} />}

      {/* Grid for other raw stats if they exist and aren't in the funnel */}
      <div className="tm-insight-grid mt-4">
        {Object.entries(stats).map(([k, v]) => {
          if (['raw_count', 'filtered_count', 'final_count'].includes(k)) return null;
          return <StatCard key={k} label={k.replace('_count', '')} value={v} icon={Zap} />;
        })}
      </div>

      {/* Reasoning output content (if found) */}
      {reasoning && (
        <div className="mt-4 pt-4 border-t border-slate-800/50">
          <div className="tm-meta-key mb-2 text-indigo-400">Reasoning Output:</div>
          <div className="text-slate-300 text-[11px] leading-relaxed whitespace-pre-wrap rounded bg-slate-900/50 p-3 outline outline-1 outline-slate-700/50">
            {reasoning}
          </div>
        </div>
      )}

      {/* Advanced Fallback for simple scalar keys only */}
      {others.length > 0 && !reasoning && (
        <div className="mt-4 pt-4 border-t border-slate-800/50">
          <div className="tm-metadata-grid">
            {others.map(({k, v}) => (
              <React.Fragment key={k}>
                <div className="tm-meta-key">{k}:</div>
                <div className="tm-meta-value">
                  {String(v)}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TelemetryEntry = ({ entry }) => {
  const [showMeta, setShowMeta] = useState(false);
  const config = AGENT_CONFIG[entry.agent] || AGENT_CONFIG.orchestrator;
  const Icon   = config.icon;
  const hasMeta = Object.keys(entry.metadata || {}).length > 0;
  const time = new Date(entry.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      layout
      className="tm-entry"
    >
      <div className="tm-time">{time}</div>
      
      <div className="tm-icon-wrapper" style={{ backgroundColor: `${config.color}15`, borderColor: `${config.color}30`, color: config.color }}>
        <Icon size={18} strokeWidth={2.5} />
      </div>

      <div className="tm-content">
        <div className="tm-agent-info">
          <span className="tm-agent-name" style={{ color: config.color }}>{config.label}</span>
          <span className={`tm-badge level-${entry.level.toLowerCase()}`}>{entry.level}</span>
        </div>
        
        <div className="tm-message">
          {entry.message}
        </div>

        {hasMeta && (
          <>
            <motion.button 
              whileHover={{ x: 2 }}
              className="tm-metadata-toggle" 
              onClick={() => setShowMeta(!showMeta)}
            >
              <ChevronDown size={14} style={{ transform: showMeta ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} />
              <span className="tracking-wide uppercase text-[9px] font-black opacity-60">
                {showMeta ? 'System Output' : 'View Insights'}
              </span>
            </motion.button>
            <AnimatePresence>
              {showMeta && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <MetadataInspector metadata={entry.metadata} agent={entry.agent} />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default function TelemetryViewer({ telemetry, height }) {
  const scrollRef = useRef(null);
  const [filter, setFilter] = useState('');
  
  const filteredTelemetry = useMemo(() => {
    let list = telemetry;
    if (filter) {
      const f = filter.toLowerCase();
      list = list.filter(t => 
        t.message.toLowerCase().includes(f) || 
        t.agent.toLowerCase().includes(f)
      );
    }
    
    // Deduplicate to ensure one type of log comes a single time per agent/message pair
    const unique = [];
    const seen = new Set();
    list.forEach(t => {
      const key = `${t.agent}::${t.message}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(t);
      }
    });

    return unique;
  }, [telemetry, filter]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredTelemetry]);

  return (
    <div className="tm-container" style={{ height: height || '400px' }}>
      <div className="tm-header">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(85,107,47,0.8)]" />
             <span className="text-[10px] font-black tracking-[0.2em] text-indigo-400 uppercase">Observer OS v2.0</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Filter consciousness..." 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-slate-900/80 border border-slate-700/50 rounded-lg py-1.5 pl-9 pr-4 text-[10px] text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-all w-48 font-medium"
            />
          </div>
        </div>
      </div>

      <div className="tm-scroll-area custom-scrollbar" ref={scrollRef}>
        <AnimatePresence initial={false} mode="popLayout">
          {filteredTelemetry.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center text-slate-600 gap-3 py-20"
            >
              <Zap size={32} strokeWidth={1.5} className="text-slate-700 animate-bounce" />
              <div className="text-[10px] font-black tracking-[0.3em] uppercase opacity-40">Synchronizing...</div>
            </motion.div>
          ) : (
            <div className="flex flex-col">
              {filteredTelemetry.map((entry, idx) => (
                <TelemetryEntry 
                  key={entry.id || idx} 
                  entry={entry} 
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
