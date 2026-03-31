
from __future__ import annotations
import operator
import operator
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

    flights      = data.get("flights", [])
    hotels       = data.get("hotels", [])
    weather      = data.get("weather", [])
    news_items   = data.get("news", [])
    restaurants  = data.get("restaurants", ["Local eateries"])

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

    # --- NEW WEATHER FORMATTING LOGIC ---
    w_info_lines = []
    if weather and isinstance(weather[0], dict) and "error" not in weather[0] and "date" in weather[0]:
        for w in weather:
            sym = w.get("symbol", "°")
            w_line = f"    {w.get('date')}: {w.get('conditions')} ({w.get('max_temp')}{sym} / {w.get('min_temp')}{sym}) 💡 {w.get('travel_advice')}"
            w_info_lines.append(w_line)
        w_info = "\n".join(w_info_lines)
    else:
        # Fallback for errors or dummy data
        if weather and isinstance(weather[0], dict) and "error" in weather[0]:
            w_info = f"    ⚠️ {weather[0]['error']}"
        elif weather and isinstance(weather[0], str):
            w_info = f"    {weather[0]}"
        else:
            w_info = "    Weather data unavailable."

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
  • Evening: Dinner at {restaurants[0] if restaurants else 'local spot'}
  • Explore the hotel area and rest

Day 2 — Exploration
  • Morning: Iconic sightseeing in {dest}
  • Afternoon: Local markets & cultural hubs
  • Evening: Dinner at {restaurants[1] if len(restaurants)>1 else (restaurants[0] if restaurants else 'local restaurant')}
  • Night: Leisure at hotel

Day 3 — Departure
  • Morning: Final breakfast & hotel checkout
  • Last-minute sightseeing
  • Head home for return journey

📌 Local Tips:
{chr(10).join(f'  • {n}' for n in news_items)}
"""
    print("✅ Itinerary ready!")
    return {"final_itinerary": itinerary, "status_log": [msg, "✅ Final itinerary generated!"]}


