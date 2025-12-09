import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axios';
import { Eye } from 'lucide-react';
import './Reports.css';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const fetchReports = async () => {
    try {
      const endpoint = filter === 'pending' 
        ? '/admin/reports/pending' 
        : `/admin/reports${filter !== 'all' ? `?status=${filter}` : ''}`;
      
      const response = await axios.get(endpoint);
      if (response.data.success) {
        setReports(response.data.reports);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading reports...</div>;
  }

  return (
    <div className="reports-page">
      <div className="page-header">
        <h1 className="page-title">Reports Management</h1>
        
        <div className="filter-tabs">
          <button 
            className={filter === 'all' ? 'active' : ''} 
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={filter === 'pending' ? 'active' : ''} 
            onClick={() => setFilter('pending')}
          >
            Pending
          </button>
          <button 
            className={filter === 'resolved' ? 'active' : ''} 
            onClick={() => setFilter('resolved')}
          >
            Resolved
          </button>
          <button 
            className={filter === 'rejected' ? 'active' : ''} 
            onClick={() => setFilter('rejected')}
          >
            Rejected
          </button>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="empty-state">No reports found</div>
      ) : (
        <div className="reports-table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Report ID</th>
                <th>Reason</th>
                <th>Reported By</th>
                <th>Post Owner</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report._id}>
                  <td className="report-id">{report.reportId?.slice(0, 8)}...</td>
                  <td>
                    <span className="reason-badge">{report.reason}</span>
                  </td>
                  <td>
                    <div className="user-info">
                      <span>{report.reportedBy?.username || 'Unknown'}</span>
                      <span className="fake-ip">{report.reportedBy?.fakeIP}</span>
                    </div>
                  </td>
                  <td>
                    <div className="user-info">
                      <span>{report.postOwner?.username || 'Unknown'}</span>
                      <span className="fake-ip">{report.postOwner?.fakeIP}</span>
                      {report.postOwner?.shadowbanned && (
                        <span className="shadowban-badge">Shadowbanned</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${report.status}`}>
                      {report.status}
                    </span>
                  </td>
                  <td>{new Date(report.createdAt).toLocaleDateString()}</td>
                  <td>
                    <Link to={`/reports/${report._id}`} className="action-btn">
                      <Eye size={16} />
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Reports;
