"""
server.py — Flask SSE backend for the Travel Concierge UI
Streams real-time agent events; handles 5-phase HITL via Command(resume=...).
"""
from flask import Flask, Response, request, jsonify, send_from_directory
from test import get_compiled_graph
import json, threading, queue, uuid, os

# Try to import PostgreSQL checkpointer, fallback to memory
try:
    from langgraph_checkpoint.postgres import PostgresSaver
    from psycopg_pool import ConnectionPool
    USE_POSTGRES = True
except ImportError:
    try:
        from langgraph.checkpoint.postgres import PostgresSaver
        from psycopg_pool import ConnectionPool
        USE_POSTGRES = True
    except ImportError:
        # Fallback to memory checkpointer
        USE_POSTGRES = False
        print("⚠️ PostgreSQL checkpointer not found, using memory checkpointer")

from langgraph.types import Command

flask_app = Flask(__name__, static_folder="static")

# Setup checkpointer
if USE_POSTGRES:
    try:
        DB_URI = "postgresql://postgres:postgres@localhost:5432/travel_agent"
        connection_pool = ConnectionPool(
            conninfo=DB_URI,
            max_size=20,
            kwargs={"autocommit": True, "prepare_threshold": 0},
        )
        checkpointer = PostgresSaver(connection_pool)
        checkpointer.setup()
        print("✅ PostgreSQL checkpointer initialized")
    except Exception as e:
        print(f"⚠️ Failed to initialize PostgreSQL: {e}")
        print("🔄 Falling back to memory checkpointer")
        # Create a simple memory checkpointer
        from langgraph.checkpoint.memory import MemorySaver
        checkpointer = MemorySaver()
        print("✅ Memory checkpointer initialized")
else:
    print("🔄 Using memory checkpointer")
    from langgraph.checkpoint.memory import MemorySaver
    checkpointer = MemorySaver()
    print("✅ Memory checkpointer initialized")

graph_app = get_compiled_graph(checkpointer)

_sessions: dict[str, queue.Queue] = {}


# ──────────────────────────────────────────────────────────────────
# SSE helpers
# ──────────────────────────────────────────────────────────────────
def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"

def _push(q: queue.Queue, event: str, data: dict):
    q.put(_sse(event, data))


# ──────────────────────────────────────────────────────────────────
# Graph streaming worker
# ──────────────────────────────────────────────────────────────────
def _run_graph(thread_id: str, input_val, q: queue.Queue):
    """Stream graph until the next interrupt() or END, pushing SSE events."""
    config = {"configurable": {"thread_id": thread_id}}
    try:
        for chunk in graph_app.stream(input_val, config=config, stream_mode="values"):
            logs = chunk.get("status_log", [])
            for log in logs[-1:]:
                _push(q, "agent_log", {"message": log})
            scraped = chunk.get("scraped_data", {})
            if scraped:
                _push(q, "scraped_update", {"scraped_data": scraped})
            timeline = chunk.get("timeline", [])
            if timeline:
                _push(q, "timeline_update", {"timeline": timeline})

    except Exception as e:
        _push(q, "error", {"message": str(e)})
        import traceback; traceback.print_exc()

    # After stream ends, inspect state for interrupt or completion
    snap = graph_app.get_state(config)
    vals = snap.values

    # Collect interrupt payloads from the current state tasks
    interrupt_payloads = []
    for task in (snap.tasks or []):
        for intr in getattr(task, "interrupts", []):
            interrupt_payloads.append(intr.value)

    next_nodes = list(snap.next) if snap.next else []
    is_done    = (not next_nodes) and (not interrupt_payloads)

    _push(q, "phase_complete", {
        "next_nodes":         next_nodes,
        "interrupt_payloads": interrupt_payloads,
        "scraped_data":       vals.get("scraped_data", {}),
        "trip_details":       vals.get("trip_details", {}),
        "final_itinerary":    vals.get("final_itinerary", ""),
        "status_log":         vals.get("status_log", []),
        "timeline":           vals.get("timeline", []),
        "hitl_action":        vals.get("hitl_action", ""),
        "last_approved_phase": vals.get("last_approved_phase", ""),
        "is_done":            is_done,
    })

    q.put(None)   # sentinel → close stream


# ──────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────
@flask_app.route("/")
def index():
    return send_from_directory("static", "index.html")


@flask_app.route("/api/start", methods=["POST"])
def start():
    """Start a new trip planning session."""
    body        = request.get_json(force=True)
    user_prompt = body.get("prompt", "").strip()
    # trip_details = body.get("trip_details", {})
    trip_details = {
            "origin":              "srinagar",
            "destination":         "goa",
            "start_date":          "2026-04-10",
            "end_date":            "2026-04-13",
            "number_of_travelers": 1,
            "total_budget":        500.0,
        }
    if not user_prompt:
        return jsonify({"error": "prompt required"}), 400

    thread_id = str(uuid.uuid4())
    q = queue.Queue()
    _sessions[thread_id] = q

    initial_state = {
        "user_request":        user_prompt,
        "trip_details":        trip_details,
        "human_feedback":      "",
        "pending_feedback":    "",
        "feedback_route":      "",
        "last_approved_phase": "",
        "hitl_action":         "approved",
        "scraped_data":        {},
    }
    t = threading.Thread(target=_run_graph, args=(thread_id, initial_state, q), daemon=True)
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


@flask_app.route("/api/resume/<thread_id>", methods=["POST"])
def resume(thread_id: str):
    """
    Universal resume endpoint — replaces the old /approve endpoint.
    Body: { "decision": "yes" | "no" | "<feedback text>" }
    """
    body     = request.get_json(force=True)
    decision = body.get("decision", "yes").strip()
    if not decision:
        decision = "yes"

    q = queue.Queue()
    _sessions[thread_id] = q

    t = threading.Thread(
        target=_run_graph,
        args=(thread_id, Command(resume=decision), q),
        daemon=True,
    )
    t.start()

    return jsonify({"status": "resumed", "decision": decision})


# Keep old /api/approve for backward compatibility with the existing frontend
@flask_app.route("/api/approve/<thread_id>", methods=["POST"])
def approve(thread_id: str):
    body  = request.get_json(force=True)
    phase = body.get("phase", 1)
    feedback = body.get("feedback", "").strip()

    # Map old approve calls to the new Command(resume=...) pattern
    decision = feedback if feedback else "yes"
    q = queue.Queue()
    _sessions[thread_id] = q

    t = threading.Thread(
        target=_run_graph,
        args=(thread_id, Command(resume=decision), q),
        daemon=True,
    )
    t.start()
    return jsonify({"status": "resumed", "phase": phase})


@flask_app.route("/api/state/<thread_id>")
def get_state(thread_id: str):
    config = {"configurable": {"thread_id": thread_id}}
    try:
        snap = graph_app.get_state(config)
        interrupts = []
        for task in (snap.tasks or []):
            for intr in getattr(task, "interrupts", []):
                interrupts.append(intr.value)
        return jsonify({**snap.values, "interrupt_payloads": interrupts})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    os.makedirs("static", exist_ok=True)
    print("Travel Concierge server starting at http://localhost:5000")
    flask_app.run(debug=False, threaded=True, port=5000)
