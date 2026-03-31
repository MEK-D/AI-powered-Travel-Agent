
from __future__ import annotations
from typing import TypedDict, List, Dict, Optional, Annotated
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.constants import Send
from langchain_cohere import ChatCohere
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import json, os, requests
from datetime import datetime
import langchain

def restaurant_agent(state: dict) -> dict:
    dest = state.get("trip_details", {}).get("destination", "Destination")
    msg  = f"🍽 Restaurant Agent (dummy): Finding dining in {dest}"
    print(msg)
    return {
        "scraped_data": {"restaurants": [
            f"Spice Garden — authentic local cuisine in {dest}",
            "The Harbour Grill — seafood with panoramic views",
        ]},
        "status_log": [msg],
    }
