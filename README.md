# Vortu / Nexum

SaaS de gestión empresarial para pymes y autónomos — multi-país (ES, MX, CO, AR, CL, PE, SV),
con asistente IA ("Vera"). Backend FastAPI + frontend Next.js 16.

> **Secrets are not in this repo.** Copy `backend/.env.example` → `backend/.env` and fill in
> real values. Never commit `.env`.

## Stack
- **backend/** — FastAPI + SQLAlchemy (SQLite por defecto), Chroma (vector), Neo4j (grafo),
  Vera multi-LLM (Claude/OpenAI/Gemini/DeepSeek) con enrutado por coste y cuota.
- **frontend/** — Next.js 16 (App Router), React 19.

## Setup

### Backend
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # rellena SECRET_KEY, DATABASE_URL, NEO4J_PASSWORD, ANTHROPIC_API_KEY, etc.
python setup_db.py              # crea tablas (o usa migraciones incluidas)
uvicorn main:app --reload --port 8000
```

Migraciones puntuales incluidas (ejecutar una vez si aplica):
`migrate_extraction_tables.py`, `migrate_accounts_company_unique.py`, `configure_deepseek.py`.

### Frontend
```bash
cd frontend
npm install
npm run dev                     # http://localhost:3000  (espera el backend en :8000)
```

## Documentos — pipeline de extracción por evidencia
La carga de documentos usa un pipeline evidence-first (`backend/vera/extraction/`):
extracción barata por esquema → validación determinista → escalado a VLM bajo control de
coste → crítico adversario → consenso multi-perspectiva (alto valor) → cola de revisión humana.
Modelos/prompts/presupuesto se configuran en el backoffice admin (no hardcodeado).

## Notas de seguridad
- Rota cualquier clave que haya estado en un `.env` versionado.
- `DEBUG=false` por defecto; CORS restringido a `FRONTEND_URL`.
