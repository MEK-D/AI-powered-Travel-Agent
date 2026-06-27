"""Sync helper to invoke MCP tools from LangGraph agent nodes."""
from __future__ import annotations

import asyncio
import json
from typing import Any

from langchain_mcp_adapters.client import MultiServerMCPClient

from travel_mcp.client.config import MCP_SERVERS

_tool_cache: dict[str, Any] | None = None


import ast

def _normalize(result: Any) -> Any:
    def parse_text(text: str) -> Any:
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            try:
                text_strip = text.strip()
                if text_strip.startswith("{") or text_strip.startswith("["):
                    return ast.literal_eval(text_strip)
            except Exception:
                pass
            return text

    if isinstance(result, list) and len(result) > 0 and getattr(result[0], 'type', None) == 'text':
        parsed = parse_text(result[0].text)
        if isinstance(parsed, str) and parsed.startswith("Error"):
            return {"error": parsed}
        return parsed
    if isinstance(result, list) and len(result) > 0 and isinstance(result[0], dict) and "text" in result[0]:
        parsed = parse_text(result[0]["text"])
        if isinstance(parsed, str) and parsed.startswith("Error"):
            return {"error": parsed}
        return parsed
    if isinstance(result, str):
        parsed = parse_text(result)
        if isinstance(parsed, str) and parsed.startswith("Error"):
            return {"error": parsed}
        return parsed
    return result


async def _load_tools():
    global _tool_cache
    if _tool_cache is not None:
        return _tool_cache
    client = MultiServerMCPClient(MCP_SERVERS)
    tools = await client.get_tools()
    _tool_cache = {t.name: t for t in tools}
    return _tool_cache


async def invoke_tool_async(tool_name: str, args: dict) -> Any:
    tools = await _load_tools()
    tool = tools.get(tool_name)
    if tool is None:
        raise KeyError(f"MCP tool '{tool_name}' not found. Available: {list(tools)}")
    result = await tool.ainvoke(args)
    return _normalize(result)


def invoke_tool(tool_name: str, args: dict) -> Any:
    """Call an MCP tool synchronously (safe inside sync LangGraph nodes)."""
    return asyncio.run(invoke_tool_async(tool_name, args))
