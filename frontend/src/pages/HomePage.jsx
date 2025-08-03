import { useNavigate } from "react-router-dom";
import img from "../assets/logo.png"; // ロゴ画像のインポート
import fImage from "../assets/f.png"; // ファシリ屋さん画像のインポート
import aImage from "../assets/b.png"; // 「AIが進行をサポートするグループワークツール」画像のインポート

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
        <div className="min-h-screen flex flex-col bg-gray-50">
            {/* ヘッダー */}
            <header className="w-full bg-black text-white p-4 shadow-md">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    {/* ロゴ画像を表示 */}
                    <img 
                        src={img} 
                        alt="議論進行サポート" 
                        className="h-12" 
                    />
                    {/* ナビゲーション */}
                    <nav className="ml-auto">
                        <ul className="flex space-x-4">
                            <li>
                                <a href="/" className="hover:underline">ホーム</a>
                            </li>
                            <li>
                                <a href="/about" className="hover:underline">使い方</a>
                            </li>
                        </ul>
                    </nav>
                </div>
            </header>

            {/* メインコンテンツ */}
            <div className="flex flex-col items-center justify-center flex-grow p-4">
                {/* ファシリ屋さんの画像 */}
                <img 
                    src={fImage} 
                    alt="ファシリ屋さん" 
                    className="w-150 h-12" // サイズ調整（適宜変更）
                />
                
                {/* 「AIが進行をサポートするグループワークツール」を画像に置き換え */}
                <img 
                    src={aImage} 
                    alt="AIが進行をサポートするグループワークツール"
                    className="mt-5 w-80 h-auto"  // サイズ調整（適宜変更）
                />

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

            {/* フッター */}
            <footer className="bg-black text-white text-center py0 mt-auto">
                <p>Copyright©2025 Mint. All Rights Reserved.</p>
            </footer>
        </div>
    );
};

export default HomePage;
