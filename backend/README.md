# Flask Backend

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file (copy from `.env.example`).

## Run

```bash
python app.py
```

## Health Check

```bash
curl http://localhost:5000/health
```

## Auth Endpoints

```bash
curl -X POST http://localhost:5000/auth/register -H "Content-Type: application/json" -d "{\"name\":\"Test\",\"phone\":\"9876543210\",\"password\":\"secret123\"}"
curl -X POST http://localhost:5000/auth/login -H "Content-Type: application/json" -d "{\"phone\":\"9876543210\",\"password\":\"secret123\"}"
```
