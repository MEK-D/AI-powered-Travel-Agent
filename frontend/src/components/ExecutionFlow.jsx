import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const s = {
  wrap: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  title: {
    fontFamily: "'Playfair Display', sans-serif",
    fontWeight: 900,
    fontSize: '.9rem',
    color: '#e2e8f0',
    marginBottom: 10,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxHeight: 240,
    overflow: 'auto',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '110px 1fr 110px',
    gap: 10,
    alignItems: 'center',
  },
  pill: (tone) => ({
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: '.72rem',
    fontWeight: 900,
    letterSpacing: '.02em',
    textTransform: 'uppercase',
    border: '1px solid rgba(255,255,255,0.08)',
    ...(tone === 'from'
      ? { background: 'rgba(85,107,47,0.10)', color: '#c7d2fe' }
      : tone === 'to'
        ? { background: 'rgba(16,185,129,0.10)', color: '#bbf7d0' }
        : { background: 'rgba(255,255,255,0.04)', color: '#94a3b8' }),
  }),
  msg: {
    fontSize: '.82rem',
    color: '#94a3b8',
    lineHeight: 1.35,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  arrow: {
    color: '#475569',
    textAlign: 'center',
    fontWeight: 900,
  },
}

function shortAgent(a) {
  if (!a) return 'system'
  return a.replace('_agent', '').replace('_', ' ')
}

export default function ExecutionFlow({ timeline = [] }) {
  const items = useMemo(() => timeline.slice(-12).reverse(), [timeline])

  return (
    <div style={s.wrap}>
      <div style={s.title}>🔁 Execution Flow</div>
      <div style={s.list}>
        <AnimatePresence initial={false}>
          {items.map((it) => (
            <motion.div
              key={it.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div style={s.row}>
                <div style={s.pill('from')}>{shortAgent(it.from)}</div>
                <div style={s.msg} title={it.message}>{it.message}</div>
                <div style={s.pill('to')}>{shortAgent(it.to)}</div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
