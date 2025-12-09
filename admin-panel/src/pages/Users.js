import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axios';
import { Eye, Search, Shield, AlertTriangle } from 'lucide-react';
import './Users.css';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  useEffect(() => {
    fetchUsers();
  }, [filter, search, pagination.page]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 100
      });
      
      if (filter !== 'all') params.append('filter', filter);
      if (search) params.append('search', search);

      console.log('🔎 Frontend: Fetching users with filter:', filter);
      const response = await axios.get(`/admin/users?${params}`);
      if (response.data.success) {
        console.log('✅ Frontend: Received', response.data.users.length, 'users');
        
        // Log sample user IDs
        if (response.data.users.length > 0) {
          console.log('📋 Frontend: Sample user IDs:', response.data.users.slice(0, 3).map(u => ({
            id: u._id,
            idType: typeof u._id,
            username: u.username,
            violations: u.violationCount
          })));
        }
        
        setUsers(response.data.users);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('❌ Frontend: Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchUsers();
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  return (
    <div className="users-page">
      <div className="page-header">
        <h1 className="page-title">Users Management</h1>
        
        <div className="page-controls">
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-input">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search by username or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="search-btn">Search</button>
          </form>
          
          <div className="filter-tabs">
            <button 
              className={filter === 'all' ? 'active' : ''} 
              onClick={() => setFilter('all')}
            >
              All Users
            </button>
            <button 
              className={filter === 'shadowbanned' ? 'active' : ''} 
              onClick={() => setFilter('shadowbanned')}
            >
              Shadowbanned
            </button>
            <button 
              className={filter === 'violations' ? 'active' : ''} 
              onClick={() => setFilter('violations')}
            >
              With Violations
            </button>
          </div>
        </div>
      </div>

      <div className="users-stats">
        <div className="stat-card">
          <span className="stat-number">{pagination.total}</span>
          <span className="stat-label">Total Users</span>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="empty-state">No users found</div>
      ) : (
        <>
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Fake IP</th>
                  <th>Device Hash</th>
                  <th>Violations</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td>
                      <div className="user-info">
                        <div className="user-avatar">
                          {user.username?.charAt(0).toUpperCase()}
                        </div>
                        <div className="user-details">
                          <span className="username">{user.username}</span>
                          <span className="user-id">{user._id.slice(0, 8)}...</span>
                        </div>
                      </div>
                    </td>
                    <td className="fake-ip">{user.fakeIP}</td>
                    <td className="device-hash">{user.deviceHash?.slice(0, 12)}...</td>
                    <td>
                      <div className="violations">
                        {user.violationCount > 0 ? (
                          <span className="violation-count">
                            <AlertTriangle size={14} />
                            {user.violationCount}
                          </span>
                        ) : (
                          <span className="no-violations">0</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="user-status">
                        {user.shadowbanned ? (
                          <span className="status-badge shadowbanned">
                            <Shield size={12} />
                            Shadowbanned
                          </span>
                        ) : (
                          <span className="status-badge active">Active</span>
                        )}
                      </div>
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      {user._id ? (
                        <Link to={`/users/${user._id}`} className="action-btn">
                          <Eye size={16} />
                          View
                        </Link>
                      ) : (
                        <span className="action-btn disabled" title="User ID not available">
                          <Eye size={16} />
                          View
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="pagination-btn"
              >
                Previous
              </button>
              
              <div className="pagination-info">
                Page {pagination.page} of {pagination.pages}
              </div>
              
              <button 
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="pagination-btn"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Users;