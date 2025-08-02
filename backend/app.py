from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Dict, List
import uuid

app = FastAPI()

# ── ① StaticFiles のマウントを /static に変更 ─────────────────
app.mount("/static", StaticFiles(directory="static"), name="static")

# ── ② ルートで index.html を返す ────────────────────────────────
@app.get("/", include_in_schema=False)
async def root():
    return FileResponse("static/index.html")

# ── ③ /chat.html を返すハンドラ ──────────────────────────────
@app.get("/chat.html", include_in_schema=False)
async def chat_page():
    return FileResponse("static/chat.html")

# ── ④ ルーム作成 API ───────────────────────────────────────────
class RoomCreateRequest(BaseModel):
    host_name: str
class RoomInfo(BaseModel):
    room_id: str
    host_name: str
rooms: Dict[str, Dict] = {}

@app.post("/rooms", response_model=RoomInfo)
async def create_room(req: RoomCreateRequest):
    room_id = str(uuid.uuid4())
    rooms[room_id] = {"host": req.host_name, "members": [req.host_name]}
    return RoomInfo(room_id=room_id, host_name=req.host_name)

@app.get("/rooms/{room_id}", response_model=RoomInfo)
async def get_room(room_id: str):
    if room_id not in rooms:
        raise HTTPException(status_code=404, detail="Room not found")
    info = rooms[room_id]
    return RoomInfo(room_id=room_id, host_name=info["host"])

# ── ⑤ WebSocket 接続管理 ─────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, room_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.setdefault(room_id, []).append(websocket)

    def disconnect(self, room_id: str, websocket: WebSocket):
        self.active_connections[room_id].remove(websocket)
        if not self.active_connections[room_id]:
            del self.active_connections[room_id]

    async def broadcast(self, room_id: str, message: dict):
        for ws in self.active_connections.get(room_id, []):
            await ws.send_json(message)

manager = ConnectionManager()

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, name: str):
    await manager.connect(room_id, websocket)
    await manager.broadcast(room_id, {"type": "system", "text": f"{name} さんが参加しました。"})
    try:
        while True:
            msg = await websocket.receive_json()
            await manager.broadcast(room_id, msg)
    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)
        await manager.broadcast(room_id, {"type": "system", "text": f"{name} さんが退出しました。"})