"""
app_run.py — 3-Phase Human-in-the-Loop runner
Simulates the browser/UI approving each phase via terminal input.
"""
from test import app
import json

def display_separator(title: str):
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def pretty_print_state(state: dict, phase: int):
    """Dynamically prints only the data relevant to the current phase."""
    data = state.get("scraped_data", {})

    if phase == 1:
        if "flights" in data:
            display_separator("✈️  PHASE 1 RESULT — FLIGHTS")
            for f in data["flights"]:
                if "error" in f:
                    print(f"  ⚠️  Error: {f['error']}")
                else:
                    print(f"  • Airline:   {f.get('airline')}")
                    print(f"    Departure: {f.get('departure')}  →  Arrival: {f.get('arrival')}")
                    print(f"    Cost:      ${f.get('cost')}")
                    print(f"    Notes:     {f.get('timing_notes', '')}")
                    print(f"    Detail:    {f.get('details', '')}")
                    print()

        if "trains" in data:
            display_separator("🚆  PHASE 1 RESULT — TRAINS")
            for t in data["trains"]:
                if "error" in t:
                    print(f"  ⚠️  Error: {t['error']}")
                else:
                    print(f"  • Train:     {t.get('train_name')}")
                    print(f"    Departure: {t.get('departure')}  →  Arrival: {t.get('arrival')}")
                    print(f"    Duration:  {t.get('duration')}")
                    print(f"    Cost:      ${t.get('cost')}")
                    print(f"    Detail:    {t.get('details', '')}")
                    print()

    if phase == 2:
        if "hotels" in data:
            display_separator("🏨  PHASE 2 RESULT — HOTELS")
            for h in data["hotels"]:
                if "error" in h:
                    print(f"  ⚠️  Error: {h['error']}")
                else:
                    print(f"  • Name:    {h.get('name')}")
                    print(f"    Rating:  ⭐ {h.get('rating')}")
                    print(f"    Cost:    ${h.get('cost_per_night')}/night")
                    
                    # NEW: Display GPS Coordinates
                    gps = h.get("gps_coordinates")
                    if gps:
                        print(f"    GPS:     📍 Lat: {gps.get('latitude')}, Lng: {gps.get('longitude')}")
                    
                    # NEW: Display Nearby Places
                    nearby = h.get("nearby_places")
                    if nearby:
                        print(f"    Nearby:  {', '.join(nearby)}")
                        
                    print(f"    Detail:  {h.get('details', '')}")
                    print()

        if "weather" in data:
            display_separator("🌦  WEATHER")
            for w in data["weather"]:
                print(f"  • {w}")

        if "news" in data:
            display_separator("📰  LOCAL NEWS & EVENTS")
            for n in data["news"]:
                print(f"  • {n}")


def run():
    # user_prompt = "I want to plan my trip from delhi to jaipur for 3 days by train and want a good meal. also provide me the news which can affect my trip"
    user_prompt = "I want to plan my trip from delhi to jaipur for 3 days by flight and want a good meal. also provide me the news which can affect my trip"

    # Changed thread_id so LangGraph starts fresh
    config = {"configurable": {"thread_id": "trip-002"}}

    display_separator("🚀 STARTING TRIP PLANNER")
    print(f"User Prompt: {user_prompt}\n")

    initial_state = {
        "user_request": user_prompt, 
        "trip_details": {
            "origin": "delhi",
            "destination": "jaipur",
            "start_date": "2026-04-10",
            "end_date": "2026-04-13",
            "number_of_travelers": 1,
            "total_budget": 500.0
        }
    }

    # ─── PHASE 1: Orchestrate + Transportation ──────────────────────────
    print("▶️  Invoking graph (will pause after Phase 1)...\n")
    for event in app.stream(initial_state, config=config, stream_mode="values"):
        pass

    state_snapshot = app.get_state(config)
    pretty_print_state(state_snapshot.values, phase=1)

    # ─── Phase 1 User Approval ──────────────────────────────────────────
    print("\n" + "─" * 60)
    
    # Dynamically format the approval prompt based on which agents actually ran
    ran_agents = state_snapshot.values.get("required_agents", [])
    transport_agents = [ag for ag in ran_agents if ag in ["flight_agent", "train_agent"]]
    transport_str = "/".join([a.split("_")[0] + "s" for a in transport_agents]) if transport_agents else "Transportation"
    
    user_input = input(f"✅ Approve Phase 1 ({transport_str}) and continue to Phase 2? [yes/no]: ").strip().lower()
    if user_input not in ("yes", "y", ""):
        print("❌ User declined. Stopping.")
        return

    # Resume — update state and continue (graph pauses at phase2_approval next)
    app.update_state(config, {"phase1_approved": True, "human_feedback": "Phase 1 approved"})
    print("\n▶️  Resuming graph (will pause after Phase 2)...\n")
    for event in app.stream(None, config=config, stream_mode="values"):
        pass

    state_snapshot = app.get_state(config)
    pretty_print_state(state_snapshot.values, phase=2)

    # ─── Phase 2 User Approval ──────────────────────────────────────────
    print("\n" + "─" * 60)
    
    # Dynamically format the Phase 2 approval prompt
    basecamp_agents = [ag for ag in ran_agents if ag in ["hotel_agent", "weather_agent", "news_agent"]]
    basecamp_str = "/".join([a.split("_")[0] for a in basecamp_agents]) if basecamp_agents else "Hotels/Weather/News"
    
    user_input = input(f"✅ Approve Phase 2 ({basecamp_str}) and generate itinerary? [yes/no]: ").strip().lower()
    if user_input not in ("yes", "y", ""):
        print("❌ User declined. Stopping.")
        return

    # Resume — graph runs Phase 3 to completion
    app.update_state(config, {"phase2_approved": True, "human_feedback": "Phase 2 approved"})
    print("\n▶️  Resuming graph (Phase 3 — Restaurant + Itinerary)...\n")
    for event in app.stream(None, config=config, stream_mode="values"):
        pass

    final_state = app.get_state(config)

    display_separator("🎉  YOUR FINAL ITINERARY")
    print(final_state.values.get("final_itinerary", "No itinerary generated."))
    display_separator("✨  TRIP PLANNING COMPLETE")


if __name__ == "__main__":
    run()