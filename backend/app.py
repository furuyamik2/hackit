# backend/app.py

import os
import uuid
import asyncio
import json
import sys
from pathlib import Path
from typing import Dict, List

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# .envファイルを読み込み
load_dotenv()

# ── モデルロードロジックは省略 ──
from ai import initialize_model, generate_response

app = FastAPI(title="AI Chat Application", version="1.0.0")

# CORS設定を追加（外部アクセス対応）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 全てのオリジンを許可（外部アクセス対応）
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 1. static フォルダを正しく参照 ─────────────────────────
# app.py がある backend/ ディレクトリ内に static/ がある
BASE_DIR   = Path(__file__).parent
STATIC_DIR = BASE_DIR / "static"
assert STATIC_DIR.exists(), f"static フォルダが見つかりません: {STATIC_DIR}"

# ── 2. /static プレフィックスでマウント ────────────────────
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# ── 3. ルートおよび chat.html へのハンドラ ─────────────────
@app.get("/", include_in_schema=False)
async def root():
    # これで static/index.html が返ります
    print(f"Serving index.html from: {STATIC_DIR / 'index.html'}")
    return FileResponse(STATIC_DIR / "index.html")

@app.get("/health", include_in_schema=False)
async def health_check():
    """ヘルスチェック用エンドポイント"""
    return {"status": "ok", "message": "Server is running"}



@app.get("/chat.html", include_in_schema=False)
async def chat_page():
    return FileResponse(STATIC_DIR / "chat.html")

# ── 4. モデルの遅延ロードをバックグラウンドで開始 ────────────
@app.on_event("startup")
async def on_startup():
    # モデルロードを別タスクとしてキックするだけ
    import asyncio
    asyncio.create_task(initialize_model())

# ── 以下、ルーム管理＆WebSocket はそのまま ─────────────────
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
    
    # ルーム作成時にルームIDを表示
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except:
        local_ip = "127.0.0.1"
    
    print(f"🎉 新しいルームが作成されました!")
    print(f"   📝 ホスト名: {req.host_name}")
    print(f"   🔑 ルームID: {room_id}")
    print(f"   🌐 アクセスURL: http://{local_ip}:8080/chat.html?room_id={room_id}&name={req.host_name}")
    print("=" * 60)
    
    return RoomInfo(room_id=room_id, host_name=req.host_name)

@app.get("/rooms/{room_id}", response_model=RoomInfo)
async def get_room(room_id: str):
    if room_id not in rooms:
        print(f"❌ ルーム {room_id} が見つかりません")
        raise HTTPException(status_code=404, detail="Room not found")
    
    info = rooms[room_id]
    print(f"✅ ルーム {room_id} の情報を取得しました (ホスト: {info['host']})")
    return RoomInfo(room_id=room_id, host_name=info["host"])

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
    
    # ルーム参加時にログを表示
    print(f"👋 {name} さんがルーム {room_id} に参加しました")
    
    await manager.broadcast(room_id, {"type":"system","text":f"{name} さんが参加しました。"})
    history: List[str] = []
    try:
        while True:
            msg = await websocket.receive_json()
            await manager.broadcast(room_id, msg)

            if msg.get("type") == "chat":
                user_text = msg["text"]
                history.append(f"ユーザー: {user_text}")

                ai_text = generate_response(history[-6:])
                history.append(f"AI: {ai_text}")

                await manager.broadcast(room_id, {"type":"chat","name":"AI","text":ai_text})

    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)
        
        # ルーム退出時にログを表示
        print(f"👋 {name} さんがルーム {room_id} から退出しました")
        
        await manager.broadcast(room_id, {"type":"system","text":f"{name} さんが退出しました。"})


# ── 単体テスト用の関数群 ──────────────────────────────────
def test_static_files():
    """静的ファイルの存在確認テスト"""
    print("=== Testing Static Files ===")
    
    # static フォルダの存在確認
    if STATIC_DIR.exists():
        print("✓ Static directory exists")
    else:
        print("✗ Static directory not found")
        return False
        
    # index.html の存在確認
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        print("✓ index.html exists")
    else:
        print("✗ index.html not found")
        return False
        
    # chat.html の存在確認
    chat_file = STATIC_DIR / "chat.html"
    if chat_file.exists():
        print("✓ chat.html exists")
    else:
        print("✗ chat.html not found")
        return False
        
    return True


def test_room_management():
    """ルーム管理機能のテスト"""
    print("\n=== Testing Room Management ===")
    
    try:
        # ルーム作成のテスト
        room_data = RoomCreateRequest(host_name="TestUser")
        room_info = create_room_sync(room_data)
        
        if room_info and room_info.room_id:
            print(f"✓ Room created successfully: {room_info.room_id}")
            
            # ルーム取得のテスト
            retrieved_room = get_room_sync(room_info.room_id)
            if retrieved_room and retrieved_room.host_name == "TestUser":
                print("✓ Room retrieval successful")
                return True
            else:
                print("✗ Room retrieval failed")
                return False
        else:
            print("✗ Room creation failed")
            return False
            
    except Exception as e:
        print(f"✗ Room management test failed: {e}")
        return False


def test_ai_functions():
    """AI機能のテスト"""
    print("\n=== Testing AI Functions ===")
    
    try:
        # モデル情報の表示
        from ai import get_model_info
        model_info = get_model_info()
        print(f"Model Type: {model_info['model_type']}")
        
        # モデルの初期化テスト
        print("Initializing AI model...")
        initialize_model()
        print("✓ AI model initialization successful")
        
        # 応答生成のテスト
        test_chat = ["ユーザー: こんにちは"]
        response = generate_response(test_chat, max_new_tokens=50)
        
        if response and len(response.strip()) > 0:
            print(f"✓ AI response generation successful: {response[:50]}...")
            return True
        else:
            print("✗ AI response generation failed - empty response")
            return False
            
    except Exception as e:
        print(f"✗ AI functions test failed: {e}")
        return False


# 同期版の関数（テスト用）
def create_room_sync(req: RoomCreateRequest) -> RoomInfo:
    """ルーム作成の同期版（テスト用）"""
    room_id = str(uuid.uuid4())
    rooms[room_id] = {"host": req.host_name, "members": [req.host_name]}
    return RoomInfo(room_id=room_id, host_name=req.host_name)


def get_room_sync(room_id: str) -> RoomInfo:
    """ルーム取得の同期版（テスト用）"""
    if room_id not in rooms:
        return None
    info = rooms[room_id]
    return RoomInfo(room_id=room_id, host_name=info["host"])


def run_tests():
    """全てのテストを実行"""
    print("Starting FastAPI application tests...")
    print("="*50)
    
    test_results = []
    
    # 静的ファイルのテスト
    test_results.append(test_static_files())
    
    # ルーム管理のテスト
    test_results.append(test_room_management())
    
    # AI機能のテスト
    test_results.append(test_ai_functions())
    
    # 結果サマリー
    print("\n" + "="*50)
    print("TEST SUMMARY")
    print("="*50)
    
    total_tests = len(test_results)
    passed_tests = sum(test_results)
    failed_tests = total_tests - passed_tests
    
    print(f"Total tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {failed_tests}")
    
    if passed_tests == total_tests:
        print("\n🎉 All tests passed!")
        return True
    else:
        print(f"\n⚠️  {failed_tests} test(s) failed")
        return False


if __name__ == "__main__":
    # コマンドライン引数の確認
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        # テストモード
        success = run_tests()
        sys.exit(0 if success else 1)
    else:
        # 通常のサーバー起動モード
        import uvicorn
        import socket
        
        # サーバー設定
        HOST = "0.0.0.0"  # 外部アクセスを許可
        PORT = 8080
        
        # ローカルIPアドレスを取得
        def get_local_ip():
            try:
                # 外部サイトに接続してローカルIPを取得
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                s.connect(("8.8.8.8", 80))
                local_ip = s.getsockname()[0]
                s.close()
                return local_ip
            except:
                return "127.0.0.1"
        
        local_ip = get_local_ip()
        
        print("Starting FastAPI server...")
        print("Available commands:")
        print("  python app.py          - Start the server")
        print("  python app.py test     - Run tests")
        print(f"\nStarting server on http://{HOST}:{PORT}")
        print("Server will be accessible at:")
        print(f"  - Local: http://localhost:{PORT}")
        print(f"  - Local: http://127.0.0.1:{PORT}")
        print(f"  - Network: http://{local_ip}:{PORT}")
        print("\n⚠️  Make sure your firewall allows connections on port 8080")
        print("⚠️  Other devices on the same network can access using the Network URL")
        print("\n💡 サーバーは独立したプロセスとして動作しています")
        print("💡 停止するには: python server_manager.py stop")
        
        uvicorn.run(app, host=HOST, port=PORT)
