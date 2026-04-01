"""
test.py — 3-Phase Human-in-the-Loop LangGraph Travel Concierge
================================================================
Phase 1 → flight_agent (REAL) / train_agent (REAL)  → interrupt
Phase 2 → hotel_agent (REAL) + weather_agent + news_agent (REAL, parallel) → interrupt
Phase 3 → restaurant_agent → itinerary_agent  (sequential)
"""

from __future__ import annotations
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.constants import Send
from dotenv import load_dotenv
import langchain

from agents.flight import flight_agent
from agents.hotel import hotel_agent
from agents.itinerary import itinerary_agent
from agents.road import road_agent
from agents.news import news_agent
from agents.orchestrator import TripState, orchestrator_node
from agents.restaurant import restaurant_agent
from agents.site_seeing import site_seeing_agent
from agents.train import train_agent
from agents.weather import weather_agent
langchain.debug = True

load_dotenv()
def _log(msg: str) -> dict:
    print(msg)
    return {"status_log": [msg]}


def phase1_collector(state: TripState) -> dict:
    print("📥 Phase 1 Collector: All transportation data gathered.")
    return {"status_log": ["📥 Phase 1: Transportation data collected. Awaiting approval."]}


def phase1_approval(state: TripState) -> dict:
    """Graph pauses HERE via interrupt_before. UI reads state; user approves."""
    print("\n⏸️  GRAPH PAUSED — Phase 1 approval gate")
    return {"status_log": ["⏸️ Waiting for Phase 1 user approval..."]}




def phase2_collector(state: TripState) -> dict:
    print("📥 Phase 2 Collector: Hotel/Weather/News gathered.")
    return {"status_log": ["📥 Phase 2: Basecamp data collected. Awaiting approval."]}


def phase2_approval(state: TripState) -> dict:
    """Graph pauses HERE via interrupt_before."""
    print("\n⏸️  GRAPH PAUSED — Phase 2 approval gate")
    return {"status_log": ["⏸️ Waiting for Phase 2 user approval..."]}



def phase1_router(state: TripState):
    required = state.get("required_agents", [])
    tasks    = state.get("agent_tasks", {})
    trip     = state.get("trip_details", {})
    sends = []
    for ag in ["flight_agent", "train_agent"]:
        if ag in required:
            sends.append(Send(ag, {"agent_tasks": {ag: tasks.get(ag, {})}, "trip_details": trip}))
    # If no transport agent, fall straight to collector
    return sends if sends else []


def phase2_router(state: TripState):
    required = state.get("required_agents", [])
    tasks    = state.get("agent_tasks", {})
    trip     = state.get("trip_details", {})
    sends = []
    for ag in ["hotel_agent", "weather_agent", "news_agent"]:
        if ag in required:
            sends.append(Send(ag, {"agent_tasks": {ag: tasks.get(ag, {})}, "trip_details": trip}))
    return sends


workflow = StateGraph(TripState)

# Nodes
workflow.add_node("orchestrator",     orchestrator_node)
workflow.add_node("flight_agent",     flight_agent)
workflow.add_node("train_agent",      train_agent)
workflow.add_node("phase1_collector", phase1_collector)
workflow.add_node("phase1_approval",  phase1_approval)
workflow.add_node("hotel_agent",      hotel_agent)
workflow.add_node("weather_agent",    weather_agent)
workflow.add_node("news_agent",       news_agent)
workflow.add_node("phase2_collector", phase2_collector)
workflow.add_node("phase2_approval",  phase2_approval)
workflow.add_node("restaurant_agent", restaurant_agent)
workflow.add_node("site_seeing_agent", site_seeing_agent)
workflow.add_node("itinerary_agent",  itinerary_agent)
workflow.add_node("road_agent",       road_agent)


# Edges — Phase 1
workflow.add_edge(START, "orchestrator")
workflow.add_conditional_edges("orchestrator", phase1_router, ["flight_agent", "train_agent"])
workflow.add_edge("flight_agent",      "phase1_collector")
workflow.add_edge("train_agent",       "phase1_collector")
workflow.add_edge("phase1_collector",  "phase1_approval")

# Edges — Phase 2
workflow.add_conditional_edges("phase1_approval", phase2_router, ["hotel_agent", "weather_agent", "news_agent"])
workflow.add_edge("hotel_agent",       "phase2_collector")
workflow.add_edge("weather_agent",     "phase2_collector")
workflow.add_edge("news_agent",        "phase2_collector")
workflow.add_edge("phase2_collector",  "phase2_approval")

# Edges — Phase 3 (sequential)
workflow.add_edge("phase2_approval",   "restaurant_agent")
workflow.add_edge("phase2_approval",   "site_seeing_agent")
workflow.add_edge("site_seeing_agent", "itinerary_agent")
workflow.add_edge("restaurant_agent",  "itinerary_agent")
workflow.add_edge("itinerary_agent",   END)

# Compile with MemorySaver
memory = MemorySaver()
app = workflow.compile(
    checkpointer=memory,
    interrupt_before=["phase1_approval", "phase2_approval"],
)

print("✅ 3-Phase HiTL graph compiled!")
