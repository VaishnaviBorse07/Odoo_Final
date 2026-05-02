# Local dev server — from this folder: python run_dev.py (requires .env with DATABASE_URL).
import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
