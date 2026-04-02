
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

class DailyWeather(BaseModel):
    date: str = Field(description="Date of the forecast (YYYY-MM-DD).")
    max_temp: float = Field(description="Maximum temperature for the day.")
    min_temp: float = Field(description="Minimum temperature for the day.")
    conditions: str = Field(description="Short description of the weather (e.g., Sunny, Rain, Cloudy).")
    precipitation_chance: float = Field(description="Probability of precipitation as a percentage (0-100).")
    travel_advice: str = Field(description="A short, actionable tip for the traveler based on this day's specific weather (e.g., 'Bring an umbrella', 'Perfect day for outdoor sightseeing').")

class WeatherForecast(BaseModel):
    daily_forecasts: List[DailyWeather] = Field(description="List of daily weather forecasts for the duration of the trip.")
    

def weather_agent(state: dict) -> dict:
    logs = ["🌦 Weather Agent: Fetching forecast from Visual Crossing API..."]
    print(logs[0])

    trip = state.get("trip_details", {})
    task = state.get("agent_tasks", {}).get("weather_agent", {})

    dest_city = trip.get("destination", "Unknown")
    start_date = trip.get("start_date")
    end_date = trip.get("end_date")
    
    # Check preferred units from Orchestrator's task
    units = task.get("preferred_units", "celsius").lower()
    unit_group = "us" if units == "fahrenheit" else "metric"
    temp_symbol = "°F" if units == "fahrenheit" else "°C"

    # ── Human feedback from previous HITL interrupt ──────────────────────────
    human_feedback = state.get("human_feedback", "").strip()
    feedback_clause = (
        f"\n\n⚠️ USER FEEDBACK: \"{human_feedback}\""
        "\nAdjust your weather advice to address this feedback."
        if human_feedback else ""
    )
    
    api_key = os.getenv("VISUAL_CROSSING_API_KEY")

    if not api_key:
        msg = "⚠️ Missing VISUAL_CROSSING_API_KEY in environment."
        logs.append(msg); print(msg)
        return {"scraped_data": {"weather": [{"error": msg}]}, "status_log": logs}

    # --- STEP 1: Fetch Raw Data from Visual Crossing ---
    try:
        # Visual Crossing Timeline API takes location/start_date/end_date natively
        url = f"https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/{dest_city}/{start_date}/{end_date}"
        params = {
            "unitGroup": unit_group,
            "key": api_key,
            "contentType": "json"
        }
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        raw_weather_data = resp.json().get("days", [])
    except Exception as e:
        logs.append(f"❌ Weather API error: {e}")
        print(logs[-1])
        return {"scraped_data": {"weather": [{"error": str(e)}]}, "status_log": logs}

    # --- STEP 2: Condense the massive JSON payload ---
    condensed_weather = []
    for day in raw_weather_data:
        condensed_weather.append({
            "date": day.get("datetime"),
            "max_temp": day.get("tempmax"),
            "min_temp": day.get("tempmin"),
            "conditions": day.get("conditions"),
            "precip_prob": day.get("precipprob"),
            "wind_speed": day.get("windspeed")
        })

    if not condensed_weather:
        return {"scraped_data": {"weather": [{"error": "No weather data returned for these dates."}]}, "status_log": logs}

    # --- STEP 3: LLM Analysis & Structuring ---
    logs.append(f"🧠 Weather Agent: LLM structuring {len(condensed_weather)} days of weather and generating travel advice...")
    print(logs[-1])

    try:
        llm = ChatCohere(model="command-r-08-2024", temperature=0)
        evaluator_llm = llm.with_structured_output(WeatherForecast)

        eval_prompt = ChatPromptTemplate.from_messages([
            ("system", f"""You are an expert travel meteorologist. Review the following daily weather data for the user's destination. 
            Format it into the requested structure. 
            Most importantly, provide a short, highly practical 'travel_advice' for each day based on the conditions and temperature (e.g., 'Bring a heavy coat', 'Wear sunscreen', 'Keep indoor backup plans ready').{feedback_clause}"""),
            ("human", "Destination: {destination}\nUnits: {units}\nWeather Data:\n{weather_data}")
        ])

        analyzed_weather: WeatherForecast = (eval_prompt | evaluator_llm).invoke({
            "destination": dest_city,
            "units": "Celsius" if unit_group == "metric" else "Fahrenheit",
            "weather_data": json.dumps(condensed_weather, indent=2)
        })

        # --- STEP 4: Format for State ---
        results = []
        for day in analyzed_weather.daily_forecasts:
            results.append({
                "type": "weather",
                "date": day.date,
                "max_temp": day.max_temp,
                "min_temp": day.min_temp,
                "conditions": day.conditions,
                "precipitation_chance": day.precipitation_chance,
                "travel_advice": day.travel_advice,
                "symbol": temp_symbol
            })
            log = f"✅ Weather [{day.date}]: {day.conditions}, {day.max_temp}{temp_symbol} / {day.min_temp}{temp_symbol} | Tip: {day.travel_advice}"
            logs.append(log); print(log)

    except Exception as e:
        logs.append(f"⚠️ LLM eval failed ({e}), using raw condensed data.")
        results = [{
            "date": d["date"], "max_temp": d["max_temp"], "min_temp": d["min_temp"],
            "conditions": d["conditions"], "travel_advice": f"Prepare for {d['conditions']}",
            "symbol": temp_symbol
        } for d in condensed_weather]

    return {"scraped_data": {"weather": results}, "status_log": logs}
