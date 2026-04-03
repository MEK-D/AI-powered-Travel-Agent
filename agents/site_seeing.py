from __future__ import annotations
from typing import List
from state import TripState
from langchain_cohere import ChatCohere
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import json, os, requests, uuid

load_dotenv()

class SelectedSite(BaseModel):
    name: str = Field(description="Name of the tourist attraction.")
    address: str = Field(description="Full address of the site.")
    type_of_place: str = Field(description="Type of attraction (e.g., Museum, Historic Landmark, Park).")
    vibe: str = Field(description="The general atmosphere or vibe of the place.")
    details: str = Field(description="Brief description and why it's a must-visit (reasoning).")
    opening_times: str = Field(description="Operating hours or 'Check locally' if unavailable.")
    reviews: List[str] = Field(description="A few snippets from recent reviews to capture public sentiment.")
    entry_fee: str = Field(description="Estimated entry fee or 'Free'/'Unknown'.")
    suggestions: str = Field(description="Practical tips for visiting (e.g., 'Go early to avoid crowds', 'Wear comfortable shoes').")
    photo_url: str = Field(description="A valid URL of a photo of the site, if available.")

class SiteSelection(BaseModel):
    best_sites: List[SelectedSite] = Field(description="Top 4 highly recommended tourist attractions to visit.")

def site_seeing_agent(state: dict) -> dict:
    logs = ["🏛️ Site Seeing Agent: Finding top attractions near your hotel..."]
    print(logs[0])

    trip = state.get("trip_details", {})
    dest_city = trip.get("destination", "Unknown")
    
    # Try to find hotel GPS from state to anchor search
    hotels = state.get("scraped_data", {}).get("hotels", [])
    lat, lng = None, None
    hotel_name = ""
    if hotels and isinstance(hotels[0], dict):
        hotel_name = hotels[0].get("name", "")
        gps = hotels[0].get("gps_coordinates", {})
        lat = gps.get("latitude")
        lng = gps.get("longitude")

    serpapi_key = os.getenv("SERPAPI_KEY")
    llm = ChatCohere(model="command-r-08-2024", temperature=0)

    # ── Human feedback from previous HITL interrupt ──────────────────────────
    human_feedback = state.get("human_feedback", "").strip()
    feedback_clause = (
        f"\n\n⚠️ USER FEEDBACK ON SIGHTSEEING: \"{human_feedback}\""
        "\nAdjust your attraction selection to address this feedback."
        if human_feedback else ""
    )

    try:
        query = f"top tourist attractions in {dest_city}"
        if hotel_name:
            query = f"top attractions near {hotel_name} {dest_city}"

        params = {
            "engine": "google_maps",
            "type": "search",
            "q": query,
            "api_key": serpapi_key
        }
        if lat and lng:
            params["ll"] = f"@{lat},{lng},14z"

        response = requests.get("https://serpapi.com/search", params=params, timeout=15)
        results = response.json().get("local_results", [])[:10]
        print(f"DEBUG: {dest_city} SerpApi results: {len(results)} found.")

        if not results:
            logs.append("⚠️ No sites found via Google Maps.")
            return {"status_log": logs}

        print(f"🧠 {dest_city} LLM Evaluation starting...")
        eval_llm = llm.with_structured_output(SiteSelection)
        eval_prompt = ChatPromptTemplate.from_messages([
            ("system", f"You are a local tour guide. Pick the best 4 most famous or unique sites for a tourist stay. Provide practical tips and reasoning.{feedback_clause}"),
            ("human", "Nearby Attractions Data:\n{results}\n\nDestination: {dest_city}")
        ])

        best: SiteSelection = (eval_prompt | eval_llm).invoke({
            "results": json.dumps(results),
            "dest_city": dest_city
        })

        sites_list = []
        for s in best.best_sites:
            sites_list.append({
                "name": s.name,
                "address": s.address,
                "type": s.type_of_place,
                "vibe": s.vibe,
                "details": s.details,
                "opening_times": s.opening_times,
                "reviews": s.reviews,
                "entry_fee": s.entry_fee,
                "suggestions": s.suggestions,
                "photo_url": s.photo_url
            })
            logs.append(f"✅ Site: {s.name} ({s.type_of_place})")
            print(f"✅ Site Selected: {s.name}")

        tl = [{"id": str(uuid.uuid4()), "from": "site_seeing_agent", "to": "phase3_collector", "message": f"Found {len(sites_list)} top attractions."}]
        return {
            "scraped_data": {"sites": sites_list},
            "status_log": logs,
            "timeline": tl
        }

    except Exception as e:
        error_msg = f"❌ Site Seeing Agent Error: {str(e)}"
        print(error_msg)
        return {"status_log": [error_msg]}