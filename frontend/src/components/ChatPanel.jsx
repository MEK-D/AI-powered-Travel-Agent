import { useState, useRef, useEffect } from 'react'

const s = {
  chatContainer: {
    display: 'flex', flexDirection: 'column', height: '100%',
    background: 'rgba(10, 15, 26, 0.5)', borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.05)',
  },
  messagesContainer: {
    flex: 1, padding: 20, overflowY: 'auto',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  message: (isUser) => ({
    maxWidth: '70%',
    padding: '12px 16px',
    borderRadius: 16,
    fontFamily: "'Inter', sans-serif", fontSize: '.9rem',
    lineHeight: 1.5,
    ...(isUser ? {
      background: 'linear-gradient(135deg, #556B2F, #3e4f20)',
      color: '#fff',
      alignSelf: 'flex-end',
      borderBottomRightRadius: 4,
    } : {
      background: 'rgba(255,255,255,0.05)',
      color: '#e2e8f0',
      border: '1px solid rgba(255,255,255,0.08)',
      alignSelf: 'flex-start',
      borderBottomLeftRadius: 4,
    }),
  }),
  inputContainer: {
    padding: 20, borderTop: '1px solid rgba(255,255,255,0.07)',
    background: 'rgba(13, 17, 23, 0.8)',
    borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
  },
  inputWrapper: {
    display: 'flex', gap: 12, alignItems: 'flex-end',
  },
  input: (disabled) => ({
    flex: 1,
    background: disabled ? 'rgba(255,255,255,0.02)' : '#0a0a00',
    border: disabled ? '1px solid rgba(255,255,255,0.03)' : '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    color: disabled ? '#64748b' : '#e2e8f0',
    fontFamily: "'Inter', sans-serif", fontSize: '.9rem',
    padding: '12px 16px', resize: 'none', minHeight: 44, maxHeight: 120,
    outline: 'none', transition: 'all .2s',
    cursor: disabled ? 'not-allowed' : 'text',
    '&:focus': {
      borderColor: disabled ? 'rgba(255,255,255,0.03)' : '#556B2F',
      boxShadow: disabled ? 'none' : '0 0 0 3px rgba(85,107,47,0.1)',
    },
  }),
  sendButton: (disabled) => ({
    padding: '12px 20px', border: 'none', borderRadius: 12,
    background: disabled ? 'rgba(85,107,47,0.2)' : 'linear-gradient(135deg, #556B2F, #3e4f20)',
    color: '#fff', fontFamily: "'Playfair Display', sans-serif", fontSize: '.9rem', fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all .3s', opacity: disabled ? 0.5 : 1,
    boxShadow: disabled ? 'none' : '0 4px 20px rgba(85,107,47,0.3)',
  }),
  statusIndicator: {
    padding: '8px 16px', borderRadius: 20, fontSize: '.8rem', fontWeight: 600,
    marginBottom: 12, textAlign: 'center',
  },
  statusActive: {
    background: 'rgba(245,158,11,.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,.3)',
  },
  statusInactive: {
    background: 'rgba(16,185,129,.15)', color: '#10b981', border: '1px solid rgba(16,185,129,.3)',
  },
  placeholderMessage: {
    textAlign: 'center', color: '#64748b', fontSize: '.9rem',
    fontFamily: "'Inter', sans-serif", padding: 40,
  },
}

export default function ChatPanel({ status, isDone }) {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)

  const isInputDisabled = status === 'running' || (status !== 'paused' && status !== 'done' && status !== 'idle')

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = () => {
    if (!inputValue.trim() || isInputDisabled) return

    const userMessage = { id: Date.now(), text: inputValue, isUser: true, timestamp: new Date() }
    setMessages(prev => [...prev, userMessage])
    setInputValue('')

    // Simulate agent response
    setIsTyping(true)
    setTimeout(() => {
      const agentResponse = {
        id: Date.now() + 1,
        text: `I received your message: "${inputValue}". The chat interface is currently in ${status} mode. This is a demo response.`,
        isUser: false,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, agentResponse])
      setIsTyping(false)
    }, 1500)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={s.chatContainer}>
      <div style={s.messagesContainer}>
        {messages.length === 0 ? (
          <div style={s.placeholderMessage}>
            <div style={{ fontSize: '2rem', marginBottom: 16 }}>🖋️</div>
            <div>Chat with your TravelEase</div>
            <div style={{ fontSize: '.8rem', marginTop: 8, color: '#475569' }}>
              {isInputDisabled 
                ? 'Chat is disabled while agents are working. Please wait...' 
                : 'Type your message below to get started.'
              }
            </div>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <div key={msg.id} style={s.message(msg.isUser)}>
                {msg.text}
              </div>
            ))}
            {isTyping && (
              <div style={s.message(false)}>
                <span>Agent is typing</span>
                <span style={{ marginLeft: 4 }}>
                  <span style={{ animation: 'blink 1s infinite' }}>●</span>
                  <span style={{ animation: 'blink 1s infinite 0.3s' }}>●</span>
                  <span style={{ animation: 'blink 1s infinite 0.6s' }}>●</span>
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div style={s.inputContainer}>
        <div style={{
          ...s.statusIndicator,
          ...(isInputDisabled ? s.statusActive : s.statusInactive)
        }}>
          {isInputDisabled ? '🔴 Agents Working - Chat Disabled' : '🟢 Chat Active'}
        </div>
        
        <div style={s.inputWrapper}>
          <textarea
            style={s.input(isInputDisabled)}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isInputDisabled ? 'Chat disabled while agents are working...' : 'Type your message...'}
            disabled={isInputDisabled}
            rows={1}
          />
          <button
            style={s.sendButton(isInputDisabled || !inputValue.trim())}
            onClick={handleSend}
            disabled={isInputDisabled || !inputValue.trim()}
          >
            Send
          </button>
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
