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


def pretty_print_state(state: dict):
    data = state.get("scraped_data", {})

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

    if "hotels" in data:
        display_separator("🏨  PHASE 2 RESULT — HOTELS")
        for h in data["hotels"]:
            if "error" in h:
                print(f"  ⚠️  Error: {h['error']}")
            else:
                print(f"  • Name:    {h.get('name')}")
                print(f"    Rating:  ⭐ {h.get('rating')}")
                print(f"    Cost:    ${h.get('cost_per_night')}/night")
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
    user_prompt = "I want to plan my trip from delhi  to jaipur for 3 days by flight and want a good meal."
    
    # Every resumed invocation needs the same thread_id so
    # LangGraph can reload the checkpoint from MemorySaver.
    config = {"configurable": {"thread_id": "trip-001"}}

    display_separator("🚀 STARTING TRIP PLANNER")
    print(f"User Prompt: {user_prompt}\n")

    initial_state = {"user_request": user_prompt, "trip_details": {
        "origin": "goa",
        "destination": "srinagar",
        "start_date": "2026-04-10",
        "end_date": "2026-04-13",
        "number_of_travelers": 1,
        "total_budget": 5000.0
        }}

    # ─── PHASE 1: Orchestrate + Transportation (runs until interrupt) ────
    print("▶️  Invoking graph (will pause after Phase 1)...\n")
    for event in app.stream(initial_state, config=config, stream_mode="values"):
        pass   # stream drives execution; state snapshots come via get_state

    state_snapshot = app.get_state(config)
    pretty_print_state(state_snapshot.values)

    # ─── Phase 1 User Approval ──────────────────────────────────────────
    print("\n" + "─" * 60)
    user_input = input("✅ Approve Phase 1 (flights) and continue to Hotels? [yes/no]: ").strip().lower()
    if user_input not in ("yes", "y", ""):
        print("❌ User declined. Stopping.")
        return

    # Resume — update state and continue (graph pauses at phase2_approval next)
    app.update_state(config, {"phase1_approved": True, "human_feedback": "Phase 1 approved"})
    print("\n▶️  Resuming graph (will pause after Phase 2)...\n")
    for event in app.stream(None, config=config, stream_mode="values"):
        pass

    state_snapshot = app.get_state(config)
    pretty_print_state(state_snapshot.values)

    # ─── Phase 2 User Approval ──────────────────────────────────────────
    print("\n" + "─" * 60)
    user_input = input("✅ Approve Phase 2 (hotels/weather/news) and generate itinerary? [yes/no]: ").strip().lower()
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
