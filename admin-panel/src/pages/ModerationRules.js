import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { Save, Plus, Trash2, Shield, AlertTriangle } from 'lucide-react';
import './ModerationRules.css';

const ModerationRules = () => {
  const [rules, setRules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newBannedWord, setNewBannedWord] = useState('');
  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await axios.get('/admin/moderation-rules');
      if (response.data.success) {
        setRules(response.data.rules);
      }
    } catch (error) {
      console.error('Error fetching rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await axios.put('/admin/moderation-rules', rules);
      if (response.data.success) {
        alert('Moderation rules updated successfully');
        setRules(response.data.rules);
      }
    } catch (error) {
      alert('Error updating rules: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  const addBannedWord = () => {
    if (!newBannedWord.trim()) return;
    
    const newWord = {
      word: newBannedWord.trim().toLowerCase(),
      severity: 'medium'
    };
    
    setRules(prev => ({
      ...prev,
      bannedWords: [...prev.bannedWords, newWord]
    }));
    setNewBannedWord('');
  };

  const removeBannedWord = (index) => {
    setRules(prev => ({
      ...prev,
      bannedWords: prev.bannedWords.filter((_, i) => i !== index)
    }));
  };

  const updateBannedWordSeverity = (index, severity) => {
    setRules(prev => ({
      ...prev,
      bannedWords: prev.bannedWords.map((word, i) => 
        i === index ? { ...word, severity } : word
      )
    }));
  };

  const addAutoHideKeyword = () => {
    if (!newKeyword.trim()) return;
    
    setRules(prev => ({
      ...prev,
      autoHideKeywords: [...prev.autoHideKeywords, newKeyword.trim().toLowerCase()]
    }));
    setNewKeyword('');
  };

  const removeAutoHideKeyword = (index) => {
    setRules(prev => ({
      ...prev,
      autoHideKeywords: prev.autoHideKeywords.filter((_, i) => i !== index)
    }));
  };

  const updateRule = (path, value) => {
    setRules(prev => {
      const newRules = { ...prev };
      const keys = path.split('.');
      let current = newRules;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newRules;
    });
  };

  if (loading) {
    return <div className="loading">Loading moderation rules...</div>;
  }

  if (!rules) {
    return <div className="error">Failed to load moderation rules</div>;
  }

  return (
    <div className="moderation-rules">
      <div className="page-header">
        <h1 className="page-title">Moderation Rules</h1>
        <button 
          onClick={handleSave} 
          className="save-btn"
          disabled={saving}
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="rules-grid">
        {/* Banned Words Section */}
        <div className="rule-section">
          <div className="section-header">
            <h2>
              <Shield size={20} />
              Banned Words ({rules.bannedWords?.length || 0})
            </h2>
            <p>Words that will be automatically flagged or hidden</p>
          </div>

          <div className="add-item">
            <input
              type="text"
              placeholder="Add banned word..."
              value={newBannedWord}
              onChange={(e) => setNewBannedWord(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addBannedWord()}
            />
            <button onClick={addBannedWord} className="add-btn">
              <Plus size={16} />
              Add
            </button>
          </div>

          <div className="items-list">
            {rules.bannedWords?.map((wordObj, index) => (
              <div key={index} className="banned-word-item">
                <span className="word">{wordObj.word}</span>
                <select
                  value={wordObj.severity}
                  onChange={(e) => updateBannedWordSeverity(index, e.target.value)}
                  className="severity-select"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <button 
                  onClick={() => removeBannedWord(index)}
                  className="remove-btn"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Auto-Hide Keywords Section */}
        <div className="rule-section">
          <div className="section-header">
            <h2>
              <AlertTriangle size={20} />
              Auto-Hide Keywords ({rules.autoHideKeywords?.length || 0})
            </h2>
            <p>Keywords that will automatically hide posts until reviewed</p>
          </div>

          <div className="add-item">
            <input
              type="text"
              placeholder="Add keyword..."
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addAutoHideKeyword()}
            />
            <button onClick={addAutoHideKeyword} className="add-btn">
              <Plus size={16} />
              Add
            </button>
          </div>

          <div className="items-list">
            {rules.autoHideKeywords?.map((keyword, index) => (
              <div key={index} className="keyword-item">
                <span className="keyword">{keyword}</span>
                <button 
                  onClick={() => removeAutoHideKeyword(index)}
                  className="remove-btn"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Threshold Settings */}
        <div className="rule-section">
          <div className="section-header">
            <h2>Threshold Settings</h2>
            <p>Configure automatic moderation thresholds</p>
          </div>

          <div className="threshold-settings">
            <div className="setting-item">
              <label>Auto-Shadowban Threshold</label>
              <input
                type="number"
                min="1"
                max="10"
                value={rules.autoShadowbanThreshold}
                onChange={(e) => updateRule('autoShadowbanThreshold', parseInt(e.target.value))}
              />
              <span className="setting-help">Number of violations before auto-shadowban</span>
            </div>
          </div>
        </div>

        {/* Auto-Flag Settings */}
        <div className="rule-section">
          <div className="section-header">
            <h2>Auto-Flag Settings</h2>
            <p>Configure automatic flagging behavior</p>
          </div>

          <div className="setting-group">
            <div className="setting-item checkbox-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rules.autoFlagSettings?.enabled || false}
                  onChange={(e) => updateRule('autoFlagSettings.enabled', e.target.checked)}
                />
                <span>Enable Auto-Flagging</span>
              </label>
            </div>

            <div className="setting-item">
              <label>Minimum Reports to Flag</label>
              <input
                type="number"
                min="1"
                max="20"
                value={rules.autoFlagSettings?.minReports || 3}
                onChange={(e) => updateRule('autoFlagSettings.minReports', parseInt(e.target.value))}
                disabled={!rules.autoFlagSettings?.enabled}
              />
            </div>

            <div className="setting-item">
              <label>Auto-Remove Threshold</label>
              <input
                type="number"
                min="5"
                max="50"
                value={rules.autoFlagSettings?.autoRemoveThreshold || 10}
                onChange={(e) => updateRule('autoFlagSettings.autoRemoveThreshold', parseInt(e.target.value))}
                disabled={!rules.autoFlagSettings?.enabled}
              />
              <span className="setting-help">Number of reports to automatically remove post</span>
            </div>
          </div>
        </div>

        {/* Spam Detection */}
        <div className="rule-section">
          <div className="section-header">
            <h2>Spam Detection</h2>
            <p>Configure spam detection parameters</p>
          </div>

          <div className="setting-group">
            <div className="setting-item checkbox-item">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rules.spamDetection?.enabled || false}
                  onChange={(e) => updateRule('spamDetection.enabled', e.target.checked)}
                />
                <span>Enable Spam Detection</span>
              </label>
            </div>

            <div className="setting-item">
              <label>Max Posts Per Hour</label>
              <input
                type="number"
                min="1"
                max="100"
                value={rules.spamDetection?.maxPostsPerHour || 10}
                onChange={(e) => updateRule('spamDetection.maxPostsPerHour', parseInt(e.target.value))}
                disabled={!rules.spamDetection?.enabled}
              />
            </div>

            <div className="setting-item">
              <label>Duplicate Content Threshold</label>
              <input
                type="number"
                min="0.1"
                max="1"
                step="0.1"
                value={rules.spamDetection?.duplicateContentThreshold || 0.8}
                onChange={(e) => updateRule('spamDetection.duplicateContentThreshold', parseFloat(e.target.value))}
                disabled={!rules.spamDetection?.enabled}
              />
              <span className="setting-help">Similarity threshold (0.1 - 1.0)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModerationRules;