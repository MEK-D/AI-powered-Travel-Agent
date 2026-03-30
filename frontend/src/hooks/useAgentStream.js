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
  const [logs,     setLogs]             = useState([])
  const [agentStates, setAgentStates]   = useState({})
  const [scraped,  setScraped]          = useState({})
  const [phase1Done, setPhase1Done]     = useState(false)
  const [phase2Done, setPhase2Done]     = useState(false)
  const [isDone,   setIsDone]           = useState(false)
  const [finalItinerary, setFinal]      = useState('')
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
    const es = new EventSource(`/api/stream/${tid}`)
    esRef.current = es

    es.addEventListener('connected',      () => addLog('🔗 Connected to agent stream'))
    es.addEventListener('agent_log',      e  => addLog(JSON.parse(e.data).message))
    es.addEventListener('scraped_update', e  => mergeScraped(JSON.parse(e.data).scraped_data || {}))

    es.addEventListener('phase_complete', e => {
      const d = JSON.parse(e.data)
      if (d.scraped_data)     mergeScraped(d.scraped_data)
      if (d.final_itinerary)  setFinal(d.final_itinerary)

      const nextNodes = d.next_nodes || []

      if (d.is_done || nextNodes.length === 0) {
        setIsDone(true)
        setStatus('done')
        addLog('🎉 Trip planning complete!')
        es.close()
      } else if (nextNodes.includes('phase1_approval')) {
        setPhase1Done(true)
        setStatus('paused')
        setAgentStates(prev => ({ ...prev, orchestrator: 'done', flight_agent: 'done' }))
        addLog('⏸️ Phase 1 complete — awaiting your approval')
        es.close()
      } else if (nextNodes.includes('phase2_approval')) {
        setPhase2Done(true)
        setStatus('paused')
        setAgentStates(prev => ({ ...prev, hotel_agent: 'done', weather_agent: 'done', news_agent: 'done' }))
        addLog('⏸️ Phase 2 complete — awaiting your approval')
        es.close()
      }
    })

    es.addEventListener('stream_end', () => { es.close(); addLog('📡 Stream closed') })
    es.addEventListener('error',      e => { if (e.data) addLog('❌ ' + JSON.parse(e.data).message) })
    es.onerror = () => addLog('⚠️ SSE connection issue...')
  }, [addLog, mergeScraped])

  const startSession = useCallback(async (prompt) => {
    setStatus('running')
    setAgentStates({ orchestrator: 'running' })
    addLog('🚀 Starting session...')

    const res  = await fetch('/api/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
    const data = await res.json()
    setThreadId(data.thread_id)
    addLog(`📡 Thread: ${data.thread_id.substring(0, 8)}...`)
    openStream(data.thread_id)
  }, [addLog, openStream])

  const approve = useCallback(async (phase) => {
    if (!threadId) return
    setStatus('running')
    addLog(`✅ Phase ${phase} approved — resuming graph...`)

    if (phase === 1) setAgentStates(prev => ({ ...prev, hotel_agent: 'running', weather_agent: 'running', news_agent: 'running' }))
    if (phase === 2) setAgentStates(prev => ({ ...prev, restaurant_agent: 'running', itinerary_agent: 'running' }))

    await fetch(`/api/approve/${threadId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase }),
    })
    openStream(threadId)
  }, [threadId, addLog, openStream])

  const reset = useCallback(() => {
    if (esRef.current) esRef.current.close()
    setThreadId(null); setStatus('idle'); setLogs([])
    setAgentStates({}); setScraped({}); setFinal('')
    setPhase1Done(false); setPhase2Done(false); setIsDone(false)
  }, [])

  return { threadId, status, logs, agentStates, scraped, phase1Done, phase2Done, isDone, finalItinerary, startSession, approve, reset }
}
