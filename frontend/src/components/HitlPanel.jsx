import { useMemo, useState } from 'react'
import PayloadVisualizer from './PayloadVisualizer'
import { motion } from 'framer-motion'

const s = {
  panel: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.06)',
    padding: 24,
  },
  title: {
    fontFamily: "'Playfair Display', sans-serif",
    fontSize: '1.2rem',
    fontWeight: 800,
    color: '#e2e8f0',
    marginBottom: 12,
  },
  message: {
    background: 'rgba(85,107,47,0.08)',
    border: '1px solid rgba(85,107,47,0.18)',
    borderRadius: 12,
    padding: 14,
    color: '#c7d2fe',
    fontSize: '.9rem',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    marginBottom: 16,
  },
  meta: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 12,
    marginBottom: 16,
  },
  card: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 12,
  },
  cardTitle: {
    fontSize: '.72rem',
    color: '#64748b',
    fontWeight: 800,
    letterSpacing: '.08em',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  json: {
    fontFamily: "'Courier New', monospace",
    fontSize: '.75rem',
    color: '#94a3b8',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: 1.5,
    maxHeight: 220,
    overflow: 'auto',
  },
  input: (disabled) => ({
    width: '100%',
    background: disabled ? 'rgba(255,255,255,0.02)' : '#0a0a00',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    color: '#e2e8f0',
    fontFamily: "'Inter', sans-serif",
    fontSize: '.9rem',
    padding: '12px 14px',
    outline: 'none',
    resize: 'vertical',
    minHeight: 90,
    opacity: disabled ? 0.6 : 1,
  }),
  actions: {
    display: 'flex',
    gap: 10,
    marginTop: 12,
  },
  btn: (kind, disabled) => ({
    flex: 1,
    padding: '12px 12px',
    border: 'none',
    borderRadius: 12,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: "'Playfair Display', sans-serif",
    fontWeight: 800,
    letterSpacing: '.02em',
    opacity: disabled ? 0.6 : 1,
    ...(kind === 'primary'
      ? { background: 'linear-gradient(135deg, #556B2F, #3e4f20)', color: '#fff' }
      : { background: 'rgba(239,68,68,0.16)', color: '#fecaca', border: '1px solid rgba(239,68,68,0.25)' }),
  }),
  hint: {
    marginTop: 10,
    fontSize: '.8rem',
    color: '#64748b',
    lineHeight: 1.4,
  },
}

export default function HitlPanel({ hitl, onSend, disabled }) {
  const [text, setText] = useState('')

  const phaseTitle = useMemo(() => {
    const p = hitl?.phase
    if (!p) return 'Awaiting Input'
    if (p === 'orchestrator') return '♟️ Orchestrator Approval'
    if (p === 'transport') return '🛩️🚂 Transport Review'
    if (p === 'basecamp') return '🛖🌦��️ Basecamp Review'
    if (p === 'activities') return '🍷🏛 Activities Review'
    if (p === 'itinerary') return '📜 Itinerary Review'
    return `Phase: ${p}`
  }, [hitl])

  const payloadPreview = useMemo(() => {
    if (!hitl) return null
    if (hitl.phase === 'itinerary') return null // Suppress rendering the huge itinerary here
    return hitl
  }, [hitl])

  const handleApprove = async () => {
    await onSend('yes')
    setText('')
  }

  const handleStop = async () => {
    await onSend('no')
    setText('')
  }

  const handleFeedback = async () => {
    if (!text.trim()) return
    await onSend(text.trim())
    setText('')
  }

  return (
    <div style={s.panel}>
      <div style={s.title}>{phaseTitle}</div>

      <div style={s.message}>
        {hitl?.message || 'The graph is waiting for your input.'}
      </div>

      {payloadPreview && (
        <div style={s.meta}>
          <div style={{...s.card, width: '100%'}}>
            <div style={s.cardTitle}>Phase Data Summary</div>
            <PayloadVisualizer payload={payloadPreview} />
          </div>
        </div>
      )}

      <textarea
        style={s.input(disabled)}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        placeholder="Give feedback (e.g. cheaper flights, different dates, change destination). The LLM will decide to proceed / retry / go back to orchestrator."
      />

      <div style={s.actions}>
        <button style={s.btn('primary', disabled)} disabled={disabled} onClick={handleApprove}>
          Approve / Continue
        </button>
        <button style={s.btn('danger', disabled)} disabled={disabled} onClick={handleStop}>
          Stop
        </button>
      </div>

      <div style={s.actions}>
        <button
          style={s.btn('primary', disabled || !text.trim())}
          disabled={disabled || !text.trim()}
          onClick={handleFeedback}
        >
          Send Feedback
        </button>
      </div>

      <div style={s.hint}>
        - **Approve / Continue** sends `yes`.
        - **Stop** sends `no`.
        - **Send Feedback** sends your text; the LLM will decide whether to rerun this phase, go back to orchestrator, or proceed.
      </div>
    </div>
  )
}
