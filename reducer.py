from __future__ import annotations
from typing import TypedDict, List, Dict, Optional, Annotated
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.constants import Send
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import langchain

def _merge(a: Dict, b: Dict) -> Dict:
    out = dict(a or {})
    for k, v in (b or {}).items():
        if k in out and isinstance(out[k], list) and isinstance(v, list):
            out[k] = out[k] + v
        else:
            out[k] = v
    return out
