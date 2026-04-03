import uuid
from test import get_compiled_graph
from langgraph.checkpoint.memory import MemorySaver

def verify_skip():
    print("🚀 Verifying Phase Skipping...")
    checkpointer = MemorySaver()
    graph = get_compiled_graph(checkpointer)
    
    config = {"configurable": {"thread_id": str(uuid.uuid4())}}
    
    # Prompt implies no travel planning needed
    inputs = {
        "user_request": "Plan a trip to Srinagar, but I already booked my flights and trains. Just show me hotels and activities.",
        "trip_details": {
            "origin": "Mumbai",
            "destination": "Srinagar",
            "start_date": "2026-04-10",
            "end_date": "2026-04-13",
            "number_of_travelers": 1,
            "total_budget": 500.0
        }
    }
    
    print("\n--- Phase 0: Orchestrator ---")
    for chunk in graph.stream(inputs, config=config, stream_mode="values"):
        if "required_agents" in chunk:
            print(f"✅ Required agents: {chunk['required_agents']}")
            # Expecting flight_agent and train_agent NOT to be here
            if "flight_agent" in chunk['required_agents'] or "train_agent" in chunk['required_agents']:
                print("⚠️  Warning: AI might have included transport agents. This test depends on LLM behavior.")
    
    # Approve orchestrator plan
    print("\n--- Approving Orchestrator Plan ---")
    from langgraph.types import Command
    
    print("\n--- Streaming to next phase ---")
    # We expect it to skip Phase 1 and go straight to Phase 2 (Hotels)
    found_skip_1 = False
    found_phase_2 = False
    
    # Use Command(resume=...) to proceed from the interrupt
    for event in graph.stream(Command(resume="yes"), config=config, stream_mode="updates"):
        for node, data in event.items():
            print(f"📍 Node executed: {node}")
            if node == "skip_phase1":
                found_skip_1 = True
            if node in ["hotel_agent", "weather_agent", "news_agent"]:
                found_phase_2 = True
            if node == "phase1_hitl":
                print("❌ ERROR: Landed in phase1_hitl! Bypass failed.")
                return False
                
    if found_skip_1 and found_phase_2:
        print("\n✅ SUCCESS: Phase 1 was correctly skipped, and Phase 2 started automatically.")
        return True
    else:
        print(f"\n❌ FAILURE: skip_phase1={found_skip_1}, phase2_agents={found_phase_2}")
        return False

if __name__ == "__main__":
    verify_skip()
