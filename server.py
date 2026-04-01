"""
server.py — Flask SSE backend for the Travel Concierge UI
Streams real-time agent events to the browser via Server-Sent Events.
"""
from flask import Flask, Response, request, jsonify, send_from_directory
from test import get_compiled_graph
from langgraph.checkpoint.postgres import PostgresSaver
from psycopg_pool import ConnectionPool
import json, threading, queue, uuid, os

flask_app = Flask(__name__, static_folder="static")

# Setup PostgreSQL Connection Pool for the server lifetime
DB_URI = "postgresql://postgres:postgres@localhost:5432/travel_agent"
connection_pool = ConnectionPool(
    conninfo=DB_URI,
    max_size=20,
    kwargs={"autocommit": True, "prepare_threshold": 0},
)

# Initialize checkpointer and compile graph once for the server
checkpointer = PostgresSaver(connection_pool)
checkpointer.setup()
graph_app = get_compiled_graph(checkpointer)

# In-memory session store: thread_id → queue of SSE events
_sessions: dict[str, queue.Queue] = {}
_session_states: dict[str, dict] = {}


# ──────────────────────────────────────────────────────────────────
# SSE HELPERS
# ──────────────────────────────────────────────────────────────────
def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _push(q: queue.Queue, event: str, data: dict):
    q.put(_sse(event, data))


def _run_phase(thread_id: str, initial_state, q: queue.Queue):
    """Run LangGraph until next interrupt, pushing events to queue."""
    config = {"configurable": {"thread_id": thread_id}}
    try:
        for chunk in graph_app.stream(initial_state, config=config, stream_mode="values"):
            # chunk is the full state after each node execution
            logs = chunk.get("status_log", [])
            for log in logs[-1:]:   # push latest log line only
                _push(q, "agent_log", {"message": log})

            scraped = chunk.get("scraped_data", {})
            if scraped:
                _push(q, "scraped_update", {"scraped_data": scraped})
    except Exception as e:
        _push(q, "error", {"message": str(e)})
        import traceback; traceback.print_exc()

    # After stream ends (at interrupt or END), push the current snapshot
    snap = graph_app.get_state(config)
    vals = snap.values
    _session_states[thread_id] = vals

    next_nodes = list(snap.next) if snap.next else []
    _push(q, "phase_complete", {
        "next_nodes":    next_nodes,
        "scraped_data":  vals.get("scraped_data", {}),
        "trip_details":  vals.get("trip_details", {}),
        "final_itinerary": vals.get("final_itinerary", ""),
        "status_log":    vals.get("status_log", []),
        "is_done":       len(next_nodes) == 0,
    })
    q.put(None)   # sentinel → close stream


# ──────────────────────────────────────────────────────────────────
# ROUTES
# ──────────────────────────────────────────────────────────────────
@flask_app.route("/")
def index():
    return send_from_directory("static", "index.html")


@flask_app.route("/api/start", methods=["POST"])
def start():
    """Start a new trip planning session (Phase 1)."""
    body        = request.get_json(force=True)
    user_prompt = body.get("prompt", "").strip()
    if not user_prompt:
        return jsonify({"error": "prompt required"}), 400

    thread_id = str(uuid.uuid4())
    q = queue.Queue()
    _sessions[thread_id] = q

    initial_state = {"user_request": user_prompt}
    t = threading.Thread(target=_run_phase, args=(thread_id, initial_state, q), daemon=True)
    t.start()

    return jsonify({"thread_id": thread_id})


@flask_app.route("/api/stream/<thread_id>")
def stream(thread_id: str):
    """SSE endpoint — browser listens here for real-time events."""
    q = _sessions.get(thread_id)
    if q is None:
        return jsonify({"error": "session not found"}), 404

    def generate():
        yield _sse("connected", {"thread_id": thread_id})
        while True:
            item = q.get()
            if item is None:
                yield _sse("stream_end", {})
                break
            yield item

    return Response(generate(), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@flask_app.route("/api/approve/<thread_id>", methods=["POST"])
def approve(thread_id: str):
    """Approve current phase and resume graph."""
    body  = request.get_json(force=True)
    phase = body.get("phase", 1)
    config = {"configurable": {"thread_id": thread_id}}

    if phase == 1:
        graph_app.update_state(config, {"phase1_approved": True, "human_feedback": "Phase 1 approved via UI"})
    else:
        graph_app.update_state(config, {"phase2_approved": True, "human_feedback": "Phase 2 approved via UI"})

    # Fresh queue for resumed stream
    q = queue.Queue()
    _sessions[thread_id] = q

    t = threading.Thread(target=_run_phase, args=(thread_id, None, q), daemon=True)
    t.start()

    return jsonify({"status": "resumed", "phase": phase})


@flask_app.route("/api/state/<thread_id>")
def get_state(thread_id: str):
    config = {"configurable": {"thread_id": thread_id}}
    try:
        snap = graph_app.get_state(config)
        return jsonify(snap.values)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    os.makedirs("static", exist_ok=True)
    print("🚀 Travel Concierge server starting at http://localhost:5000")
    flask_app.run(debug=False, threaded=True, port=5000)
