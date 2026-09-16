# Code Plagiarism Monorepo

This monorepo contains the frontend, backend, and two analysis services (Python and Java) for a code plagiarism detection system.

| Service | Folder | Port | Start Command |
|---|---|---|---|
| Frontend | `/frontend` | 5173 | `npm run dev` |
| Backend | `/backend` | 4000 | `npm start` |
| Analysis (Python) | `/analysis-python` | 8000 | `uvicorn main:app --reload --port 8000` |
| Analysis (Java) | `/analysis-java` | 8080 | `mvn compile exec:java` |

## Getting Started

To install dependencies, navigate into each folder and run the following commands:

- **Frontend**: `cd frontend && npm install`
- **Backend**: `cd backend && npm install`
- **Analysis (Python)**: `cd analysis-python && pip install -r requirements.txt`
- **Analysis (Java)**: `cd analysis-java && mvn clean install`
