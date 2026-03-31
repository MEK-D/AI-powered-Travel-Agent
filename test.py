"""
test.py — 3-Phase Human-in-the-Loop LangGraph Travel Concierge
================================================================
Phase 1 → flight_agent (REAL) / train_agent (REAL)  → interrupt
Phase 2 → hotel_agent (REAL) + weather_agent + news_agent (REAL, parallel) → interrupt
Phase 3 → restaurant_agent → itinerary_agent  (sequential)
"""

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
langchain.debug = True

load_dotenv()

# ──────────────────────────────────────────────────────────────────
# PYDANTIC SCHEMAS
# ──────────────────────────────────────────────────────────────────
class TripDetails(BaseModel):
    origin: str = Field(description="City they are leaving from.")
    destination: str = Field(description="City they are traveling to.")
    start_date: str = Field(description="YYYY-MM-DD")
    end_date: str = Field(description="YYYY-MM-DD")
    number_of_travelers: int = Field(default=1)
    total_budget: float = Field(default=0.0, description="Total budget for the entire trip in USD.")

class FlightTask(BaseModel):
    seat_class: Optional[str] = Field(default="economy")
    preferred_airline: Optional[str] = None
    date_of_booking: str
    date_of_return: str
    time_preference: Optional[str] = Field(default="Any time")

class TrainTask(BaseModel):
    train_type: Optional[str] = Field(default="standard")
    seat_class: Optional[str] = Field(default="standard")
    date_of_booking: str
    date_of_return: str
    time_preference: Optional[str] = Field(default="Any time")


class HotelTask(BaseModel):
    vibe_preference: Optional[str] = Field(default="standard"
    )
    room_type: Optional[str] = None
    date_of_bookings: List[str] = Field(default_factory=list)

class RestaurantTask(BaseModel):
    cuisine_preference: Optional[str] = Field(default="local")
    price_tier: Optional[str] = Field(default="medium")

class WeatherTask(BaseModel):
    preferred_units: str = Field(default="celsius")

class NewsTask(BaseModel):
    interests: List[str] = Field(default_factory=lambda: ["events"])

class ItineraryTask(BaseModel):
    pace: Optional[str] = Field(default="moderate")
    activity_vibes: List[str] = Field(default_factory=lambda: ["tourist highlights"])

class RoadTask(BaseModel):
    needs_rental: bool = False
    route_preference: Optional[str] = Field(default="fastest")

class OrchestratorPlan(BaseModel):
    trip_details: TripDetails
    required_agents: List[str]
    flight_task: Optional[FlightTask] = None
    train_task: Optional[TrainTask] = None
    road_task: Optional[RoadTask] = None
    hotel_task: Optional[HotelTask] = None
    restaurant_task: Optional[RestaurantTask] = None
    weather_task: Optional[WeatherTask] = None
    news_task: Optional[NewsTask] = None
    itinerary_task: Optional[ItineraryTask] = None


class SelectedFlight(BaseModel):
    airline: str
    departure_time: str
    arrival_time: str
    price: float
    timing_notes: str
    reasoning: str

class FlightSelection(BaseModel):
    best_flights: List[SelectedFlight]

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


class SelectedTrain(BaseModel):
    train_name: str = Field(description="Name or number of the train")
    departure_time: str = Field(description="Departure time")
    arrival_time: str = Field(description="Arrival time")
    duration: str = Field(description="Total travel time")
    price: float = Field(description="Ticket price (numeric)")
    reasoning: str = Field(description="Why this train perfectly matches the user's preferences")

class TrainSelection(BaseModel):
    best_trains: List[SelectedTrain] = Field(description="Top 1 to 3 recommended trains")


class TravelNewsItem(BaseModel):
    headline: str = Field(description="The exact news headline")
    impact_summary: str = Field(description="A short 1-sentence explanation of how this specifically affects a traveler visiting the area.")
    severity_level: str = Field(description="'High', 'Medium', or 'Low' impact on travel plans.")

class FilteredTravelNews(BaseModel):
    relevant_news: List[TravelNewsItem] = Field(description="List of news items that impact travel. Can be empty if no significant travel news exists.")



# ──────────────────────────────────────────────────────────────────
# STATE
# ──────────────────────────────────────────────────────────────────
def _merge(a: Dict, b: Dict) -> Dict:
    out = dict(a or {})
    for k, v in (b or {}).items():
        if k in out and isinstance(out[k], list) and isinstance(v, list):
            out[k] = out[k] + v
        else:
            out[k] = v
    return out

class TripState(TypedDict):
    user_request:    str
    trip_details:    dict
    required_agents: List[str]
    agent_tasks:     Dict[str, dict]
    scraped_data:    Annotated[Dict[str, list], _merge]
    human_feedback:  str
    phase1_approved: bool
    phase2_approved: bool
    final_itinerary: str
    status_log:      Annotated[List[str], operator.add]   # streaming log

import operator  # needed for the Annotated reducer above


# ──────────────────────────────────────────────────────────────────
# HELPER — log helper
# ──────────────────────────────────────────────────────────────────
def _log(msg: str) -> dict:
    print(msg)
    return {"status_log": [msg]}


# ──────────────────────────────────────────────────────────────────
# ORCHESTRATOR
# ──────────────────────────────────────────────────────────────────
# ──────────────────────────────────────────────────────────────────
# ORCHESTRATOR
# ──────────────────────────────────────────────────────────────────
def orchestrator_node(state: TripState) -> dict:
    msg = "🧠 Orchestrator: Parsing request & building execution plan..."
    print(msg)

    llm = ChatCohere(model="command-r-08-2024", temperature=0, max_retries=1)
    structured = llm.with_structured_output(OrchestratorPlan)
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Grab the trip details passed in during graph invocation
    trip = state.get("trip_details", {})

    prompt = ChatPromptTemplate.from_messages([
        ("system", f"""You are the master Orchestrator for an AI Travel Concierge.
Today's date is {today}.

The user has already provided the following trip details:
- Origin: {{origin}}
- Destination: {{destination}}
- Dates: {{start_date}} to {{end_date}}
- Travelers: {{number_of_travelers}}
- Budget: ${{total_budget}}

Your job is to decide which agents to activate based on their prompt:
[flight_agent, train_agent, road_agent, hotel_agent, restaurant_agent, weather_agent, news_agent, itinerary_agent]

Rules:
- Always include: itinerary_agent, hotel_agent, weather_agent, news_agent
- If user says "by flight" → activate flight_agent
- If user mentions something like food/dining/eating/meal → activate restaurant_agent
- DO NOT over-provision. If they are driving, do not call the flight agent.
- Fill out the specific tasks (preferences) ONLY for the agents you are activating."""),
        ("human", "User Request: {user_request}, trip details: {trip_details}")
    ])

    try:
        # Pass the state variables directly into the prompt context
        plan: OrchestratorPlan = (prompt | structured).invoke({
            "user_request": state.get("user_request", ""),
            "trip_details": trip,
            "origin": trip.get("origin", "Unknown"),
            "destination": trip.get("destination", "Unknown"),
            "start_date": trip.get("start_date", "Unknown"),
            "end_date": trip.get("end_date", "Unknown"),
            "number_of_travelers": trip.get("number_of_travelers", 1),
            "total_budget": trip.get("total_budget", 0)
        })
    except Exception as e:
        print(f"❌ Orchestrator LLM error: {e}")
        # Fallback plan
        return {
            "required_agents":  ["flight_agent", "hotel_agent", "weather_agent", "news_agent", "restaurant_agent", "itinerary_agent"],
            "agent_tasks":      {"flight_agent": {}, "hotel_agent": {}, "weather_agent": {}, "news_agent": {}, "restaurant_agent": {}, "itinerary_agent": {}},
            "phase1_approved":  False,
            "phase2_approved":  False,
            "status_log":       [msg, f"❌ Fallback activated due to error: {e}"],
        }

    required = list(plan.required_agents)
    for must in ["itinerary_agent", "hotel_agent", "weather_agent", "news_agent"]:
        if must not in required:
            required.append(must)

    print(f"🔀 Activated agents: {required}")

    task_map = {
        "flight_agent":     plan.flight_task,
        "train_agent":      plan.train_task,
        "road_agent":       plan.road_task,
        "hotel_agent":      plan.hotel_task,
        "restaurant_agent": plan.restaurant_task,
        "weather_agent":    plan.weather_task,
        "news_agent":       plan.news_task,
        "itinerary_agent":  plan.itinerary_task,
    }
    
    agent_tasks = {n: (t.dict(exclude_none=True) if t else {}) for n, t in task_map.items() if n in required}

    return {
        # Note: We don't return "trip_details" here anymore because it's already in the global state!
        "required_agents":  required,
        "agent_tasks":      agent_tasks,
        "phase1_approved":  False,
        "phase2_approved":  False,
        "status_log":       [msg, f"✅ Plan built. Agents: {required}"],
    }


# ──────────────────────────────────────────────────────────────────
# PHASE 1 — FLIGHT AGENT (REAL)
# ──────────────────────────────────────────────────────────────────
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
            ("system", "Pick the best 1-2 flights considering price, layovers, and time preference. Provide timing_notes and reasoning."),
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


class TopTrainCandidates(BaseModel):
    option_ids: List[int] = Field(description="A list containing exactly the option_id of the top 3 selected trains.")

def train_agent(state: dict) -> dict:
    logs = ["🚆 Train Agent: Waking up and preparing RapidAPI IRCTC search..."]
    print(logs[0])

    trip = state.get("trip_details", {})
    task = state.get("agent_tasks", {}).get("train_agent", {})

    origin_city  = trip.get("origin", "Unknown")
    dest_city    = trip.get("destination", "Unknown")
    start_date   = trip.get("start_date")
    total_budget = trip.get("total_budget", 0.0)

    # Extract specific train preferences from orchestrator
    time_preference = task.get("time_preference", "Any time")
    seat_class      = task.get("seat_class", "standard")
    train_type      = task.get("train_type", "standard")

    rapidapi_key = os.getenv("RAPIDAPI_KEY")
    llm = ChatCohere(model="command-r-08-2024", temperature=0)

    logs.append(f"🚆 Route: {origin_city} → {dest_city} on {start_date} | Pref: {time_preference}, {seat_class} class")
    print(logs[-1])

    # --- STEP 1: Resolve city names → Indian Railway station codes via LLM ---
    try:
        station_prompt = ChatPromptTemplate.from_template(
            "Respond with ONLY the official Indian Railway station code (uppercase, typically 2-4 letters) "
            "for the main railway station in {city}. No explanation. Example: New Delhi → NDLS, Mumbai → CSTM, Goa → MAO."
        )
        origin_code = (station_prompt | llm).invoke({"city": origin_city}).content.strip().upper()
        dest_code   = (station_prompt | llm).invoke({"city": dest_city}).content.strip().upper()
    except Exception as e:
        logs.append(f"❌ Station code lookup failed: {e}")
        return {"scraped_data": {"trains": [{"error": str(e)}]}, "status_log": logs}

    # --- STEP 2: Fetch ALL available trains ---
    try:
        url = "https://irctc1.p.rapidapi.com/api/v3/trainBetweenStations"
        querystring = {
            "fromStationCode": origin_code,
            "toStationCode":   dest_code,
            "dateOfJourney":   start_date,
        }
        headers = {
            "X-RapidAPI-Key":  rapidapi_key,
            "X-RapidAPI-Host": "irctc1.p.rapidapi.com",
        }
        response = requests.get(url, headers=headers, params=querystring, timeout=20)
        response.raise_for_status()
        raw_trains = response.json().get("data", [])
    except Exception as e:
        logs.append(f"❌ Train API error: {e}")
        print(logs[-1])
        return {"scraped_data": {"trains": [{"error": str(e)}]}, "status_log": logs}

    # Condense the JSON payload (No Fares yet)
    condensed_trains = []
    for i, t in enumerate(raw_trains[:20]):
        try:
            train_name   = t.get("train_name", t.get("train_number", "Unknown Train"))
            train_number = t.get("train_number", "")
            condensed_trains.append({
                "option_id":         i + 1,
                "train_name":        f"{train_name} ({train_number})" if train_number else train_name,
                "train_number":      train_number,
                "departure_time":    t.get("from_std", t.get("departure_time", "Unknown")),
                "arrival_time":      t.get("to_std", t.get("arrival_time", "Unknown")),
                "duration":          t.get("duration", "Unknown"),
                "available_classes": t.get("class_type", []),
            })
        except Exception:
            continue

    if not condensed_trains:
        msg = f"No trains found for {origin_code} → {dest_code} on {start_date}."
        logs.append(f"⚠️ {msg}")
        return {"scraped_data": {"trains": [{"error": msg}]}, "status_log": logs}

    # --- STEP 3: LLM Pass 1 - Filter to Top 3 (Based on Preferences) ---
    logs.append("🧠 LLM Pass 1: Filtering raw trains down to Top 3 candidates...")
    print(logs[-1])
    try:
        eval_llm_1 = llm.with_structured_output(TopTrainCandidates)
        prompt_1 = ChatPromptTemplate.from_messages([
            ("system", "Review the JSON list of available trains. Pick exactly the 3 best `option_id`s that match the user's Time Preference ({time_preference}) and Train Type ({train_type}). Do not worry about price yet."),
            ("human", "Available Trains:\n{trains}")
        ])
        top_candidates: TopTrainCandidates = (prompt_1 | eval_llm_1).invoke({
            "trains": json.dumps(condensed_trains, indent=2),
            "time_preference": time_preference,
            "train_type": train_type
        })
        
        # Extract the actual train objects based on the LLM's chosen IDs
        top_3_trains = [t for t in condensed_trains if t["option_id"] in top_candidates.option_ids][:3]
        if not top_3_trains: raise ValueError("LLM returned invalid option IDs.")
    except Exception as e:
        logs.append(f"⚠️ LLM Pass 1 failed ({e}). Defaulting to top 3 trains.")
        top_3_trains = condensed_trains[:3]


    # --- STEP 4: Fetch Fares ONLY for the Top 3 Trains ---
    logs.append(f"🚆 Fetching precise fares for the 3 shortlisted trains...")
    enriched_top_3 = []
    
    for t in top_3_trains:
        fare_data = {}
        train_number = t.get("train_number")
        if train_number:
            try:
                fare_url = "https://irctc1.p.rapidapi.com/api/v1/getFare"
                fare_qs = {"trainNo": train_number, "fromStationCode": origin_code, "toStationCode": dest_code}
                fare_resp = requests.get(fare_url, headers=headers, params=fare_qs, timeout=10)
                
                if fare_resp.status_code == 200:
                    f_json = fare_resp.json()
                    f_data = f_json.get("data", [])
                    
                    if isinstance(f_data, list):
                        for f_item in f_data:
                            c_type = f_item.get("classType", f_item.get("enqClass"))
                            f_amt = f_item.get("fare", f_item.get("totalFare", 0))
                            if c_type: fare_data[c_type] = float(f_amt)
                    elif isinstance(f_data, dict):
                        for cls_key, cls_val in f_data.items():
                            if isinstance(cls_val, dict) and "totalFare" in cls_val:
                                fare_data[cls_key] = float(cls_val["totalFare"])
                            elif isinstance(cls_val, (int, float)):
                                fare_data[cls_key] = float(cls_val)
            except Exception as fe:
                logs.append(f"⚠️ Fare fetch failed for train {train_number}: {fe}")

        # Add the fare data to the train object
        t["class_fares"] = fare_data if fare_data else "Fare API unavailable"
        enriched_top_3.append(t)


    # --- STEP 5: LLM Pass 2 - Final Selection (Based on Exact Budget & Price) ---
    logs.append(f"🧠 LLM Pass 2: Selecting the single BEST train considering the ${total_budget} total budget...")
    print(logs[-1])

    try:
        eval_llm_2 = llm.with_structured_output(TrainSelection)
        prompt_2 = ChatPromptTemplate.from_messages([
            ("system", """You are an elite travel concierge. Review the final 3 shortlisted trains and their exact class-wise fares.
            
            YOUR GOAL: Pick the SINGLE BEST train from these options.
            
            CRITICAL BUDGET INSTRUCTIONS:
            1. The user's TOTAL trip budget is ${total_budget} USD. 
            2. Train fares are provided in INR (Indian Rupees). Convert INR to USD (divide by 83) to understand the real cost.
            3. Train travel should only take up a reasonable fraction of a total trip budget (usually 5% - 20%). Be wise about which class and train to select so you don't exhaust their budget before they even book a hotel.
            
            Output your final selection matching the requested `seat_class` ({seat_class}). 
            Ensure you output the exact numeric price you found in `class_fares`. Provide strong reasoning explaining why this fits their schedule AND their holistic trip budget.
            """),
            ("human", "Shortlisted Trains:\n{trains}")
        ])

        final_decision: TrainSelection = (prompt_2 | eval_llm_2).invoke({
            "trains":       json.dumps(enriched_top_3, indent=2),
            "total_budget": total_budget,
            "seat_class":   seat_class,
        })

        # --- STEP 6: Format Output for LangGraph State ---
        # Even though the LLM might return a list of 1 inside `best_trains`, we'll parse it out safely.
        results = []
        for t in (final_decision.best_trains[:1] or []): # Force strictly top 1
            results.append({
                "type":       "train",
                "train_name": t.train_name,
                "departure":  t.departure_time,
                "arrival":    t.arrival_time,
                "duration":   t.duration,
                "cost":       t.price,
                "details":    t.reasoning,
            })
            log = f"✅ Final Selected Train: {t.train_name} | ₹{t.price} | Reason: {t.reasoning[:50]}..."
            logs.append(log)
            print(log)

    except Exception as e:
        logs.append(f"⚠️ LLM Pass 2 failed ({e}), using top raw result from shortlist")
        fallback_train = enriched_top_3[0]
        fallback_fares = fallback_train.get("class_fares", {})
        fallback_price = list(fallback_fares.values())[0] if isinstance(fallback_fares, dict) and fallback_fares else 0.0

        results = [{
            "type": "train",
            "train_name": fallback_train["train_name"],
            "departure":  fallback_train["departure_time"],
            "arrival":    fallback_train["arrival_time"],
            "duration":   fallback_train["duration"],
            "cost":       fallback_price,
            "details":    "LLM final eval unavailable, auto-selected top shortlisted train.",
        }]

    return {"scraped_data": {"trains": results}, "status_log": logs}

def phase1_collector(state: TripState) -> dict:
    print("📥 Phase 1 Collector: All transportation data gathered.")
    return {"status_log": ["📥 Phase 1: Transportation data collected. Awaiting approval."]}


def phase1_approval(state: TripState) -> dict:
    """Graph pauses HERE via interrupt_before. UI reads state; user approves."""
    print("\n⏸️  GRAPH PAUSED — Phase 1 approval gate")
    return {"status_log": ["⏸️ Waiting for Phase 1 user approval..."]}


# ──────────────────────────────────────────────────────────────────
# PHASE 2 — HOTEL (REAL) + WEATHER + NEWS (dummy, parallel)
# ──────────────────────────────────────────────────────────────────
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
            ("system", "Pick best 1-2 hotels. You MUST preserve the exact 'gps_coordinates' and 'nearby_places' provided in the source data."),
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

    return {"scraped_data": {"hotels": results}, "status_log": logs}


def weather_agent(state: dict) -> dict:
    dest = state.get("trip_details", {}).get("destination", "Destination")
    msg  = f"🌦 Weather Agent (dummy): Sunny 28-32°C in {dest}. Low chance of rain."
    print(msg)
    return {"scraped_data": {"weather": [f"Sunny and pleasant in {dest}. Expect 28–32°C."]}, "status_log": [msg]}


def news_agent(state: dict) -> dict:
    logs = ["📰 News Agent: Waking up and preparing Google News search..."]
    print(logs[0])

    trip = state.get("trip_details", {})
    dest_city = trip.get("destination", "Unknown")
    serpapi_key = os.getenv("SERPAPI_KEY")

    logs.append(f"📰 Fetching latest news for: {dest_city}")
    print(logs[-1])

    # --- STEP 1: Fetch Google News Data via SerpApi ---
    try:
        query = f"{dest_city} (travel OR tourism OR strike OR weather OR festival OR event)"
        params = {
            "engine":  "google_news",
            "q":       query,
            "gl":      "us",
            "hl":      "en",
            "api_key": serpapi_key,
        }
        response = requests.get("https://serpapi.com/search", params=params, timeout=20)
        response.raise_for_status()
        raw_news = response.json().get("news_results", [])
    except Exception as e:
        logs.append(f"❌ Failed to fetch SerpApi News data: {e}")
        print(logs[-1])
        return {"scraped_data": {"news": ["Could not fetch local news."]}, "status_log": logs}

    # --- STEP 2: Condense the JSON payload ---
    condensed_news = []
    for item in raw_news[:15]:
        title   = item.get("title", "")
        snippet = item.get("snippet", "")
        date    = item.get("date", "Recent")
        if title:
            condensed_news.append({"title": title, "snippet": snippet, "date": date})

    if not condensed_news:
        logs.append(f"⚠️ No recent news found for {dest_city}.")
        return {"scraped_data": {"news": ["No major recent news events found."]}, "status_log": logs}

    # --- STEP 3: LLM Evaluation with Cohere ---
    logs.append(f"🧠 News Agent: Evaluating {len(condensed_news)} headlines for travel impact...")
    print(logs[-1])

    try:
        llm = ChatCohere(model="command-r-08-2024", temperature=0)
        evaluator_llm = llm.with_structured_output(FilteredTravelNews)

        evaluation_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an elite Travel Risk and Event Analyst.
            Review the following list of recent news headlines for the user's destination.
            Filter out all irrelevant local news (e.g., sports, local business, minor politics).
            Keep ONLY the news that will directly impact a tourist's experience. This includes:
            - Transit strikes or airport disruptions
            - Severe weather or natural disasters
            - Safety, protests, or health advisories
            - Major local festivals, holidays, or massive events

            If none of the news affects a traveler, return an empty list."""),
            ("human", "Destination: {destination}\n\nRecent News:\n{news}")
        ])

        analyzed_news: FilteredTravelNews = (evaluation_prompt | evaluator_llm).invoke({
            "destination": dest_city,
            "news":        json.dumps(condensed_news, indent=2),
        })

        # --- STEP 4: Format for LangGraph State ---
        final_news_data = []

        if not analyzed_news.relevant_news:
            final_news_data = ["No major travel-impacting news reported recently."]
            logs.append("✅ No high-impact travel news found.")
        else:
            for n in analyzed_news.relevant_news:
                formatted_item = f"[{n.severity_level} IMPACT] {n.headline} — {n.impact_summary}"
                final_news_data.append(formatted_item)
                log = f"✅ Extracted News: {formatted_item}"
                logs.append(log)
                print(log)

    except Exception as e:
        logs.append(f"⚠️ LLM eval failed ({e}), using raw top headline.")
        top_headline = condensed_news[0]["title"]
        final_news_data = [f"Latest Headline: {top_headline}"]

    return {"scraped_data": {"news": final_news_data}, "status_log": logs}


def phase2_collector(state: TripState) -> dict:
    print("📥 Phase 2 Collector: Hotel/Weather/News gathered.")
    return {"status_log": ["📥 Phase 2: Basecamp data collected. Awaiting approval."]}


def phase2_approval(state: TripState) -> dict:
    """Graph pauses HERE via interrupt_before."""
    print("\n⏸️  GRAPH PAUSED — Phase 2 approval gate")
    return {"status_log": ["⏸️ Waiting for Phase 2 user approval..."]}


# ──────────────────────────────────────────────────────────────────
# PHASE 3 — RESTAURANT (dummy) → ITINERARY (real synthesis)
# ──────────────────────────────────────────────────────────────────
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
    weather      = data.get("weather", ["Pleasant weather"])
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

    itinerary = f"""
╔══════════════════════════════════════════════════════════╗
║          🌍 YOUR COMPLETE TRIP PLAN                    ║
║     {origin} → {dest}  |  {start} to {end}            ║
╚══════════════════════════════════════════════════════════╝

✈️  FLIGHT    : {f_info}
🚆  TRAIN     : {t_info}
🏨  HOTEL     : {h_info}
🌦  WEATHER   : {weather[0] if weather else 'N/A'}
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

def road_agent(state: dict) -> dict:
    return {"scraped_data": {"road": ["Dummy road data"]}, "status_log": ["🚗 Road Agent: dummy"]}


# ──────────────────────────────────────────────────────────────────
# ROUTERS
# ──────────────────────────────────────────────────────────────────
def phase1_router(state: TripState):
    required = state.get("required_agents", [])
    tasks    = state.get("agent_tasks", {})
    trip     = state.get("trip_details", {})
    sends = []
    for ag in ["flight_agent", "train_agent"]:
        if ag in required:
            sends.append(Send(ag, {"agent_tasks": {ag: tasks.get(ag, {})}, "trip_details": trip}))
    # If no transport agent, fall straight to collector
    return sends if sends else []


def phase2_router(state: TripState):
    required = state.get("required_agents", [])
    tasks    = state.get("agent_tasks", {})
    trip     = state.get("trip_details", {})
    sends = []
    for ag in ["hotel_agent", "weather_agent", "news_agent"]:
        if ag in required:
            sends.append(Send(ag, {"agent_tasks": {ag: tasks.get(ag, {})}, "trip_details": trip}))
    return sends


# ──────────────────────────────────────────────────────────────────
# GRAPH CONSTRUCTION
# ──────────────────────────────────────────────────────────────────
workflow = StateGraph(TripState)

# Nodes
workflow.add_node("orchestrator",     orchestrator_node)
workflow.add_node("flight_agent",     flight_agent)
workflow.add_node("train_agent",      train_agent)
workflow.add_node("phase1_collector", phase1_collector)
workflow.add_node("phase1_approval",  phase1_approval)
workflow.add_node("hotel_agent",      hotel_agent)
workflow.add_node("weather_agent",    weather_agent)
workflow.add_node("news_agent",       news_agent)
workflow.add_node("phase2_collector", phase2_collector)
workflow.add_node("phase2_approval",  phase2_approval)
workflow.add_node("restaurant_agent", restaurant_agent)
workflow.add_node("itinerary_agent",  itinerary_agent)
workflow.add_node("road_agent",       road_agent)

# Edges — Phase 1
workflow.add_edge(START, "orchestrator")
workflow.add_conditional_edges("orchestrator", phase1_router, ["flight_agent", "train_agent"])
workflow.add_edge("flight_agent",      "phase1_collector")
workflow.add_edge("train_agent",       "phase1_collector")
workflow.add_edge("phase1_collector",  "phase1_approval")

# Edges — Phase 2
workflow.add_conditional_edges("phase1_approval", phase2_router, ["hotel_agent", "weather_agent", "news_agent"])
workflow.add_edge("hotel_agent",       "phase2_collector")
workflow.add_edge("weather_agent",     "phase2_collector")
workflow.add_edge("news_agent",        "phase2_collector")
workflow.add_edge("phase2_collector",  "phase2_approval")

# Edges — Phase 3 (sequential)
workflow.add_edge("phase2_approval",   "restaurant_agent")
workflow.add_edge("restaurant_agent",  "itinerary_agent")
workflow.add_edge("itinerary_agent",   END)

# Compile with MemorySaver
memory = MemorySaver()
app = workflow.compile(
    checkpointer=memory,
    interrupt_before=["phase1_approval", "phase2_approval"],
)

print("✅ 3-Phase HiTL graph compiled!")
