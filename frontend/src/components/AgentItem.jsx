import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const s = {
  item: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 16px', marginBottom: 10,
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 14, transition: 'all .3s',
    position: 'relative', overflow: 'hidden',
  },
  icon: { fontSize: '1.4rem', zIndex: 2 },
  info: { flex: 1, zIndex: 2 },
  name: {
    fontFamily: "'Playfair Display', sans-serif", fontSize: '.9rem', fontWeight: 700,
    color: '#e2e8f0', marginBottom: 2,
  },
  sub: { fontSize: '.75rem', color: '#64748b', lineHeight: 1.3 },
  status: {
    padding: '4px 10px', borderRadius: 20, fontSize: '.7rem', fontWeight: 800,
    textTransform: 'uppercase', letterSpacing: '.05em', zIndex: 2,
  },
  statusRunning: {
    background: 'rgba(245,158,11,.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,.3)',
  },
  statusDone: {
    background: 'rgba(16,185,129,.15)', color: '#10b981', border: '1px solid rgba(16,185,129,.3)',
  },
  statusError: {
    background: 'rgba(239,68,68,.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,.3)',
  },
  statusIdle: {
    background: 'rgba(255,255,255,.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,.1)',
  },
  pulse: {
    width: 6, height: 6, borderRadius: '50%', background: '#f59e0b',
    marginRight: 6,
  },
  glow: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(90deg, transparent, rgba(85,107,47,0.05), transparent)',
    zIndex: 1,
  }
}

const STATUS_CONFIG = {
  running: { label: 'Active', style: s.statusRunning },
  done:    { label: 'Ready',  style: s.statusDone },
  error:   { label: 'Error',  style: s.statusError },
  idle:    { label: 'Idle',   style: s.statusIdle },
}

export default function AgentItem({ agent, state }) {
  const statusConfig = STATUS_CONFIG[state] || STATUS_CONFIG.idle

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.04)' }}
      style={{
        ...s.item,
        ...(state === 'running' && {
          borderColor: 'rgba(245,158,11,.3)',
          background: 'rgba(245,158,11,.03)',
        }),
        ...(state === 'done' && {
            borderColor: 'rgba(16,185,129,.2)',
        })
      }}
    >
      <AnimatePresence>
        {state === 'running' && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            style={s.glow}
          />
        )}
      </AnimatePresence>

      <div style={s.icon}>{agent.icon}</div>
      <div style={s.info}>
        <div style={s.name}>{agent.name}</div>
        <div style={s.sub}>{agent.sub}</div>
      </div>
      
      <div style={{ ...s.status, ...statusConfig.style }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
            {state === 'running' && (
                <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    style={s.pulse}
                />
            )}
            {statusConfig.label}
        </div>
      </div>
    </motion.div>
  )
}
