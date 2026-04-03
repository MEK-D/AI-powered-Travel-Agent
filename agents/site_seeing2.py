# import os
# from typing import List
# from pydantic import BaseModel, Field
# from langchain_cohere import ChatCohere
# from langchain_core.prompts import ChatPromptTemplate
# from serpapi import GoogleSearch

# # --- 1. SCHEMA (Same as before) ---
# class SelectedSite(BaseModel):
#     name: str = Field(description="Name of the place")
#     vibe: str = Field(description="The atmosphere (e.g., Royal, Peaceful)")
#     rating: str = Field(description="Star rating")
#     review_count: str = Field(description="Total reviews")
#     snippet: str = Field(description="A short traveler highlight")

# class SiteSelection(BaseModel):
#     best_sites: List[SelectedSite]

# # --- 2. THE MAIN NODE (SERPAPI ONLY) ---
# def sightseeing_node(state):
#     print("--- 🚀 SIGHTSEEING AGENT (SERPAPI DIRECT MODE) ---")
    
#     city = state["trip_details"].get("destination", "Jaipur")
#     serp_key = os.getenv("SERP_API_KEY")

#     # STEP A: Search Google Maps directly for "Top Sights in [City]"
#     # This is much faster than geocoding + radius searching
#     search = GoogleSearch({
#         "engine": "google_maps",
#         "q": f"top sights in {city}",
#         "type": "search",
#         "api_key": serp_key
#     })
#     results = search.get_dict()
    
#     # STEP B: Extract the first 3 locations from 'local_results'
#     # Google already ranks these by popularity!
#     local_results = results.get("local_results", [])[:3]
    
#     raw_data = []
#     for place in local_results:
#         name = place.get("title")
#         print(f"✅ Found: {name} (Rating: {place.get('rating')})")
        
#         raw_data.append({
#             "name": name,
#             "rating": str(place.get("rating", "4.5")),
#             "reviews": str(place.get("reviews", "1,000+")),
#             "snippet": place.get("description") or "A top-rated landmark."
#         })

#     # STEP C: LLM Summarization
#     llm = ChatCohere(model="command-r-08-2024", temperature=0)
#     structured_llm = llm.with_structured_output(SiteSelection)

#     prompt = ChatPromptTemplate.from_template(
#         "You are a travel expert. Review these 3 top locations for {city}: {raw_data}. "
#         "Format them into a luxury guide with a 'vibe' for each."
#     )

#     try:
#         chain = prompt | structured_llm
#         result = chain.invoke({"city": city, "raw_data": raw_data})
#         return {"best_sites": [site.dict() for site in result.best_sites]}
#     except Exception as e:
#         print(f"❌ Error: {e}")
#         return {"best_sites": []}

import os
from typing import List, Optional
from pydantic import BaseModel, Field
from langchain_cohere import ChatCohere
from langchain_core.prompts import ChatPromptTemplate
from serpapi import GoogleSearch

# --- 1. UPDATED SCHEMA ---
class SelectedSite(BaseModel):
    name: str = Field(description="Name of the place")
    vibe: str = Field(description="The atmosphere (e.g., Royal, Peaceful)")
    rating: str = Field(description="Star rating")
    review_count: str = Field(description="Total reviews")
    hours: str = Field(description="Opening and closing times (e.g., 9:00 AM - 6:00 PM)")
    status: str = Field(description="Current status (e.g., Open now, Closed)")
    snippet: str = Field(description="A short traveler highlight")

class SiteSelection(BaseModel):
    best_sites: List[SelectedSite]

# --- 2. THE MAIN NODE ---
def sightseeing_node(state):
    print("--- 🚀 SIGHTSEEING AGENT (SERPAPI FULL INFO) ---")
    
    city = state["trip_details"].get("destination", "Jaipur")
    serp_key = os.getenv("SERP_API_KEY")

    # Step A: Search Google Maps for "Top Sights"
    search = GoogleSearch({
        "engine": "google_maps",
        "q": f"top sights in {city}",
        "type": "search",
        "api_key": serp_key
    })
    results = search.get_dict()
    
    # Step B: Extract top 3 places with their metadata
    local_results = results.get("local_results", [])[:3]
    
    raw_data = []
    for place in local_results:
        name = place.get("title")
        
        # Extract hours - Google Maps usually provides 'operating_hours' or 'open_state'
        # We try to get the 'hours' string directly from the search result
        hours_info = place.get("operating_hours", {}).get("today", "Hours not listed")
        open_status = place.get("open_state", "Status unknown")

        print(f"✅ Found: {name} | Timing: {hours_info}")
        
        raw_data.append({
            "name": name,
            "rating": str(place.get("rating", "4.5")),
            "reviews": str(place.get("reviews", "1,000+")),
            "hours": hours_info,
            "status": open_status,
            "snippet": place.get("description") or "A top-rated landmark."
        })

    # Step C: LLM Summarization
    llm = ChatCohere(model="command-r-08-2024", temperature=0)
    structured_llm = llm.with_structured_output(SiteSelection)

    prompt = ChatPromptTemplate.from_template(
        "You are a luxury travel guide for {city}. Use this raw data: {raw_data}. "
        "Create a guide for these 3 places. Ensure the opening/closing hours and status are included clearly."
    )

    try:
        chain = prompt | structured_llm
        result = chain.invoke({"city": city, "raw_data": raw_data})
        return {"best_sites": [site.dict() for site in result.best_sites]}
    except Exception as e:
        print(f"❌ Error in LLM enrichment: {e}")
        return {"best_sites": []}