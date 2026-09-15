import { useEffect, useState } from 'react';
import GuideCard from '../components/GuideCard.jsx';

const Guides = () => {
  const [guides, setGuides] = useState([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch('http://localhost:4000/api/guides')
      .then((r) => r.json())
      .then(setGuides);
  }, []);

  const search = () => {
    fetch(`http://localhost:4000/api/guides/search?q=${query}`)
      .then((r) => r.json())
      .then(setGuides);
  };

  return (
    <div>
      <h1>Guider</h1>
      <div className="searchrow">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Sök på namn eller landskap" />
        <button className="btn-primary" onClick={search}>Sök</button>
      </div>
      <div className="grid">
        {guides.map((g) => <GuideCard key={g.id} guide={g} />)}
      </div>
    </div>
  );
};

export default Guides;
