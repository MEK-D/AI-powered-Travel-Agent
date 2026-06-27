#!/usr/bin/env python3
"""Unified Travel MCP server — exposes all external API tools via stdio."""
from __future__ import annotations

import sys
from pathlib import Path

# Ensure project root is on sys.path when launched as subprocess
ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP

from travel_mcp.shared import travel_api

load_dotenv(ROOT / ".env")

mcp = FastMCP("travel-concierge")


@mcp.tool()
def search_flights(
    origin_iata: str,
    dest_iata: str,
    start_date: str,
    end_date: str = "",
) -> dict:
    """Search Google Flights via SerpApi. IATA codes required (e.g. DEL, BOM)."""
    return travel_api.search_flights(origin_iata, dest_iata, start_date, end_date)


@mcp.tool()
def search_hotels(
    dest_city: str,
    check_in: str,
    check_out: str,
    travelers: int = 1,
) -> dict:
    """Search Google Hotels via SerpApi for a destination and date range."""
    return travel_api.search_hotels(dest_city, check_in, check_out, travelers)


@mcp.tool()
def get_weather_forecast(
    dest_city: str,
    start_date: str,
    end_date: str,
    unit_group: str = "metric",
) -> dict:
    """Fetch Visual Crossing weather timeline for destination and dates."""
    return travel_api.get_weather_forecast(dest_city, start_date, end_date, unit_group)


@mcp.tool()
def search_trains(
    origin_code: str,
    dest_code: str,
    date_of_journey: str,
) -> dict:
    """Search IRCTC trains between two Indian Railway station codes."""
    return travel_api.search_trains(origin_code, dest_code, date_of_journey)


@mcp.tool()
def get_train_fare(
    train_number: str,
    origin_code: str,
    dest_code: str,
) -> dict:
    """Fetch class-wise fares for a specific train number."""
    return travel_api.get_train_fare(train_number, origin_code, dest_code)


@mcp.tool()
def search_restaurants(
    search_location: str = "Unknown",
    lat_long: str = "",
) -> dict:
    """Search restaurants near GPS coordinates or by city name via SerpApi."""
    ll = lat_long.strip() or None
    return travel_api.search_restaurants(lat_long=ll, search_location=search_location)


@mcp.tool()
def search_travel_news(dest_city: str) -> dict:
    """Search Google News for travel-impacting events at a destination."""
    return travel_api.search_travel_news(dest_city)


@mcp.tool()
def search_attractions(
    query: str,
    lat: float = 0.0,
    lng: float = 0.0,
) -> dict:
    """Search tourist attractions via Google Maps (SerpApi). Pass lat/lng=0 to skip GPS anchor."""
    use_lat = lat if lat else None
    use_lng = lng if lng else None
    return travel_api.search_attractions(query, use_lat, use_lng)


if __name__ == "__main__":
    mcp.run(transport="stdio")
