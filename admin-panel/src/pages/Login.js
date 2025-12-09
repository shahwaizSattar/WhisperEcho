import React, { useState } from 'react';
import adminAuth from '../utils/auth';
import './Login.css';

const Login = ({ setIsAuthenticated }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate loading delay for better UX
    setTimeout(() => {
      const result = adminAuth.login(username, password);
      
      if (result.success) {
        adminAuth.setLoginTime();
        setIsAuthenticated(true);
      } else {
        setError(result.error);
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>WhisperEcho</h1>
          <p>Admin Panel</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="superadmin"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="WhisperEcho@2025"
              required
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Development hint - remove in production */}
        <div className="credentials-hint">
          <strong>Admin Credentials:</strong><br />
          Username: superadmin<br />
          Password: WhisperEcho@2025
        </div>
      </div>
    </div>
  );
};

export default Login;
