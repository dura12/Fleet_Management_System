import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useErrorAlert } from '../context/ErrorContext';
import BrandLogo from '../components/BrandLogo';

export default function Login() {
  const { login } = useAuth();
  const { showError } = useErrorAlert();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <main className="login-panel">
        <div className="login-card">
          <div className="login-card-brand">
            <BrandLogo to={null} subtitle="Fleet Management" fleetIconSize={28} />
          </div>
          <div className="login-card-head">
            <h2>Welcome back</h2>
            <p>Sign in with your company email to continue.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button className="btn login-submit" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="login-footer-note">
            Secure access for employees, managers, and fleet coordinators.
          </p>
        </div>
      </main>
    </div>
  );
}
