from agents.orchestrator import orchestrator_node
from dotenv import load_dotenv
import os

load_dotenv()

state = {
    "user_request": "I want to go from Indore to Goa by flight.",
    "trip_details": {
        "origin": "Indore",
        "destination": "Goa",
        "start_date": "2026-04-10",
        "end_date": "2026-04-13",
        "number_of_travelers": 1,
        "total_budget": 500
    },
    "human_feedback": ""
}

print("Starting test...")
res = orchestrator_node(state)
print("Result:", res)
