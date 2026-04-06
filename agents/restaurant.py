
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

class SelectedRestaurant(BaseModel):
    restaurant_name: str
    cuisine_type: str
    rating: float
    price_level: str = Field(description="Price range like $, $$, or $$$")
    address: str
    description: str = Field(description="A brief, appetizing summary of the place.")
    distance_from_hotel: Optional[str] = Field(None, description="How far it is from the hotel coordinates.")
    reasoning: str = Field(description="Why this matches the user's trip context.")

class RestaurantSelection(BaseModel):
    best_restaurants: List[SelectedRestaurant]


def restaurant_agent(state: dict) -> dict:
    tm = TelemetryManager("restaurant_agent")
    tm.info("🍴 Restaurant Agent: Finding dining options near your hotel...")
    callback = TelemetryCallbackHandler(tm)
    

    # 1. Extract context from State
    # We assume 'hotels' was populated by the hotel_agent
    trip  = state.get("trip_details", {})
    hotel_data = state.get("scraped_data", {}).get("hotels", [])
    tm.debug(f"DEBUG: Restaurant Agent received {len(hotel_data)} hotels from state.")
    if not hotel_data:
        tm.warning("⚠️ No hotel found in state. Searching general city area instead.")
        search_location = state.get("trip_details", {}).get("destination", "Unknown")
        lat_long = None
    else:
        # Take the first selected hotel's info
        target_hotel = hotel_data[0]
        search_location = f"restaurants near {target_hotel.get('name')}"
        gps = target_hotel.get("gps_coordinates", {})
        lat_long = f"@{gps.get('latitude')},{gps.get('longitude')},15z" # 15z is zoom level
        tm.info(f"🍴 Context: Anchoring search to {target_hotel.get('name')} at coordinates {gps.get('latitude')}, {gps.get('longitude')}")

    serpapi_key = os.getenv("SERPAPI_KEY")
    llm = ChatCohere(model="command-r-08-2024", temperature=0)

    # ── Human feedback from previous HITL interrupt ──────────────────────────
    human_feedback = state.get("human_feedback", "").strip()
    feedback_clause = (
        f"\n\n⚠️ USER FEEDBACK ON PREVIOUS DINING RESULTS: \"{human_feedback}\""
        "\nAdjust your restaurant selection to address this feedback."
        if human_feedback else ""
    )

    # 2. SerpApi Google Maps Search
    try:
        params = {
            "engine": "google_maps",
            "q": "best restaurants",
            "ll": lat_long, # Anchors search to Hotel GPS
            "type": "search",
            "api_key":serpapi_key,
        }
        
        # If no GPS, we fallback to a text search
        if not lat_long:
            params["engine"] = "google_local"
            params["q"] = f"best restaurants in {search_location}"

        resp = requests.get("https://serpapi.com/search", params=params, timeout=20)
        resp.raise_for_status()
        raw_results = resp.json().get("local_results", [])
        tm.info(f"📡 SerpApi Data Received: Found {len(raw_results)} local dining options nearby.", raw_count=len(raw_results))
    except Exception as e:
        tm.error(f"❌ Restaurant API error: {e}")
        return {"scraped_data": {"restaurants": [{"error": str(e)}]}, "status_log": [e.message for e in tm.entries], "telemetry": tm.get_entries()}

    # 3. Condense Data for LLM
    condensed = []
    for r in raw_results[:10]: # Top 10 for the LLM to pick from
        condensed.append({
            "name": r.get("title"),
            "rating": r.get("rating"),
            "reviews": r.get("reviews"),
            "type": r.get("type"),
            "price": r.get("price"),
            "address": r.get("address"),
            "description": r.get("description", "Popular local spot")
        })

    # 4. LLM Structured Evaluation
    try:
        tm.info(f"🧠 Analysis: Evaluating {len(condensed)} curated options to pick a diverse top 3 selection.", condensed_count=len(condensed))
        eval_llm = llm.with_structured_output(RestaurantSelection)
        eval_prompt = ChatPromptTemplate.from_messages([
            ("system", f"You are a local food guide. Based on the hotel location and restaurant data and budget(considering budget(budget provided to uh will of entire trip not just for restaurant), pick the 3 best diverse options (e.g., one casual, one fine dining, one local favorite).{feedback_clause}"),
            ("human", "Available Restaurants:\n{restaurants}\n\nHotel Context: {context}\n\n Trip Details: {trip_details}")
        ])
        
        best: RestaurantSelection = (eval_prompt | eval_llm).invoke({
            "restaurants": json.dumps(condensed, indent=2),
            "context": f"Staying at {search_location}",
            "trip_details": trip,
        }, config={"callbacks": [callback]})

        results = []
        for res in best.best_restaurants:
            results.append({
                "type": "restaurant",
                "name": res.restaurant_name,
                "cuisine": res.cuisine_type,
                "rating": res.rating,
                "price": res.price_level,
                "address": res.address,
                "details": res.description,
                "distance": res.distance_from_hotel,
                "why_pick": res.reasoning
            })
            tm.info(f"✅ Restaurant: {res.restaurant_name} ({res.cuisine_type})")

    except Exception as e:
        tm.warning(f"⚠️ LLM eval failed ({e}), returning raw results")
        results = condensed[:3] # Fallback
    tm.debug("restaurants:", results=results)
    tm.info(f"✅ Selection Complete: Finalized {len(results)} hand-picked dining recommendations.", final_count=len(results))
    tl = [{"id": str(uuid.uuid4()), "from": "restaurant_agent", "to": "phase3_collector", "message": f"Found {len(results)} restaurant options."}]
    return {"scraped_data": {"restaurants": results}, "status_log": [e.message for e in tm.entries], "telemetry": tm.get_entries(), "timeline": tl}


