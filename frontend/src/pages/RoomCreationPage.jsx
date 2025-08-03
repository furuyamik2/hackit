import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import img from "../assets/logo.png"; // ロゴ画像のインポート
import io from "socket.io-client"; // WebSocket通信のためにsocket.io-clientをインポート

import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

const RoomCreationPage = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();

    // 参加者、議題、時間の状態を管理
    const [participants, setParticipants] = useState([]); // 作成者を初期値に設定
    const [topic, setTopic] = useState("");
    const [duration, setDuration] = useState("");
    const [isCreator, setIsCreator] = useState(false); // 作成者かどうかを判定する状態
    const [isLoading, setIsLoading] = useState(false);

    const API_BASE_URL = 'https://facili-ya-san-api.onrender.com';
    const WS_SERVER_URL = 'https://facili-ya-san-ws-server.onrender.com';


    useEffect(() => {
        // Firestoreのルームドキュメントへの参照を作成
        const roomRef = doc(db, "rooms", roomId);

        // onSnapshotでデータベースの変更をリアルタイムに監視
        // コールバックの引数名を'doc'から'documentSnapshot'に変更（可読性向上のため）
        const unsubscribe = onSnapshot(roomRef, (documentSnapshot) => {
            if (documentSnapshot.exists()) {
                console.log("Firestoreデータ更新:", documentSnapshot.data());
                const roomData = documentSnapshot.data();

                // マップ形式の参加者データをユーザー名のリストに変換
                const participantsMap = roomData.participants || {};
                const participantsList = Object.values(participantsMap);
                setParticipants(participantsList);

                // 自分が作成者かどうかを判定
                const currentUid = localStorage.getItem("uid");
                if (roomData.creator_uid === currentUid) {
                    setIsCreator(true);
                }

                if (roomData.status === 'discussing') {
                    console.log("ステータスが'discussing'に変わりました。画面遷移します。");
                    navigate(`/room/${roomId}/discussion`);
                }

            } else {
                console.error("指定されたルームが見つかりません。");
                navigate("/not-found");
            }
        });


        return () => {
            console.log("Leaving room and disconnecting socket...");
            // if (username && uid) {
            //     // コンポーネントがアンマウントされる前に leave_room イベントを送信
            //     socket.emit("leave_room", { roomId, uid });
            // }
            unsubscribe();
        };
    }, [roomId, navigate]); // roomId が変更された時のみuseEffectが実行される

    const handleStartDiscussion = async () => {
        // 議題と時間が入力されているかチェック
        if (topic.trim() === "" || duration.trim() === "") {
            alert("議題と制限時間を設定してください。");
            return;
        }

        setIsLoading(true); // 処理中の状態にする

        try {
            // APIサーバーに議題と時間を保存し、ステータスを'discussing'に変更するよう依頼
            const response = await fetch(`${API_BASE_URL}/update_room_settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomId,
                    topic,
                    duration: parseInt(duration, 10)
                }),
            });

            if (!response.ok) {
                throw new Error('設定の保存に失敗しました。');
            }
            // 成功すれば、あとはonSnapshotが自動で画面遷移させてくれる
        } catch (error) {
            console.error("議論の開始に失敗しました:", error);
            alert("エラーが発生しました。もう一度お試しください。");
            setIsLoading(false);
        }
    };


    return (
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
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                <div className="w-full max-w-2xl bg-white p-8 rounded-lg shadow-lg">
                    {/* ルームID */}
                    <div className="text-center mb-6">
                        <h1 className="text-xl font-bold text-gray-800">
                            ルームID: <span className="text-blue-600">{roomId}</span>
                        </h1>
                    </div>

                    {/* 議題と制限時間の設定フォーム */}
                    <div className="flex flex-col gap-6">
                        <div>
                            <label
                                htmlFor="topic"
                                className="block text-sm font-medium text-gray-700"
                            >
                                議題
                            </label>
                            <input
                                type="text"
                                id="topic"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="例: 新サービスのアイデア出し"
                                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                                disabled={!isCreator} // 作成者以外は無効化
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="duration"
                                className="block text-sm font-medium text-gray-700"
                            >
                                制限時間（分）
                            </label>
                            <input
                                type="number"
                                id="duration"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                placeholder="例: 60"
                                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                                disabled={!isCreator} // 作成者以外は無効化
                            />
                        </div>
                    </div>

                    {/* 参加者リスト */}
                    <div className="mt-8">
                        <h2 className="text-lg font-semibold text-gray-700 mb-2">
                            参加者 ({participants.length}/5人)
                        </h2>
                        <ul className="bg-gray-100 p-4 rounded-lg shadow-inner">
                            {participants.length === 0 ? (
                                <li className="text-md text-gray-500 py-1">
                                    他の人が参加するのを待っています...
                                </li>
                            ) : (
                                participants.map((p, index) => (
                                    <li key={index} className="text-md text-gray-800 py-1">
                                        <span className="mr-2 text-blue-500 font-medium">
                                            &#9679;
                                        </span>
                                        {p}
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>

                    {/* 議論開始ボタン */}
                    <div className="mt-8">
                        <button
                            onClick={handleStartDiscussion}
                            className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 text-xl font-semibold"
                            disabled={!isCreator} // 作成者以外は無効化
                        >
                            議論を開始する
                        </button>
                    </div>
                </div>
            </div>
            {/* フッター */}
            <footer className="bg-black text-white text-center py-0 mt-auto">
                <p>Copyright©2025 Mint. All Rights Reserved.</p>
            </footer>
        </div>
    );
};

export default RoomCreationPage;
