import { BrowserRouter, Routes, Route } from 'react-router-dom';

import HomePage from './pages/HomePage';

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                {/* path="/" に HomePage を設定する */}
                <Route path="/" element={<HomePage />} />

                {/* 他のルート設定 */}
            </Routes>
        </BrowserRouter>
    );
}

export default App;
