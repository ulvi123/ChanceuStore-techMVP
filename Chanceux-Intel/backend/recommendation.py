from motor.motor_asyncio import AsyncIOMotorClient
from collections import defaultdict
from typing import List, Dict
import os
from dotenv import load_dotenv

load_dotenv()

client = AsyncIOMotorClient(os.getenv("MONGODB_URL"))
db = client.chanceux_intel

async def get_recommendations(store_id: str, section: str, items_touched: List[str]) -> Dict:
    """
    Simple collaborative filtering:
    "Customers who browsed X also looked at Y"
    """
    
    # Find similar sessions (same section, overlapping items)
    similar_sessions = await db.events.find({
        "store_id": store_id,
        "section": section,
        "items_touched": {"$in": items_touched}  # At least one item in common
    }).limit(50).to_list(50)
    
    # Count what other items they touched
    item_frequency = defaultdict(int)
    for session in similar_sessions:
        for item in session["items_touched"]:
            if item not in items_touched:  # Don't recommend what they already saw
                item_frequency[item] += 1
    
    # Sort by frequency
    recommendations = sorted(item_frequency.items(), key=lambda x: x[1], reverse=True)[:5]
    
    return {
        "section": section,
        "based_on_items": items_touched,
        "recommendations": [
            {
                "item": item,
                "times_browsed_together": count,
                "confidence": min(count / len(similar_sessions) * 100, 100) if similar_sessions else 0
            }
            for item, count in recommendations
        ],
        "similar_customers": len(similar_sessions)
    }

async def get_section_recommendations(store_id: str, current_section: str) -> Dict:
    """
    "Customers who browsed athletic wear also visited..."
    """
    
    # Get all sessions that included this section
    sessions_with_section = await db.events.find({
        "store_id": store_id,
        "section": current_section
    }).limit(100).to_list(100)
    
    if not sessions_with_section:
        return {"message": "Not enough data yet"}
    
    # Get the customer IDs (or timestamps as proxy)
    session_ids = [s["_id"] for s in sessions_with_section]
    
    # Find what OTHER sections those customers visited
    # For MVP, we'll use timestamp proximity as a proxy for "same customer"
    section_frequency = defaultdict(int)
    
    for session in sessions_with_section:
        # In a real system, you'd track customer_id across sessions
        # For MVP, we'll just look at section co-occurrence
        section_frequency[session["section"]] += 1
    
    # Remove current section
    section_frequency.pop(current_section, None)
    
    top_sections = sorted(section_frequency.items(), key=lambda x: x[1], reverse=True)[:3]
    
    return {
        "if_customer_browses": current_section,
        "they_also_visit": [
            {"section": section, "percentage": count / len(sessions_with_section) * 100}
            for section, count in top_sections
        ]
    }