
from __future__ import annotations
from typing import TypedDict, List, Dict, Optional, Annotated
from langgraph.graph import StateGraph, START, END
from langgraph.constants import Send
from langchain_cohere import ChatCohere
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import json, os, requests, uuid
from datetime import datetime
import langchain

class SelectedHotel(BaseModel):
    hotel_name: str
    rating: float
    total_price: float
    vibe_match_reasoning: str
    # Added GPS and Nearby Places fields
    gps_coordinates: Optional[Dict[str, float]] = Field(
        None, description="The latitude and longitude of the hotel."
    )
    nearby_places: List[str] = Field(
        default_factory=list, description="A list of 2-3 significant nearby landmarks or transit points."
    )
class HotelSelection(BaseModel):
    best_hotels: List[SelectedHotel]

def hotel_agent(state: dict) -> dict:
    logs = ["🏨 Hotel Agent: Starting SerpApi Google Hotels search..."]
    print(logs[0])

    trip        = state.get("trip_details", {})
    task        = state.get("agent_tasks", {}).get("hotel_agent", {})
    dest_city   = trip.get("destination", "Unknown")
    check_in    = trip.get("start_date")
    check_out   = trip.get("end_date")
    travelers   = trip.get("number_of_travelers", 1)
    vibe        = task.get("vibe_preference", "standard")
    serpapi_key = os.getenv("SERPAPI_KEY")

    # ── Human feedback from previous HITL interrupt ──────────────────────────
    human_feedback = state.get("human_feedback", "").strip()
    feedback_clause = (
        f"\n\n⚠️ USER FEEDBACK ON PREVIOUS HOTEL RESULTS: \"{human_feedback}\""
        "\nAdjust your hotel ranking to address this feedback."
        if human_feedback else ""
    )

    try:
        params = {
            "engine":         "google_hotels",
            "q":              dest_city,
            "check_in_date":  check_in,
            "check_out_date": check_out,
            "adults":         travelers,
            "currency":       "USD",
            "hl":             "en",
            "api_key":        serpapi_key,
        }
        resp = requests.get("https://serpapi.com/search", params=params, timeout=20)
        resp.raise_for_status()
        raw_hotels = resp.json().get("properties", [])
    except Exception as e:
        logs.append(f"❌ Hotel API error: {e}")
        return {"scraped_data": {"hotels": [{"error": str(e)}]}, "status_log": logs}

    # Step 1: Extract data from raw JSON including GPS and Nearby Places
    condensed = []
    for i, h in enumerate(raw_hotels[:15]):
        try:
            price = h.get("rate_per_night", {}).get("extracted_lowest")
            if not price: continue
            
            # Extract GPS coordinates
            gps = h.get("gps_coordinates", {})
            
            # Extract Nearby Places names
            nearby_raw = h.get("nearby_places", [])
            nearby_names = [place.get("name") for place in nearby_raw if place.get("name")][:3]

            condensed.append({
                "option_id":           i + 1,
                "name":                h.get("name", "Unknown"),
                "user_rating":         h.get("overall_rating", "N/A"),
                "description":         str(h.get("description", ""))[:150],
                "price_per_night_usd": float(price),
                "gps_coordinates":     gps,
                "nearby_places":       nearby_names
            })
        except Exception:
            continue

    if not condensed:
        return {"scraped_data": {"hotels": [{"error": "No hotels found."}]}, "status_log": logs}

    logs.append(f"🧠 Hotel Agent: LLM evaluating {len(condensed)} hotels for '{vibe}' vibe...")

    try:
        llm      = ChatCohere(model="command-r-08-2024", temperature=0)
        eval_llm = llm.with_structured_output(HotelSelection)
        eval_p   = ChatPromptTemplate.from_messages([
            ("system", f"Pick best 1 hotels. You MUST preserve the exact 'gps_coordinates' and 'nearby_places' provided in the source data.{feedback_clause}"),
            ("human",  "Hotels Data:\n{hotels}\n\nVibe: {vibe}")
        ])
        best: HotelSelection = (eval_p | eval_llm).invoke({
            "hotels":    json.dumps(condensed, indent=2),
            "vibe":      vibe
        })
        
        results = []
        for h in (best.best_hotels or []):
            results.append({
                "type":            "hotel",
                "name":            h.hotel_name,
                "location":        dest_city,
                "vibe":            vibe,
                "rating":          h.rating,
                "cost_per_night":  h.total_price,
                "gps_coordinates": h.gps_coordinates,
                "nearby_places":   h.nearby_places,
                "details":         h.vibe_match_reasoning,
            })
            log = f"✅ Hotel: {h.hotel_name} | GPS: {h.gps_coordinates}"
            logs.append(log); print(log)
            
    except Exception as e:
        logs.append(f"⚠️ LLM eval failed ({e}), using top raw result")
        # Fallback ensuring GPS/Nearby are preserved even on LLM error
        top = condensed[0]
        results = [{
            "type": "hotel", "name": top["name"], "location": dest_city,
            "vibe": vibe, "rating": top["user_rating"],
            "cost_per_night": top["price_per_night_usd"],
            "gps_coordinates": top["gps_coordinates"],
            "nearby_places": top["nearby_places"],
            "details": "LLM eval unavailable"
        }]

    selected_h = results[0] if results else None
    tl = [{"id": str(uuid.uuid4()), "from": "hotel_agent", "to": "phase2_collector", "message": f"Recommended hotel: {results[0]['name'] if results else 'N/A'}"}]
    return {
        "scraped_data": {"hotels": results},
        "all_hotels":     condensed,
        "selected_hotel":  selected_h,
        "status_log":      logs,
        "timeline":        tl
    }
