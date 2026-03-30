"""
test_auto.py — Automated end-to-end test (auto-approves all phases).
Uses LangGraph streaming + MemorySaver interrupt/resume.
"""
from test import app
import json

def pretty_print(data: dict):
    for key, items in data.items():
        print(f"\n  [{key.upper()}]")
        for item in items:
            if isinstance(item, dict):
                for k, v in item.items():
                    print(f"    {k}: {v}")
                print()
            else:
                print(f"    • {item}")

def run_auto():
    user_prompt = (
        "I want to plan my trip from goa to srinagar for 3 days by flight "
        "and want a good meal. Please check flights and hotels."
    )
    config = {"configurable": {"thread_id": "auto-test-001"}}

    print("="*65)
    print("  🤖 AUTO-TEST: 3-Phase Human-in-the-Loop Trip Planner")
    print("="*65)
    print(f"  Prompt: {user_prompt}\n")

    # ── PHASE 1 ──────────────────────────────────────────────────
    print("▶️  PHASE 1: Orchestrator + Transportation agents running...\n")
    try:
        for _ in app.stream({"user_request": user_prompt}, config=config, stream_mode="values"):
            pass
    except Exception as e:
        print(f"❌ Phase 1 stream error: {e}")
        import traceback; traceback.print_exc()
        return

    snap1 = app.get_state(config)
    phase1_data = snap1.values.get("scraped_data", {})
    print("\n📦 Phase 1 Scraped Data:")
    pretty_print(phase1_data)

    # ── PHASE 1 AUTO-APPROVE ─────────────────────────────────────
    print("\n✅ [AUTO-APPROVE] Phase 1 approved — continuing to Phase 2...")
    app.update_state(config, {"phase1_approved": True, "human_feedback": "auto-approved"})

    # ── PHASE 2 ──────────────────────────────────────────────────
    print("\n▶️  PHASE 2: Hotel, Weather, News agents running...\n")
    try:
        for _ in app.stream(None, config=config, stream_mode="values"):
            pass
    except Exception as e:
        print(f"❌ Phase 2 stream error: {e}")
        import traceback; traceback.print_exc()
        return

    snap2 = app.get_state(config)
    phase2_data = snap2.values.get("scraped_data", {})
    print("\n📦 Phase 2 Scraped Data (cumulative):")
    pretty_print(phase2_data)

    # ── PHASE 2 AUTO-APPROVE ─────────────────────────────────────
    print("\n✅ [AUTO-APPROVE] Phase 2 approved — continuing to Phase 3...")
    app.update_state(config, {"phase2_approved": True, "human_feedback": "auto-approved"})

    # ── PHASE 3 ──────────────────────────────────────────────────
    print("\n▶️  PHASE 3: Restaurant + Itinerary agents running...\n")
    try:
        for _ in app.stream(None, config=config, stream_mode="values"):
            pass
    except Exception as e:
        print(f"❌ Phase 3 stream error: {e}")
        import traceback; traceback.print_exc()
        return

    final = app.get_state(config)
    print("\n" + "="*65)
    print("  🎉 FINAL ITINERARY")
    print("="*65)
    print(final.values.get("final_itinerary", "No itinerary generated."))
    print("\n✅ AUTO-TEST COMPLETE — all 3 phases ran successfully!")

if __name__ == "__main__":
    run_auto()
