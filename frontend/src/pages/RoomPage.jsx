import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
// アイコンライブラリをインポートします (例: lucide-react)
// npm install lucide-react もしくは yarn add lucide-react が必要です
import { MessageCircle, Clock, Lightbulb, Users, CheckCircle2, Send } from 'lucide-react';

const RoomPage = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const username = localStorage.getItem('username') || '名無しさん';
    const [socket, setSocket] = useState(null); // socketインスタンスをstateで管理

    // --- State管理 ---
    const [topic, setTopic] = useState('議題を読み込み中...');
    const [timeLeft, setTimeLeft] = useState(0);
    const [messages, setMessages] = useState([]); // 初期値は必ず空の配列
    const [myMessage, setMyMessage] = useState('');
    const [finishedCount, setFinishedCount] = useState(0);
    const [totalParticipants, setTotalParticipants] = useState(0);
    const [hasFinished, setHasFinished] = useState(false);

    const chatEndRef = useRef(null);

    const WS_SERVER_URL = 'https://facili-ya-san-ws-server.onrender.com';

    useEffect(() => {
        let socketInstance; // クリーンアップ関数で使えるように、外側で変数を定義

        const setupRoom = async () => {
            // まず、Firestoreから部屋の初期情報を取得します
            const roomRef = doc(db, 'rooms', roomId);
            const docSnap = await getDoc(roomRef);

            if (docSnap.exists()) {
                const roomData = docSnap.data();
                setTopic(roomData.topic || '議題未設定');
                const initialDurationInSeconds = (roomData.duration || 0) * 60;
                setTimeLeft(initialDurationInSeconds);
                setTotalParticipants(Object.keys(roomData.participants || {}).length);

                // AIからの最初のメッセージをセット
                setMessages([{
                    id: Date.now(),
                    user: 'AIファシリ屋さん',
                    text: `議論を開始します：${roomData.topic}`
                }]);

                // Firestoreのデータ取得後にWebSocketに接続することで、レースコンディションを防ぎます
                socketInstance = io(WS_SERVER_URL, {
                    transports: ['websocket']
                });
                setSocket(socketInstance);

                socketInstance.on('connect', () => {
                    console.log('議論ページに接続しました。');
                    socketInstance.emit('join_discussion_room', { roomId });
                });

                // 他のユーザーからの新しいメッセージを受信
                socketInstance.on('new_message', (newMessage) => {
                    setMessages(prevMessages => [...prevMessages, newMessage]);
                });


            } else {
                console.log("ルーム情報が見つかりません！");
                navigate('/not-found');
            }
        };

        setupRoom();

        // コンポーネントが消えるときに接続を解除
        return () => {
            if (socketInstance) {
                socketInstance.disconnect();
            }
        };
    }, [roomId, navigate]);;

    // --- タイマー処理 ---
    useEffect(() => {
        if (timeLeft <= 0) return;
        const timer = setInterval(() => setTimeLeft(prev => prev > 0 ? prev - 1 : 0), 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    // --- チャットが更新されたら一番下にスクロール ---
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);


    // --- イベントハンドラ ---
    const handleSendMessage = (e) => {
        e.preventDefault();
        if (myMessage.trim() === '' || !socket) return;

        const newMessage = {
            id: Date.now(), // 簡易的なユニークID
            user: username,
            text: myMessage,
        };

        // 自分の画面にメッセージを即時反映
        setMessages(prevMessages => [...prevMessages, newMessage]);

        // サーバーにメッセージを送信して、他の参加者に転送してもらう
        socket.emit('send_message', { roomId, message: newMessage });

        setMyMessage(''); // 入力欄を空にする
    };

    const handleFinishClick = () => {
        setHasFinished(true);
        setFinishedCount(prev => prev + 1); // ダミーでカウントアップ
        // TODO: 本来はWebSocketでサーバーに完了したことを通知する
        // socket.emit('finish_step', { roomId, uid: localStorage.getItem('uid') });
    };

    // --- 表示用のヘルパー関数 ---
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const progressPercentage = totalParticipants > 0 ? (finishedCount / totalParticipants) * 100 : 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col p-4 md:p-6 lg:p-8">
            {/* Modern Header with Glass Effect */}
            <header className="w-full max-w-6xl mx-auto bg-white/80 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-white/20 mb-8">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                            <MessageCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                                {topic}
                            </h1>
                            <p className="text-gray-500 mt-1">進行中のディスカッション</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 rounded-xl border border-amber-200">
                            <Clock className="w-5 h-5 text-amber-600" />
                            <span className="text-sm font-medium text-amber-700">残り時間</span>
                        </div>
                        <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent bg-white/90 px-6 py-3 rounded-xl shadow-lg border border-blue-100">
                            {formatTime(timeLeft)}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content with Enhanced Layout */}
            <main className="w-full max-w-6xl mx-auto flex-grow flex flex-col lg:flex-row gap-8 min-h-0">
                {/* Left Panel: AI Question & Progress */}
                <div className="w-full lg:w-2/5 flex flex-col gap-6">
                    {/* AI Question Card */}
                    <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/20 flex-1 hover:shadow-2xl transition-all duration-300">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg">
                                <Lightbulb className="w-5 h-5 text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-800">AIからの問いかけ</h2>
                        </div>
                        <p className="text-lg text-gray-700 leading-relaxed font-medium">
                            {/* TODO: AIからの問いかけを動的に更新 */}
                            最初の問いかけ：この議題について、あなたの考えを自由に述べてください。
                        </p>
                    </div>

                    {/* Progress & Finish Button Card */}
                    <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
                        <div className="flex items-center gap-3 mb-4">
                            <Users className="w-5 h-5 text-blue-600" />
                            <h3 className="font-semibold text-gray-800">参加者の進捗</h3>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-6">
                            <div className="flex justify-between text-sm text-gray-600 mb-2">
                                <span>完了済み</span>
                                <span>{finishedCount} / {totalParticipants} 人</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                    className="bg-gradient-to-r from-green-400 to-emerald-500 h-3 rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${progressPercentage}%` }}
                                ></div>
                            </div>
                        </div>

                        <button
                            onClick={handleFinishClick}
                            disabled={hasFinished}
                            className={`w-full py-4 text-lg font-semibold rounded-xl shadow-lg transition-all duration-300 transform ${hasFinished
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white cursor-default'
                                : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 hover:scale-105 hover:shadow-xl active:scale-95'
                                }`}
                        >
                            <div className="flex items-center justify-center gap-2">
                                {hasFinished && <CheckCircle2 className="w-5 h-5" />}
                                {hasFinished ? '完了しました！' : '作業完了'}
                            </div>
                        </button>
                    </div>
                </div>

                {/* Right Panel: Enhanced Chat Area */}
                <div className="w-full lg:w-3/5 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 flex flex-col overflow-hidden">
                    {/* Chat Header */}
                    <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                        <div className="flex items-center gap-3">
                            <MessageCircle className="w-5 h-5 text-blue-600" />
                            <h3 className="font-semibold text-gray-800">チャット</h3>
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full font-medium">
                                {messages.length} メッセージ
                            </span>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-grow p-6 overflow-y-auto space-y-4" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex flex-col ${msg.user === username ? 'items-end' : 'items-start'}`}>
                                {msg.user !== 'AIファシリ屋さん' && (
                                    <p className="text-xs text-gray-500 mb-1 px-2">{msg.user}</p>
                                )}
                                <div className={`max-w-xs lg:max-w-md p-4 rounded-2xl shadow-md transition-all duration-200 hover:shadow-lg ${msg.user === username
                                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white ml-4'
                                    : msg.user === 'AIファシリ屋さん'
                                        ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-gray-800 border border-yellow-200 mr-4'
                                        : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 mr-4'
                                    }`}>
                                    {msg.user === 'AIファシリ屋さん' && (
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="p-1 bg-yellow-400 rounded-full">
                                                <Lightbulb className="w-3 h-3 text-white" />
                                            </div>
                                            <p className="text-sm font-semibold text-yellow-800">{msg.user}</p>
                                        </div>
                                    )}
                                    <p className="text-sm leading-relaxed">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Enhanced Message Input */}
                    <form onSubmit={handleSendMessage} className="p-6 border-t border-gray-100 bg-gray-50/50">
                        <div className="flex items-center gap-4">
                            <input
                                type="text"
                                value={myMessage}
                                onChange={(e) => setMyMessage(e.target.value)}
                                placeholder="メッセージを入力してください..."
                                className="flex-grow px-6 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all duration-200 bg-white shadow-sm"
                            />
                            <button
                                type="submit"
                                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl p-4 shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-200"
                            >
                                <Send className="h-5 w-5" />
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default RoomPage;
