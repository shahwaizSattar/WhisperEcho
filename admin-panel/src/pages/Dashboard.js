import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { Users, FileText, Flag, AlertTriangle } from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get('/admin/dashboard/stats');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: '#667eea'
    },
    {
      title: 'Total Posts',
      value: stats?.totalPosts || 0,
      icon: FileText,
      color: '#48bb78'
    },
    {
      title: 'Pending Reports',
      value: stats?.pendingReports || 0,
      icon: Flag,
      color: '#f6ad55'
    },
    {
      title: 'Shadowbanned Users',
      value: stats?.shadowbannedUsers || 0,
      icon: AlertTriangle,
      color: '#fc8181'
    }
  ];

  return (
    <div className="dashboard">
      <h1 className="page-title">Dashboard</h1>
      
      <div className="stats-grid">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="stat-card" style={{ borderTopColor: card.color }}>
              <div className="stat-icon" style={{ background: card.color }}>
                <Icon size={24} color="white" />
              </div>
              <div className="stat-content">
                <p className="stat-title">{card.title}</p>
                <h2 className="stat-value">{card.value}</h2>
              </div>
            </div>
          );
        })}
      </div>

      {stats?.recentReports && stats.recentReports.length > 0 && (
        <div className="recent-reports">
          <h2>Recent Reports</h2>
          <div className="reports-list">
            {stats.recentReports.map((report) => (
              <div key={report._id} className="report-item">
                <div className="report-info">
                  <span className="report-reason">{report.reason}</span>
                  <span className="report-date">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <span className={`status-badge ${report.status}`}>
                  {report.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
