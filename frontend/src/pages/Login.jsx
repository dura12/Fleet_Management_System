import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <h1>Fleet Management</h1>
        <p className="subtitle">OTech Engineering &amp; Technology Solutions</p>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <div style={{ height: 10 }} />
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <div className="btn-row">
            <button className="btn" type="submit" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Signing in\u2026' : 'Sign in'}
            </button>
          </div>
        </form>
        <div className="demo-accounts">
          Demo accounts (after running the seed script), password <code>Password123</code>:
          <br /><code>employee@otech.com</code> &middot; <code>manager@otech.com</code> &middot; <code>fleet@otech.com</code>
        </div>
      </div>
    </div>
  );
}
