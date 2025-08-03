import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import img from "../assets/logo.png"; // ロゴ画像のインポート

const JoinRoomPage = () => {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState('');
    const [username, setUsername] = useState('');

    const handleJoin = () => {
        // ルームIDとユーザー名が入力されているかチェック
        if (roomId.trim() === '' || username.trim() === '') {
            alert('ルームIDとニックネームを両方入力してください。');
            return;
        }

        // バックエンドにルームIDとユーザー名を送信する処理（ここでは仮にコンソールに出力）
        console.log('ルームに参加:', { roomId, username });

        // 成功したと仮定して、議論ページに遷移
        navigate(`/room/create/${roomId}`);
    };

    const handleBack = () => {
        navigate(`/`);
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            {/* ヘッダー */}
            <header className="w-full bg-black text-white p-4 shadow-md">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    {/* ロゴ画像を表示 */}
                    <img 
                        src={img} 
                        alt="議論進行サポート" 
                        className="h-12" 
                    />
                    {/* ナビゲーション */}
                    <nav className="ml-auto">
                        <ul className="flex space-x-4">
                            <li>
                                <a href="/" className="hover:underline">ホーム</a>
                            </li>
                            <li>
                                <a href="/about" className="hover:underline">使い方</a>
                            </li>
                        </ul>
                    </nav>
                </div>
            </header>

            {/* メインコンテンツ */}
            <div className="flex flex-col items-center justify-center flex-grow p-4">
                {/* タイトル */}
                <h1 className="text-3xl md:text-4xl font-bold text-center text-gray-800">
                    ルームに参加
                </h1>
                <p className="mt-2 text-md text-gray-600">
                    ルームIDと、あなたのニックネームを入力してください。
                </p>

                {/* 入力フォームのコンテナ */}
                <div className="mt-8 w-full max-w-sm flex flex-col gap-4">
                    <input
                        type="text"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        placeholder="ルームIDを入力"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                    />
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="ニックネームを入力"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                    />
                </div>

                {/* 参加ボタン */}
                <div className="mt-6 w-full max-w-sm">
                    <button
                        onClick={handleJoin}
                        className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 text-xl font-semibold"
                    >
                        参加する
                    </button>
                </div>

                {/* 戻るボタン */}
                <div className="mt-6 w-full max-w-sm">
                    <button
                        onClick={handleBack}
                        className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 text-xl font-semibold"
                    >
                        戻る
                    </button>
                </div>
            </div>

            {/* フッター */}
            <footer className="bg-black text-white text-center py-0 mt-auto">
                <p>Copyright©2025 Mint. All Rights Reserved.</p>
            </footer>
        </div>
    );
};

export default JoinRoomPage;
