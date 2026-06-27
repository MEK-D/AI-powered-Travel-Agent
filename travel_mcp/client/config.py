"""MCP server connection settings."""
from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
TRAVEL_SERVER_SCRIPT = str(PROJECT_ROOT / "travel_mcp" / "servers" / "travel_server.py")

MCP_SERVERS = {
    "travel": {
        "command": sys.executable,
        "args": [TRAVEL_SERVER_SCRIPT],
        "transport": "stdio",
    },
}
