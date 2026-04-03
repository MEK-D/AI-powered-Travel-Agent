import { useState, useRef, useCallback } from 'react'

const AGENT_KEYWORDS = {
  orchestrator:     ['Orchestrator'],
  flight_agent:     ['Flight Agent', 'IATA', 'Google Flights', 'Searching Flights', 'Route:'],
  train_agent:      ['Train Agent'],
  hotel_agent:      ['Hotel Agent', 'Google Hotels', 'Searching:'],
  weather_agent:    ['Weather Agent'],
  news_agent:       ['News Agent'],
  restaurant_agent: ['Restaurant Agent'],
  itinerary_agent:  ['Itinerary Agent'],
}

function detectAgent(msg) {
  for (const [id, keys] of Object.entries(AGENT_KEYWORDS)) {
    if (keys.some(k => msg.includes(k))) return id
  }
  return null
}

export function useAgentStream({ onFlights, onHotels } = {}) {
  const [threadId, setThreadId]         = useState(null)
  const [status,   setStatus]           = useState('idle')   // idle | running | paused | done | error
  const [lastPrompt, setLastPrompt]     = useState('')
  const [logs,     setLogs]             = useState([])
  const [agentStates, setAgentStates]   = useState({})
  const [scraped,  setScraped]          = useState({})
  const [hitl, setHitl]                 = useState(null)
  const [error, setError]               = useState(null)
  const [phase1Done, setPhase1Done]     = useState(false)
  const [phase2Done, setPhase2Done]     = useState(false)
  const [isDone,   setIsDone]           = useState(false)
  const [finalItinerary, setFinal]      = useState('')
  const [timeline, setTimeline]         = useState([])
  const esRef = useRef(null)

  const addLog = useCallback((msg) => {
    setLogs(prev => [...prev.slice(-80), msg])
    // update agent state based on message content
    const agId = detectAgent(msg)
    if (agId) {
      setAgentStates(prev => {
        if (prev[agId] !== 'done') return { ...prev, [agId]: 'running' }
        return prev
      })
    }
    if (msg.startsWith('✅') && agId) {
      setAgentStates(prev => ({ ...prev, [agId]: 'done' }))
    }
    if (msg.includes('❌') && agId) {
      setAgentStates(prev => ({ ...prev, [agId]: 'error' }))
    }
  }, [])

  const mergeScraped = useCallback((incoming) => {
    setScraped(prev => {
      const next = { ...prev }
      for (const [k, v] of Object.entries(incoming)) {
        next[k] = Array.isArray(prev[k]) && Array.isArray(v) ? [...prev[k], ...v] : v
      }
      return next
    })
    if (incoming.flights) onFlights?.(incoming.flights)
    if (incoming.hotels)  onHotels?.(incoming.hotels)
  }, [onFlights, onHotels])

  const openStream = useCallback((tid) => {
    if (esRef.current) esRef.current.close()
    setError(null)
    const es = new EventSource(`/api/stream/${tid}`)
    esRef.current = es

    es.addEventListener('connected',      () => addLog('🔗 Connected to agent stream'))
    es.addEventListener('agent_log',      e  => addLog(JSON.parse(e.data).message))
    es.addEventListener('scraped_update', e  => mergeScraped(JSON.parse(e.data).scraped_data || {}))
    es.addEventListener('timeline_update', e => {
      const data = JSON.parse(e.data)
      if (data.timeline) setTimeline(data.timeline)
    })

    es.addEventListener('phase_complete', e => {
      const d = JSON.parse(e.data)
      if (d.scraped_data)     mergeScraped(d.scraped_data)
      if (d.final_itinerary)  setFinal(d.final_itinerary)
      if (d.timeline)         setTimeline(d.timeline)

      const interruptPayloads = d.interrupt_payloads || []
      if (interruptPayloads.length > 0) {
        setHitl(interruptPayloads[interruptPayloads.length - 1])
      } else {
        setHitl(null)
      }

      const nextNodes = d.next_nodes || []

      if (d.is_done || nextNodes.length === 0) {
        setIsDone(true)
        setStatus('done')
        addLog('🎉 Trip planning complete!')
        es.close()
      } else if (nextNodes.includes('orchestrator_hitl')) {
        setStatus('paused')
        setAgentStates(prev => ({ ...prev, orchestrator: 'done' }))
        addLog('⏸️ Orchestrator plan ready — awaiting your input')
        es.close()
      } else if (nextNodes.includes('phase1_hitl')) {
        setPhase1Done(true)
        setStatus('paused')
        addLog('⏸️ Phase 1 complete — awaiting your input')
        es.close()
      } else if (nextNodes.includes('phase2_hitl')) {
        setPhase2Done(true)
        setStatus('paused')
        addLog('⏸️ Phase 2 complete — awaiting your input')
        es.close()
      } else {
        setStatus('running')
      }
    })

    es.addEventListener('stream_end', () => { es.close(); addLog('📡 Stream closed') })
    es.addEventListener('error',      e => {
      try {
        if (e.data) addLog('❌ ' + JSON.parse(e.data).message)
      } catch {
        addLog('❌ Stream error')
      }
    })
    es.onerror = () => {
      setError('SSE connection issue. Is the backend running?')
      setStatus('error')
      addLog('⚠️ SSE connection issue...')
    }
  }, [addLog, mergeScraped])

  const startSession = useCallback(async (prompt, tripDetails) => {
    const actualPrompt = prompt || lastPrompt
    if (!actualPrompt) return
    setLastPrompt(actualPrompt)
    setStatus('running')
    setAgentStates({ orchestrator: 'running' })
    setHitl(null)
    setError(null)
    addLog('🚀 Starting session...')

    try {
      const res  = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: actualPrompt,
          trip_details: tripDetails 
        }),
      })
      if (!res.ok) {
        const t = await res.text()
        throw new Error(t || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setThreadId(data.thread_id)
      addLog(`📡 Thread: ${data.thread_id.substring(0, 8)}...`)
      openStream(data.thread_id)
    } catch (e) {
      setError(String(e?.message || e))
      setStatus('error')
      addLog('❌ Failed to start session')
    }
  }, [addLog, openStream])

  const resume = useCallback(async (decision) => {
    if (!threadId) return
    setStatus('running')
    setError(null)
    setHitl(null)
    addLog(`🟣 Sending input: ${String(decision).slice(0, 80)}`)
    try {
      const res = await fetch(`/api/resume/${threadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      })
      if (!res.ok) {
        const t = await res.text()
        throw new Error(t || `HTTP ${res.status}`)
      }
      openStream(threadId)
    } catch (e) {
      setError(String(e?.message || e))
      setStatus('error')
      addLog('❌ Failed to resume graph')
    }
  }, [threadId, addLog, openStream])
  
  const retry = useCallback(async () => {
    if (!error) return
    if (!threadId) {
      // Re-start if it failed during start
      addLog('🔄 Retrying start...')
      startSession() // This might need the last prompt, let's store it
    } else {
      addLog('🔄 Retrying resume...')
      // We don't have the last decision, but usually it's during a resume
      openStream(threadId)
    }
  }, [error, threadId, addLog, startSession, openStream])


  // Backward compatibility: approve maps to resume('yes')
  const approve = useCallback(async (_phase) => {
    await resume('yes')
  }, [resume])

  const reset = useCallback(() => {
    if (esRef.current) esRef.current.close()
    setThreadId(null); setStatus('idle'); setLogs([])
    setAgentStates({}); setScraped({}); setFinal(''); setHitl(null); setError(null)
    setPhase1Done(false); setPhase2Done(false); setIsDone(false); setTimeline([])
  }, [])

  return { threadId, status, error, hitl, logs, agentStates, scraped, timeline, phase1Done, phase2Done, isDone, finalItinerary, startSession, approve, resume, reset, retry }
}
