import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const RoomCreationPage = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();

    // 参加者、議題、時間の状態を管理
    const [participants, setParticipants] = useState(['Alice']); // 作成者を初期値に設定
    const [topic, setTopic] = useState('');
    const [duration, setDuration] = useState('');
    const [isCreator, setIsCreator] = useState(true); // 作成者かどうかを判定する状態

    // モックデータとして、参加者の追加をシミュレーション
    useEffect(() => {
        const timer = setTimeout(() => {
            setParticipants(prev => [...prev, 'Bob', 'Charlie']);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    const handleStartDiscussion = () => {
        // 議論開始ボタンが押された時の処理
        if (topic.trim() === '' || duration.trim() === '') {
            alert('議題と制限時間を設定してください。');
            return;
        }

        // TODO: バックエンドに議題と時間を設定するAPIを呼び出し、
        // 成功したら議論開始をトリガーするAPIを呼び出す

        console.log('議論開始情報:', { topic, duration });

        // 議論実行ページに遷移
        navigate(`/room/discussion/${roomId}`);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-2xl bg-white p-8 rounded-lg shadow-lg">
                {/* ルームID */}
                <div className="text-center mb-6">
                    <h1 className="text-xl font-bold text-gray-800">ルームID: <span className="text-blue-600">{roomId}</span></h1>
                </div>

                {/* 議題と制限時間の設定フォーム */}
                <div className="flex flex-col gap-6">
                    <div>
                        <label htmlFor="topic" className="block text-sm font-medium text-gray-700">議題</label>
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
                        <label htmlFor="duration" className="block text-sm font-medium text-gray-700">制限時間（分）</label>
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
                    <h2 className="text-lg font-semibold text-gray-700 mb-2">参加者 ({participants.length}人)</h2>
                    <ul className="bg-gray-100 p-4 rounded-lg shadow-inner">
                        {participants.map((p, index) => (
                            <li key={index} className="text-md text-gray-800 py-1">
                                <span className="mr-2 text-blue-500 font-medium">&#9679;</span>
                                {p}
                            </li>
                        ))}
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
    );
};

export default RoomCreationPage;