
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

class SelectedTrain(BaseModel):
    train_name: str = Field(description="Name or number of the train")
    departure_time: str = Field(description="Departure time")
    arrival_time: str = Field(description="Arrival time")
    duration: str = Field(description="Total travel time")
    price: float = Field(description="Ticket price (numeric)")
    reasoning: str = Field(description="Why this train perfectly matches the user's preferences")

class TrainSelection(BaseModel):
    best_trains: List[SelectedTrain] = Field(description="Top 1 to 3 recommended trains")

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

    # ── Human feedback from previous HITL interrupt ──────────────────────────
    human_feedback = state.get("human_feedback", "").strip()
    feedback_clause = (
        f"\n\n⚠️ USER FEEDBACK ON PREVIOUS TRAIN RESULTS: \"{human_feedback}\""
        "\nAdjust your train selection to address this feedback."
        if human_feedback else ""
    )

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
            ("system", f"Review the JSON list of available trains. Pick exactly the 3 best `option_id`s that match the user's Time Preference ({{time_preference}}) and Train Type ({{train_type}}). Do not worry about price yet.{feedback_clause}"),
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
