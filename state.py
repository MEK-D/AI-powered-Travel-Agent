from __future__ import annotations
from typing import TypedDict, List, Dict, Optional, Annotated
from langgraph.graph import StateGraph, START, END
from langgraph.constants import Send
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from reducer import _merge
import operator

class TripState(TypedDict):
    user_request:        str
    trip_details:        dict
    required_agents:     List[str]
    agent_tasks:         Dict[str, dict]
    scraped_data:        Annotated[Dict[str, list], _merge]
    
    # Track all options vs final selections
    all_flights:         List[dict]
    selected_flight:     Optional[dict]
    all_hotels:          List[dict]
    selected_hotel:      Optional[dict]
    human_feedback:      str          # latest user feedback text (cleared on approve)
    pending_feedback:    str          # latest raw HITL input awaiting routing decision
    feedback_route:      str          # "proceed" | "retry" | "orchestrator"
    last_approved_phase: str          # e.g. "orchestrator", "transport", "basecamp", "activities"
    hitl_action:         str          # "approved" | "cancelled" | "feedback"
    final_itinerary:     str
    status_log:          Annotated[List[str], operator.add]
    timeline:           Annotated[List[dict], operator.add]   # Agent-to-agent communication entries
    messages:           Annotated[List[dict], operator.add]   # Chat history for UI