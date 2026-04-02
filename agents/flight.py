
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



class SelectedFlight(BaseModel):
    airline: str
    departure_time: str
    arrival_time: str
    price: float
    timing_notes: str
    reasoning: str

class FlightSelection(BaseModel):
    best_flights: List[SelectedFlight]
    

def flight_agent(state: dict) -> dict:
    logs = ["✈️ Flight Agent: Starting SerpApi Google Flights search..."]
    print(logs[0])

    trip  = state.get("trip_details", {})
    task  = state.get("agent_tasks", {} ).get("flight_agent", {})
    origin_city     = trip.get("origin", "Unknown")
    dest_city       = trip.get("destination", "Unknown")
    start_date      = trip.get("start_date")
    end_date        = trip.get("end_date")
    time_preference = task.get("time_preference", "Any time")

    # ── Human feedback from previous HITL interrupt ──────────────────────────
    human_feedback = state.get("human_feedback", "").strip()
    feedback_clause = (
        f"\n\n⚠️ USER FEEDBACK ON PREVIOUS FLIGHT RESULTS: \"{human_feedback}\""
        "\nAdjust your ranking/selection to address this feedback."
        if human_feedback else ""
    )

    llm = ChatCohere(model="command-r-08-2024", temperature=0)
    serpapi_key = os.getenv("SERPAPI_KEY")

    # IATA codes
    try:
        iata_p = ChatPromptTemplate.from_template(
            "Respond with ONLY the 3-letter uppercase IATA airport code for {city}. No explanation."
        )
        origin_iata = (iata_p | llm).invoke({"city": origin_city}).content.strip().upper()[:3]
        dest_iata   = (iata_p | llm).invoke({"city": dest_city}).content.strip().upper()[:3]
    except Exception as e:
        logs.append(f"❌ IATA lookup failed: {e}")
        return {"scraped_data": {"flights": [{"error": str(e)}]}, "status_log": logs}

    logs.append(f"✈️ Route: {origin_iata} → {dest_iata} | Pref: {time_preference}")
    print(logs[-1])

    # SerpApi
    try:
        is_rt = bool(end_date)
        params = {
            "engine":        "google_flights",
            "departure_id":  origin_iata,
            "arrival_id":    dest_iata,
            "outbound_date": start_date,
            "currency":      "USD",
            "hl":            "en",
            "api_key":       serpapi_key,
            "type":          "1" if is_rt else "2",
        }
        if is_rt:
            params["return_date"] = end_date
        resp = requests.get("https://serpapi.com/search", params=params, timeout=20)
        resp.raise_for_status()
        raw = resp.json().get("best_flights", []) or resp.json().get("other_flights", [])
    except Exception as e:
        logs.append(f"❌ Flight API error: {e}")
        print(logs[-1])
        return {"scraped_data": {"flights": [{"error": str(e)}]}, "status_log": logs}

    condensed = []
    for i, f in enumerate(raw[:20]):
        try:
            legs = f.get("flights", [])
            if not legs: continue
            condensed.append({
                "option_id":      i + 1,
                "airline":        legs[0].get("airline", "Unknown"),
                "departure_time": legs[0].get("departure_airport", {}).get("time", "?"),
                "arrival_time":   legs[-1].get("arrival_airport", {}).get("time", "?"),
                "price_usd":      f.get("price", 0),
                "layovers":       len(legs) - 1,
            })
        except Exception:
            continue

    if not condensed:
        msg = f"No flights found {origin_iata}→{dest_iata} on {start_date}"
        logs.append(f"⚠️ {msg}")
        return {"scraped_data": {"flights": [{"error": msg}]}, "status_log": logs}

    logs.append(f"🧠 Flight Agent: Evaluating {len(condensed)} options via LLM...")
    print(logs[-1])

    try:
        eval_llm = llm.with_structured_output(FlightSelection)
        eval_prompt = ChatPromptTemplate.from_messages([
            ("system", f"Pick the best 1-2 flights considering price, layovers, and time preference. Provide timing_notes and reasoning.{feedback_clause}"),
            ("human",  "Flights JSON:\n{flights}\n\nTime Preference: {time_preference}")
        ])
        best: FlightSelection = (eval_prompt | eval_llm).invoke({
            "flights":         json.dumps(condensed, indent=2),
            "time_preference": time_preference,
        })
        results = []
        for f in (best.best_flights or []):
            results.append({
                "type":         "flight",
                "airline":      f.airline,
                "departure":    f.departure_time,
                "arrival":      f.arrival_time,
                "cost":         f.price,
                "timing_notes": f.timing_notes,
                "details":      f.reasoning,
            })
            log = f"✅ Flight: {f.airline} | {f.departure_time}→{f.arrival_time} | ${f.price}"
            logs.append(log); print(log)
    except Exception as e:
        logs.append(f"⚠️ LLM eval failed ({e}), using top raw result")
        results = [{"type": "flight", "airline": condensed[0]["airline"], "departure": condensed[0]["departure_time"],
                    "arrival": condensed[0]["arrival_time"], "cost": condensed[0]["price_usd"],
                    "timing_notes": "Direct pick", "details": "LLM eval unavailable"}]

    return {"scraped_data": {"flights": results or condensed[:2]}, "status_log": logs}
