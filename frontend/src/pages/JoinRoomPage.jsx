import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
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

export default JoinRoomPage;