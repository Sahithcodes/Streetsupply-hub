from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "The backend is successfully running!"}

@app.get("/api/test")
def test_endpoint():
    return {"status": "success", "data": "Frontend connection ready."}