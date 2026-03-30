const styles = {
  header: {
    background: 'linear-gradient(135deg, #0d1117 0%, #1a0a2e 50%, #0a1628 100%)',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    padding: '22px 36px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    position: 'relative',
    overflow: 'hidden',
    flexShrink: 0,
  },
  glow: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    background: 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(139,92,246,0.1) 0%, transparent 60%)',
  },
  logo: { fontSize: '2.2rem', position: 'relative', zIndex: 1 },
  titleBlock: { position: 'relative', zIndex: 1 },
  title: {
    fontFamily: "'Outfit', sans-serif", fontSize: '1.7rem', fontWeight: 900,
    background: 'linear-gradient(135deg, #818cf8, #c084fc, #38bdf8)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  sub: { color: '#64748b', fontSize: '.8rem', marginTop: 2 },
  badge: (s) => ({
    marginLeft: 'auto', padding: '6px 18px', borderRadius: 20, fontSize: '.78rem', fontWeight: 700,
    border: '1px solid',
    position: 'relative', zIndex: 1,
    ...(s === 'running' ? { background: 'rgba(245,158,11,.12)', color: '#f59e0b', borderColor: 'rgba(245,158,11,.3)' }
      : s === 'paused'  ? { background: 'rgba(99,102,241,.15)', color: '#818cf8', borderColor: 'rgba(99,102,241,.4)' }
      : s === 'done'    ? { background: 'rgba(16,185,129,.12)', color: '#10b981', borderColor: 'rgba(16,185,129,.3)' }
      :                   { background: 'rgba(99,102,241,.08)', color: '#6366f1', borderColor: 'rgba(99,102,241,.2)' }),
  }),
}

const labels = { idle: '● Ready', running: '⚙ Running…', paused: '⏸ Awaiting Approval', done: '✅ Complete', error: '❌ Error' }

export default function Header({ status }) {
  return (
    <header style={styles.header}>
      <div style={styles.glow} />
      <div style={styles.logo}>🌍</div>
      <div style={styles.titleBlock}>
        <h1 style={styles.title}>AI Travel Concierge</h1>
        <p style={styles.sub}>3-Phase LangGraph Orchestration · Real Flights & Hotels via SerpApi</p>
      </div>
      <div style={styles.badge(status)}>{labels[status] || '●'}</div>
    </header>
  )
}
