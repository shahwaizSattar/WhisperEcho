import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import ReportDetail from './pages/ReportDetail';
import Posts from './pages/Posts';
import PostDetail from './pages/PostDetail';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import ModerationRules from './pages/ModerationRules';
import Logs from './pages/Logs';
import Layout from './components/Layout';
import adminAuth from './utils/auth';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsAuthenticated(adminAuth.isAuthenticated());
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/admin/login" 
          element={
            isAuthenticated ? 
            <Navigate to="/dashboard" /> : 
            <Login setIsAuthenticated={setIsAuthenticated} />
          } 
        />
        <Route 
          path="/login" 
          element={<Navigate to="/admin/login" />}
        />
        
        <Route 
          path="/" 
          element={
            isAuthenticated ? 
            <Layout setIsAuthenticated={setIsAuthenticated} /> : 
            <Navigate to="/admin/login" />
          }
        >
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="reports" element={<Reports />} />
          <Route path="reports/:id" element={<ReportDetail />} />
          <Route path="posts" element={<Posts />} />
          <Route path="posts/:id" element={<PostDetail />} />
          <Route path="users" element={<Users />} />
          <Route path="users/:id" element={<UserDetail />} />
          <Route path="moderation-rules" element={<ModerationRules />} />
          <Route path="logs" element={<Logs />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
