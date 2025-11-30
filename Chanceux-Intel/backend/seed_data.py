import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
import random
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL")
client = AsyncIOMotorClient(MONGODB_URL)
db = client.fashion_intel

# Sample data
SECTIONS = ["athletic", "formal", "casual", "accessories", "footwear", "outerwear"]
ITEMS = {
    "athletic": ["nike-shoes-001", "adidas-shorts-002", "puma-top-003", "under-armour-leggings-004"],
    "formal": ["blazer-black-001", "dress-shirt-white-002", "trousers-navy-003", "tie-silk-004"],
    "casual": ["jeans-blue-001", "tshirt-plain-002", "hoodie-gray-003", "sweater-wool-004"],
    "accessories": ["belt-leather-001", "watch-sport-002", "sunglasses-003", "bag-tote-004"],
    "footwear": ["boots-leather-001", "sneakers-white-002", "loafers-brown-003", "sandals-004"],
    "outerwear": ["jacket-denim-001", "coat-winter-002", "raincoat-003", "vest-puffer-004"]
}

AGE_RANGES = ["18-24", "25-34", "35-44", "45-54", "55+"]
GENDERS = ["M", "F", "NB"]

async def generate_demo_data(store_id: str = "demo-store-001", num_sessions: int = 100):
    """Generate realistic demo sessions"""
    events = []
    
    # Generate sessions over last 7 days
    now = datetime.utcnow()
    
    for i in range(num_sessions):
        section = random.choice(SECTIONS)
        items = random.sample(ITEMS[section], k=random.randint(1, 4))
        time_spent = random.randint(30, 600)  # 30 seconds to 10 minutes
        
        # Sessions more frequent during business hours
        days_ago = random.randint(0, 7)
        hour = random.choices(
            range(9, 21),  # 9 AM to 9 PM
            weights=[1, 2, 3, 5, 7, 8, 10, 9, 7, 5, 3, 2],  # Peak at midday/evening
            k=1
        )[0]
        
        timestamp = now - timedelta(days=days_ago, hours=random.randint(0, 24-hour), minutes=random.randint(0, 59))
        
        event = {
            "store_id": store_id,
            "section": section,
            "items_touched": items,
            "time_spent_seconds": time_spent,
            "demographics": {
                "age_range": random.choice(AGE_RANGES),
                "gender": random.choice(GENDERS)
            },
            "timestamp": timestamp,
            "associate_id": f"associate-{random.randint(1, 5):02d}"
        }
        events.append(event)
    
    # Insert all events
    result = await db.events.insert_many(events)
    print(f"✅ Inserted {len(result.inserted_ids)} demo sessions")
    return len(result.inserted_ids)

async def main():
    print("🌱 Seeding demo data...")
    await generate_demo_data(num_sessions=100)
    print("✨ Done!")

if __name__ == "__main__":
    asyncio.run(main())