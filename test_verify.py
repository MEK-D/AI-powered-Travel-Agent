import requests
import time
import json

BASE_URL = "http://localhost:5000"

def test_termination():
    print("🚀 Starting session...")
    payload = {
        "prompt": "I want to visit Srinagar and try Kashmiri food.",
        "trip_details": {
            "origin": "Mumbai",
            "destination": "Srinagar",
            "start_date": "2026-04-10",
            "end_date": "2026-04-13",
            "number_of_travelers": 1,
            "total_budget": 500.0
        }
    }
    
    res = requests.post(f"{BASE_URL}/api/start", json=payload)
    if res.status_code != 200:
        print(f"❌ Failed to start: {res.text}")
        return
    
    data = res.json()
    thread_id = data["thread_id"]
    print(f"📡 Thread ID: {thread_id}")

    # Wait for orchestrator to finish and wait for HITL
    print("⏳ Waiting for interrupt...")
    while True:
        res = requests.get(f"{BASE_URL}/api/state/{thread_id}")
        state = res.json()
        interrupts = state.get("interrupt_payloads", [])
        if interrupts:
            print(f"⏸️ Interrupt received: {interrupts[0]['message']}")
            break
        
        # Check if done
        if state.get("final_itinerary") or state.get("is_done"):
            print("🏁 Graph finished unexpectedly.")
            return
            
        time.sleep(2)

    # Send "stop"
    print("🛑 Sending 'stop'...")
    res = requests.post(f"{BASE_URL}/api/resume/{thread_id}", json={"decision": "stop"})
    if res.status_code != 200:
        print(f"❌ Failed to resume: {res.text}")
        return
    
    # Wait for graph to end
    print("⏳ Waiting for termination...")
    time.sleep(5)
    res = requests.get(f"{BASE_URL}/api/state/{thread_id}")
    state = res.json()
    
    # In my changes, cancelled state should have hitl_action = cancelled and no next nodes
    # Check if is_done would be true or if it reached END
    print(f"📊 Final state hitl_action: {state.get('hitl_action')}")
    print(f"📊 Final state next: {state.get('next_nodes', 'unknown')}")
    
    if state.get('hitl_action') == 'cancelled':
        print("✅ SUCCESS: Graph terminated correctly with 'cancelled' state.")
    else:
        print("❌ FAILURE: Graph did not reflect 'cancelled' state.")

if __name__ == "__main__":
    test_termination()
