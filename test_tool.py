import asyncio
from travel_mcp.client.tool_loader import invoke_tool
import json
print("Testing search_flights tool...")
res = invoke_tool("search_flights", {
    "origin_iata": "SFO",
    "dest_iata": "JFK",
    "start_date": "2026-07-01",
    "end_date": "2026-07-10",
})
print("Result Type:", type(res))
if isinstance(res, str):
    print("Preview (str):", res[:200])
elif isinstance(res, list):
    print("Preview (list):", res[:2])
else:
    print("Preview:", res)
