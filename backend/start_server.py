#!/usr/bin/env python3
"""
AI Chat Application Server Starter
外部アクセス可能なサーバーを起動します
"""

import os
import sys
import socket
import subprocess
from pathlib import Path

def get_local_ip():
    """ローカルIPアドレスを取得"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except:
        return "127.0.0.1"

def check_dependencies():
    """必要な依存関係をチェック"""
    try:
        import fastapi
        import uvicorn
        import torch
        import transformers
        print("✓ All dependencies are installed")
        return True
    except ImportError as e:
        print(f"✗ Missing dependency: {e}")
        print("Please install required packages:")
        print("pip install fastapi uvicorn torch transformers openai google-generativeai python-dotenv")
        return False

def main():
    print("=" * 60)
    print("🤖 AI Chat Application Server")
    print("=" * 60)
    
    # 依存関係チェック
    if not check_dependencies():
        sys.exit(1)
    
    # サーバー設定
    HOST = "0.0.0.0"
    PORT = 8001
    local_ip = get_local_ip()
    
    print(f"\n🚀 Starting server...")
    print(f"📡 Host: {HOST}")
    print(f"🔌 Port: {PORT}")
    print(f"\n🌐 Access URLs:")
    print(f"   Local:  http://localhost:{PORT}")
    print(f"   Local:  http://127.0.0.1:{PORT}")
    print(f"   Network: http://{local_ip}:{PORT}")
    
    print(f"\n⚠️  Important:")
    print(f"   • Make sure your firewall allows connections on port {PORT}")
    print(f"   • Other devices can access using: http://{local_ip}:{PORT}")
    print(f"   • Press Ctrl+C to stop the server")
    print("=" * 60)
    
    try:
        # app.pyを実行
        subprocess.run([sys.executable, "app.py"], check=True)
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped by user")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Server failed to start: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 