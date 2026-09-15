import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../api.js';
import GuideCard from '../components/GuideCard.jsx';

const Home = () => {
  const [guides, setGuides] = useState([]);
  const [popular, setPopular] = useState([]);
  const [regions, setRegions] = useState([]);
  const [latest, setLatest] = useState([]);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    get('/guides').then(setGuides);
    get('/guides/popular').then(setPopular);
    get('/guides/regions').then(setRegions);
    get('/tours/latest').then(setLatest);
    get('/health').then(setHealth);
  }, []);

  return (
    <div className="home">
      <section className="hero">
        <h1>Hitta din nästa tur</h1>
        <p>{guides.length} guider i {regions.length} landskap.</p>
      </section>

      <h2>Populärast just nu</h2>
      <div className="grid">
        {popular.map((g) => <GuideCard key={g.id} guide={g} />)}
      </div>

      <h2>Senaste turerna</h2>
      <ul className="list">
        {latest.map((t) => (
          <li key={t.id}>
            <Link to={`/turer/${t.id}`}>{t.title}</Link>
            <span className="muted"> {Math.round(t.distance_m / 100) / 10} km</span>
          </li>
        ))}
      </ul>

      <h2>Alla guider</h2>
      <div className="grid">
        {guides.map((g) => <GuideCard key={g.id} guide={g} />)}
      </div>

      {health ? <p className="muted">API {health.version}</p> : null}
    </div>
  );
};

export default Home;
