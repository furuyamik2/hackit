@echo off
echo ============================================================
echo 🤖 AI Chat Application Server Manager
echo ============================================================
echo.

if "%1"=="" (
    echo 使用方法:
    echo   start_server_daemon.bat start   - サーバーを起動
    echo   start_server_daemon.bat stop    - サーバーを停止
    echo   start_server_daemon.bat restart - サーバーを再起動
    echo   start_server_daemon.bat status  - サーバーの状態確認
    echo   start_server_daemon.bat logs    - ログを表示
    echo.
    pause
    exit /b
)

echo 🚀 サーバー管理コマンドを実行中: %1
echo.

python server_manager.py %1

echo.
echo ============================================================
pause 