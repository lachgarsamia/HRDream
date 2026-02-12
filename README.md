# CV Shortlister

A production-grade web application for automated CV/resume screening and shortlisting.

## Features

- **Multi-format CV parsing**: PDF (text + OCR fallback), DOCX
- **Intelligent extraction**: Names, emails, skills, experience, education
- **Role-based criteria matching**: Must-have/nice-to-have skills, location, experience
- **Evidence-backed scoring**: Every match includes snippet + page number
- **PDF highlighting**: Real coordinate-based highlights on original documents
- **Export**: CSV and PDF reports

## Tech Stack

### Frontend
- Next.js 14 (App Router) + TypeScript
- TailwindCSS + shadcn/ui
- TanStack Table & Query
- react-pdf for PDF viewing

### Backend
- FastAPI + Pydantic
- PostgreSQL + SQLAlchemy 2.0 + pgvector
- Redis + Celery for background jobs
- PyMuPDF + PaddleOCR for parsing
- RapidFuzz for fuzzy matching

## Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local frontend dev)
- Python 3.11+ (for local backend dev)

## Quick Start

### 1. Clone and configure

```bash
cd HRDream
cp .env.example .env
# Edit .env with your settings (especially SECRET_KEY and OPENAI_API_KEY)
```

### 2. Start with Docker Compose

```bash
docker-compose up --build
```

This starts:
- **postgres**: PostgreSQL with pgvector extension (port 5432)
- **redis**: Redis for Celery broker (port 6379)
- **backend**: FastAPI server (port 8000)
- **worker**: Celery worker for background jobs
- **frontend**: Next.js app (port 3000)

### 3. Access the application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Development

### Backend only

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend only

```bash
cd frontend
npm install
npm run dev
```

### Run tests

```bash
# Backend
cd backend
pytest -v

# Frontend
cd frontend
npm run test
```

### Database migrations

```bash
cd backend
alembic upgrade head
alembic revision --autogenerate -m "Description"
```

## Project Structure

```
HRDream/
├── backend/
│   ├── app/
│   │   ├── api/routes/      # API endpoints
│   │   ├── core/            # Database, config, security
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic
│   │   └── utils/           # Helpers
│   ├── alembic/             # Database migrations
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js App Router pages
│   │   ├── components/      # React components
│   │   └── lib/             # Utilities, API client
│   └── public/
├── docker-compose.yml
└── .env.example
```

## Architecture Notes

### Evidence-First Design
All criterion matches must be backed by:
- Text snippet from the CV
- Page number where found
- Confidence score
- Bounding box coordinates (for PDF highlighting)

### Parsing Pipeline
1. Extract text with PyMuPDF (preserving word coordinates)
2. Check text quality (word count, unique ratio)
3. If low quality → OCR with PaddleOCR (per page, with boxes)
4. Structure with LLM (strict JSON schema)
5. Generate embeddings for semantic matching
6. Index in PostgreSQL with pgvector

### Scoring
- Hard filters first (must-have skills, location, min experience)
- Weighted scoring: skill coverage + embedding similarity + experience
- All scores normalized to 0-100

## License

Proprietary - All rights reserved
