import asyncio
from travel_mcp.client.tool_loader import invoke_tool, _normalize
from langchain_mcp_adapters.client import MultiServerMCPClient
from travel_mcp.client.config import MCP_SERVERS

async def main():
    client = MultiServerMCPClient(MCP_SERVERS)
    tools = await client.get_tools()
    tool = next(t for t in tools if t.name == "search_hotels")
    print("Calling search_hotels...")
    raw_result = await tool.ainvoke({
        "dest_city": "Kolkata",
        "check_in": "2026-04-10",
        "check_out": "2026-04-13",
        "travelers": 1
    })
    print("RAW TYPE:", type(raw_result))
    print("RAW:", repr(raw_result)[:300])
    
    normalized = _normalize(raw_result)
    print("NORMALIZED TYPE:", type(normalized))
    print("NORMALIZED:", repr(normalized)[:300])

asyncio.run(main())
