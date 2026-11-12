import os
import sys
import socket
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Ensure project root is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.database import init_db
from backend.api.students import router as students_router, settings_router
from backend.api.marks import router as marks_router
from backend.api.analytics import router as analytics_router
from backend.api.backup import router as backup_router
from backend.automation.browser_manager import browser_manager

# Initialize DB
init_db()

def get_lan_ip() -> str:
    """Detect outward LAN IP for mobile phone connectivity"""
    try:
        return socket.gethostbyname(socket.gethostname())
    except Exception:
        return "127.0.0.1"

app = FastAPI(
    title="VRaZ Marks Manager API",
    description="Local automated marks manager for VRaZ MHTCET student accounts",
    version="1.0.0"
)

# CORS configuration allowing LAN/mobile access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(students_router)
app.include_router(settings_router)
app.include_router(marks_router)
app.include_router(analytics_router)
app.include_router(backup_router)

@app.get("/api/mobile/info")
def get_mobile_info():
    """Returns local network address for mobile access"""
    lan_ip = get_lan_ip()
    port = int(os.environ.get("PORT", 8000))
    return {
        "lan_ip": lan_ip,
        "port": port,
        "url": f"http://{lan_ip}:{port}",
        "pwa_ready": True
    }

@app.on_event("shutdown")
async def shutdown_event():
    await browser_manager.close()

# Static frontend serving
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
FRONTEND_PUBLIC = BASE_DIR / "frontend" / "public"

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/sw.js")
    async def serve_sw():
        sw_file = FRONTEND_DIST / "sw.js"
        if not sw_file.exists():
            sw_file = FRONTEND_PUBLIC / "sw.js"
        return FileResponse(
            sw_file,
            media_type="application/javascript",
            headers={"Service-Worker-Allowed": "/", "Cache-Control": "no-cache"}
        )

    @app.get("/manifest.json")
    async def serve_manifest():
        m_file = FRONTEND_DIST / "manifest.json"
        if not m_file.exists():
            m_file = FRONTEND_PUBLIC / "manifest.json"
        return FileResponse(
            m_file,
            media_type="application/manifest+json",
            headers={"Cache-Control": "no-cache"}
        )

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = FRONTEND_DIST / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")

if __name__ == "__main__":
    import uvicorn
    # Bind to 0.0.0.0 to enable access from mobile devices on the same Wi-Fi
    lan_ip = get_lan_ip()
    port = int(os.environ.get("PORT", 8000))
    print(f"\n=======================================================")
    print(f"  VRaZ Marks Manager Server Ready")
    print(f"  Desktop URL:  http://localhost:{port}")
    print(f"  Mobile URL:   http://{lan_ip}:{port}")
    print(f"=======================================================\n")
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=False)
