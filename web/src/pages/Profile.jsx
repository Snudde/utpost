import { useEffect, useState } from 'react';
import Button from '../components/Button.jsx';

const Profile = () => {
  const [tours, setTours] = useState([]);
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  useEffect(() => {
    fetch('http://localhost:4000/api/tours')
      .then((r) => r.json())
      .then((all) => setTours(all.filter((t) => t.user_id === user?.id)));
  }, [user?.id]);

  if (!user) return <p>Du är inte inloggad.</p>;

  return (
    <div>
      <h1>{user.display_name}</h1>
      <p className="muted">{user.email} · {user.role}</p>
      <h2>Mina turer ({tours.length})</h2>
      <ul className="list">
        {tours.map((t) => <li key={t.id}>{t.title}</li>)}
      </ul>
      <Button onClick={() => { localStorage.clear(); window.location.href = '/'; }}>Logga ut</Button>
    </div>
  );
};

export default Profile;
