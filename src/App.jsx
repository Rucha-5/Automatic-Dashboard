import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import Dashboard from './components/Dashboard';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  const fetchData = async () => {
    try {
      const response = await axios.get('/api/dashboard');
      setData(response.data);
      setError(null);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch dashboard data');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const intervalId = window.setInterval(fetchData, 10000);

    return () => window.clearInterval(intervalId);
  }, []);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('excelFile', file);

    setUploading(true);
    setUploadMessage('');

    try {
      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUploadMessage(response.data.message || 'Excel sheet uploaded successfully.');
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div className="App">
      <div className="topbar">
        <div>
          <h2>SPPL Operations Dashboard</h2>
          <p>Upload a new weekly Excel sheet to refresh the dashboard instantly.</p>
        </div>
        <label className="upload-btn">
          <input type="file" accept=".xlsx,.xls,.xlsm" onChange={handleUpload} />
          {uploading ? 'Uploading...' : 'Upload Excel'}
        </label>
      </div>

      {uploadMessage && <div className="upload-status success">{uploadMessage}</div>}
      {error && <div className="error">{error}</div>}
      {!error && data && <Dashboard data={data} />}
    </div>
  );
}

export default App;
