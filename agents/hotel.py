
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
from telemetry import TelemetryManager, TelemetryCallbackHandler

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
    tm = TelemetryManager("hotel_agent")
    tm.info("🏨 Hotel Agent: Starting SerpApi Google Hotels search...")

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
        tm.info(f"🏨 Hotel Search: Looking for properties in {dest_city} ({check_in} to {check_out}) for {travelers} travelers.")
        resp = requests.get("https://serpapi.com/search", params=params, timeout=20)
        resp.raise_for_status()
        raw_hotels = resp.json().get("properties", [])
        tm.info(f"📡 SerpApi Data Received: Found {len(raw_hotels)} properties in the {dest_city} area.", 
                raw_count=len(raw_hotels), city=dest_city)
    except Exception as e:
        tm.error(f"❌ Hotel API error: {e}")
        return {"scraped_data": {"hotels": [{"error": str(e)}]}, "status_log": [e.message for e in tm.entries], "telemetry": tm.get_entries()}

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
        tm.warning(f"⚠️ No hotel options extracted from {len(raw_hotels)} raw results. (Price per night missing or invalid)")
        return {"scraped_data": {"hotels": [{"error": "No hotels found."}]}, "status_log": [e.message for e in tm.entries], "telemetry": tm.get_entries()}

    tm.info(f"🧠 Analysis: Extracted {len(condensed)} valid hotel options for closer evaluation.", 
            condensed_count=len(condensed), vibe=vibe)

    try:
        llm      = ChatCohere(model="command-r-08-2024", temperature=0)
        eval_llm = llm.with_structured_output(HotelSelection)
        eval_p   = ChatPromptTemplate.from_messages([
            ("system", f"Pick best 1 hotels according to user preferences, budget(budget provided to uh will of entire trip not just for hotel), interests. You MUST preserve the exact 'gps_coordinates' and 'nearby_places' provided in the source data.{feedback_clause}"),
            ("human",  "Hotels Data:\n{hotels}\n\nVibe: {vibe}\n\n Trip Details: {trip_details}")
        ])
        best: HotelSelection = (eval_p | eval_llm).invoke({
            "hotels":    json.dumps(condensed, indent=2),
            "vibe":      vibe,
            "trip_details": trip,
        }, config={"callbacks": [TelemetryCallbackHandler(tm)]})
        
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
            tm.info(f"✅ Hotel: {h.hotel_name} | GPS: {h.gps_coordinates}")
            
    except Exception as e:
        tm.warning(f"⚠️ LLM eval failed ({e}), using top raw result")
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

    tm.info(f"✅ Hotel Selection Complete: Highly recommending {results[0]['name'] if results else 'N/A'}.", 
            final_selection=results[0]['name'] if results else 'None')

    all_hotels = [{"type": "hotel", "name": c["name"], "location": dest_city, "vibe": vibe, "rating": c["user_rating"], "cost_per_night": c["price_per_night_usd"], "gps_coordinates": c.get("gps_coordinates"), "nearby_places": c.get("nearby_places"), "details": c.get("description", "")[:100] + "..."} for c in condensed[:10]]

    tl = [{"id": str(uuid.uuid4()), "from": "hotel_agent", "to": "phase2_collector", "message": f"Recommended hotel: {results[0]['name'] if results else 'N/A'}"}]
    return {"scraped_data": {"hotels": results, "all_hotels": all_hotels}, "status_log": [e.message for e in tm.entries], "telemetry": tm.get_entries(), "timeline": tl}
