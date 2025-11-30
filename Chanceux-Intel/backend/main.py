from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel,Field
from datetime import datetime
from typing import List, Optional
import os
from bson import ObjectId
from datetime import timedelta
from recommendation import get_recommendations, get_section_recommendations

app = FastAPI(title = "Chanceux Intel Backend")

#CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins = ["*"],
    allow_credentials = True,
    allow_methods = ["*"],
    allow_headers = ["*"],
)


# MongoDB Configuration
MONGODB_URL = os.getenv("MONGODB_URL")
print(f"🔗 Connected to MongoDB: {MONGODB_URL[:50] if MONGODB_URL else 'NOT CONFIGURED'}...")
client = AsyncIOMotorClient(MONGODB_URL)
db = client.fashion_intel


#Pydantic models
class InteractionEvent(BaseModel):
    store_id: str
    section:str
    items_touched: List[str]
    time_spent_seconds: int
    demographics: Optional[dict] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    asscociate_id: Optional[str] = None

class SessionResponse(BaseModel):
    id: str
    store_id: str
    section: str
    items_touched: List[str]
    time_spent_seconds: int
    timestamp: datetime


# API Endpoints

#Health check
@app.get("/health")
async def helath_check():
    return {"status": "alive","service": "Chanceux Intel Backend"}

#log interaction event
@app.post("/events", status_code = 201)
async def log_interactions_event(event: InteractionEvent):
    event_dict = event.model_dump()
     # DEBUG: Print what we received
    print("=" * 50)
    print("📝 NEW EVENT RECEIVED:")
    print(f"Store: {event_dict['store_id']}")
    print(f"Section: {event_dict['section']}")
    print(f"Items: {event_dict['items_touched']}")
    print(f"Time: {event_dict['time_spent_seconds']}s")
    print("=" * 50)
    result  = await db.events.insert_one(event_dict)
    print(f"✅ Saved with ID: {result.inserted_id}")
    print()
    return {
        "id": str(result.inserted_id),
        "message": "Interaction event logged successfully"
    }

#Getting recent sessions for the store
@app.get("/sessions/{store_id}")
async def get_recent_sessions(store_id: str, limit: int = 50):
    cursor = db.events.find({"store_id": store_id}).sort("timestamp",-1).limit(limit)
    events = await cursor.to_list(length=limit)

    #converting object id to string for json serialization
    for event in events:
        event["id"] = str(event.pop("_id"))
        
    return {"sessions": events, "count": len(events)}


#Basic analytics endpoint
@app.get("/insights/{store_id}")
async def get_insights(store_id: str):
    #Aggregating the top secitons
    pipeline = [
        {"$match": {"store_id": store_id}},
        {"$group": {
            "_id": "$section",
            "visits": {"$sum": 1},
            "avg_time": {"$avg": "$time_spent_seconds"},
            "total_items_touched": {"$sum": {"$size": "$items_touched"}}
        }},
        {"$sort": {"visits": -1}}
    ]

    sections = await db.events.aggregate(pipeline).to_list(length=100)

    #total sessions for the day
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    total_today = await db.events.count_documents({
        "store_id": store_id,
        "timestamp": {"$gte": today}
    })


    return ({
        "store_id": store_id,
        "top_sections": sections,
        "total_sessions_today": total_today
    })

# Add this endpoint anywhere in your main.py
@app.get("/debug/stats")
async def debug_stats():
    """Check how many events we actually have"""
    total = await db.events.count_documents({})
    
    # Count by store_id
    pipeline = [
        {"$group": {"_id": "$store_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    by_store = await db.events.aggregate(pipeline).to_list(100)
    
    # Get the 5 most recent
    recent = await db.events.find().sort("timestamp", -1).limit(5).to_list(5)
    
    return {
        "total_events_in_db": total,
        "events_by_store": by_store,
        "most_recent_5": [
            {
                "section": e["section"],
                "items": e["items_touched"],
                "time": e["timestamp"].isoformat()
            }
            for e in recent
        ]
    }


@app.post("/recommendations/items")
async def recommend_items(section: str, items_touched: List[str], store_id: str = "demo-store-001"):
    """Get product recommendations based on browsing behavior"""
    return await get_recommendations(store_id, section, items_touched)


@app.get("/recommendations/sections/{section}")
async def recommend_sections(section: str, store_id: str = "demo-store-001"):
    """Get section recommendations"""
    return await get_section_recommendations(store_id, section)


@app.get("/insights/{store_id}/actionable")
async def get_actionable_insights(store_id: str):
    """Generate actionable insights for store owners"""
    
    # Get top sections
    pipeline = [
        {"$match": {"store_id": store_id}},
        {"$group": {
            "_id": "$section",
            "visits": {"$sum": 1},
            "avg_time": {"$avg": "$time_spent_seconds"},
            "avg_items": {"$avg": {"$size": "$items_touched"}}
        }},
        {"$sort": {"visits": -1}}
    ]
    sections = await db.events.aggregate(pipeline).to_list(100)
    
    insights = []
    
    # Insight 1: High traffic, low engagement
    for section in sections:
        if section["visits"] > 10 and section["avg_time"] < 120:
            insights.append({
                "type": "warning",
                "title": f"Low engagement in {section['_id']}",
                "description": f"High traffic ({section['visits']} visits) but customers spend only {int(section['avg_time'])}s. Consider better product placement or signage.",
                "action": "Reorganize display or add promotional signage"
            })
    
    # Insight 2: High engagement, low traffic
    for section in sections:
        if section["visits"] < 10 and section["avg_time"] > 180:
            insights.append({
                "type": "opportunity",
                "title": f"Hidden gem: {section['_id']}",
                "description": f"Customers who find this section spend {int(section['avg_time'])}s browsing. Drive more traffic here.",
                "action": "Add wayfinding signage or move closer to entrance"
            })
    
    # Insight 3: High touch rate
    for section in sections:
        if section["avg_items"] > 3:
            insights.append({
                "type": "success",
                "title": f"Strong interest in {section['_id']}",
                "description": f"Customers touch an average of {section['avg_items']:.1f} items. This section is performing well.",
                "action": "Consider expanding inventory or similar styles"
            })
    
    return {
        "insights": insights[:5],  # Top 5 insights
        "generated_at": datetime.utcnow().isoformat()
    }

@app.get("/debug/connection")
async def debug_connection():
    try:
        await client.admin.command('ping')

        total = await db.events.count_documents({})
        test_doc = {
            "test": True,
            "timestamp": datetime.utcnow(),
            "message": "Connection test"
        }

        result = await db.debug_tests.insert_one(test_doc)

        await db.events.delete_one({"_id": result.inserted_id})

        return {
            "status": "✅ Connected",
            "database": "chanceux_intel",
            "collection": "events",
            "total_events": total,
            "can_write": True,
            "mongodb_url_configured": bool(MONGODB_URL)
        }
    
    except Exception as e:
        return {
            "status": "❌ Connection failed",
            "error": str(e),
            "mongodb_url_configured": bool(MONGODB_URL)
        }

        


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host = "0.0.0.0", port=8000)