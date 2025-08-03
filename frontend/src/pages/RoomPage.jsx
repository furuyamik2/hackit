import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { MessageCircle, Clock, Lightbulb, Users, CheckCircle2, Send, LoaderCircle, ListChecks } from 'lucide-react';

const RoomPage = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const username = localStorage.getItem('username') || '名無しさん';
    const uid = localStorage.getItem('uid');
    const [socket, setSocket] = useState(null);

    // --- State管理 ---
    const [topic, setTopic] = useState('');
    const [messages, setMessages] = useState([]);
    const [myMessage, setMyMessage] = useState('');


    const [agenda, setAgenda] = useState([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    const [timeLeft, setTimeLeft] = useState(0);
    const [isLoadingAgenda, setIsLoadingAgenda] = useState(true);
    const [totalParticipants, setTotalParticipants] = useState(0);
    const [finishedCount, setFinishedCount] = useState(0);
    const [hasFinished, setHasFinished] = useState(false);
    const [isDiscussionComplete, setIsDiscussionComplete] = useState(false);


    const chatEndRef = useRef(null);
    const API_BASE_URL = 'https://facili-ya-san-api.onrender.com';
    const WS_SERVER_URL = 'https://facili-ya-san-ws-server.onrender.com';

    // 次のステップに進むための関数を定義
    const moveToNextStep = () => {
        console.log("➡️ moveToNextStep 関数が呼び出されました。");
        const nextStepIndex = currentStepIndex + 1;

        if (agenda && nextStepIndex < agenda.length) {
            console.log(`🧠 次のステップに進みます。Index: ${nextStepIndex}`);
            const nextStep = agenda[nextStepIndex];
            setCurrentStepIndex(nextStepIndex);
            setTimeLeft(nextStep.allocated_time * 60);
            setMessages(prev => [...prev, { id: Date.now(), user: 'AIファシリ屋さん', text: nextStep.prompt_question }]);
            setHasFinished(false);
            setFinishedCount(0);

            // 【重要】サーバーに進捗のリセットを依頼する処理を復活させる
            if (socket) {
                console.log("⏩ サーバーに進捗のリセットを依頼します ('reset_progress_for_next_step')");
                socket.emit('reset_progress_for_next_step', { roomId });
            }
        } else {
            console.log("🎉 全ての議題が完了しました。ディスカッションを終了します。");
            setIsDiscussionComplete(true);
        }
    };

    useEffect(() => {
        let socketInstance; // クリーンアップ関数で使えるように、外側で変数を定義

        const setupRoom = async () => {
            // まず、Firestoreから部屋の初期情報を取得します
            const roomRef = doc(db, 'rooms', roomId);
            const docSnap = await getDoc(roomRef);

            if (docSnap.exists()) {
                const roomData = docSnap.data();

                // Firestoreに保存されたアジェンダを直接取得
                const savedAgenda = roomData.agenda;

                if (!savedAgenda || savedAgenda.length === 0) {
                    // もしアジェンダがまだなければ（ホストが設定中など）、待機画面などを表示
                    console.log("アジェンダがまだ設定されていません。");
                    // ここでは仮にローディング表示を続けます
                    setIsLoadingAgenda(true);
                    // 必要であれば、数秒後にリロードするなどの処理を追加
                    return;
                }

                // 取得した部屋情報とアジェンダをStateに設定
                setTopic(roomData.topic || '議題未設定');
                setAgenda(savedAgenda);
                setTotalParticipants(Object.keys(roomData.participants || {}).length);

                // 最初のステップの時間と問いかけを設定
                setTimeLeft(savedAgenda[0].allocated_time * 60);
                setMessages([{ id: Date.now(), user: 'AIファシリ屋さん', text: savedAgenda[0].prompt_question }]);
                setIsLoadingAgenda(false); // ローディング完了

                // Firestoreのデータ取得後にWebSocketに接続することで、レースコンディションを防ぎます
                socketInstance = io(WS_SERVER_URL, {
                    transports: ['websocket'],
                    upgrade: false // このオプションが重要です
                });
                setSocket(socketInstance);

                socketInstance.on('connect', () => {
                    console.log('議論ページに接続しました。');
                    socketInstance.emit('join_discussion_room', { roomId });
                });

                // 他のユーザーからの新しいメッセージを受信
                socketInstance.on('new_message', (newMessage) => {
                    if (newMessage.uid && newMessage.uid === uid) {
                        return;
                    }
                    setMessages(prevMessages => [...prevMessages, newMessage]);
                });

                // 【重要】このリスナーを有効に戻す
                socketInstance.on('progress_update', (data) => {
                    console.log("🔄 [progress_update] 進捗情報を受信しました。", data);
                    setFinishedCount(data.finished_count);
                    setTotalParticipants(data.total_participants);

                    if (data.total_participants > 0 && data.finished_count >= data.total_participants) {
                        console.log("👏 全員が完了しました！1.5秒後に moveToNextStep を呼び出します。");
                        setTimeout(() => {
                            moveToNextStep();
                        }, 500);
                    }
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
    }, [roomId, navigate, uid]);;

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
            id: `${Date.now()}-${uid}`, // 簡易的なユニークID
            user: username,
            text: myMessage,
            uid: uid
        };

        // 自分の画面にメッセージを即時反映
        setMessages(prevMessages => [...prevMessages, newMessage]);

        // サーバーにメッセージを送信して、他の参加者に転送してもらう
        socket.emit('send_message', { roomId, message: newMessage });

        setMyMessage(''); // 入力欄を空にする
    };

    // 作業完了」ボタンの処理をシンプルに
    const handleFinishClick = () => {
        // まだ完了報告をしていなければ、サーバーに通知する
        if (!hasFinished && socket) {
            console.log("👍 'finish_step' イベントをサーバーに送信します。");
            setHasFinished(true); // ボタンを二度押しできないようにする
            socket.emit('finish_step', { roomId, uid });
        } else {
            console.error("❌ 送信不可：Socket未接続または完了済みです。");
        }
    };

    // --- 表示用のヘルパー関数 ---
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const progressPercentage = totalParticipants > 0 ? (finishedCount / totalParticipants) * 100 : 0;

    if (isLoadingAgenda) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
                <LoaderCircle className="w-12 h-12 text-blue-500 animate-spin" />
                <p className="mt-4 text-lg text-gray-600">議題に合わせた段取りを生成中です...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col p-4 md:p-6 lg:p-8">
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

            <main className="w-full max-w-6xl mx-auto flex-grow flex flex-col lg:flex-row gap-8 min-h-0">
                <div className="w-full lg:w-2/5 flex flex-col gap-6">
                    <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/20 flex-1 flex flex-col hover:shadow-2xl transition-all duration-300">
                        {/* 現在のステップ */}
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg">
                                    <Lightbulb className="w-5 h-5 text-white" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-800">
                                    {agenda[currentStepIndex]?.step_name || "現在のステップ"}
                                </h2>
                            </div>
                            <p className="text-lg text-gray-700 leading-relaxed font-medium mb-6">
                                {agenda[currentStepIndex]?.prompt_question || "読み込み中..."}
                            </p>
                        </div>

                        <div className="border-t border-gray-200 pt-6 mt-auto">
                            <div className="flex items-center gap-3 mb-4">
                                <ListChecks className="w-5 h-5 text-gray-500" />
                                <h3 className="font-semibold text-gray-600">全体の流れ</h3>
                            </div>
                            <ul className="space-y-3">
                                {agenda.map((step, index) => (
                                    <li key={index} className={`p-3 rounded-lg transition-all duration-200 ${index === currentStepIndex ? 'bg-blue-100 shadow-inner' : 'bg-gray-50'}`}>
                                        <div className="flex justify-between items-center">
                                            <span className={`font-medium ${index === currentStepIndex ? 'text-blue-700' : 'text-gray-600'}`}>
                                                {index + 1}. {step.step_name}
                                            </span>
                                            <span className={`font-semibold text-sm px-2 py-1 rounded-md ${index === currentStepIndex ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-700'}`}>
                                                {step.allocated_time}分
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300">
                        <div className="flex items-center gap-3 mb-4">
                            <Users className="w-5 h-5 text-blue-600" />
                            <h3 className="font-semibold text-gray-800">参加者の進捗</h3>
                        </div>

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
                                {hasFinished ? '回答済' : '完了'}
                            </div>
                        </button>
                    </div>
                </div>

                <div className="w-full lg:w-3/5 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                        <div className="flex items-center gap-3">
                            <MessageCircle className="w-5 h-5 text-blue-600" />
                            <h3 className="font-semibold text-gray-800">チャット</h3>
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full font-medium">
                                {messages.length} メッセージ
                            </span>
                        </div>
                    </div>

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

            {/* ▼▼▼【追加】ディスカッション完了メッセージ用のモーダル ▼▼▼ */}
            {isDiscussionComplete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300">
                    <div className="bg-white p-8 md:p-12 rounded-2xl shadow-2xl text-center max-w-md mx-4 transform transition-all scale-100 opacity-100">
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6 animate-pulse" />
                        <h2 className="text-3xl font-bold text-gray-800 mb-3">ディスカッション完了！</h2>
                        <p className="text-gray-600 mb-8 text-lg">素晴らしい議論でした。お疲れ様でした！</p>
                        <button
                            onClick={() => navigate('/')}
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold px-10 py-4 rounded-lg shadow-lg hover:scale-105 transition-transform duration-200"
                        >
                            ホームに戻る
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoomPage;
