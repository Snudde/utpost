import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Guides from './pages/Guides.jsx';
import GuideDetail from './pages/GuideDetail.jsx';
import Tours from './pages/Tours.jsx';
import TourDetail from './pages/TourDetail.jsx';
import Login from './pages/Login.jsx';
import Profile from './pages/Profile.jsx';

const App = () => {
  const token = localStorage.getItem('token');

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="logo">Utpost</Link>
        <nav>
          <Link to="/guider">Guider</Link>
          <Link to="/turer">Turer</Link>
          {token ? <Link to="/profil">Min sida</Link> : <Link to="/logga-in">Logga in</Link>}
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/guider" element={<Guides />} />
          <Route path="/guider/:slug" element={<GuideDetail />} />
          <Route path="/turer" element={<Tours />} />
          <Route path="/turer/:id" element={<TourDetail />} />
          <Route path="/logga-in" element={<Login />} />
          <Route path="/profil" element={<Profile />} />
        </Routes>
      </main>

      <footer>Utpost 1.4.2</footer>
    </div>
  );
};

export default App;
