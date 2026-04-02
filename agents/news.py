
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

class TravelNewsItem(BaseModel):
    headline: str = Field(description="The exact news headline")
    impact_summary: str = Field(description="A short 1-sentence explanation of how this specifically affects a traveler visiting the area.")
    severity_level: str = Field(description="'High', 'Medium', or 'Low' impact on travel plans.")

class FilteredTravelNews(BaseModel):
    relevant_news: List[TravelNewsItem] = Field(description="List of news items that impact travel. Can be empty if no significant travel news exists.")

def news_agent(state: dict) -> dict:
    logs = ["📰 News Agent: Waking up and preparing Google News search..."]
    print(logs[0])

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

    tl = [{"id": str(uuid.uuid4()), "from": "news_agent", "to": "phase2_collector", "message": f"News updates for {dest_city} retrieved."}]
    return {"scraped_data": {"news": final_news_data}, "status_log": logs, "timeline": tl}
