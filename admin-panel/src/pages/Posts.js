import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from '../api/axios';
import { Eye } from 'lucide-react';
import './Posts.css';

const Posts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchPosts = useCallback(async (pageNum, isReset = false) => {
    try {
      if (isReset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const params = new URLSearchParams();
      params.append('page', pageNum);
      params.append('limit', 50);
      if (filter !== 'all') params.append('filter', filter);

      const response = await axios.get(`/admin/posts?${params.toString()}`);
      if (response.data.success) {
        if (isReset) {
          setPosts(response.data.posts);
        } else {
          setPosts(prev => [...prev, ...response.data.posts]);
        }
        
        setTotalCount(response.data.pagination.total);
        setPage(pageNum);
        
        const currentTotal = isReset ? response.data.posts.length : posts.length + response.data.posts.length;
        setHasMore(currentTotal < response.data.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filter, posts.length]);

  useEffect(() => {
    // Reset and fetch posts when filter changes
    fetchPosts(1, true);
  }, [filter, fetchPosts]);

  const loadMorePosts = () => {
    if (!loadingMore && hasMore) {
      fetchPosts(page + 1, false);
    }
  };

  const getPostType = (post) => {
    // Check for poll first
    if (post.poll && post.poll.enabled) return '📊 Poll';
    
    // Check for voice note
    if (post.content?.voiceNote?.url) return '🎙️ Voice Note';
    
    // Check for media in content.media
    if (post.content?.media && post.content.media.length > 0) {
      const types = new Set(post.content.media.map(m => m.type));
      if (types.size === 1) {
        if (types.has('image')) return `🖼️ ${post.content.media.length} Image${post.content.media.length > 1 ? 's' : ''}`;
        if (types.has('video')) return `🎥 ${post.content.media.length} Video${post.content.media.length > 1 ? 's' : ''}`;
        if (types.has('audio')) return `🔊 ${post.content.media.length} Audio`;
      }
      return '📎 Mixed Media';
    }
    
    // Check for legacy media field
    if (post.media && post.media.length > 0) {
      const types = new Set(post.media.map(m => m.type));
      if (types.size === 1) {
        if (types.has('image')) return `🖼️ ${post.media.length} Image${post.media.length > 1 ? 's' : ''}`;
        if (types.has('video')) return `🎥 ${post.media.length} Video${post.media.length > 1 ? 's' : ''}`;
        if (types.has('audio')) return `🔊 ${post.media.length} Audio`;
      }
      return '📎 Mixed Media';
    }
    
    // Check for single image in content.image (legacy)
    if (post.content?.image) return '🖼️ Image';
    
    // Check for vanish mode
    if (post.vanishMode?.enabled) return '⏱️ Vanish Post';
    
    // Check for one-time post
    if (post.oneTime?.enabled) return '👁️ One-Time Post';
    
    // Default to text
    return '📝 Text';
  };

  if (loading) {
    return <div className="loading">Loading posts...</div>;
  }

  return (
    <div className="posts-page">
      <div className="page-header">
        <h1 className="page-title">Posts Management</h1>
        <p className="posts-count">Total Posts: {totalCount}</p>
        
        <div className="filter-tabs">
          <button 
            className={filter === 'all' ? 'active' : ''} 
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={filter === 'most_reported' ? 'active' : ''} 
            onClick={() => setFilter('most_reported')}
          >
            Most Reported
          </button>
          <button 
            className={filter === 'flagged' ? 'active' : ''} 
            onClick={() => setFilter('flagged')}
          >
            Flagged
          </button>
          <button 
            className={filter === 'removed' ? 'active' : ''} 
            onClick={() => setFilter('removed')}
          >
            Removed
          </button>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="empty-state">No posts found</div>
      ) : (
        <>
          <div className="posts-grid">
            {posts.map((post) => (
              <div key={post._id} className="post-card">
                <div className="post-header">
                  <div className="post-author">
                    <span className="username">{post.author?.username}</span>
                    <span className="fake-ip">{post.author?.fakeIP}</span>
                  </div>
                  <div className="post-badges">
                    <span className={`status-badge ${post.status}`}>
                      {post.status}
                    </span>
                    <span className="post-type-badge">
                      {getPostType(post)}
                    </span>
                  </div>
                </div>

                <div className="post-content">
                  {/* Special post type indicators */}
                  {post.vanishMode?.enabled && (
                    <div className="special-badge vanish-badge">
                      ⏱️ Vanishes: {new Date(post.vanishMode.vanishAt).toLocaleString()}
                    </div>
                  )}
                  {post.oneTime?.enabled && (
                    <div className="special-badge onetime-badge">
                      👁️ One-Time Post ({post.oneTime.viewedBy?.length || 0} views)
                    </div>
                  )}
                  {post.locationEnabled && post.locationName && (
                    <div className="special-badge location-badge">
                      📍 {post.locationName}
                    </div>
                  )}
                  
                  {/* Media content */}
                  {((post.content && post.content.media && post.content.media.length > 0) || (post.media && post.media.length > 0)) ? (
                    (() => {
                      const mediaArr = (post.content && post.content.media && post.content.media.length > 0) ? post.content.media : post.media || [];
                      const first = mediaArr[0];
                      return (
                        <div className="media-preview-card">
                          {first.type === 'image' && (
                            <img src={first.url} alt="media" className="preview-image" />
                          )}
                          {first.type === 'video' && (
                            <video src={first.url} controls className="preview-video" />
                          )}
                          {first.type === 'audio' && (
                            <audio src={first.url} controls className="preview-audio" />
                          )}
                          {mediaArr.length > 1 && (
                            <div className="media-count">+{mediaArr.length - 1} more</div>
                          )}
                        </div>
                      );
                    })()
                  ) : post.content?.image ? (
                    <div className="media-preview-card">
                      <img src={post.content.image} alt="post" className="preview-image" />
                    </div>
                  ) : post.content?.voiceNote?.url ? (
                    <div className="media-preview-card">
                      <div className="voice-note-preview">
                        <span className="voice-icon">🎙️</span>
                        <span className="voice-label">Voice Note {post.content.voiceNote.effect && post.content.voiceNote.effect !== 'none' ? `(${post.content.voiceNote.effect})` : ''}</span>
                        <audio src={post.content.voiceNote.url} controls className="preview-audio" />
                        {post.content.voiceNote.duration && (
                          <div className="voice-duration">{post.content.voiceNote.duration}s</div>
                        )}
                      </div>
                    </div>
                  ) : post.poll && post.poll.enabled ? (
                    <div className="poll-preview">
                      <strong>📊 Poll:</strong> {post.poll.question}
                      <div className="poll-options">
                        {post.poll.options && post.poll.options.map((opt, i) => (
                          <div key={i} className="poll-option">
                            <span className="option-text">{opt.emoji ? `${opt.emoji} ` : ''}{opt.text}</span>
                            <span className="option-votes">{opt.voteCount || 0} votes</span>
                          </div>
                        ))}
                      </div>
                      <div className="poll-total-votes">Total Votes: {post.poll.totalVotes || 0}</div>
                    </div>
                  ) : (
                    <p className="text-content">{(post.content && post.content.text) ? `${post.content.text.substring(0, 150)}${post.content.text.length > 150 ? '...' : ''}` : 'No text content'}</p>
                  )}
                </div>

                <div className="post-stats">
                  <span>❤️ {post.reactionCounts?.total || 0}</span>
                  <span>💬 {post.comments?.length || 0}</span>
                  <span>🚩 {post.reports?.length || 0} reports</span>
                </div>

                <div className="post-footer">
                  <span className="post-date">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                  <Link to={`/posts/${post._id}`} className="view-btn">
                    <Eye size={16} />
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
          
          {hasMore && (
            <div className="load-more-container">
              <button 
                className="load-more-btn"
                onClick={loadMorePosts}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading...' : `Load More Posts (${posts.length}/${totalCount})`}
              </button>
            </div>
          )}
          
          {!hasMore && posts.length > 0 && (
            <div className="all-loaded">
              ✅ All {totalCount} posts loaded
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Posts;
