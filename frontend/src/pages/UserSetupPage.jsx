import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import img from "../assets/logo.png"; // ロゴ画像のインポート
import { auth } from "../firebase";
import { signInAnonymously } from "firebase/auth"; // signInAnonymously関数をインポート

const UserSetupPage = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const API_BASE_URL = 'https://facili-ya-san-api.onrender.com';



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

            const response = await fetch(`${API_BASE_URL}/create_room`, {
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
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <div className="min-h-screen flex flex-col bg-gray-50">
                {/* ヘッダー */}
                <header className="w-full bg-black text-white p-4 shadow-md">
                    <div className="max-w-7xl mx-auto flex justify-between items-center">
                        {/* ロゴ画像を表示 */}
                        <img src={img} alt="議論進行サポート" className="h-12" />
                        {/* ナビゲーション */}
                        <nav className="ml-auto">
                            <ul className="flex space-x-4">
                                <li>
                                    <a href="/" className="hover:underline">
                                        ホーム
                                    </a>
                                </li>
                                <li>
                                    <a href="/about" className="hover:underline">
                                        使い方
                                    </a>
                                </li>
                            </ul>
                        </nav>
                    </div>
                </header>

                {/* メインコンテンツ */}
                <div className="flex flex-col items-center justify-center flex-grow p-4">
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

                {/* フッター */}

                <footer className="bg-black text-white text-center py-0 mt-auto">
                    <p>Copyright©2025 Mint. All Rights Reserved.</p>
                </footer>
            </div>
        </div>
    );
};

export default UserSetupPage;
