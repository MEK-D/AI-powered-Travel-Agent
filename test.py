"""
test.py — 5-Phase Human-in-the-Loop LangGraph Travel Concierge
================================================================
Phase 0 → orchestrator          → orchestrator_hitl  (interrupt)
Phase 1 → flight / train        → phase1_collector   → phase1_hitl  (interrupt)
Phase 2 → hotel/weather/news    → phase2_collector   → phase2_hitl  (interrupt)
Phase 3 → restaurant/siteseeing → phase3_collector   → phase3_hitl  (interrupt)
Phase 4 → itinerary             → itinerary_hitl     (interrupt)

At every interrupt the user can:
  "yes" / "approve"  → proceed to next phase
  "no"  / "cancel"   → hard stop → END
  <any other text>   → feedback: clear current-phase data, re-run with feedback injected
"""

from __future__ import annotations
from langgraph.graph import StateGraph, START, END
from langgraph.constants import Send
from langgraph.types import interrupt
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

load_dotenv()
langchain.debug = False   # flip to True for verbose LLM tracing


# ─────────────────────────────────────────────────────────────────────────────
# Helper: normalise a user decision string
# ─────────────────────────────────────────────────────────────────────────────
_APPROVE = {"yes", "y", "approve", "ok", "proceed", "continue", ""}
_CANCEL  = {"no", "n", "cancel", "stop", "quit", "exit", "decline"}

def _classify(decision: str) -> str:
    d = str(decision).strip().lower()
    if d in _APPROVE:
        return "approved"
    if d in _CANCEL:
        return "cancelled"
    return "feedback"


# ─────────────────────────────────────────────────────────────────────────────
# Fan-out helpers  (reused by both initial routing and feedback re-routing)
# ─────────────────────────────────────────────────────────────────────────────
def _phase1_sends(state):
    required = state.get("required_agents", [])
    tasks    = state.get("agent_tasks", {})
    trip     = state.get("trip_details", {})
    hf       = state.get("human_feedback", "")
    sends = [
        Send(ag, {"agent_tasks": {ag: tasks.get(ag, {})}, "trip_details": trip, "human_feedback": hf})
        for ag in ["flight_agent", "train_agent"] if ag in required
    ]
    return sends if sends else "phase1_collector"


def _phase2_sends(state):
    required = state.get("required_agents", [])
    tasks    = state.get("agent_tasks", {})
    trip     = state.get("trip_details", {})
    hf       = state.get("human_feedback", "")
    sends = [
        Send(ag, {"agent_tasks": {ag: tasks.get(ag, {})}, "trip_details": trip, "human_feedback": hf})
        for ag in ["hotel_agent", "weather_agent", "news_agent"] if ag in required
    ]
    return sends if sends else "phase2_collector"


def _phase3_sends(state):
    tasks   = state.get("agent_tasks", {})
    trip    = state.get("trip_details", {})
    scraped = state.get("scraped_data", {})
    hf      = state.get("human_feedback", "")
    base    = {"agent_tasks": tasks, "trip_details": trip, "scraped_data": scraped, "human_feedback": hf}
    return [Send("restaurant_agent", base), Send("site_seeing_agent", base)]


# ─────────────────────────────────────────────────────────────────────────────
# Collector / log nodes
# ─────────────────────────────────────────────────────────────────────────────
def phase1_collector(state):
    print("📥 Phase 1 Collector: Transportation data gathered.")
    return {"status_log": ["📥 Phase 1: Transportation data collected."]}


def phase2_collector(state):
    print("📥 Phase 2 Collector: Hotel / Weather / News gathered.")
    return {"status_log": ["📥 Phase 2: Basecamp data collected."]}


def phase3_collector(state):
    print("📥 Phase 3 Collector: Activities data gathered.")
    return {"status_log": ["📥 Phase 3: Activities data collected."]}


# ─────────────────────────────────────────────────────────────────────────────
# HITL Gate Nodes  (each calls interrupt() — the real LangGraph primitive)
# ─────────────────────────────────────────────────────────────────────────────
def orchestrator_hitl(state: TripState) -> dict:
    """Phase 0 gate: show orchestrator plan, wait for human decision."""
    payload = {
        "phase":           "orchestrator",
        "required_agents": state.get("required_agents", []),
        "agent_tasks":     state.get("agent_tasks", {}),
        "trip_details":    state.get("trip_details", {}),
        "message":         (
            "🧠 Orchestrator has built the execution plan.\n"
            "Type 'yes' to approve, 'no' to cancel, or describe changes you want."
        ),
    }
    decision = interrupt(payload)
    action   = _classify(decision)

    if action == "approved":
        return {"hitl_action": "approved", "last_approved_phase": "orchestrator", "human_feedback": ""}
    elif action == "cancelled":
        return {"hitl_action": "cancelled"}
    else:
        print(f"💬 Orchestrator feedback received: {decision}")
        return {
            "hitl_action":    "feedback", 
            "human_feedback": str(decision),
            "agent_tasks":     None,      # clear tasks → re-plan
            "required_agents": None,      # clear → re-plan
        }


def phase1_hitl(state: TripState) -> dict:
    """Phase 1 gate: show transport results, wait for human decision."""
    data = state.get("scraped_data", {})
    payload = {
        "phase":   "transport",
        "flights": data.get("flights", []),
        "trains":  data.get("trains",  []),
        "message": (
            "✈️🚆 Phase 1 complete — Transportation options above.\n"
            "Type 'yes' to approve, 'no' to cancel, or give feedback to refine."
        ),
    }
    decision = interrupt(payload)
    action   = _classify(decision)

    if action == "approved":
        return {"hitl_action": "approved", "last_approved_phase": "transport", "human_feedback": ""}
    elif action == "cancelled":
        return {"hitl_action": "cancelled"}
    else:
        print(f"💬 Phase-1 feedback: {decision}")
        return {
            "hitl_action":  "feedback",
            "human_feedback": str(decision),
            "scraped_data": {"flights": None, "trains": None},   # clear → re-run fresh
        }


def phase2_hitl(state: TripState) -> dict:
    """Phase 2 gate: show hotel/weather/news, wait for human decision."""
    data = state.get("scraped_data", {})
    payload = {
        "phase":   "basecamp",
        "hotels":  data.get("hotels",  []),
        "weather": data.get("weather", []),
        "news":    data.get("news",    []),
        "message": (
            "🏨🌦📰 Phase 2 complete — Hotel, Weather & News above.\n"
            "Type 'yes' to approve, 'no' to cancel, or give feedback to refine."
        ),
    }
    decision = interrupt(payload)
    action   = _classify(decision)

    if action == "approved":
        return {"hitl_action": "approved", "last_approved_phase": "basecamp", "human_feedback": ""}
    elif action == "cancelled":
        return {"hitl_action": "cancelled"}
    else:
        print(f"💬 Phase-2 feedback: {decision}")
        return {
            "hitl_action":    "feedback",
            "human_feedback": str(decision),
            "scraped_data":   {"hotels": None, "weather": None, "news": None},
        }


def phase3_hitl(state: TripState) -> dict:
    """Phase 3 gate: show restaurant/sightseeing, wait for human decision."""
    data = state.get("scraped_data", {})
    payload = {
        "phase":       "activities",
        "restaurants": data.get("restaurants", []),
        "sightseeing": data.get("sites", []),
        "message": (
            "🍴🏛 Phase 3 complete — Dining & Sightseeing above.\n"
            "Type 'yes' to approve, 'no' to cancel, or give feedback to refine."
        ),
    }
    decision = interrupt(payload)
    action   = _classify(decision)

    if action == "approved":
        return {"hitl_action": "approved", "last_approved_phase": "activities", "human_feedback": ""}
    elif action == "cancelled":
        return {"hitl_action": "cancelled"}
    else:
        print(f"💬 Phase-3 feedback: {decision}")
        return {
            "hitl_action":    "feedback",
            "human_feedback": str(decision),
            "scraped_data":   {"restaurants": None, "sites": None},
        }


def itinerary_hitl(state: TripState) -> dict:
    """Phase 4 gate: show final itinerary, give last chance to refine."""
    payload = {
        "phase":     "itinerary",
        "itinerary": state.get("final_itinerary", ""),
        "message": (
            "🗺 Phase 4 complete — Final Itinerary above.\n"
            "Type 'yes' to confirm & finish, 'no' to discard, or give feedback to regenerate."
        ),
    }
    decision = interrupt(payload)
    action   = _classify(decision)

    if action == "approved":
        return {"hitl_action": "approved", "last_approved_phase": "itinerary", "human_feedback": ""}
    elif action == "cancelled":
        return {"hitl_action": "cancelled"}
    else:
        print(f"💬 Itinerary feedback: {decision}")
        return {"hitl_action": "feedback", "human_feedback": str(decision), "final_itinerary": ""}


# ─────────────────────────────────────────────────────────────────────────────
# Conditional-edge routing functions
# ─────────────────────────────────────────────────────────────────────────────
def route_orchestrator_hitl(state):
    action = state.get("hitl_action", "approved")
    if action == "cancelled":
        return END
    if action == "feedback":
        return "orchestrator"           # re-run orchestrator with feedback in state
    return _phase1_sends(state)         # approved → fan-out phase 1


def route_phase1_hitl(state):
    action = state.get("hitl_action", "approved")
    if action == "cancelled":
        return END
    if action == "feedback":
        return _phase1_sends(state)     # re-run transport with feedback
    return _phase2_sends(state)         # approved → fan-out phase 2


def route_phase2_hitl(state):
    action = state.get("hitl_action", "approved")
    if action == "cancelled":
        return END
    if action == "feedback":
        return _phase2_sends(state)     # re-run basecamp with feedback
    return _phase3_sends(state)         # approved → fan-out phase 3


def route_phase3_hitl(state):
    action = state.get("hitl_action", "approved")
    if action == "cancelled":
        return END
    if action == "feedback":
        return _phase3_sends(state)     # re-run activities with feedback
    return "itinerary_agent"            # approved → itinerary


def route_itinerary_hitl(state):
    action = state.get("hitl_action", "approved")
    if action == "feedback":
        return "itinerary_agent"        # re-generate itinerary with feedback
    return END                          # approved or cancelled → done


# ─────────────────────────────────────────────────────────────────────────────
# Graph construction
# ─────────────────────────────────────────────────────────────────────────────
_ALL_NODES = [
    "orchestrator", "orchestrator_hitl",
    "flight_agent", "train_agent", "phase1_collector", "phase1_hitl",
    "hotel_agent", "weather_agent", "news_agent", "phase2_collector", "phase2_hitl",
    "restaurant_agent", "site_seeing_agent", "phase3_collector", "phase3_hitl",
    "itinerary_agent", "itinerary_hitl",
    "road_agent",
]

workflow = StateGraph(TripState)

# ── register nodes ────────────────────────────────────────────────────────────
workflow.add_node("orchestrator",       orchestrator_node)
workflow.add_node("orchestrator_hitl",  orchestrator_hitl)

workflow.add_node("flight_agent",       flight_agent)
workflow.add_node("train_agent",        train_agent)
workflow.add_node("phase1_collector",   phase1_collector)
workflow.add_node("phase1_hitl",        phase1_hitl)

workflow.add_node("hotel_agent",        hotel_agent)
workflow.add_node("weather_agent",      weather_agent)
workflow.add_node("news_agent",         news_agent)
workflow.add_node("phase2_collector",   phase2_collector)
workflow.add_node("phase2_hitl",        phase2_hitl)

workflow.add_node("restaurant_agent",   restaurant_agent)
workflow.add_node("site_seeing_agent",  site_seeing_agent)
workflow.add_node("phase3_collector",   phase3_collector)
workflow.add_node("phase3_hitl",        phase3_hitl)

workflow.add_node("itinerary_agent",    itinerary_agent)
workflow.add_node("itinerary_hitl",     itinerary_hitl)
workflow.add_node("road_agent",         road_agent)

# ── edges ─────────────────────────────────────────────────────────────────────
workflow.add_edge(START, "orchestrator")
workflow.add_edge("orchestrator", "orchestrator_hitl")

workflow.add_conditional_edges(
    "orchestrator_hitl", route_orchestrator_hitl,
    ["orchestrator", "flight_agent", "train_agent", "phase1_collector", END],
)

workflow.add_edge("flight_agent",     "phase1_collector")
workflow.add_edge("train_agent",      "phase1_collector")
workflow.add_edge("phase1_collector", "phase1_hitl")

workflow.add_conditional_edges(
    "phase1_hitl", route_phase1_hitl,
    ["flight_agent", "train_agent", "phase1_collector", "hotel_agent", "weather_agent", "news_agent", "phase2_collector", END],
)

workflow.add_edge("hotel_agent",      "phase2_collector")
workflow.add_edge("weather_agent",    "phase2_collector")
workflow.add_edge("news_agent",       "phase2_collector")
workflow.add_edge("phase2_collector", "phase2_hitl")

workflow.add_conditional_edges(
    "phase2_hitl", route_phase2_hitl,
    ["hotel_agent", "weather_agent", "news_agent", "phase2_collector", "restaurant_agent", "site_seeing_agent", END],
)

workflow.add_edge("restaurant_agent",  "phase3_collector")
workflow.add_edge("site_seeing_agent", "phase3_collector")
workflow.add_edge("phase3_collector",  "phase3_hitl")

workflow.add_conditional_edges(
    "phase3_hitl", route_phase3_hitl,
    ["restaurant_agent", "site_seeing_agent", "phase3_collector", "itinerary_agent", END],
)

workflow.add_edge("itinerary_agent", "itinerary_hitl")

workflow.add_conditional_edges(
    "itinerary_hitl", route_itinerary_hitl,
    ["itinerary_agent", END],
)


# ─────────────────────────────────────────────────────────────────────────────
# Export
# ─────────────────────────────────────────────────────────────────────────────
def get_compiled_graph(checkpointer):
    """Compile the workflow with the given checkpointer. No interrupt_before needed."""
    return workflow.compile(checkpointer=checkpointer)


print("✅ 5-Phase HITL StateGraph builder ready!")
