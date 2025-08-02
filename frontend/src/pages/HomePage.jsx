import { useNavigate } from "react-router-dom";

export const HomePage = () => {
    const navigate = useNavigate();

    const handleCreateRoom = () => {
        // 「ルーム作成」ボタンが押された時の処理
        navigate('/setup');
    };

    const handleJoinRoom = () => {
        // 「ルーム参加」ボタンが押された時の処理
        navigate('/join');
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
            {/* タイトル */}
            <h1 className="text-5xl md:text-6xl font-bold text-center text-gray-800">
                ファシリ屋さん
            </h1>
            <p className="mt-4 text-lg text-gray-600">
                AIが進行をサポートするグループワークツール
            </p>

            {/* ボタンとフォームのコンテナ */}
            <div className="mt-12 w-full max-w-sm flex flex-col items-center">
                {/* ルーム作成ボタン */}
                <button
                    onClick={handleCreateRoom}
                    className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 text-xl font-semibold"
                >
                    ルームを作成する
                </button>

                {/* 区切り線 */}
                <div className="flex items-center w-full my-8">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="flex-shrink mx-4 text-gray-400">または</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div>

                {/* ルーム参加ボタン */}
                <button
                    onClick={handleJoinRoom}
                    className="w-full px-6 py-4 bg-gray-200 text-gray-700 rounded-lg shadow-lg hover:bg-gray-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50 text-xl font-semibold"
                >
                    ルームに参加する
                </button>
            </div>
        </div>
    );
};

export default HomePage;