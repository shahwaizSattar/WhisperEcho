import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { ArrowLeft, Trash2, CheckCircle, AlertTriangle, Ban, X } from 'lucide-react';
import './ReportDetail.css';

const ReportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [previousReports, setPreviousReports] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    fetchReport();
  }, [id]);

  const fetchReport = async () => {
    try {
      console.log('🔎 Fetching report with ID:', id);
      const response = await axios.get(`/admin/reports/${id}`);
      console.log('📡 API response status:', response.status, 'data:', response.data);
      
      if (response.data.success) {
        setReport(response.data.report);
        setPreviousReports(response.data.previousReports);
      } else {
        console.error('❌ Report not found - response:', response.data);
      }
    } catch (error) {
      console.error('❌ Error fetching report:', error.message);
      console.error('Report ID:', id);
      console.error('Error response:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    if (!window.confirm(`Are you sure you want to ${action}?`)) return;
    
    setActionLoading(true);
    try {
      const response = await axios.post(`/admin/reports/${id}/${action}`, { adminNotes });
      if (response.data.success) {
        alert(`Action completed: ${action}`);
        navigate('/reports');
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading report...</div>;
  }

  if (!report) {
    return <div className="error">Report not found</div>;
  }

  return (
    <div className="report-detail">
      <button className="back-btn" onClick={() => navigate('/reports')}>
        <ArrowLeft size={20} />
        Back to Reports
      </button>

      <div className="detail-header">
        <h1>Report Details</h1>
        <span className={`status-badge ${report.status}`}>{report.status}</span>
      </div>

      <div className="detail-grid">
        <div className="detail-card">
          <h3>Report Information</h3>
          <div className="info-row">
            <span className="label">Report ID:</span>
            <span className="value">{report.reportId}</span>
          </div>
          <div className="info-row">
            <span className="label">Reason:</span>
            <span className="value reason-badge">{report.reason}</span>
          </div>
          <div className="info-row">
            <span className="label">Description:</span>
            <span className="value">{report.description || 'No description'}</span>
          </div>
          <div className="info-row">
            <span className="label">Created:</span>
            <span className="value">{new Date(report.createdAt).toLocaleString()}</span>
          </div>
        </div>

        <div className="detail-card">
          <h3>Reported By</h3>
          <div className="info-row">
            <span className="label">Username:</span>
            <span className="value">{report.reportedBy?.username}</span>
          </div>
          <div className="info-row">
            <span className="label">Fake IP:</span>
            <span className="value">{report.reportedBy?.fakeIP}</span>
          </div>
          <div className="info-row">
            <span className="label">Device Hash:</span>
            <span className="value">{report.reportedBy?.deviceHash || 'N/A'}</span>
          </div>
        </div>

        <div className="detail-card">
          <h3>Post Owner</h3>
          <div className="info-row">
            <span className="label">Username:</span>
            <span className="value">{report.postOwner?.username}</span>
          </div>
          <div className="info-row">
            <span className="label">Fake IP:</span>
            <span className="value">{report.postOwner?.fakeIP}</span>
          </div>
          <div className="info-row">
            <span className="label">Violations:</span>
            <span className="value">{report.postOwner?.violationCount || 0}</span>
          </div>
          <div className="info-row">
            <span className="label">Previous Reports:</span>
            <span className="value">{previousReports}</span>
          </div>
          <div className="info-row">
            <span className="label">Shadowbanned:</span>
            <span className="value">
              {report.postOwner?.shadowbanned ? 
                <span className="shadowban-badge">Yes</span> : 
                'No'
              }
            </span>
          </div>
        </div>

        <div className="detail-card full-width">
          <h3>Post Content</h3>
          <div className="post-snapshot">
            <p>{report.postSnapshot?.content || 'No content'}</p>
            {report.postSnapshot?.media && report.postSnapshot.media.length > 0 && (
              <div className="media-preview">
                {report.postSnapshot.media.map((media, index) => (
                  <div key={index} className="media-item">
                    {media.type === 'image' && <img src={media.url} alt="Post media" />}
                    {media.type === 'video' && <video src={media.url} controls />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {report.status === 'pending' && (
        <div className="actions-section">
          <h3>Admin Actions</h3>
          
          <div className="admin-notes">
            <label>Admin Notes (optional)</label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add notes about this action..."
              rows={4}
            />
          </div>

          <div className="action-buttons">
            <button 
              className="action-btn remove" 
              onClick={() => handleAction('remove-post')}
              disabled={actionLoading}
            >
              <Trash2 size={18} />
              Remove Post
            </button>
            
            <button 
              className="action-btn keep" 
              onClick={() => handleAction('keep-post')}
              disabled={actionLoading}
            >
              <CheckCircle size={18} />
              Keep Post
            </button>
            
            <button 
              className="action-btn warn" 
              onClick={() => handleAction('warn-user')}
              disabled={actionLoading}
            >
              <AlertTriangle size={18} />
              Warn User
            </button>
            
            <button 
              className="action-btn shadowban" 
              onClick={() => handleAction('shadowban')}
              disabled={actionLoading}
            >
              <Ban size={18} />
              Shadowban User
            </button>
            
            <button 
              className="action-btn close" 
              onClick={() => handleAction('close')}
              disabled={actionLoading}
            >
              <X size={18} />
              Close Report
            </button>
          </div>
        </div>
      )}

      {report.status !== 'pending' && (
        <div className="resolved-info">
          <h3>Resolution Details</h3>
          <div className="info-row">
            <span className="label">Action Taken:</span>
            <span className="value">{report.actionTaken}</span>
          </div>
          <div className="info-row">
            <span className="label">Reviewed By:</span>
            <span className="value">{report.reviewedBy?.username || 'Unknown'}</span>
          </div>
          <div className="info-row">
            <span className="label">Reviewed At:</span>
            <span className="value">{new Date(report.reviewedAt).toLocaleString()}</span>
          </div>
          {report.adminNotes && (
            <div className="info-row">
              <span className="label">Admin Notes:</span>
              <span className="value">{report.adminNotes}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportDetail;
