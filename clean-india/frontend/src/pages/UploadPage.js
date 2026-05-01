import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import api from '../utils/api';
import useAuthStore from '../store/authStore';
import './UploadPage.css';

const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState({ latitude: '', longitude: '', city: '', address: '' });
  const [geoLoading, setGeoLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const { refreshUser } = useAuthStore();
  const navigate = useNavigate();

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length > 0) {
      toast.error('File rejected: ' + (rejected[0].errors[0]?.message || 'Invalid file type'));
      return;
    }
    const f = accepted[0];
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview({ url, type: f.type.startsWith('video/') ? 'video' : 'image' });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'], 'video/*': ['.mp4', '.mov'] },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
  });

  const getGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported by your browser');
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation((l) => ({
          ...l,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setGeoLoading(false);
        toast.success('Location captured! 📍');
      },
      (err) => {
        setGeoLoading(false);
        toast.error('Could not get location: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { toast.error('Please select a file first'); return; }

    setUploading(true);
    const formData = new FormData();
    formData.append('media', file);
    formData.append('caption', caption);
    if (location.latitude) formData.append('latitude', location.latitude);
    if (location.longitude) formData.append('longitude', location.longitude);
    if (location.city) formData.append('city', location.city);
    if (location.address) formData.append('address', location.address);

    try {
      const { data } = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          // Could show progress here
        },
      });
      setUploadResult(data);
      toast.success('Upload successful! AI verification in progress...');
      refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setCaption('');
    setLocation({ latitude: '', longitude: '', city: '', address: '' });
    setUploadResult(null);
  };

  if (uploadResult) {
    return (
      <div className="upload-page page">
        <div className="container">
          <div className="upload-success card">
            <div className="success-icon">🎉</div>
            <h2>Upload Submitted!</h2>
            <p>Your proof is being verified by our AI system. You'll be notified once it's reviewed.</p>
            <div className="success-meta">
              <span className={`badge ${uploadResult.upload.status === 'approved' ? 'badge-green' : 'badge-gold'}`}>
                {uploadResult.upload.status}
              </span>
            </div>
            <div className="success-actions">
              <button className="btn btn-primary" onClick={reset}>Upload Another</button>
              <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>View Dashboard</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-page page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title">Upload Proof</h1>
          <p className="text-secondary">Capture yourself disposing waste in a dustbin to earn points</p>
        </div>

        <div className="upload-layout">
          <form className="upload-form" onSubmit={handleSubmit}>
            {/* Dropzone */}
            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}>
              <input {...getInputProps()} />
              {preview ? (
                <div className="preview-container">
                  {preview.type === 'image' ? (
                    <img src={preview.url} alt="preview" />
                  ) : (
                    <video src={preview.url} controls muted />
                  )}
                  <button type="button" className="remove-file" onClick={(e) => { e.stopPropagation(); reset(); }}>✕</button>
                </div>
              ) : (
                <div className="dropzone-placeholder">
                  <div className="dropzone-icon">📸</div>
                  <h3>{isDragActive ? 'Drop it here!' : 'Upload Photo or Video'}</h3>
                  <p>Drag & drop or click to select</p>
                  <p className="text-xs text-muted">JPG, PNG, WebP, MP4, MOV • Max 50MB</p>
                </div>
              )}
            </div>

            {/* Caption */}
            <div className="form-group">
              <label className="form-label">Caption (optional)</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Describe your action — e.g. 'Cleaning up the park near my house 🌳'"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={500}
                style={{ resize: 'vertical' }}
              />
              <span className="text-xs text-muted">{caption.length}/500</span>
            </div>

            {/* Location */}
            <div className="location-section">
              <label className="form-label">📍 Location</label>
              <div className="location-row">
                <button type="button" className="btn btn-secondary gps-btn" onClick={getGPS} disabled={geoLoading}>
                  {geoLoading ? '⏳ Getting...' : '🎯 Auto-detect GPS'}
                </button>
                {location.latitude && (
                  <span className="text-xs text-green">✓ {location.latitude}, {location.longitude}</span>
                )}
              </div>
              <div className="auth-row" style={{ marginTop: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <input className="form-input" placeholder="City (e.g. Mumbai)" value={location.city}
                    onChange={(e) => setLocation({ ...location, city: e.target.value })} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <input className="form-input" placeholder="Address / Landmark" value={location.address}
                    onChange={(e) => setLocation({ ...location, address: e.target.value })} />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary upload-submit" disabled={!file || uploading}>
              {uploading ? (
                <><span className="spinner"></span> Uploading...</>
              ) : (
                '⬆️ Submit for Verification'
              )}
            </button>
          </form>

          {/* Tips */}
          <div className="upload-tips">
            <div className="tips-card card">
              <h3>📋 Tips for Approval</h3>
              <ul>
                <li>✅ Dustbin must be clearly visible</li>
                <li>✅ Show the act of disposing waste</li>
                <li>✅ Good lighting helps</li>
                <li>✅ Enable GPS for bonus</li>
                <li>❌ No selfies without dustbin</li>
                <li>❌ No reuse of old photos</li>
                <li>❌ No blurry or dark images</li>
              </ul>
            </div>
            <div className="points-card card">
              <h3>⭐ Points You Can Earn</h3>
              <div className="points-list">
                {[
                  ['Valid Upload', '+10 pts'],
                  ['First Ever Upload', '+50 pts bonus'],
                  ['Streak Day 2+', '+5× streak pts'],
                  ['10 Uploads', '+20 pts bonus'],
                  ['50 Uploads', '+100 pts bonus'],
                ].map(([label, pts]) => (
                  <div className="points-row" key={label}>
                    <span>{label}</span>
                    <span className="text-gold">{pts}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
