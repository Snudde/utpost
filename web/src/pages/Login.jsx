import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { post } from '../api.js';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    const data = await post('/auth/login', { email, password });
    if (data.error) {
      setError(data.error);
      return;
    }
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    navigate('/profil');
  };

  return (
    <form onSubmit={submit} className="login">
      <h1>Logga in</h1>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-post" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Lösenord" />
      {error ? <p className="error">{error}</p> : null}
      <button type="submit" className="button-blue">Logga in</button>
    </form>
  );
};

export default Login;
