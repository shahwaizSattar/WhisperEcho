import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from '../api/axios';
import { ArrowLeft, Trash2, RotateCcw, Flag, User, ExternalLink } from 'lucide-react';
import './PostDetail.css';

const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchPost();
  }, [id]);

  const fetchPost = async () => {
    try {
      const response = await axios.get(`/admin/posts/${id}`);
      if (response.data.success) {
        console.log('📝 Post data:', response.data.post);
        console.log('👤 Author:', response.data.post.author);
        console.log('🆔 Author type:', typeof response.data.post.author);
        console.log('🔑 Author ID:', response.data.post.author?._id || response.data.post.author);
        
        if (!response.data.post.author) {
          console.warn('⚠️ Warning: Post has no author data');
        }
        
        setPost(response.data.post);
        setReports(response.data.reports);
      }
    } catch (error) {
      console.error('Error fetching post:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get author ID (handles both string and object)
  const getAuthorId = () => {
    const author = post?.author;
    if (!author) return null;

    // If author is already a string ID
    if (typeof author === 'string') return author;

    if (typeof author === 'object') {
      // Common id fields
      const idField = author._id || author.id || author.uuid;
      if (!idField) return null;

      // If _id is a plain string
      if (typeof idField === 'string') return idField;

      // If _id is an object (e.g. { $oid: '...' })
      if (typeof idField === 'object') {
        if (idField.$oid) return idField.$oid;
        if (idField.$id) return idField.$id;
        // Fallback to toString if available
        try {
          const s = idField.toString();
          if (s && s !== '[object Object]') return s;
        } catch (e) {
          // ignore
        }
      }
    }

    return null;
  };

  const handleRemovePost = async () => {
    if (!window.confirm('Are you sure you want to remove this post?')) return;
    
    setActionLoading(true);
    try {
      const reason = prompt('Reason for removal:');
      const response = await axios.post(`/admin/posts/${id}/remove`, { reason });
      if (response.data.success) {
        setPost(response.data.post);
        alert('Post removed successfully');
      }
    } catch (error) {
      alert('Error removing post: ' + (error.response?.data?.message || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestorePost = async () => {
    if (!window.confirm('Are you sure you want to restore this post?')) return;
    
    setActionLoading(true);
    try {
      const response = await axios.post(`/admin/posts/${id}/restore`);
      if (response.data.success) {
        setPost(response.data.post);
        alert('Post restored successfully');
      }
    } catch (error) {
      alert('Error restoring post: ' + (error.response?.data?.message || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading post...</div>;
  }

  if (!post) {
    return <div className="error">Post not found</div>;
  }

  return (
    <div className="post-detail">
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="back-btn">
          <ArrowLeft size={20} />
          Back
        </button>
        <h1>Post Details</h1>
      </div>

      <div className="post-content">
        <div className="post-info">
          <div className="post-meta">
            <span className="post-id">ID: {post._id}</span>
            <span className={`status-badge ${post.status}`}>{post.status}</span>
          </div>
          
          <div className="post-author">
            <div className="author-header">
              <h3>
                <User size={18} />
                Author Information
              </h3>
              {/* View User button removed by request */}
            </div>
            <p><strong>Username:</strong> {post.author?.username || (typeof post.author === 'string' ? 'User ID: ' + post.author : 'Unknown')}</p>
            <p><strong>User ID:</strong> {getAuthorId() || 'N/A'}</p>
            {typeof post.author === 'object' && (
              <>
                <p><strong>Fake IP:</strong> {post.author?.fakeIP || 'N/A'}</p>
                <p><strong>Device Hash:</strong> {post.author?.deviceHash?.slice(0, 16) || 'N/A'}...</p>
                <p><strong>Violations:</strong> {post.author?.violationCount || 0}</p>
                {post.author?.shadowbanned && (
                  <span className="shadowban-badge">⚠️ Shadowbanned</span>
                )}
              </>
            )}
          </div>

          <div className="post-text">
            <h3>Content</h3>
            <div className="content-box">
              {post.content?.text || post.content || 'No text content'}
            </div>
          </div>

          {((post.content?.media && post.content.media.length > 0) || (post.media && post.media.length > 0)) && (
            <div className="post-media">
              <h3>Media</h3>
              <div className="media-grid">
                {(post.content?.media || post.media || []).map((media, index) => (
                  <div key={index} className="media-item">
                    {media.type === 'image' ? (
                      <img src={media.url} alt="Post media" />
                    ) : media.type === 'video' ? (
                      <video controls>
                        <source src={media.url} type="video/mp4" />
                      </video>
                    ) : (
                      <div className="media-placeholder">
                        {media.type} file
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="post-stats">
            <p><strong>Created:</strong> {new Date(post.createdAt).toLocaleString()}</p>
            <p><strong>Reactions:</strong> {post.reactionCounts?.total || post.likes?.length || 0}</p>
            <p><strong>Comments:</strong> {post.comments?.length || 0}</p>
            <p><strong>Reports:</strong> {post.reports?.length || reports.length || 0}</p>
            <p><strong>Violation Count:</strong> {post.violationCount || 0}</p>
            {post.removedAt && (
              <p><strong>Removed:</strong> {new Date(post.removedAt).toLocaleString()}</p>
            )}
            {post.removedBy && (
              <p><strong>Removed By:</strong> {post.removedBy.username || 'Admin'}</p>
            )}
          </div>
        </div>

        <div className="post-actions">
          <h3>Actions</h3>
          <div className="action-buttons">
            {post.status === 'active' ? (
              <button 
                onClick={handleRemovePost} 
                className="btn btn-danger"
                disabled={actionLoading}
              >
                <Trash2 size={16} />
                Remove Post
              </button>
            ) : (
              <button 
                onClick={handleRestorePost} 
                className="btn btn-success"
                disabled={actionLoading}
              >
                <RotateCcw size={16} />
                Restore Post
              </button>
            )}
          </div>
        </div>
      </div>

      {reports.length > 0 && (
        <div className="post-reports">
          <h3>
            <Flag size={20} />
            Reports ({reports.length})
          </h3>
          <div className="reports-list">
            {reports.map((report) => (
              <div key={report._id} className="report-item">
                <div className="report-header">
                  <span className="reason-badge">{report.reason}</span>
                  <span className={`status-badge ${report.status}`}>{report.status}</span>
                </div>
                <div className="report-details">
                  <p><strong>Reported by:</strong> {report.reportedBy?.username} ({report.reportedBy?.fakeIP})</p>
                  <p><strong>Date:</strong> {new Date(report.createdAt).toLocaleString()}</p>
                  {report.description && (
                    <p><strong>Description:</strong> {report.description}</p>
                  )}
                  {report.adminNotes && (
                    <p><strong>Admin Notes:</strong> {report.adminNotes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PostDetail;