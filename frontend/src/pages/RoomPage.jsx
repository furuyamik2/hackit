import React, { useState, useEffect, useRef, useCallback } from 'react';
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

    // ▼▼▼【修正点1】この関数はインデックスを増やすことだけに責任を持つ ▼▼▼
    const moveToNextStep = useCallback(() => {
        setCurrentStepIndex(prevIndex => prevIndex + 1);
    }, []);

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

                console.log("読み込まれたアジェンダ:", savedAgenda);
                console.log("アジェンダのステップ数:", savedAgenda.length);

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
                setMessages([{ id: Date.now(), user: 'ファシリ屋さん', text: savedAgenda[0].prompt_question }]);
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
                        console.log("👏 全員が完了しました！1秒後に moveToNextStep を呼び出します。");
                        setTimeout(() => {
                            moveToNextStep();
                        }, 1000);
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
    }, [roomId, navigate, uid, moveToNextStep]);

    // ▼▼▼【修正点3】ステップの変更（2番目以降）を監視し、副作用を管理するuseEffect ▼▼▼
    useEffect(() => {
        // 初期化中やアジェンダがない場合は何もしない
        if (isLoadingAgenda || agenda.length === 0) {
            return;
        }

        // 最初のステップ(index: 0)は初期設定useEffectで処理済のため、ここでは何もしない
        if (currentStepIndex === 0) {
            return;
        }

        // 2番目以降のステップに進んだ場合の処理
        if (currentStepIndex < agenda.length) {
            const currentStep = agenda[currentStepIndex];

            // 新しいお題をメッセージに追加（重複しないようにチェック）
            const newPromptText = currentStep.prompt_question;
            setMessages(prevMsgs => {
                const lastMessage = prevMsgs.length ? prevMsgs[prevMsgs.length - 1] : null;
                if (lastMessage && lastMessage.text === newPromptText) {
                    return prevMsgs; // 既に同じメッセージがあれば追加しない
                }
                return [...prevMsgs, { id: Date.now(), user: 'ファシリ屋さん', text: newPromptText }];
            });

            // 各種stateをリセット
            setTimeLeft(currentStep.allocated_time * 60);
            setHasFinished(false);
            setFinishedCount(0);
            if (socket) {
                socket.emit('reset_progress_for_next_step', { roomId });
            }
        } else {
            // 全てのステップが完了した場合
            setIsDiscussionComplete(true);
        }
    }, [currentStepIndex, agenda, isLoadingAgenda, socket, roomId]);

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
        // ▼▼▼【修正点1】画面全体の高さを `h-screen` に固定し、縦方向のflexコンテナにする ▼▼▼
        <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex flex-col p-4 md:p-6 lg:p-8 gap-8">
            {/* headerは変更なし */}
            <header className="w-full max-w-6xl mx-auto bg-white/80 backdrop-blur-xl p-4 rounded-2xl shadow-lg border border-white/20">
                <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
                            <MessageCircle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                                {topic}
                            </h1>
                            <p className="text-sm text-gray-500">進行中のディスカッション</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2 rounded-lg border border-amber-200">
                            <Clock className="w-5 h-5 text-amber-600" />
                            <span className="text-sm font-medium text-amber-700">残り時間</span>
                        </div>
                        <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent bg-white/90 px-4 py-2 rounded-lg shadow-md border border-blue-100">
                            {formatTime(timeLeft)}
                        </div>
                    </div>
                </div>
            </header>

            {/* ▼▼▼【修正点2】main要素が残りの高さを全て使うようにし、内部がはみ出ないようにする ▼▼▼ */}
            <main className="w-full max-w-6xl mx-auto flex-grow flex flex-col lg:flex-row gap-8 min-h-0">
                {/* 左カラム */}
                <div className="w-full lg:w-2/5 flex flex-col gap-6">
                    {/* 上のカード */}
                    <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/20 flex flex-col hover:shadow-2xl transition-all duration-300 min-h-0">
                        {/* ▼▼▼【修正点3】「全体の流れ」セクションが残りの高さを全て使い、リストがスクロールするようにする ▼▼▼ */}
                        <div className="border-t border-gray-200 pt-6 mt-auto flex flex-col flex-grow min-h-0">
                            <div className="flex items-center gap-3 mb-4 flex-shrink-0">
                                <ListChecks className="w-5 h-5 text-gray-500" />
                                <h3 className="font-semibold text-gray-600">全体の流れ</h3>
                            </div>
                            <ul className="space-y-3 overflow-y-auto pr-2">
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

                    {/* 下のカード */}
                    <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 flex-shrink-0">
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
                                {hasFinished ? '投票済み' : '次に進む'}
                            </div>
                        </button>
                    </div>
                </div>

                {/* ▼▼▼【修正点4】右カラム（チャット）のレイアウトを修正 ▼▼▼ */}
                <div className="w-full lg:w-3/5 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <MessageCircle className="w-5 h-5 text-blue-600" />
                            <h3 className="font-semibold text-gray-800">チャット</h3>
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full font-medium">
                                {messages.length} メッセージ
                            </span>
                        </div>
                    </div>

                    {/* チャットメッセージ部分が残りの高さを全て使う */}
                    <div className="flex-grow p-6 overflow-y-auto space-y-4">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex flex-col ${msg.user === username ? 'items-end' : 'items-start'}`}>
                                {msg.user !== 'ファシリ屋さん' && (
                                    <p className="text-xs text-gray-500 mb-1 px-2">{msg.user}</p>
                                )}
                                <div className={`p-4 rounded-2xl shadow-md transition-all duration-200 hover:shadow-lg ${msg.user === username
                                    ? 'max-w-xs lg:max-w-md bg-gradient-to-r from-blue-500 to-indigo-600 text-white ml-4'
                                    : msg.user === 'ファシリ屋さん'
                                        ? 'w-full bg-gradient-to-r from-yellow-100 to-amber-100 text-gray-800 border border-yellow-200'
                                        : 'max-w-xs lg:max-w-md bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 mr-4'
                                    }`}>
                                    {msg.user === 'ファシリ屋さん' && (
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

                    {/* 入力フォームは高さを固定 */}
                    <form onSubmit={handleSendMessage} className="p-6 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
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
