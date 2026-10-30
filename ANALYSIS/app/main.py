import os

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from . import analysis
from .db import connect

app = FastAPI(title="ProjetEmma Analysis", version="1.0.0")

_frontend_url = os.getenv("FRONTEND_URL", "").strip()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        *([_frontend_url] if _frontend_url else []),
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "projetemma-analysis"}


@app.get("/summary")
def summary():
    df = analysis.load_reports()
    df = analysis.classify(df)
    return analysis.summary(df)


@app.get("/trends")
def trends():
    df = analysis.load_reports()
    df = analysis.classify(df)
    return analysis.trends(df)


@app.get("/clusters")
def clusters(
    eps_km: float = Query(default=0.5, ge=0.1, le=20.0),
    min_samples: int = Query(default=2, ge=2, le=20),
):
    df = analysis.load_reports()
    df = analysis.classify(df)
    return analysis.clusters(df, eps_km=eps_km, min_samples=min_samples)


@app.post("/recompute")
def recompute():
    df = analysis.load_reports()
    if df.empty:
        return {"message": "Aucun signalement à analyser", "updated": 0}
    classified = analysis.classify(df)
    updated = 0
    with connect() as conn:
        with conn.cursor() as cur:
            for row in classified.itertuples():
                if row.severityScore is None or row.severityClass is None or row.severityClass == "nan":
                    continue
                cur.execute(
                    'UPDATE "Report" SET "severityScore" = %s, "severityClass" = %s WHERE id = %s',
                    (float(row.severityScore), str(row.severityClass), row.id),
                )
                if cur.rowcount:
                    updated += cur.rowcount
            cur.execute(
                'INSERT INTO "AnalysisRun" (id, type, params, results, "createdAt") VALUES (gen_random_uuid()::text, %s, %s, %s, NOW())',
                (
                    "FULL",
                    '{"source": "service"}',
                    '{"updated": %s}' % updated,
                ),
            )
        conn.commit()
    return {"message": "Analyse terminée", "updated": updated}
