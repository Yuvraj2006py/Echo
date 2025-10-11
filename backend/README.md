# Echo Backend

FastAPI service powering Echo's journaling, insights, and automation features.

## Local setup

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Environment variables are listed in the repo-level `.env.example`.
