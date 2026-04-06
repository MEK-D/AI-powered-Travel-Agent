
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

class TravelNewsItem(BaseModel):
    headline: str = Field(description="The exact news headline")
    impact_summary: str = Field(description="A short 1-sentence explanation of how this specifically affects a traveler visiting the area.")
    severity_level: str = Field(description="'High', 'Medium', or 'Low' impact on travel plans.")

class FilteredTravelNews(BaseModel):
    relevant_news: List[TravelNewsItem] = Field(description="List of news items that impact travel. Can be empty if no significant travel news exists.")

def news_agent(state: dict) -> dict:
    tm = TelemetryManager("news_agent")
    tm.info("📰 News Agent: Waking up and preparing Google News search...")
    callback = TelemetryCallbackHandler(tm)

    trip = state.get("trip_details", {})
    dest_city = trip.get("destination", "Unknown")
    serpapi_key = os.getenv("SERPAPI_KEY")

    # ── Human feedback from previous HITL interrupt ──────────────────────────
    human_feedback = state.get("human_feedback", "").strip()
    feedback_clause = (
        f"\n\n⚠️ USER FEEDBACK: \"{human_feedback}\""
        "\nAdjust your news filtering/summaries to address this feedback."
        if human_feedback else ""
    )

    query = f"{dest_city} (travel OR tourism OR strike OR weather OR festival OR event)"
    tm.info(f"📰 News Search: Querying Google News for {dest_city} travel impacts...", query=query)

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
        tm.info(f"📡 SerpApi Data Received: Found {len(raw_news)} raw news articles.", raw_count=len(raw_news))
    except Exception as e:
        tm.error(f"❌ Failed to fetch SerpApi News data: {e}")
        return {"scraped_data": {"news": ["Could not fetch local news."]}, "status_log": [e.message for e in tm.entries], "telemetry": tm.get_entries()}

    # --- STEP 2: Condense the JSON payload ---
    condensed_news = []
    for item in raw_news[:15]:
        title   = item.get("title", "")
        snippet = item.get("snippet", "")
        date    = item.get("date", "Recent")
        if title:
            condensed_news.append({"title": title, "snippet": snippet, "date": date})

    if not condensed_news:
        tm.warning(f"⚠️ No recent news found for {dest_city}.")
        return {"scraped_data": {"news": ["No major recent news events found."]}, "status_log": [e.message for e in tm.entries], "telemetry": tm.get_entries()}

    # --- STEP 3: LLM Evaluation with Cohere ---
    tm.info(f"🧠 Analysis: Evaluating {len(condensed_news)} potential headlines for travel relevance...", 
            condensed_count=len(condensed_news), dest=dest_city)

    try:
        llm = ChatCohere(model="command-r-08-2024", temperature=0)
        evaluator_llm = llm.with_structured_output(FilteredTravelNews)

        evaluation_prompt = ChatPromptTemplate.from_messages([
            ("system", f"""You are an elite Travel Risk and Event Analyst.
            Review the following list of recent news headlines for the user's destination.
            Filter out all irrelevant local news (e.g., sports, local business, minor politics).
            Keep ONLY the news that will directly impact a tourist's experience. This includes:
            - Transit strikes or airport disruptions
            - Severe weather or natural disasters
            - Safety, protests, or health advisories
            - Major local festivals, holidays, or massive events

            If none of the news affects a traveler, return an empty list.{feedback_clause}"""),
            ("human", "Destination: {destination}\n\nRecent News:\n{news}")
        ])

        analyzed_news: FilteredTravelNews = (evaluation_prompt | evaluator_llm).invoke({
            "destination": dest_city,
            "news":        json.dumps(condensed_news, indent=2),
        }, config={"callbacks": [callback]})

        # --- STEP 4: Format for LangGraph State ---
        final_news_data = []

        if not analyzed_news.relevant_news:
            final_news_data = ["No major travel-impacting news reported recently."]
            tm.info("✅ No high-impact travel news found.")
        else:
            for n in analyzed_news.relevant_news:
                formatted_item = f"[{n.severity_level} IMPACT] {n.headline} — {n.impact_summary}"
                final_news_data.append(formatted_item)
            
            tm.info(f"✅ Extraction Complete: Found {len(analyzed_news.relevant_news)} high-impact travel events.", 
                    relevant_count=len(analyzed_news.relevant_news))

    except Exception as e:
        tm.warning(f"⚠️ LLM eval failed ({e}), using raw top headline.")
        top_headline = condensed_news[0]["title"]
        final_news_data = [f"Latest Headline: {top_headline}"]

    tl = [{"id": str(uuid.uuid4()), "from": "news_agent", "to": "phase2_collector", "message": f"News updates for {dest_city} retrieved."}]
    return {"scraped_data": {"news": final_news_data}, "status_log": [e.message for e in tm.entries], "telemetry": tm.get_entries(), "timeline": tl}
