from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pydantic import BaseModel, Field
from typing import List, Optional
import os
import uuid
from datetime import datetime

# Initialize FastAPI app
app = FastAPI(title="Fantasy Football Auction Manager")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = MongoClient(MONGO_URL)
db = client.fantasy_football
players_collection = db.players
budgets_collection = db.budgets

# Pydantic models
class Player(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    team: str
    role: str  # portiere, difensore, centrocampista, attaccante
    goals: int = 0
    assists: int = 0
    is_penalty_taker: bool = False
    price_paid: float = 0.0
    max_desired_price: float = 0.0
    is_primary_choice: bool = True
    priority_order: int = 1  # 1 = primary, 2+ = backup choices
    created_at: datetime = Field(default_factory=datetime.utcnow)

class BudgetConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    total_budget: float = 500.0
    portiere_budget: float = 10.0
    difensore_budget: float = 90.0
    centrocampista_budget: float = 200.0
    attaccante_budget: float = 200.0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UpdateBudgetRequest(BaseModel):
    total_budget: float
    portiere_budget: float
    difensore_budget: float
    centrocampista_budget: float
    attaccante_budget: float

# API Routes

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "Fantasy Football Auction Manager API"}

@app.get("/api/players", response_model=List[Player])
async def get_players():
    """Get all players"""
    try:
        players = list(players_collection.find({}, {"_id": 0}))
        return players
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/players/role/{role}")
async def get_players_by_role(role: str):
    """Get players by role"""
    try:
        players = list(players_collection.find({"role": role}, {"_id": 0}))
        # Sort by priority (primary choices first, then by priority_order)
        players.sort(key=lambda x: (not x.get('is_primary_choice', True), x.get('priority_order', 1)))
        return players
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/players", response_model=Player)
async def create_player(player: Player):
    """Create a new player"""
    try:
        player_dict = player.dict()
        players_collection.insert_one(player_dict)
        return player
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/players/{player_id}", response_model=Player)
async def update_player(player_id: str, player: Player):
    """Update a player"""
    try:
        player_dict = player.dict()
        player_dict["id"] = player_id
        result = players_collection.replace_one({"id": player_id}, player_dict)
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Player not found")
        return player
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/players/{player_id}")
async def delete_player(player_id: str):
    """Delete a player"""
    try:
        result = players_collection.delete_one({"id": player_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Player not found")
        return {"message": "Player deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/budget")
async def get_budget():
    """Get current budget configuration"""
    try:
        budget = budgets_collection.find_one({}, {"_id": 0}, sort=[("created_at", -1)])
        if not budget:
            # Create default budget
            default_budget = BudgetConfig()
            budgets_collection.insert_one(default_budget.dict())
            return default_budget.dict()
        return budget
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/budget")
async def update_budget(budget_request: UpdateBudgetRequest):
    """Update budget configuration"""
    try:
        budget = BudgetConfig(**budget_request.dict())
        budgets_collection.insert_one(budget.dict())
        return budget.dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/budget/summary")
async def get_budget_summary():
    """Get budget summary with spent amounts"""
    try:
        # Get current budget
        budget = budgets_collection.find_one({}, {"_id": 0}, sort=[("created_at", -1)])
        if not budget:
            budget = BudgetConfig().dict()
        
        # Calculate spent amounts by role
        roles = ["portiere", "difensore", "centrocampista", "attaccante"]
        summary = {
            "total_budget": budget["total_budget"],
            "roles": {}
        }
        
        total_spent = 0
        for role in roles:
            players = list(players_collection.find({"role": role}, {"price_paid": 1}))
            spent = sum(player.get("price_paid", 0) for player in players)
            allocated = budget.get(f"{role}_budget", 0)
            
            summary["roles"][role] = {
                "allocated": allocated,
                "spent": spent,
                "remaining": allocated - spent,
                "overflow": max(0, spent - allocated)
            }
            total_spent += spent
        
        summary["total_spent"] = total_spent
        summary["total_remaining"] = budget["total_budget"] - total_spent
        
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)