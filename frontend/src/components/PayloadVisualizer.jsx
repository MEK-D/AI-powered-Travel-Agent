import React from 'react'

const s = {
  container: {
    padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)',
    maxHeight: '60vh', overflowY: 'auto',
  },
  section: {
    marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  label: {
    fontSize: '.75rem', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 12,
    display: 'flex', alignItems: 'center', gap: 8,
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16,
  },
  card: {
    padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  cardTitle: {
    fontWeight: 800, fontSize: '1rem', color: '#e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  cardSub: {
    fontSize: '.85rem', color: '#94a3b8', lineHeight: 1.5,
  },
  field: {
    display: 'flex', gap: 8, fontSize: '.8rem',
  },
  fieldName: {
    color: '#64748b', minWidth: 100, fontWeight: 700,
  },
  fieldValue: {
    color: '#cbd5e1', flex: 1,
  },
  badge: {
     display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: '.7rem', fontWeight: 700,
     background: 'rgba(16,185,129,0.15)', color: '#10b981',
  },
  tagContainer: {
    display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4,
  },
  tag: {
    background: 'rgba(99,102,241,0.1)', color: '#818cf8',
    padding: '2px 8px', borderRadius: 6, fontSize: '.7rem', fontWeight: 600,
  },
  weatherCard: {
    display: 'flex', flexDirection: 'column', gap: 4, padding: 12, background: 'rgba(14,165,233,0.05)', borderRadius: 10, border: '1px solid rgba(14,165,233,0.1)',
  }
}

export default function PayloadVisualizer({ payload }) {
  if (!payload) return null
  
  const { phase, ...data } = payload
  
  const renderField = (name, value) => {
    if (value === undefined || value === null || value === '') return null
    return (
      <div style={s.field} key={name}>
        <div style={s.fieldName}>{name}:</div>
        <div style={s.fieldValue}>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</div>
      </div>
    )
  }

  // --- Specialized Renderers ---

  if (phase === 'orchestrator') {
    return (
      <div style={s.container}>
        <div style={s.section}>
          <div style={s.label}>Required Agents</div>
          <div style={s.tagContainer}>
            {data.required_agents?.map(a => <span key={a} style={{...s.tag, padding: '4px 10px', fontSize: '.8rem'}}>{a.replace('_agent', '')}</span>)}
          </div>
        </div>
        <div style={s.section}>
           <div style={s.label}>Execution Plan</div>
           <div style={s.grid}>
             {Object.entries(data.agent_tasks || {}).map(([ag, task]) => (
               <div key={ag} style={s.card}>
                 <div style={s.cardTitle}>{ag.replace('_agent', '').toUpperCase()}</div>
                 <div style={s.cardSub}>{task.goal || task.description}</div>
                 {Object.entries(task).map(([k, v]) => {
                    if (k === 'goal' || k === 'description') return null
                    return renderField(k, v)
                 })}
               </div>
             ))}
           </div>
        </div>
      </div>
    )
  }

  if (phase === 'transport') {
    return (
      <div style={s.container}>
         <div style={s.section}>
            <div style={s.label}>✈️ Flight Options <span style={s.badge}>{data.flights?.length || 0}</span></div>
            <div style={s.grid}>
                {data.flights?.map((f, i) => (
                    <div key={i} style={s.card}>
                        <div style={s.cardTitle}>
                            <span>{f.airline}</span>
                            <span style={{color: '#10b981'}}>${f.cost || f.price_usd}</span>
                        </div>
                        <div style={{...s.fieldValue, fontWeight: 700, marginBottom: 4}}>
                            {f.departure} → {f.arrival}
                        </div>
                        {renderField('Timing', f.timing_notes)}
                        {renderField('Details', f.details)}
                        {renderField('Duration', f.duration)}
                    </div>
                ))}
            </div>
         </div>
         {data.trains?.length > 0 && (
           <div style={s.section}>
              <div style={s.label}>🚆 Train Options <span style={s.badge}>{data.trains.length}</span></div>
              <div style={s.grid}>
                  {data.trains.map((t, i) => (
                      <div key={i} style={s.card}>
                          <div style={s.cardTitle}>
                              <span>{t.train_name}</span>
                              <span style={{color: '#10b981'}}>₹{t.cost}</span>
                          </div>
                          <div style={{...s.fieldValue, fontWeight: 700, marginBottom: 4}}>
                              {t.departure} → {t.arrival} ({t.duration})
                          </div>
                          {renderField('Details', t.details)}
                      </div>
                  ))}
              </div>
           </div>
         )}
      </div>
    )
  }

  if (phase === 'basecamp') {
    return (
      <div style={s.container}>
         <div style={s.section}>
            <div style={s.label}>🏨 Hotel Options <span style={s.badge}>{data.hotels?.length || 0}</span></div>
            <div style={s.grid}>
                {data.hotels?.map((h, i) => (
                    <div key={i} style={s.card}>
                        <div style={s.cardTitle}>
                            <span>{h.name}</span>
                            <span style={{color: '#10b981'}}>${h.cost_per_night}/nt</span>
                        </div>
                        <div style={s.cardSub}>{h.details}</div>
                        {renderField('Vibe', h.vibe)}
                        {renderField('Rating', h.rating)}
                        {renderField('Location', h.location)}
                        {h.gps_coordinates && renderField('GPS', `${h.gps_coordinates.latitude}, ${h.gps_coordinates.longitude}`)}
                        {h.nearby_places?.length > 0 && (
                            <div style={{marginTop: 4}}>
                                <div style={s.fieldName}>Nearby:</div>
                                <div style={s.tagContainer}>
                                    {h.nearby_places.map((p, j) => <span key={j} style={s.tag}>{p}</span>)}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
         </div>
         <div style={s.grid}>
             <div style={s.section}>
                <div style={s.label}>🌦 Weather Forecast</div>
                <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                    {data.weather?.map((w, i) => (
                        <div key={i} style={s.weatherCard}>
                            <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '.9rem'}}>
                                <span>{w.date}</span>
                                <span>{w.max_temp}{w.symbol} / {w.min_temp}{w.symbol}</span>
                            </div>
                            <div style={{fontSize: '.85rem', color: '#e2e8f0'}}>{w.conditions}</div>
                            <div style={{fontSize: '.8rem', color: '#94a3b8', fontStyle: 'italic'}}>{w.travel_advice}</div>
                        </div>
                    ))}
                </div>
             </div>
             <div style={s.section}>
                <div style={s.label}>📰 Local News</div>
                <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
                    {data.news?.map((n, i) => (
                        <div key={i} style={{...s.card, padding: 12}}>
                            <div style={s.cardSub}>{typeof n === 'string' ? n : n.headline}</div>
                        </div>
                    ))}
                </div>
             </div>
         </div>
      </div>
    )
  }

  if (phase === 'activities') {
    const sites = data.sites || data.sightseeing || []
    return (
      <div style={s.container}>
         <div style={s.section}>
            <div style={s.label}>🍽️ Restaurant Recommendations <span style={s.badge}>{data.restaurants?.length || 0}</span></div>
            <div style={s.grid}>
                {data.restaurants?.map((r, i) => (
                    <div key={i} style={s.card}>
                        <div style={s.cardTitle}>
                            <span>{r.name}</span>
                            <span style={{color: '#f59e0b'}}>{r.rating} ⭐</span>
                        </div>
                        <div style={s.cardSub}>{r.details || r.description}</div>
                        {renderField('Type', r.type)}
                        {renderField('Price', r.price_range)}
                        {renderField('Address', r.address)}
                        {r.features && (
                            <div style={s.tagContainer}>
                                {r.features.map((f, j) => <span key={j} style={s.tag}>{f}</span>)}
                            </div>
                        )}
                    </div>
                ))}
            </div>
         </div>
         <div style={s.section}>
            <div style={s.label}>🏛️ Sightseeing & Attractions <span style={s.badge}>{sites.length}</span></div>
            <div style={s.grid}>
                {sites.map((site, i) => (
                    <div key={i} style={s.card}>
                        <div style={s.cardTitle}>{site.name}</div>
                        <div style={s.cardSub}>{site.details || site.description}</div>
                        {renderField('Category', site.category || site.type)}
                        {renderField('Address', site.address)}
                        {renderField('Vibe', site.vibe)}
                        {renderField('Entry Fee', site.entry_fee)}
                        {renderField('Hours', site.opening_times)}
                        {renderField('Tips', site.suggestions)}
                    </div>
                ))}
            </div>
         </div>
      </div>
    )
  }

  if (phase === 'itinerary') {
    return (
      <div style={s.container}>
        <div style={s.section}>
          <div style={s.label}>🗺️ Final Itinerary Draft</div>
          <div style={{
            ...s.card,
            padding: 20,
            background: 'rgba(99,102,241,0.03)',
            border: '1px solid rgba(99,102,241,0.1)',
            fontFamily: "'Courier New', monospace",
            fontSize: '.85rem',
            lineHeight: 1.6,
            color: '#e2e8f0',
            whiteSpace: 'pre',
            overflowX: 'auto'
          }}>
            {data.itinerary}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={s.container}>
       <pre style={{...s.fieldValue, fontSize: '.7rem', opacity: 0.7}}>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}
