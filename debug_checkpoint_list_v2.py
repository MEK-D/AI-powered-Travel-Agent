from server import checkpointer
import json

def test_list():
    try:
        print("Listing threads...")
        # Checkpointer's list method takes a config
        # Use None or {} to get everything
        try:
            it = checkpointer.list(None)
            for checkpoint in it:
                print(f"CheckpointTuple: {checkpoint}")
                print(f"Config: {checkpoint.config}")
                # LangGraph 0.5+ CheckpointTuple.config is a dict
                if "configurable" in checkpoint.config:
                    tid = checkpoint.config["configurable"].get("thread_id")
                    print(f"Found thread_id: {tid}")
                else:
                    print("No 'configurable' in config")
        except Exception as e:
            print(f"Error during iteration: {e}")
            import traceback; traceback.print_exc()

    except Exception as e:
        print(f"General error: {e}")
        import traceback; traceback.print_exc()

if __name__ == "__main__":
    test_list()
