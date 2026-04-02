import { useState, useEffect, useRef } from 'react'

const s = {
  logContainer: {
    flex: 1, overflowY: 'auto', fontFamily: "'Courier New', monospace", fontSize: '.72rem', lineHeight: 1.8,
  },
  logLine: (isLatest, isTyping) => ({
    color: isLatest ? '#06b6d4' : '#64748b',
    padding: '2px 0',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    opacity: isTyping ? 0.7 : 1,
    transition: 'opacity 0.3s',
    animation: isLatest ? 'slideIn 0.3s ease-out' : 'none',
  }),
  cursor: {
    display: 'inline-block',
    width: 8, height: 16,
    background: '#06b6d4',
    marginLeft: 2,
    animation: 'blink 1s infinite',
  },
}

export default function AnimatedLog({ logs }) {
  const [displayedLogs, setDisplayedLogs] = useState([])
  const [isTyping, setIsTyping] = useState(false)
  const logRef = useRef(null)

  useEffect(() => {
    if (logs.length > displayedLogs.length) {
      const newLog = logs[logs.length - 1]
      setIsTyping(true)
      
      // Simulate typing effect for the new log
      let currentIndex = 0
      const typingInterval = setInterval(() => {
        if (currentIndex <= newLog.length) {
          setDisplayedLogs(prev => [
            ...prev.slice(0, -1),
            newLog.slice(0, currentIndex)
          ])
          currentIndex++
        } else {
          clearInterval(typingInterval)
          setIsTyping(false)
        }
      }, 20)

      return () => clearInterval(typingInterval)
    }
  }, [logs, displayedLogs.length])

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [displayedLogs])

  return (
    <div style={s.logContainer} ref={logRef}>
      {displayedLogs.length === 0 ? (
        <div style={{ color: '#334155', fontSize: '.75rem' }}>Waiting for session…</div>
      ) : (
        displayedLogs.map((log, i) => (
          <div key={i} style={s.logLine(i === displayedLogs.length - 1, isTyping && i === displayedLogs.length - 1)}>
            {log}
            {isTyping && i === displayedLogs.length - 1 && <span style={s.cursor} />}
          </div>
        ))
      )}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0,
            transform: translateY(10px);
          }
          to {
            opacity: 0.7,
            transform: translateY(0);
          }
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
