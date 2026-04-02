#!/usr/bin/env python3
"""
Test script for the Travel Agent API
"""
import requests
import json
import time
import sys

BASE_URL = "http://localhost:5000"

def test_travel_agent():
    print("🚀 Testing Travel Agent API...")
    
    # Step 1: Start a new session
    print("\n1. Starting new session...")
    start_response = requests.post(
        f"{BASE_URL}/api/start",
        json={"prompt": "I want to fly from Goa to Srinagar for 3 days next week"}
    )
    
    if start_response.status_code != 200:
        print(f"❌ Failed to start session: {start_response.status_code}")
        return False
    
    thread_id = start_response.json()["thread_id"]
    print(f"✅ Session started with thread_id: {thread_id[:8]}...")
    
    # Step 2: Stream the response
    print("\n2. Streaming agent logs...")
    stream_response = requests.get(
        f"{BASE_URL}/api/stream/{thread_id}",
        stream=True
    )
    
    if stream_response.status_code != 200:
        print(f"❌ Failed to start stream: {stream_response.status_code}")
        return False
    
    print("✅ Stream started, receiving logs...")
    
    # Read stream events
    events_received = []
    for line in stream_response.iter_lines():
        if line:
            line = line.decode('utf-8')
            if line.startswith('data: '):
                data = json.loads(line[6:])
                events_received.append(data)
                print(f"📡 Event: {data}")
                
                # Stop after phase_complete event
                if 'phase_complete' in str(data) or 'stream_end' in str(data):
                    break
    
    print(f"✅ Received {len(events_received)} events")
    
    # Step 3: Test approval (if we hit an interrupt)
    print("\n3. Testing approval...")
    approve_response = requests.post(
        f"{BASE_URL}/api/approve/{thread_id}",
        json={"phase": 0}
    )
    
    if approve_response.status_code == 200:
        print("✅ Approval successful")
        print(f"Response: {approve_response.json()}")
    else:
        print(f"⚠️ Approval response: {approve_response.status_code}")
    
    print("\n🎉 API test completed successfully!")
    return True

if __name__ == "__main__":
    try:
        test_travel_agent()
    except Exception as e:
        print(f"❌ Test failed: {e}")
        sys.exit(1)
