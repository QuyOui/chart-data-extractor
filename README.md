# Chart Data Extractor — Prototype

Upload a PDF or image containing charts. Claude Opus 4.6 vision analyses
the page and returns structured data you can review, edit, and export as
Excel, CSV, or JSON.

## Architecture

```
frontend/   Next.js 15 + Tailwind CSS    → localhost:3000
backend/    Python FastAPI + Claude API  → localhost:8000
```

---

## Quick Start

### 1. Backend

```bash
cd backend

# Copy and fill in your Anthropic API key
cp .env.example .env

# Install dependencies (Python 3.11+ recommended)
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload
```

The API will be at http://localhost:8000
Interactive docs: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend

npm install
npm run dev
```

Open http://localhost:3000

---

## Supported Formats

| Format | Notes |
|--------|-------|
| PDF    | All pages extracted (up to 30) |
| PNG / JPG / WEBP | Single image |
| PPTX   | Embedded picture shapes per slide |

> **PPTX limitation:** Native PowerPoint chart objects (not images)
> cannot be rendered without LibreOffice. Export your slides as PNG
> from PowerPoint for best results.

---

## How it works

1. **Upload** — file is sent to FastAPI, converted to JPEG images
2. **Extract** — click "Extract Charts"; the page image is sent to
   Claude Opus 4.6 with a vision prompt asking for structured JSON
3. **Review** — extracted data appears in an editable table; click
   any cell to correct mistakes
4. **Export** — download all extracted charts as `.xlsx`, `.csv`, or `.json`

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |

---

## Project Structure

```
.
├── README.md
├── backend/
│   ├── .env.example
│   ├── main.py          # FastAPI app (upload, extract, export)
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   └── page.tsx     # Full SPA — upload → extract → export
    ├── next.config.mjs
    ├── package.json
    ├── postcss.config.mjs
    ├── tailwind.config.ts
    └── tsconfig.json
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/upload` | Upload file → array of page images (base64 JPEG) |
| `POST` | `/api/extract` | Send image → Claude returns structured chart JSON |
| `POST` | `/api/export` | Chart data → xlsx / csv / json file download |
| `GET`  | `/health` | Health check |

---

## Extraction output format

```json
{
  "has_charts": true,
  "confidence": 0.95,
  "charts": [
    {
      "id": 1,
      "type": "stacked_horizontal_bar",
      "title": "Employee Engagement 2024",
      "unit": "%",
      "series": ["Strongly Agree", "Agree", "Neutral", "Disagree", "Strongly Disagree"],
      "data": [
        {
          "label": "I feel valued at work",
          "values": { "Strongly Agree": 32, "Agree": 41, "Neutral": 15, "Disagree": 8, "Strongly Disagree": 4 }
        }
      ]
    }
  ]
}
```

Single-series charts use `"value": <number>` instead of `"values"`.
