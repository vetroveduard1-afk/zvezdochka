import os
import sqlite3
import hashlib
from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import BaseModel, Field
import uvicorn

app = FastAPI(title="Звёздочка* — Анонимный реестр ИФТ")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "zvezdochka.db")

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        cols = [r for r in conn.execute("PRAGMA table_info(verified_cases)").fetchall()]
        if cols and "doc_hash" not in [c for c in cols]:
            conn.execute("DROP TABLE verified_cases")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS verified_cases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                doc_hash TEXT UNIQUE NOT NULL,
                bank_name TEXT NOT NULL,
                product_type TEXT NOT NULL,
                total_paid REAL NOT NULL,
                total_fees REAL NOT NULL,
                fee_ratio INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

@app.on_event("startup")
def startup():
    init_db()

class CaseReport(BaseModel):
    doc_fingerprint: str = Field(..., min_length=4, max_length=256)
    bank_name: str = Field(..., max_length=120)
    product_type: str = Field(..., max_length=120)
    total_paid: float = Field(..., ge=0)
    total_fees: float = Field(..., ge=0)

@app.get("/")
def serve_index():
    return FileResponse(os.path.join(BASE_DIR, "index.html"), media_type="text/html")

@app.get("/favicon.ico")
def serve_favicon():
    return Response(status_code=204)

@app.get("/pdf.min.js")
def serve_pdfjs():
    return FileResponse(os.path.join(BASE_DIR, "pdf.min.js"), media_type="application/javascript")

@app.get("/pdf.worker.min.js")
def serve_pdf_worker():
    return FileResponse(os.path.join(BASE_DIR, "pdf.worker.min.js"), media_type="application/javascript")

@app.get("/banks_data.js")
def serve_banks():
    return FileResponse(os.path.join(BASE_DIR, "banks_data.js"), media_type="application/javascript")

@app.get("/scanner_engine.js")
def serve_scanner():
    return FileResponse(os.path.join(BASE_DIR, "scanner_engine.js"), media_type="application/javascript")

@app.post("/api/stats/report")
def add_report(report: CaseReport):
    doc_hash = hashlib.sha256(report.doc_fingerprint.encode("utf-8")).hexdigest()
    ratio = int(round((report.total_fees / report.total_paid) * 100)) if report.total_paid > 0 else 0
    try:
        with sqlite3.connect(DB_PATH) as conn:
            conn.execute(
                "INSERT INTO verified_cases (doc_hash, bank_name, product_type, total_paid, total_fees, fee_ratio) VALUES (?, ?, ?, ?, ?, ?)",
                (doc_hash, report.bank_name, report.product_type, round(report.total_paid, 2), round(report.total_fees, 2), min(100, ratio))
            )
        return {"status": "accepted"}
    except sqlite3.IntegrityError:
        return JSONResponse(status_code=200, content={"status": "duplicate"})

@app.get("/api/stats/summary")
def get_summary():
    with sqlite3.connect(DB_PATH) as conn:
        cnt, total = conn.execute("SELECT COUNT(*), COALESCE(SUM(total_fees), 0) FROM verified_cases").fetchone()
    return {"total_cases": int(cnt), "total_hidden_fees": round(float(total), 2)}

if __name__ == "__main__":
    print("Сервер Звёздочка* запущен -> http://127.0.0.1:8000")
    uvicorn.run(app, host="127.0.0.1", port=8000)
