
from __future__ import annotations
import operator
import operator
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

from state import TripState

def itinerary_agent(state: TripState) -> dict:
    msg = "🗺 Itinerary Agent: Synthesizing final day-by-day plan..."
    print(msg)

    data     = state.get("scraped_data", {})
    trip     = state.get("trip_details", {})
    dest     = trip.get("destination", "your destination")
    origin   = trip.get("origin", "your city")
    start    = trip.get("start_date", "")
    end      = trip.get("end_date", "")

    # ── Human feedback carried from last itinerary HITL ────────────────────────
    human_feedback = state.get("human_feedback", "").strip()
    feedback_note = (
        f"\n\n⚠️ REGENERATION FEEDBACK FROM USER: \"{human_feedback}\""
        "\nRevise the itinerary to specifically address this feedback."
        if human_feedback else ""
    )

    flights      = data.get("flights", [])
    hotels       = data.get("hotels", [])
    weather      = data.get("weather", [])
    news_items   = data.get("news", [])
    restaurants  = data.get("restaurants", [])

    trains       = data.get("trains", [])

    f_info = "No flights"
    if flights and isinstance(flights[0], dict) and "error" not in flights[0]:
        f  = flights[0]
        f_info = f"{f.get('airline')} | {f.get('departure')}→{f.get('arrival')} | ${f.get('cost')}"

    t_info = "No trains"
    if trains and isinstance(trains[0], dict) and "error" not in trains[0]:
        t  = trains[0]
        t_info = f"{t.get('train_name')} | {t.get('departure')}→{t.get('arrival')} | {t.get('duration')} | ${t.get('cost')}"

    h_info = "No hotel"
    if hotels and "error" not in hotels[0]:
        h = hotels[0]
        gps = h.get('gps_coordinates', {})
        nearby = h.get('nearby_places', [])
        
        # Enhanced formatting for the final plan
        gps_str = f" [Lat: {gps.get('latitude')}, Lng: {gps.get('longitude')}]" if gps else ""
        nearby_str = f"\n   📍 Nearby: {', '.join(nearby)}" if nearby else ""
        
        h_info = f"{h.get('name')} (⭐{h.get('rating')}, ${h.get('cost_per_night')}/night){gps_str}{nearby_str}"

    # --- WEATHER FORMATTING LOGIC ---
    w_info_lines = []
    if weather and isinstance(weather[0], dict) and "error" not in weather[0] and "date" in weather[0]:
        for w in weather:
            sym = w.get("symbol", "°")
            w_line = f"    {w.get('date')}: {w.get('conditions')} ({w.get('max_temp')}{sym} / {w.get('min_temp')}{sym}) 💡 {w.get('travel_advice')}"
            w_info_lines.append(w_line)
        w_info = "\n".join(w_info_lines)
    else:
        if weather and isinstance(weather[0], dict) and "error" in weather[0]:
            w_info = f"    ⚠️ {weather[0]['error']}"
        elif weather and isinstance(weather[0], str):
            w_info = f"    {weather[0]}"
        else:
            w_info = "    Weather data unavailable."

    # --- NEW RESTAURANT FORMATTING LOGIC ---
    formatted_restaurants = []
    if restaurants and isinstance(restaurants[0], dict) and "error" not in restaurants[0]:
        for r in restaurants:
            r_name = r.get("name", "Local Spot")
            r_rating = r.get("rating", "N/A")
            r_price = r.get("price", "")
            r_price_str = f", {r_price}" if r_price else ""
            r_desc = r.get("details", r.get("description", ""))
            
            # Format nicely: Name (⭐4.5, $$) — Description
            formatted_restaurants.append(f"{r_name} (⭐{r_rating}{r_price_str}) — {r_desc}")
    elif restaurants and isinstance(restaurants[0], str):
        # Fallback if somehow it's a list of strings
        formatted_restaurants = restaurants

    # Safely grab day 1 and day 2 options (fallback if lists are empty)
    r_day1 = formatted_restaurants[0] if len(formatted_restaurants) > 0 else "a highly-rated local restaurant"
    r_day2 = formatted_restaurants[1] if len(formatted_restaurants) > 1 else r_day1

    itinerary = f"""
╔══════════════════════════════════════════════════════════╗
║          🌍 YOUR COMPLETE TRIP PLAN                    ║
║     {origin} → {dest}  |  {start} to {end}            ║
╚══════════════════════════════════════════════════════════╝

✈️  FLIGHT    : {f_info}
🚆  TRAIN     : {t_info}
🏨  HOTEL     : {h_info}

🌦  DAY-BY-DAY WEATHER & ADVICE:
{w_info}

📰  LOCAL TIP : {news_items[0] if news_items else 'N/A'}

─────────────────────────────────────────────────────────
 📅 DAY-BY-DAY ITINERARY
─────────────────────────────────────────────────────────
Day 1 — Arrival
  • Board your transportation from {origin}
  • Check-in at: {h_info}
  • Evening: Dinner at {r_day1}
  • Explore the hotel area and rest

Day 2 — Exploration
  • Morning: Iconic sightseeing in {dest}
  • Afternoon: Local markets & cultural hubs
  • Evening: Dinner at {r_day2}
  • Night: Leisure at hotel

Day 3 — Departure
  • Morning: Final breakfast & hotel checkout
  • Last-minute sightseeing
  • Head home for return journey

📌 Local Tips:
{chr(10).join(f'  • {n}' for n in news_items)}
"""
    print("Itinerary ready!")
    tl = [{"id": str(uuid.uuid4()), "from": "itinerary_agent", "to": "itinerary_hitl", "message": "Final itinerary drafted."}]
    return {"final_itinerary": itinerary, "status_log": [msg, "Final itinerary generated!"], "timeline": tl}