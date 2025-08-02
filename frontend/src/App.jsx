import { BrowserRouter, Routes, Route } from 'react-router-dom';

import HomePage from './pages/HomePage';
import UserSetupPage from './pages/UserSetupPage';
import JoinRoomPage from './pages/JoinRoomPage';
import RoomCreationPage from './pages/RoomCreationPage';
import RoomPage from './pages/RoomPage';
import NotFoundPage from './pages/NotFoundPage';

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                {/* ホーム画面 */}
                <Route path="/" element={<HomePage />} />
                {/* 作成者画面 */}
                <Route path="/setup" element={<UserSetupPage />} />
                {/* 参加者画面 */}
                <Route path="/join" element={<JoinRoomPage />} />
                {/* ルーム作成ページ */}
                <Route path="/room/create/:roomId" element={<RoomCreationPage />} />
                {/* ルームページ */}
                <Route path="/room/discussion/:roomId" element={<RoomPage />} />

                <Route path="*" element={<NotFoundPage />} />


            </Routes>
        </BrowserRouter>
    );
}

export default App;
