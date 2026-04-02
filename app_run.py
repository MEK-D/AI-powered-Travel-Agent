"""
app_run.py — 5-Phase HITL CLI runner
=====================================================
Uses true LangGraph interrupt() / Command(resume=...) pattern.

At each phase the user can:
  "yes" / "y"          → approve and continue
  "no"  / "cancel"     → hard stop
  <any other text>     → feedback: re-run phase with LLM-improved prompts
"""

from __future__ import annotations
from test import get_compiled_graph
from langgraph.types import Command
import json, sys

# Try Postgres; fall back to in-memory if Docker isn't running
try:
    from langgraph.checkpoint.postgres import PostgresSaver
    _use_postgres = True
except Exception:
    _use_postgres = False


DB_URI = "postgresql://postgres:postgres@localhost:5432/travel_agent"


# ─────────────────────────────────────────────────────────────────────────────
# Pretty-printing helpers
# ─────────────────────────────────────────────────────────────────────────────
def _sep(title: str = ""):
    line = "═" * 62
    print(f"\n{line}")
    if title:
        print(f"  {title}")
        print(line)


def _print_interrupt(payload: dict):
    """Display phase data from the interrupt payload in a human-friendly way."""
    phase   = payload.get("phase", "unknown")
    message = payload.get("message", "")

    _sep(f"⏸  HUMAN-IN-THE-LOOP  —  Phase: {phase.upper()}")
    print(f"\n{message}\n")

    # ── Orchestrator ──────────────────────────────────────────────────────────
    if phase == "orchestrator":
        agents = payload.get("required_agents", [])
        tasks  = payload.get("agent_tasks", {})
        trip   = payload.get("trip_details", {})
        print("📋 Trip Details:")
        for k, v in trip.items():
            print(f"   {k}: {v}")
        print(f"\n🤖 Agents activated: {', '.join(agents)}")
        for ag, task in tasks.items():
            if task:
                print(f"   • {ag}: {json.dumps(task, indent=0)[:80]}")

    # ── Transportation ────────────────────────────────────────────────────────
    elif phase == "transport":
        flights = payload.get("flights", [])
        trains  = payload.get("trains",  [])
        if flights:
            print("✈️  FLIGHTS:")
            for f in flights:
                if "error" in f:
                    print(f"   ⚠️  {f['error']}")
                else:
                    print(f"   • {f.get('airline')} | {f.get('departure')} → {f.get('arrival')} | ${f.get('cost')}")
                    print(f"     {f.get('timing_notes','')} | {f.get('details','')[:60]}")
        if trains:
            print("🚆  TRAINS:")
            for t in trains:
                if "error" in t:
                    print(f"   ⚠️  {t['error']}")
                else:
                    print(f"   • {t.get('train_name')} | {t.get('departure')} → {t.get('arrival')} | {t.get('duration')} | ₹{t.get('cost')}")
                    print(f"     {t.get('details','')[:60]}")

    # ── Basecamp ──────────────────────────────────────────────────────────────
    elif phase == "basecamp":
        hotels  = payload.get("hotels",  [])
        weather = payload.get("weather", [])
        news    = payload.get("news",    [])
        if hotels:
            print("🏨  HOTELS:")
            for h in hotels:
                if "error" in h:
                    print(f"   ⚠️  {h['error']}")
                else:
                    gps   = h.get("gps_coordinates", {})
                    gps_s = f" | 📍 {gps.get('latitude')},{gps.get('longitude')}" if gps else ""
                    print(f"   • {h.get('name')} | ⭐{h.get('rating')} | ${h.get('cost_per_night')}/night{gps_s}")
                    if h.get("nearby_places"):
                        print(f"     Nearby: {', '.join(h.get('nearby_places', []))}")
        if weather:
            print("\n🌦  WEATHER:")
            for w in (weather if isinstance(weather[0], dict) else []):
                sym = w.get("symbol", "°")
                print(f"   {w.get('date')}: {w.get('conditions')} ({w.get('max_temp')}{sym}/{w.get('min_temp')}{sym}) — {w.get('travel_advice','')}")
        if news:
            print("\n📰  NEWS:")
            for n in news:
                print(f"   • {n}")

    # ── Activities ────────────────────────────────────────────────────────────
    elif phase == "activities":
        restaurants = payload.get("restaurants", [])
        sightseeing = payload.get("sightseeing", [])
        if restaurants:
            print("🍴  RESTAURANTS:")
            for r in restaurants:
                if isinstance(r, dict) and "error" not in r:
                    print(f"   • {r.get('name')} | ⭐{r.get('rating')} | {r.get('price','')} | {r.get('cuisine','')}")
                    print(f"     {r.get('details','')[:70]}")
        if sightseeing:
            print("\n🏛  SIGHTSEEING:")
            for s in sightseeing:
                print(f"   • {s}")

    # ── Itinerary ─────────────────────────────────────────────────────────────
    elif phase == "itinerary":
        print(payload.get("itinerary", "No itinerary generated."))


def _get_interrupts(snap):
    """Extract interrupt objects from a state snapshot."""
    interrupts = []
    for task in (snap.tasks or []):
        interrupts.extend(getattr(task, "interrupts", []))
    return interrupts


# ─────────────────────────────────────────────────────────────────────────────
# Stream helper: run graph until next interrupt or completion
# ─────────────────────────────────────────────────────────────────────────────
def _stream(app, input_val, config):
    """Stream graph events, printing status logs as they arrive."""
    try:
        for chunk in app.stream(input_val, config=config, stream_mode="values"):
            logs = chunk.get("status_log", [])
            if logs:
                print(f"  📡 {logs[-1]}")
    except Exception as e:
        print(f"\n❌ Stream error: {e}")
        raise


# ─────────────────────────────────────────────────────────────────────────────
# Main runner
# ─────────────────────────────────────────────────────────────────────────────
def run():
    user_prompt = (
        "I want to plan my trip from delhi to jaipur for 3 days "
        "by flight and want a good meal. also provide me the news "
        "which can affect my trip"
    )

    # Use a fresh thread_id for this run; change to replay an old thread
    thread_id = "hitl-trip-001"
    config    = {"configurable": {"thread_id": thread_id}}

    initial_state = {
        "user_request":  user_prompt,
        "trip_details": {
            "origin":              "srinagar",
            "destination":         "goa",
            "start_date":          "2026-04-10",
            "end_date":            "2026-04-13",
            "number_of_travelers": 1,
            "total_budget":        500.0,
        },
        "human_feedback":      "",
        "last_approved_phase": "",
        "hitl_action":         "approved",
        "scraped_data":        {},
    }

    _sep("🚀  5-PHASE HITL TRAVEL CONCIERGE")
    print(f"Prompt: {user_prompt}\n")

    # ── Checkpointer: try Postgres, fall back to MemorySaver ─────────────────
    import uuid as _uuid
    import contextlib

    # Use a unique thread_id each run so old checkpoints don't interfere
    thread_id = f"hitl-trip-{_uuid.uuid4().hex[:8]}"
    config    = {"configurable": {"thread_id": thread_id}}

    def _build_app(checkpointer):
        """Compile graph and run the full HITL loop with the given checkpointer."""
        app = get_compiled_graph(checkpointer)

        # ── Initial run ───────────────────────────────────────────────────────
        print("▶️  Starting graph…\n")
        _stream(app, initial_state, config)

        # ── HITL loop ─────────────────────────────────────────────────────────
        while True:
            snap       = app.get_state(config)
            interrupts = _get_interrupts(snap)

            if not interrupts:
                _sep("🎉  TRIP PLANNING COMPLETE")
                itinerary = snap.values.get("final_itinerary", "")
                print(itinerary if itinerary else "(No itinerary generated.)")
                break

            payload  = interrupts[0].value
            _print_interrupt(payload)
            phase    = payload.get("phase", "unknown")

            print("\n" + "─" * 62)
            print("Options:  yes → approve   |   no → cancel   |   <text> → feedback")
            decision = input(f"[{phase}] Your decision: ").strip() or "yes"

            print(f"\n▶️  Resuming with: \"{decision}\"\n")
            _stream(app, Command(resume=decision), config)

            snap2 = app.get_state(config)
            if snap2.values.get("hitl_action") == "cancelled":
                _sep("🛑  CANCELLED BY USER")
                print(f"Stopped at phase: {phase}")
                break

            if not snap2.next and not _get_interrupts(snap2):
                _sep("🎉  TRIP PLANNING COMPLETE")
                itinerary = snap2.values.get("final_itinerary", "")
                print(itinerary if itinerary else "(No itinerary generated.)")
                break

    # ── Choose checkpointer ───────────────────────────────────────────────────
    use_pg = _use_postgres   # copy to local variable to avoid UnboundLocalError
    if use_pg:
        try:
            with PostgresSaver.from_conn_string(DB_URI) as checkpointer:
                checkpointer.setup()
                print("💾 Using PostgresSaver checkpointer\n")
                _build_app(checkpointer)
            return   # done
        except Exception as pg_err:
            print(f"⚠️  Postgres unavailable ({pg_err}). Falling back to MemorySaver.\n")

    # MemorySaver fallback
    from langgraph.checkpoint.memory import MemorySaver
    checkpointer = MemorySaver()
    print("💾 Using MemorySaver checkpointer (no time-travel across restarts)\n")
    _build_app(checkpointer)


if __name__ == "__main__":
    run()