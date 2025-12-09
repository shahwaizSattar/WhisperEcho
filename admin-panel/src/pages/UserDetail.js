import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { ArrowLeft, Shield, ShieldOff, RotateCcw, User, FileText, Flag } from 'lucide-react';
import './UserDetail.css';

const UserDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [reports, setReports] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [id]);

  const fetchUser = async () => {
    try {
      // Clean the ID - remove any URL encoding or extra characters
      const cleanId = id.trim();
      console.log('🔎 Frontend: Fetching user with id:', cleanId);
      console.log('🔎 Frontend: ID from useParams:', id);
      console.log('🔎 Frontend: ID length:', cleanId.length);
      console.log('🔎 Frontend: ID type:', typeof cleanId);
      console.log('🔎 Frontend: Full URL will be:', `/admin/users/${cleanId}`);

      const response = await axios.get(`/admin/users/${cleanId}`);
      console.log('📡 Frontend: API response status:', response.status);
      console.log('📡 Frontend: API response data:', response.data);

      if (response.data && response.data.success) {
        console.log('✅ Frontend: User found successfully');
        setUser(response.data.user);
        setPosts(response.data.posts || []);
        setReports(response.data.reports || []);
        setAdminLogs(response.data.adminLogs || []);
      } else {
        console.error('❌ Frontend: User not found - API response (non-success):', response.data);
        setUser(null); // Explicitly set to null to show error message
      }
    } catch (error) {
      console.error('❌ Frontend: Error fetching user (exception):', error.message || error);
      console.error('❌ Frontend: User ID being searched:', id);
      console.error('❌ Frontend: Error response status:', error.response?.status);
      console.error('❌ Frontend: Error response body:', error.response?.data);
      console.error('❌ Frontend: Full error:', error);
      setUser(null); // Explicitly set to null to show error message
    } finally {
      setLoading(false);
    }
  };

  const handleShadowban = async () => {
    if (!window.confirm('Are you sure you want to shadowban this user?')) return;
    
    setActionLoading(true);
    try {
      const reason = prompt('Reason for shadowban:');
      const response = await axios.post(`/admin/users/${id}/shadowban`, { reason });
      if (response.data.success) {
        setUser(response.data.user);
        alert('User shadowbanned successfully');
        fetchUser(); // Refresh data
      }
    } catch (error) {
      alert('Error shadowbanning user: ' + (error.response?.data?.message || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnshadowban = async () => {
    if (!window.confirm('Are you sure you want to remove shadowban from this user?')) return;
    
    setActionLoading(true);
    try {
      const response = await axios.post(`/admin/users/${id}/unshadowban`);
      if (response.data.success) {
        setUser(response.data.user);
        alert('User unshadowbanned successfully');
        fetchUser(); // Refresh data
      }
    } catch (error) {
      alert('Error unshadowbanning user: ' + (error.response?.data?.message || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetViolations = async () => {
    if (!window.confirm('Are you sure you want to reset this user\'s violations?')) return;
    
    setActionLoading(true);
    try {
      const response = await axios.post(`/admin/users/${id}/reset-violations`);
      if (response.data.success) {
        setUser(response.data.user);
        alert('Violations reset successfully');
        fetchUser(); // Refresh data
      }
    } catch (error) {
      alert('Error resetting violations: ' + (error.response?.data?.message || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading user...</div>;
  }

  if (!user) {
    return (
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          borderRadius: '8px',
          padding: '30px',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#dc2626', marginBottom: '15px' }}>User Not Found</h2>
          <p style={{ color: '#991b1b', marginBottom: '10px' }}>User ID: <code>{id}</code></p>
          <p style={{ color: '#991b1b', marginBottom: '20px' }}>
            The user may have been deleted, or the ID might be invalid.
          </p>
          <button 
            onClick={() => navigate(-1)} 
            className="btn btn-secondary"
            style={{ marginTop: '15px' }}
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  // Safety check for user data
  if (!user._id || !user.username) {
    console.error('❌ Frontend: Invalid user data structure:', user);
    return (
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          background: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '8px',
          padding: '30px',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#92400e', marginBottom: '15px' }}>Invalid User Data</h2>
          <p style={{ color: '#78350f', marginBottom: '20px' }}>
            The user data structure is invalid. Please check the backend response.
          </p>
          <button 
            onClick={() => navigate(-1)} 
            className="btn btn-secondary"
            style={{ marginTop: '15px' }}
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  try {
    return (
    <div className="user-detail">
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="back-btn">
          <ArrowLeft size={20} />
          Back
        </button>
        <h1>User Details</h1>
      </div>

      <div className="user-content">
        <div className="user-info">
          <div className="user-card">
            <div className="user-avatar">
              <User size={48} />
            </div>
            <div className="user-details">
              <h2>{user.username}</h2>
              <p className="user-id">ID: {user._id}</p>
              <div className="user-badges">
                {user.shadowbanned && (
                  <span className="shadowban-badge">Shadowbanned</span>
                )}
                {user.violationCount > 0 && (
                  <span className="violation-badge">{user.violationCount} Violations</span>
                )}
              </div>
            </div>
          </div>

          <div className="user-stats">
            <div className="stat-item">
              <span className="stat-label">Fake IP</span>
              <span className="stat-value">{user.fakeIP}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Device Hash</span>
              <span className="stat-value">{user.deviceHash?.slice(0, 16)}...</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Joined</span>
              <span className="stat-value">{new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Posts</span>
              <span className="stat-value">{posts.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Reports Against</span>
              <span className="stat-value">{reports.length}</span>
            </div>
            {user.shadowbannedAt && (
              <div className="stat-item">
                <span className="stat-label">Shadowbanned Since</span>
                <span className="stat-value">{new Date(user.shadowbannedAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>

        <div className="user-actions">
          <h3>Actions</h3>
          <div className="action-buttons">
            {user.shadowbanned ? (
              <button 
                onClick={handleUnshadowban} 
                className="btn btn-success"
                disabled={actionLoading}
              >
                <ShieldOff size={16} />
                Remove Shadowban
              </button>
            ) : (
              <button 
                onClick={handleShadowban} 
                className="btn btn-danger"
                disabled={actionLoading}
              >
                <Shield size={16} />
                Shadowban User
              </button>
            )}
            
            <button 
              onClick={handleResetViolations} 
              className="btn btn-warning"
              disabled={actionLoading || user.violationCount === 0}
            >
              <RotateCcw size={16} />
              Reset Violations
            </button>
          </div>
        </div>
      </div>

      <div className="user-tabs">
        <div className="tab-content">
          <div className="tab-section">
            <h3>
              <FileText size={20} />
              Recent Posts ({posts.length})
            </h3>
            {posts.length === 0 ? (
              <div className="empty-state">No posts found</div>
            ) : (
              <div className="posts-list">
                {posts.map((post) => (
                  <div key={post._id} className="post-item">
                    <div className="post-header">
                      <span className="post-date">{new Date(post.createdAt).toLocaleDateString()}</span>
                      <span className={`status-badge ${post.status}`}>{post.status}</span>
                    </div>
                    <div className="post-content">
                      {typeof post.content === 'string' ? (
                        <>
                          {post.content.slice(0, 200)}
                          {post.content.length > 200 && '...'}
                        </>
                      ) : post.content?.text ? (
                        <>
                          {post.content.text.slice(0, 200)}
                          {post.content.text.length > 200 && '...'}
                        </>
                      ) : (
                        <em>Media post</em>
                      )}
                    </div>
                    <div className="post-stats">
                      <span>Likes: {post.likes?.length || 0}</span>
                      <span>Comments: {post.comments?.length || 0}</span>
                      {post.violationCount > 0 && (
                        <span className="violation-count">Violations: {post.violationCount}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="tab-section">
            <h3>
              <Flag size={20} />
              Reports ({reports.length})
            </h3>
            {reports.length === 0 ? (
              <div className="empty-state">No reports found</div>
            ) : (
              <div className="reports-list">
                {reports.map((report) => (
                  <div key={report._id} className="report-item">
                    <div className="report-header">
                      <span className="reason-badge">{report.reason}</span>
                      <span className={`status-badge ${report.status}`}>{report.status}</span>
                    </div>
                    <div className="report-details">
                      <p><strong>Date:</strong> {new Date(report.createdAt).toLocaleDateString()}</p>
                      {report.description && (
                        <p><strong>Description:</strong> {report.description}</p>
                      )}
                      {report.actionTaken !== 'none' && (
                        <p><strong>Action:</strong> {report.actionTaken.replace('_', ' ')}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="tab-section">
            <h3>Admin Actions History ({adminLogs.length})</h3>
            {adminLogs.length === 0 ? (
              <div className="empty-state">No admin actions found</div>
            ) : (
              <div className="logs-list">
                {adminLogs.map((log) => (
                  <div key={log._id} className="log-item">
                    <div className="log-header">
                      <span className="action-type">{log.actionType.replace('_', ' ')}</span>
                      <span className="log-date">{new Date(log.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="log-details">
                      <p><strong>Admin:</strong> {log.adminId?.username}</p>
                      <p><strong>Details:</strong> {log.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
  } catch (error) {
    console.error('❌ Frontend: Error rendering UserDetail:', error);
    return (
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          borderRadius: '8px',
          padding: '30px',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#dc2626', marginBottom: '15px' }}>Rendering Error</h2>
          <p style={{ color: '#991b1b', marginBottom: '10px' }}>
            Error: {error.message}
          </p>
          <p style={{ color: '#991b1b', marginBottom: '20px', fontSize: '12px', fontFamily: 'monospace' }}>
            {error.stack}
          </p>
          <button 
            onClick={() => navigate(-1)} 
            className="btn btn-secondary"
            style={{ marginTop: '15px' }}
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }
};

export default UserDetail;