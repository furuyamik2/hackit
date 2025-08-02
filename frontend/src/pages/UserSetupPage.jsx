import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const UserSetupPage = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');

    const handleCreateRoom = () => {
        // ユーザー名が入力されているかチェック
        if (username.trim() === '') {
            alert('ニックネームを入力してください。');
            return;
        }

        // TODO: バックエンドにルーム作成リクエストを送信する処理を実装
        // バックエンドからroomIdを受け取ったと仮定
        const roomId = 'mockRoomId123';

        // 次のページに遷移
        navigate(`/room/create/${roomId}`);
    };

    const handleBack = () => {

        navigate(`/`);

    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
            {/* タイトル */}
            <h1 className="text-3xl md:text-4xl font-bold text-center text-gray-800">
                ニックネームを設定
            </h1>
            <p className="mt-2 text-md text-gray-600">
                議論に参加するあなたの名前を教えてください。
            </p>

            {/* 入力フォームのコンテナ */}
            <div className="mt-8 w-full max-w-sm">
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ニックネームを入力"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                />
            </div>

            {/* ルーム作成ボタン */}
            <div className="mt-6 w-full max-w-sm">
                <button
                    onClick={handleCreateRoom}
                    className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 text-xl font-semibold"
                >
                    ルームを作成
                </button>
            </div>
            {/* 戻る */}
            <div className="mt-6 w-full max-w-sm">
                <button
                    onClick={handleBack}
                    className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 text-xl font-semibold"
                >
                    戻る
                </button>
            </div>
        </div>
    );
};

export default UserSetupPage;