

from __future__ import annotations
from typing import List
from langchain_cohere import ChatCohere
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import json, os, requests


class SelectedSite(BaseModel):
    name: str = Field(description="Name of the tourist attraction.")
    address: str = Field(description="Full address of the site.")
    type_of_place: str = Field(description="Type of attraction (e.g., Museum, Historic Landmark, Park).")
    vibe: str = Field(description="The general atmosphere or vibe of the place.")
    details: str = Field(description="Brief description and why it's a must-visit (reasoning).")
    opening_times: str = Field(description="Operating hours or 'Check locally' if unavailable.")
    reviews: List[str] = Field(description="A few snippets from recent reviews to capture public sentiment.")
    entry_fee: str = Field(description="Estimated entry fee or 'Free'/'Unknown'.")
    suggestions: str = Field(description="Practical tips for visiting (e.g., 'Go early to avoid crowds', 'Wear comfortable shoes').")
    photo_url: str = Field(description="A valid URL of a photo of the site, if available.")

class SiteSelection(BaseModel):
    best_sites: List[SelectedSite] = Field(description="Top 4 to 6 highly recommended tourist attractions to visit.")
    

def site_seeing_agent(state: dict) -> dict:
    print("dummy site seeing agent called with state:", state)