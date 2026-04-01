

from __future__ import annotations
from typing import TypedDict, List, Dict, Optional, Annotated
from langgraph.graph import StateGraph, START, END
from langgraph.constants import Send
from langchain_cohere import ChatCohere
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import json, os, requests
from datetime import datetime
import langchain

def road_agent(state: dict) -> dict:
    return {"scraped_data": {"road": ["Dummy road data"]}, "status_log": ["🚗 Road Agent: dummy"]}
