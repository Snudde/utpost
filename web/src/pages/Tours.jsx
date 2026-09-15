import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../api.js';

const Tours = () => {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get('/tours').then((data) => {
      setTours(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <p>Laddar turer...</p>;

  return (
    <div>
      <h1>Turer</h1>
      <table className="tours">
        <thead>
          <tr><th>Tur</th><th>Av</th><th>Guide</th><th>Längd</th><th>Bilder</th></tr>
        </thead>
        <tbody>
          {tours.map((t) => (
            <tr key={t.id}>
              <td><Link to={`/turer/${t.id}`}>{t.title}</Link></td>
              <td>{t.user?.display_name}</td>
              <td>{t.guide ? t.guide.title : '-'}</td>
              <td>{Math.round(t.distance_m / 100) / 10} km</td>
              <td>{t.photos.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Tours;
