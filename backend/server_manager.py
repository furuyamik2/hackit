#!/usr/bin/env python3
"""
AI Chat Application Server Manager
サーバーを独立したプロセスとして管理します
"""

import os
import sys
import time
import signal
import socket
import subprocess
import threading
from pathlib import Path
from datetime import datetime

class ServerManager:
    def __init__(self):
        self.server_process = None
        self.server_pid = None
        self.is_running = False
        self.port = 8080
        self.host = "0.0.0.0"
        
        # PIDファイルのパス
        self.pid_file = Path(__file__).parent / "server.pid"
        self.log_file = Path(__file__).parent / "server.log"
        
    def get_local_ip(self):
        """ローカルIPアドレスを取得"""
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()
            return local_ip
        except:
            return "127.0.0.1"
    
    def check_port_available(self, port):
        """ポートが利用可能かチェック"""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind((self.host, port))
                return True
        except OSError:
            return False
    
    def start_server(self):
        """サーバーを起動"""
        if self.is_running:
            print("⚠️  サーバーは既に起動しています")
            return False
        
        if not self.check_port_available(self.port):
            print(f"❌ ポート {self.port} は既に使用されています")
            return False
        
        try:
            # ログファイルを開く
            with open(self.log_file, 'w', encoding='utf-8') as log:
                # サーバーを起動
                self.server_process = subprocess.Popen(
                    [sys.executable, "app.py"],
                    stdout=log,
                    stderr=subprocess.STDOUT,
                    cwd=Path(__file__).parent,
                    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
                )
                
                self.server_pid = self.server_process.pid
                self.is_running = True
                
                # PIDファイルに書き込み
                with open(self.pid_file, 'w') as f:
                    f.write(str(self.server_pid))
                
                # サーバー起動を待つ
                time.sleep(3)
                
                if self.server_process.poll() is None:
                    local_ip = self.get_local_ip()
                    print("🎉 サーバーが正常に起動しました!")
                    print(f"📡 プロセスID: {self.server_pid}")
                    print(f"🌐 アクセスURL:")
                    print(f"   Local:  http://localhost:{self.port}")
                    print(f"   Local:  http://127.0.0.1:{self.port}")
                    print(f"   Network: http://{local_ip}:{self.port}")
                    print(f"📝 ログファイル: {self.log_file}")
                    print(f"🆔 PIDファイル: {self.pid_file}")
                    print("\n💡 サーバーを停止するには: python server_manager.py stop")
                    return True
                else:
                    print("❌ サーバーの起動に失敗しました")
                    self.cleanup()
                    return False
                    
        except Exception as e:
            print(f"❌ サーバー起動エラー: {e}")
            self.cleanup()
            return False
    
    def stop_server(self):
        """サーバーを停止"""
        if not self.is_running and not self.pid_file.exists():
            print("⚠️  サーバーは起動していません")
            return False
        
        try:
            # PIDファイルからプロセスIDを読み取り
            if self.pid_file.exists():
                with open(self.pid_file, 'r') as f:
                    pid = int(f.read().strip())
            else:
                pid = self.server_pid
            
            if pid:
                # Windowsの場合
                if os.name == 'nt':
                    subprocess.run(['taskkill', '/F', '/PID', str(pid)], 
                                 capture_output=True, text=True)
                else:
                    # Unix系の場合
                    os.kill(pid, signal.SIGTERM)
                    time.sleep(2)
                    try:
                        os.kill(pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass
            
            self.cleanup()
            print("🛑 サーバーを停止しました")
            return True
            
        except Exception as e:
            print(f"❌ サーバー停止エラー: {e}")
            return False
    
    def status(self):
        """サーバーの状態を確認"""
        if self.pid_file.exists():
            try:
                with open(self.pid_file, 'r') as f:
                    pid = int(f.read().strip())
                
                # プロセスが存在するかチェック
                if os.name == 'nt':
                    result = subprocess.run(['tasklist', '/FI', f'PID eq {pid}'], 
                                          capture_output=True, text=True)
                    is_running = str(pid) in result.stdout
                else:
                    try:
                        os.kill(pid, 0)
                        is_running = True
                    except OSError:
                        is_running = False
                
                if is_running:
                    local_ip = self.get_local_ip()
                    print("🟢 サーバーは起動中です")
                    print(f"📡 プロセスID: {pid}")
                    print(f"🌐 アクセスURL:")
                    print(f"   Local:  http://localhost:{self.port}")
                    print(f"   Local:  http://127.0.0.1:{self.port}")
                    print(f"   Network: http://{local_ip}:{self.port}")
                    
                    # ログファイルの最後の行を表示
                    if self.log_file.exists():
                        try:
                            with open(self.log_file, 'r', encoding='utf-8') as f:
                                lines = f.readlines()
                                if lines:
                                    print(f"📝 最新ログ: {lines[-1].strip()}")
                        except:
                            pass
                else:
                    print("🔴 サーバーは停止しています（PIDファイルは残存）")
                    self.cleanup()
            except Exception as e:
                print(f"❌ 状態確認エラー: {e}")
        else:
            print("🔴 サーバーは起動していません")
    
    def cleanup(self):
        """クリーンアップ処理"""
        self.is_running = False
        self.server_process = None
        self.server_pid = None
        
        if self.pid_file.exists():
            try:
                self.pid_file.unlink()
            except:
                pass
    
    def restart_server(self):
        """サーバーを再起動"""
        print("🔄 サーバーを再起動しています...")
        self.stop_server()
        time.sleep(2)
        return self.start_server()

def main():
    manager = ServerManager()
    
    if len(sys.argv) < 2:
        print("AI Chat Application Server Manager")
        print("=" * 50)
        print("使用方法:")
        print("  python server_manager.py start   - サーバーを起動")
        print("  python server_manager.py stop    - サーバーを停止")
        print("  python server_manager.py restart - サーバーを再起動")
        print("  python server_manager.py status  - サーバーの状態確認")
        print("  python server_manager.py logs    - ログを表示")
        return
    
    command = sys.argv[1].lower()
    
    if command == "start":
        manager.start_server()
    elif command == "stop":
        manager.stop_server()
    elif command == "restart":
        manager.restart_server()
    elif command == "status":
        manager.status()
    elif command == "logs":
        if manager.log_file.exists():
            try:
                with open(manager.log_file, 'r', encoding='utf-8') as f:
                    print("📝 サーバーログ:")
                    print("=" * 50)
                    print(f.read())
            except Exception as e:
                print(f"❌ ログ読み込みエラー: {e}")
        else:
            print("📝 ログファイルが見つかりません")
    else:
        print(f"❌ 不明なコマンド: {command}")

if __name__ == "__main__":
    main() 