import { useState, useRef, useCallback } from 'react'

const AGENT_KEYWORDS = {
  orchestrator:     ['Orchestrator'],
  flight_agent:     ['Flight Agent', 'IATA', 'Google Flights', 'Searching Flights', 'Route:'],
  train_agent:      ['Train Agent'],
  hotel_agent:      ['Hotel Agent', 'Google Hotels', 'Searching:'],
  weather_agent:    ['Weather Agent'],
  news_agent:       ['News Agent'],
  restaurant_agent: ['Restaurant Agent'],
  site_seeing_agent: ['Site Seeing Agent'],
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
  const [status,   setStatus]           = useState('idle')   
  const [lastPrompt, setLastPrompt]     = useState('')
  const [logs,     setLogs]             = useState([])
  const [agentStates, setAgentStates]   = useState({})
  const [scraped,  setScraped]          = useState({})
  const [hitl, setHitl]                 = useState(null)
  const [error, setError]               = useState(null)
  const [phase1Done, setPhase1Done]     = useState(false)
  const [phase2Done, setPhase2Done]     = useState(false)
  const [phase3Done, setPhase3Done]     = useState(false)
  const [isDone,   setIsDone]           = useState(false)
  const [finalItinerary, setFinal]      = useState('')
  const [timeline, setTimeline]         = useState([])
  const [messages, setMessages]         = useState([])
  const [threadList, setThreadList]     = useState([])
  const [tripDetails, setTripDetails]   = useState(null)
  
  const [allFlights, setAllFlights]     = useState([])
  const [selectedF, setSelF]           = useState(null)
  const [allHotels, setAllHotels]       = useState([])
  const [selectedH, setSelH]           = useState(null)
  
  const esRef = useRef(null)

  const addLog = useCallback((msg) => {
    setLogs(prev => [...prev.slice(-80), msg])
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
        if (Array.isArray(v)) {
          const existing = prev[k] || []
          const merged = [...existing, ...v]
          const seen = new Set()
          next[k] = merged.filter(item => {
            const id = item.id || item.flight_id || item.hotel_name || item.train_name || item.name || JSON.stringify(item)
            if (seen.has(id)) return false
            seen.add(id)
            return true
          })
        } else {
          next[k] = v
        }
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
    es.addEventListener('scraped_update', e  => {
        const data = JSON.parse(e.data);
        if (data.scraped_data) mergeScraped(data.scraped_data);
        if (data.all_flights)     setAllFlights(data.all_flights);
        if (data.selected_flight) setSelF(data.selected_flight);
        if (data.all_hotels)      setAllHotels(data.all_hotels);
        if (data.selected_hotel)  setSelH(data.selected_hotel);
    })
    es.addEventListener('timeline_update', e => {
      const data = JSON.parse(e.data)
      if (data.timeline) setTimeline(data.timeline)
    })
    es.addEventListener('itinerary_update', e => {
      const data = JSON.parse(e.data);
      if (data.itinerary) setFinal(data.itinerary);
    })

    es.addEventListener('phase_complete', e => {
      const d = JSON.parse(e.data)
      if (d.scraped_data)     mergeScraped(d.scraped_data)
      if (d.all_flights)      setAllFlights(d.all_flights)
      if (d.selected_flight)  setSelF(d.selected_flight)
      if (d.all_hotels)       setAllHotels(d.all_hotels)
      if (d.selected_hotel)   setSelH(d.selected_hotel)
      if (d.final_itinerary)  setFinal(d.final_itinerary)
      if (d.timeline)         setTimeline(d.timeline)
      if (d.trip_details)     setTripDetails(d.trip_details)

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
        setAgentStates(prev => {
          const next = { ...prev }
          Object.keys(next).forEach(k => { if (next[k] === 'running') next[k] = 'done' })
          return next
        })
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
      } else if (nextNodes.includes('phase3_hitl')) {
        setPhase3Done(true)
        setStatus('paused')
        addLog('⏸️ Phase 3 complete — awaiting your input')
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
          trip_details: tripDetails,
          thread_id: threadId 
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setThreadId(data.thread_id)
      openStream(data.thread_id)
    } catch (e) {
      setError(String(e?.message || e))
      setStatus('error')
    }
  }, [addLog, openStream, lastPrompt, threadId])

  const resume = useCallback(async (decision) => {
    if (!threadId) return
    setStatus('running')
    setHitl(null)
    addLog(`🟣 Sending input: ${String(decision).slice(0, 80)}`)
    try {
      const res = await fetch(`/api/resume/${threadId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      openStream(threadId)
    } catch (e) {
      setError(String(e?.message || e))
      setStatus('error')
    }
  }, [threadId, addLog, openStream])
  
  const retry = useCallback(async () => {
    if (!error) return
    if (!threadId) startSession()
    else openStream(threadId)
  }, [error, threadId, startSession, openStream])

  const approve = useCallback(async (_phase) => {
    await resume('yes')
  }, [resume])

  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch('/api/threads')
      const data = await res.json()
      if (data.threads) setThreadList(data.threads)
    } catch (e) {
      console.error(e)
    }
  }, [])

  const reset = useCallback(() => {
    if (esRef.current) esRef.current.close()
    setThreadId(null); setStatus('idle'); setLogs([])
    setAgentStates({}); setScraped({}); setFinal(''); setHitl(null); setError(null)
    setPhase1Done(false); setPhase2Done(false); setPhase3Done(false); setIsDone(false); setTimeline([]); setMessages([])
    setAllFlights([]); setSelF(null); setAllHotels([]); setSelH(null); setTripDetails(null)
  }, [])

  const loadThread = useCallback(async (tid) => {
    reset()
    setThreadId(tid)
    setStatus('running')
    addLog(`📂 Loading thread ${tid.substring(0,8)}...`)
    try {
      const res = await fetch(`/api/threads/${tid}`)
      if (res.status === 404) {
        localStorage.removeItem('travel_agent_thread_id')
        throw new Error('This plan has expired or no longer exists on the server.')
      }
      const data = await res.json()
      const s = data.state || {}
      setMessages(data.messages || [])
      setScraped(s.scraped_data || {})
      setAllFlights(s.all_flights || [])
      setSelF(s.selected_flight || null)
      setAllHotels(s.all_hotels || [])
      setSelH(s.selected_hotel || null)
      setTripDetails(s.trip_details || null)
      setFinal(s.final_itinerary || '')
      setTimeline(s.timeline || [])
      setLastPrompt(s.user_request || '')
      
      if (data.interrupt_payloads?.length > 0) {
        setHitl(data.interrupt_payloads[data.interrupt_payloads.length - 1])
        setStatus('paused')
      } else if (s.final_itinerary) {
        setStatus('done')
        setIsDone(true)
      } else {
        setStatus('idle')
      }
    } catch (e) {
      setError(String(e))
      setStatus('error')
    }
  }, [reset, addLog])

  return { 
    threadId, status, error, hitl, logs, agentStates, scraped, timeline, 
    allFlights, selectedF, allHotels, selectedH, tripDetails,
    phase1Done, phase2Done, phase3Done, isDone, finalItinerary, messages, threadList,
    startSession, approve, resume, reset, retry, fetchThreads, loadThread 
  }
}
