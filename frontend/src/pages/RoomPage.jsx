import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const RoomPage = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const username = localStorage.getItem('username') || '名無しさん';

    // --- ダミーデータとState管理 ---
    const [topic, setTopic] = useState('新サービスのアイデア出し'); // 本来は前の画面から受け取る
    const [currentQuestion, setCurrentQuestion] = useState('このサービスで、一番解決したい課題は何ですか？');
    const [timeLeft, setTimeLeft] = useState(300); // 5分 = 300秒
    const [messages, setMessages] = useState([
        { id: 1, user: 'AIファシリ屋さん', text: '最初の問いかけです。まずは5分間で、各自の意見をチャットに書き出してみましょう！' },
        { id: 2, user: 'Alice', text: 'ユーザーが操作に迷わない、直感的なUIが一番大事だと思います。' },
        { id: 3, user: 'Bob', text: '初心者が挫折しないような、丁寧なチュートリアル機能が必要ですよね。' },
    ]);
    const [myMessage, setMyMessage] = useState('');
    const [finishedCount, setFinishedCount] = useState(1); // 自分はまだ押していないので1
    const [totalParticipants, setTotalParticipants] = useState(3); // 全参加者数
    const [hasFinished, setHasFinished] = useState(false);

    const chatEndRef = useRef(null);

    const API_BASE_URL = 'https://facili-ya-san-ws-server.onrender.com';

    // --- タイマー処理 ---
    useEffect(() => {
        if (timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft(prevTime => prevTime - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    // --- チャットが更新されたら一番下にスクロール ---
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // --- WebSocket接続とイベントハンドラ (将来の実装用) ---
    useEffect(() => {
        const socket = io(`${API_BASE_URL}`);

        socket.on('connect', () => {
            console.log('議論ページに接続しました。');
            socket.emit('join_discussion_room', { roomId });
        });

        // 新しいメッセージを受信するハンドラ
        socket.on('new_message', (newMessage) => {
            setMessages(prev => [...prev, newMessage]);
        });

        // 次の問いかけを受信するハンドラ
        socket.on('next_question', (data) => {
            setCurrentQuestion(data.question);
            setTimeLeft(data.duration);
            setHasFinished(false);
            setFinishedCount(0);
        });

        return () => {
            socket.disconnect();
        };
    }, [roomId]);

    // --- イベントハンドラ ---
    const handleSendMessage = (e) => {
        e.preventDefault();
        if (myMessage.trim() === '') return;

        const newMessage = {
            id: messages.length + 1,
            user: username,
            text: myMessage,
        };

        // ダミーで自分のメッセージを追加
        setMessages(prev => [...prev, newMessage]);

        // TODO: 本来はWebSocketでサーバーにメッセージを送信する
        // socket.emit('send_message', { roomId, message: newMessage });

        setMyMessage('');
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

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col p-4 md:p-6 lg:p-8">
            {/* ヘッダー：議題とタイマー */}
            <header className="w-full max-w-5xl mx-auto bg-white p-4 rounded-xl shadow-md flex flex-col md:flex-row justify-between items-center mb-6">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-800">議題: {topic}</h1>
                </div>
                <div className="flex items-center gap-4 mt-4 md:mt-0">
                    <span className="text-lg font-medium text-gray-600">残り時間</span>
                    <span className="text-3xl font-bold text-blue-600 bg-blue-50 px-4 py-1 rounded-lg">
                        {formatTime(timeLeft)}
                    </span>
                </div>
            </header>

            {/* メインコンテンツ */}
            <main className="w-full max-w-5xl mx-auto flex-grow flex flex-col md:flex-row gap-6">
                {/* 左側：お題と完了ボタン */}
                <div className="w-full md:w-1/3 flex flex-col gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-md flex-1">
                        <h2 className="text-lg font-semibold text-gray-700 mb-3">AIからの問いかけ</h2>
                        <p className="text-xl text-gray-800 leading-relaxed">{currentQuestion}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <p className="text-center text-gray-600 mb-4">
                            完了した人の数: {finishedCount} / {totalParticipants} 人
                        </p>
                        <button
                            onClick={handleFinishClick}
                            disabled={hasFinished}
                            className="w-full py-3 text-lg font-semibold text-white bg-green-500 rounded-lg shadow-md hover:bg-green-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {hasFinished ? '完了！' : '完了'}
                        </button>
                    </div>
                </div>

                {/* 右側：チャットエリア */}
                <div className="w-full md:w-2/3 bg-white rounded-xl shadow-md flex flex-col h-[70vh]">
                    {/* メッセージ表示エリア */}
                    <div className="flex-grow p-6 overflow-y-auto">
                        {/* ▼▼▼【ここからが変更点】▼▼▼ */}
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex flex-col mb-4 ${msg.user === username ? 'items-end' : 'items-start'}`}>
                                {/* AI以外のユーザー名を吹き出しの外に表示 */}
                                {msg.user !== 'AIファシリ屋さん' && (
                                    <p className="text-xs text-gray-500 mb-1 px-1">{msg.user}</p>
                                )}
                                <div className={`max-w-xs lg:max-w-md p-3 rounded-2xl ${msg.user === username ? 'bg-blue-500 text-white' : (msg.user === 'AIファシリ屋さん' ? 'bg-yellow-200 text-gray-800' : 'bg-gray-200 text-gray-800')}`}>
                                    {/* AIファシリ屋さんの場合のみ、名前を吹き出し内に表示 */}
                                    {msg.user === 'AIファシリ屋さん' && (
                                        <p className="text-sm font-semibold mb-1">{msg.user}</p>
                                    )}
                                    <p className="text-md">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                        {/* ▲▲▲【ここまでが変更点】▲▲▲ */}
                        <div ref={chatEndRef} />
                    </div>
                    {/* メッセージ入力フォーム */}
                    <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 flex items-center gap-4">
                        <input
                            type="text"
                            value={myMessage}
                            onChange={(e) => setMyMessage(e.target.value)}
                            placeholder="メッセージを入力..."
                            className="flex-grow px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button type="submit" className="bg-blue-500 text-white rounded-full p-3 shadow-md hover:bg-blue-600 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default RoomPage;
