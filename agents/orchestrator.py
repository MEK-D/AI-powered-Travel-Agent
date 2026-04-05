
from __future__ import annotations
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

class site_seeing_task(BaseModel):
    destination: str = Field(description="City they are traveling to.")

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
    site_seeing_task: Optional[site_seeing_task] = None
    
    


def orchestrator_node(state: TripState) -> dict:
    msg = "🧠 Orchestrator: Parsing request & building execution plan..."
    print(msg)

    llm = ChatCohere(model="command-r-08-2024", temperature=0, max_retries=1)
    structured = llm.with_structured_output(OrchestratorPlan)
    today = datetime.now().strftime("%Y-%m-%d")

    # ── Incorporate any user feedback from a previous HITL interrupt ──────────
    human_feedback = state.get("human_feedback", "").strip()
    feedback_clause = (
        f"\n\n⚠️  USER FEEDBACK ON PREVIOUS PLAN: \"{human_feedback}\""
        "\nRevise the agent selection and task parameters to satisfy this feedback."
        if human_feedback else ""
    )
    
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
[flight_agent, train_agent, road_agent, hotel_agent, restaurant_agent, weather_agent, news_agent, itinerary_agent, site_seeing_agent]
site_seeing_agent: Recommends tourist attractions, landmarks, and activities at the destination.
itinerary_agent: Creates a day-by-day itinerary based on the trip details and other agent outputs.
weather_agent: Provides weather forecasts for the destination during the travel dates.
news_agent: Provides relevant news about the destination during the travel dates.
hotel_agent: Finds hotels that match the user's preferences and budget.
restaurant_agent: Recommends restaurants at the destination based on cuisine and price preferences.
flight_agent: Finds flight options based on the trip details and user preferences.
train_agent: Finds train options based on the trip details and user preferences.
road_agent: Provides road trip options and car rental information based on the trip details and user preferences

Rules:
- Always include: itinerary_agent, weather_agent, news_agent, site_seeing_agent but if user explicitly says they dont want one of these, then you can exclude it.
-Try to include one of travel agent (flight_agent, train_agent, road_agent), exclude only when user says explicitly that he dont want any travel agent from you.
-Try to include restaurant_agent if not excluded explicitly by user
-Try to include hotel_agent if not excluded explicitly by user
- Fill out the specific tasks (preferences) ONLY for the agents you are activating.{feedback_clause}"""),
        ("human", "User Request: {user_request}, trip details: {trip_details}")
    ])

    try:
        print(f"🧠 Sending request to Cohere: {state.get('user_request', 'No prompt')}...")
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
        print(f"✅ Success: Plan structured. Agents to call: {plan.required_agents}")
    except Exception as e:
        print(f"❌ Orchestrator LLM error: {e}")
        # Fallback plan
        return {
            "required_agents":  ["flight_agent", "hotel_agent", "weather_agent", "news_agent", "restaurant_agent", "itinerary_agent", "site_seeing_agent"],
            "agent_tasks":      {"flight_agent": {}, "hotel_agent": {}, "weather_agent": {}, "news_agent": {}, "restaurant_agent": {}, "itinerary_agent": {}, "site_seeing_agent": {}},
            "phase1_approved":  False,
            "phase2_approved":  False,
            "status_log":       [msg, f"❌ Fallback activated due to error: {e}"],
        }

    required = list(plan.required_agents)

    print(f"🔀 Activated agents: {required}")

    task_map = {
        "flight_agent":     plan.flight_task,
        "train_agent":      plan.train_task,
        "road_agent":       plan.road_task,
        "hotel_agent":      plan.hotel_task,
        "restaurant_agent": plan.restaurant_task,
        "weather_agent":    plan.weather_task,
        "news_agent":       plan.news_task,
        "site_seeing_agent": plan.site_seeing_task,
        "itinerary_agent":  plan.itinerary_task,
    }
    
    agent_tasks = {n: (t.dict(exclude_none=True) if t else {}) for n, t in task_map.items() if n in required}

    tl = [
        {"id": str(uuid.uuid4()), "from": "orchestrator", "to": ag, "message": f"Assigned task: {json.dumps(task_map.get(ag).dict(exclude_none=True) if task_map.get(ag) else {})[:60]}..."}
        for ag in required
    ]

    return {
        "required_agents": required,
        "agent_tasks":     agent_tasks,
        "hitl_action":     "approved",   # reset gate flag for this run
        "status_log":      [msg, f"✅ Plan built. Agents: {required}"],
        "timeline":        tl,
    }

