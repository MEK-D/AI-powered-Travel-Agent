from server import checkpointer
import json

def test_list():
    try:
        print("Listing threads...")
        for checkpoint in checkpointer.list({"configurable": {}}):
            print(f"Config: {checkpoint.config}")
            print(f"Metadata: {checkpoint.metadata}")
            # Try to access thread_id
            try:
                tid = checkpoint.config.get("configurable", {}).get("thread_id")
                print(f"Thread ID via get: {tid}")
            except Exception as e:
                print(f"Failed via get: {e}")
            
            try:
                tid = checkpoint.config["configurable"]["thread_id"]
                print(f"Thread ID via index: {tid}")
            except Exception as e:
                print(f"Failed via index: {e}")
            break # Just check one
    except Exception as e:
        print(f"Main error: {e}")

if __name__ == "__main__":
    test_list()
