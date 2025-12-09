import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { FileCheck, Filter, Calendar, User, FileText, Shield, RotateCcw } from 'lucide-react';
import './Logs.css';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [reversingAction, setReversingAction] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, [filter, pagination.page]);

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 50
      });
      
      if (filter !== 'all') params.append('actionType', filter);

      const response = await axios.get(`/admin/logs?${params}`);
      if (response.data.success) {
        setLogs(response.data.logs);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'post_removed':
      case 'post_restored':
        return <FileText size={16} />;
      case 'user_shadowbanned':
      case 'user_unshadowbanned':
      case 'user_warned':
        return <Shield size={16} />;
      case 'violations_reset':
        return <User size={16} />;
      default:
        return <FileCheck size={16} />;
    }
  };

  const getActionColor = (actionType) => {
    switch (actionType) {
      case 'post_removed':
      case 'user_shadowbanned':
        return '#dc2626';
      case 'post_restored':
      case 'user_unshadowbanned':
        return '#059669';
      case 'user_warned':
        return '#d97706';
      case 'violations_reset':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const formatActionType = (actionType) => {
    return actionType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const canReverseAction = (log) => {
    // Check if this action can be reversed
    const reversibleActions = ['user_shadowbanned', 'post_removed'];
    return reversibleActions.includes(log.actionType) && log.targetUser;
  };

  const getReverseActionText = (actionType) => {
    switch (actionType) {
      case 'user_shadowbanned':
        return 'Unshadowban User';
      case 'post_removed':
        return 'Restore Post';
      default:
        return 'Reverse Action';
    }
  };

  const handleReverseAction = async (log) => {
    if (!log.targetUser) {
      alert('Cannot reverse: User information not available');
      return;
    }

    const confirmMessage = log.actionType === 'user_shadowbanned' 
      ? `Are you sure you want to unshadowban user "${log.targetUser.username}"?`
      : `Are you sure you want to reverse this action?`;

    if (!window.confirm(confirmMessage)) return;

    setReversingAction(log._id);
    try {
      let response;
      
      if (log.actionType === 'user_shadowbanned') {
        response = await axios.post(`/admin/users/${log.targetUser._id}/unshadowban`);
      } else if (log.actionType === 'post_removed' && log.targetPost) {
        response = await axios.post(`/admin/posts/${log.targetPost._id}/restore`);
      }

      if (response?.data?.success) {
        alert('Action reversed successfully!');
        fetchLogs(); // Refresh logs
      }
    } catch (error) {
      console.error('Error reversing action:', error);
      alert('Error reversing action: ' + (error.response?.data?.message || error.message));
    } finally {
      setReversingAction(null);
    }
  };

  if (loading) {
    return <div className="loading">Loading admin logs...</div>;
  }

  const actionTypes = [
    { value: 'all', label: 'All Actions' },
    { value: 'post_removed', label: 'Post Removed' },
    { value: 'post_restored', label: 'Post Restored' },
    { value: 'user_shadowbanned', label: 'User Shadowbanned' },
    { value: 'user_unshadowbanned', label: 'User Unshadowbanned' },
    { value: 'user_warned', label: 'User Warned' },
    { value: 'violations_reset', label: 'Violations Reset' },
    { value: 'moderation_rule_updated', label: 'Rules Updated' }
  ];

  return (
    <div className="logs-page">
      <div className="page-header">
        <h1 className="page-title">
          <FileCheck size={28} />
          Admin Activity Logs
        </h1>
        
        <div className="page-controls">
          <div className="filter-section">
            <Filter size={16} />
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="filter-select"
            >
              {actionTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="logs-stats">
        <div className="stat-card">
          <span className="stat-number">{pagination.total}</span>
          <span className="stat-label">Total Actions</span>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="empty-state">No admin logs found</div>
      ) : (
        <>
          <div className="logs-container">
            <div className="logs-timeline">
              {logs.map((log) => (
                <div key={log._id} className="log-entry">
                  <div className="log-icon" style={{ color: getActionColor(log.actionType) }}>
                    {getActionIcon(log.actionType)}
                  </div>
                  
                  <div className="log-content">
                    <div className="log-header">
                      <div className="log-action">
                        <span 
                          className="action-badge"
                          style={{ backgroundColor: getActionColor(log.actionType) + '20', color: getActionColor(log.actionType) }}
                        >
                          {formatActionType(log.actionType)}
                        </span>
                        <span className="log-time">
                          <Calendar size={12} />
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="log-admin">
                        <User size={14} />
                        {log.adminId?.username || 'Unknown Admin'}
                      </div>
                    </div>

                    <div className="log-details">
                      <p className="log-description">{log.details}</p>
                      
                      <div className="log-targets">
                        {log.targetUser && (
                          <div className="target-info">
                            <span className="target-label">User:</span>
                            <span className="target-value">{log.targetUser.username || log.targetUser._id}</span>
                          </div>
                        )}
                        
                        {log.targetPost && (
                          <div className="target-info">
                            <span className="target-label">Post:</span>
                            <span className="target-value">{log.targetPost._id?.slice(0, 8)}...</span>
                          </div>
                        )}
                        
                        {log.reportId && (
                          <div className="target-info">
                            <span className="target-label">Report:</span>
                            <span className="target-value">{log.reportId.slice(0, 8)}...</span>
                          </div>
                        )}
                      </div>

                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="log-metadata">
                          <details>
                            <summary>Additional Details</summary>
                            <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                          </details>
                        </div>
                      )}
                    </div>

                    {canReverseAction(log) && (
                      <div className="log-actions">
                        <button
                          onClick={() => handleReverseAction(log)}
                          disabled={reversingAction === log._id}
                          className="reverse-action-btn"
                          title={getReverseActionText(log.actionType)}
                        >
                          <RotateCcw size={14} />
                          {reversingAction === log._id ? 'Reversing...' : getReverseActionText(log.actionType)}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
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

export default Logs;