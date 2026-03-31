from __future__ import annotations
from typing import TypedDict, List, Dict, Optional, Annotated
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.constants import Send
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from reducer import _merge
import operator
import langchain

class TripState(TypedDict):
    user_request:    str
    trip_details:    dict
    required_agents: List[str]
    agent_tasks:     Dict[str, dict]
    scraped_data:    Annotated[Dict[str, list], _merge]
    human_feedback:  str
    phase1_approved: bool
    phase2_approved: bool
    final_itinerary: str
    status_log:      Annotated[List[str], operator.add]   # streaming log