# BFHL Node Explorer

> Live Demo: [frontend URL](https://your-frontend-url.com)
> API Base: [api URL](https://your-api-url.com)

## What it does
BFHL Node Explorer accepts directed edges like `A->B`, validates and deduplicates them, then builds forest hierarchies with cycle detection and depth calculation. The API returns tree/cycle structures, invalid entries, duplicate edges, and a compact summary. The frontend provides chip-based input, SVG hierarchy visualization, animated stats, and raw JSON inspection.

## API

### POST /bfhl
**Request:**
```json
{ "data": ["A->B", "A->C", "B->D"] }
```

**Response:**
```json
{
  "user_id": "devanshsingh_24042026",
  "email_id": "devansh.singh20045@gmail.com",
  "college_roll_number": "RA2311027010014",
  "hierarchies": [
    {
      "root": "A",
      "tree": {
        "A": {
          "B": {
            "D": {}
          },
          "C": {
            "E": {
              "F": {}
            }
          }
        }
      },
      "depth": 4
    },
    {
      "root": "X",
      "tree": {},
      "has_cycle": true
    },
    {
      "root": "P",
      "tree": {
        "P": {
          "Q": {
            "R": {}
          }
        }
      },
      "depth": 3
    },
    {
      "root": "G",
      "tree": {
        "G": {
          "H": {},
          "I": {}
        }
      },
      "depth": 2
    }
  ],
  "invalid_entries": ["hello", "1->2", "A->"],
  "duplicate_edges": ["G->H"],
  "summary": {
    "total_trees": 3,
    "total_cycles": 1,
    "largest_tree_root": "A"
  }
}
```

### GET /bfhl
Returns identity fields.

## Edge Cases Handled
| Input | Behaviour |
|---|---|
| Self-loop `A->A` | `invalid_entries` |
| Pure cycle `X->Y->Z->X` | `has_cycle: true`, lex root |
| Multi-parent diamond | first parent wins |
| Triple duplicate | listed once in `duplicate_edges` |
| Whitespace ` A->B ` | trimmed and validated |

## Security & Reliability

| Layer | Measure |
|---|---|
| Body size | 10kb hard limit |
| Array cap | Max 200 entries |
| String cap | Each entry truncated to 20 chars |
| Rate limiting | 100 requests per IP per 15 minutes |
| HTTP headers | Helmet (11 headers including HSTS, nosniff, no X-Powered-By) |
| CORS | Configurable via ALLOWED_ORIGINS env var |
| Compression | gzip on all responses |
| Crash recovery | uncaughtException exits cleanly so host restarts process |
| Health check | GET /health returns uptime + timestamp |

## Running Locally
```bash
npm install
npm run dev       # API on :3000
open frontend/index.html
```

## Running Tests
```bash
npm test
```

## Stack
- Node.js + Express
- Vanilla JS frontend (no build step)
- Jest for tests
