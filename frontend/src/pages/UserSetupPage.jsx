import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase'
import { signInAnonymously } from 'firebase/auth'; // signInAnonymously関数をインポート

const UserSetupPage = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');



    const handleCreateRoom = async () => {
        // ユーザー名が入力されているかチェック
        if (username.trim() === '') {
            alert('ニックネームを入力してください。');
            return;
        }

        // TODO: バックエンドにルーム作成リクエストを送信する処理を実装
        setIsLoading(true);
        try {
            //匿名認証を実行
            const userCredential = await signInAnonymously(auth);
            const user = userCredential.user;
            const uid = user.uid;

            console.log("Authenticated as:", uid);

            const response = await fetch('http://localhost:5000/create_room', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, uid }),
            });

            if (!response.ok) {
                throw new Error('ルームの作成に失敗しました。');
            }

            const data = await response.json();
            const roomId = data.roomId;

            localStorage.setItem('username', username);
            localStorage.setItem('uid', uid)

            // 成功したら、ルームの議論準備ページに遷移
            navigate(`/room/${roomId}`)

        } catch (err) {
            setError(err.message);
            console.error('API Error', err);
        } finally {
            setIsLoading(false);
        }
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
                    {isLoading ? '作成中...' : 'ルームを作成'}
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