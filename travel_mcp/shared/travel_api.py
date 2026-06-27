"""Pure API fetch functions — used by the MCP server and testable without MCP."""
from __future__ import annotations

import os
from typing import Any, Optional

import requests


def _serpapi_key() -> str:
    key = os.getenv("SERPAPI_KEY") or os.getenv("SERPAPI_API_KEY")
    if not key:
        raise ValueError("Missing SERPAPI_KEY in environment.")
    return key


def search_flights(
    origin_iata: str,
    dest_iata: str,
    start_date: str,
    end_date: str = "",
) -> dict[str, Any]:
    is_rt = bool(end_date)
    params: dict[str, Any] = {
        "engine": "google_flights",
        "departure_id": origin_iata,
        "arrival_id": dest_iata,
        "outbound_date": start_date,
        "currency": "USD",
        "hl": "en",
        "api_key": _serpapi_key(),
        "type": "1" if is_rt else "2",
    }
    if is_rt:
        params["return_date"] = end_date
    resp = requests.get("https://serpapi.com/search", params=params, timeout=20)
    resp.raise_for_status()
    data = resp.json()
    return {
        "best_flights": data.get("best_flights", []) or [],
        "other_flights": data.get("other_flights", []) or [],
    }


def search_hotels(
    dest_city: str,
    check_in: str,
    check_out: str,
    travelers: int = 1,
) -> dict[str, Any]:
    params = {
        "engine": "google_hotels",
        "q": dest_city,
        "check_in_date": check_in,
        "check_out_date": check_out,
        "adults": travelers,
        "currency": "USD",
        "hl": "en",
        "api_key": _serpapi_key(),
    }
    resp = requests.get("https://serpapi.com/search", params=params, timeout=20)
    resp.raise_for_status()
    return {"properties": resp.json().get("properties", []) or []}


def get_weather_forecast(
    dest_city: str,
    start_date: str,
    end_date: str,
    unit_group: str = "metric",
) -> dict[str, Any]:
    api_key = os.getenv("VISUAL_CROSSING_API_KEY")
    if not api_key:
        raise ValueError("Missing VISUAL_CROSSING_API_KEY in environment.")
    url = (
        f"https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services"
        f"/timeline/{dest_city}/{start_date}/{end_date}"
    )
    params = {"unitGroup": unit_group, "key": api_key, "contentType": "json"}
    resp = requests.get(url, params=params, timeout=15)
    resp.raise_for_status()
    return {"days": resp.json().get("days", []) or []}


def _rapidapi_headers() -> dict[str, str]:
    key = os.getenv("RAPIDAPI_KEY")
    if not key:
        raise ValueError("Missing RAPIDAPI_KEY in environment.")
    return {
        "X-RapidAPI-Key": key,
        "X-RapidAPI-Host": "irctc1.p.rapidapi.com",
    }


def search_trains(
    origin_code: str,
    dest_code: str,
    date_of_journey: str,
) -> dict[str, Any]:
    url = "https://irctc1.p.rapidapi.com/api/v3/trainBetweenStations"
    params = {
        "fromStationCode": origin_code,
        "toStationCode": dest_code,
        "dateOfJourney": date_of_journey,
    }
    resp = requests.get(url, headers=_rapidapi_headers(), params=params, timeout=20)
    resp.raise_for_status()
    return {"data": resp.json().get("data", []) or []}


def get_train_fare(
    train_number: str,
    origin_code: str,
    dest_code: str,
) -> dict[str, Any]:
    url = "https://irctc1.p.rapidapi.com/api/v1/getFare"
    params = {
        "trainNo": train_number,
        "fromStationCode": origin_code,
        "toStationCode": dest_code,
    }
    resp = requests.get(url, headers=_rapidapi_headers(), params=params, timeout=10)
    resp.raise_for_status()
    return resp.json()


def search_restaurants(
    lat_long: Optional[str] = None,
    search_location: str = "Unknown",
) -> dict[str, Any]:
    params: dict[str, Any] = {"api_key": _serpapi_key()}
    if lat_long:
        params.update({
            "engine": "google_maps",
            "q": "best restaurants",
            "ll": lat_long,
            "type": "search",
        })
    else:
        params.update({
            "engine": "google_local",
            "q": f"best restaurants in {search_location}",
        })
    resp = requests.get("https://serpapi.com/search", params=params, timeout=20)
    resp.raise_for_status()
    return {"local_results": resp.json().get("local_results", []) or []}


def search_travel_news(dest_city: str) -> dict[str, Any]:
    query = f"{dest_city} (travel OR tourism OR strike OR weather OR festival OR event)"
    params = {
        "engine": "google_news",
        "q": query,
        "gl": "us",
        "hl": "en",
        "api_key": _serpapi_key(),
    }
    resp = requests.get("https://serpapi.com/search", params=params, timeout=20)
    resp.raise_for_status()
    return {"news_results": resp.json().get("news_results", []) or []}


def search_attractions(
    query: str,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
) -> dict[str, Any]:
    params: dict[str, Any] = {
        "engine": "google_maps",
        "type": "search",
        "q": query,
        "api_key": _serpapi_key(),
    }
    if lat is not None and lng is not None:
        params["ll"] = f"@{lat},{lng},14z"
    resp = requests.get("https://serpapi.com/search", params=params, timeout=15)
    resp.raise_for_status()
    return {"local_results": resp.json().get("local_results", []) or []}
