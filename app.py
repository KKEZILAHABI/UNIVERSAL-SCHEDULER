import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
# This module is compiled directly from the Rust code via maturin
import scheduling_core

app = FastAPI(title="Universal Scheduling Engine API")

# Enable CORS for communication with the MERN frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"status": "Engine Online", "backend": "Rust Native Binaries Loaded"}

@app.post("/api/v1/schedule")
async def generate_schedule(payload: dict):
    try:
        # Convert incoming JSON dict directly to a raw string for Rust optimization
        raw_json_str = json.dumps(payload)
        
        # Execute the native Rust solver execution path
        result_str = scheduling_core.solve(raw_json_str)
        
        result_data = json.loads(result_str)
        if "error" in result_data:
            raise HTTPException(status_code=400, detail=result_data["error"])
            
        return result_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)