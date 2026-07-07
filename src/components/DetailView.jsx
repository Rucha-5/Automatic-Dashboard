import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import '../styles/DetailView.css';

function DetailView({ module, category, data, onBack }) {
  const [records, setRecords] = useState(null);
  const [recordsError, setRecordsError] = useState(null);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [fleetFilter, setFleetFilter] = useState('All');
  const [vesselFilter, setVesselFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const recordsRef = useRef(null);

  const handleWeekClick = (week) => {
    setSelectedWeek(week);
    recordsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    setRecordsLoading(true);
    setRecordsError(null);
    setRecords(null);
    setFleetFilter('All');
    setVesselFilter('All');
    setSearchQuery('');
    setSortField('');
    setSortOrder('asc');

    axios.get(`/api/detail/${encodeURIComponent(category)}`)
      .then((res) => setRecords(res.data))
      .catch((err) => setRecordsError(err.response?.data?.error || 'Failed to load detailed records'))
      .finally(() => setRecordsLoading(false));
  }, [category]);

  if (!data) return null;

  const fleetHeader = records?.headers.find((h) => /^fleet$/i.test(h.trim()));
  const vesselHeader = records?.headers.find((h) => /^vessel name/i.test(h.trim()));
  const fleetOptions = fleetHeader
    ? [...new Set(records.rows.map((r) => r[fleetHeader]).filter(Boolean))].sort()
    : [];
  const vesselOptions = vesselHeader
    ? [...new Set(records.rows.map((r) => r[vesselHeader]).filter(Boolean))].sort()
    : [];

  let displayRows = records?.rows || [];
  if (fleetHeader && fleetFilter !== 'All') {
    displayRows = displayRows.filter((r) => r[fleetHeader] === fleetFilter);
  }
  if (vesselHeader && vesselFilter !== 'All') {
    displayRows = displayRows.filter((r) => r[vesselHeader] === vesselFilter);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.trim().toLowerCase();
    displayRows = displayRows.filter((r) =>
      records.headers.some((h) => String(r[h]).toLowerCase().includes(q))
    );
  }
  if (sortField) {
    displayRows = [...displayRows].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortOrder === 'asc' ? av - bv : bv - av;
      }
      return sortOrder === 'asc'
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }

  // Prepare chart data
  const chartData = [
    { week: 'W1', value: data.week1 },
    { week: 'W2', value: data.week2 },
    { week: 'W3', value: data.week3 },
    { week: 'W4', value: data.week4 },
    { week: 'W5', value: data.week5 },
    { week: 'W6', value: data.week6 },
    { week: 'W7', value: data.week7 },
    { week: 'W8', value: data.week8 },
    { week: 'W9', value: data.week9 }
  ];

  const stats = {
    current: data.week9,
    previous: data.week8,
    trend: data.week9 - data.week8,
    max: Math.max(data.week1, data.week2, data.week3, data.week4, data.week5, data.week6, data.week7, data.week8, data.week9),
    min: Math.min(data.week1, data.week2, data.week3, data.week4, data.week5, data.week6, data.week7, data.week8, data.week9),
  };

  const trend = stats.trend;
  const trendPercent = stats.previous > 0 ? ((trend / stats.previous) * 100).toFixed(1) : 0;

  return (
    <div className="detail-view">
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div className="breadcrumb">
          <span className="module">{module}</span>
          <span className="separator">→</span>
          <span className="category">{category}</span>
        </div>
      </div>

      <div className="detail-content">
        <div className="stats-grid">
          <div className="stat-card primary">
            <h3>Current Value</h3>
            <div className="value">{stats.current}</div>
            <p className="label">Week 9 (Latest)</p>
          </div>

          <div className="stat-card">
            <h3>Previous Week</h3>
            <div className="value">{stats.previous}</div>
            <p className="label">Week 8</p>
          </div>

          <div className={`stat-card ${trend > 0 ? 'up' : 'down'}`}>
            <h3>Trend</h3>
            <div className="value">
              {trend > 0 ? '+' : ''}{trend}
              <span className="percent"> ({trendPercent}%)</span>
            </div>
            <p className="label">{trend > 0 ? '▲ Increasing' : '▼ Decreasing'}</p>
          </div>

          <div className="stat-card">
            <h3>Peak Value</h3>
            <div className="value">{stats.max}</div>
            <p className="label">Highest in 9 weeks</p>
          </div>

          <div className="stat-card">
            <h3>Lowest Value</h3>
            <div className="value">{stats.min}</div>
            <p className="label">Lowest in 9 weeks</p>
          </div>

          <div className="stat-card">
            <h3>Average</h3>
            <div className="value">
              {(chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length).toFixed(1)}
            </div>
            <p className="label">9-week average</p>
          </div>
        </div>

        <div className="table-section">
          <h2>📋 Weekly Data (as in Excel)</h2>
          <div className="table-wrapper">
            <table className="weekly-table">
              <thead>
                <tr>
                  {chartData.map((d) => (
                    <th key={d.week}>{d.week}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {chartData.map((d) => (
                    <td
                      key={d.week}
                      className={`clickable-week ${d.week === 'W9' ? 'has-records' : ''} ${selectedWeek === d.week ? 'selected' : ''}`}
                      onClick={() => handleWeekClick(d.week)}
                      title={
                        d.week === 'W9'
                          ? 'Click to view the real records for this value'
                          : 'Click to see why this week has no record-level data'
                      }
                    >
                      {d.value}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="table-note">
            📌 Click any week to see a response below in "Detailed Records". Only the latest value (W9) has real
            records available; past weeks (W1–W8) don't have individual records saved in the source Excel.
          </p>
        </div>

        <div className="charts-container">
          <div className="chart-section">
            <h2>Trend Line</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 6 }}
                  activeDot={{ r: 8 }}
                  name={category}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-section">
            <h2>Weekly Comparison</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="value"
                  fill="#8b5cf6"
                  radius={[8, 8, 0, 0]}
                  name={category}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="insights-section">
          <h2>📊 Key Insights</h2>
          <div className="insights-list">
            <div className="insight">
              <span className="icon">📌</span>
              <p>
                The current value is <strong>{stats.current}</strong>, which is{' '}
                <strong>{trend > 0 ? 'higher' : 'lower'}</strong> than last week by{' '}
                <strong>{Math.abs(trend)}</strong> items.
              </p>
            </div>
            <div className="insight">
              <span className="icon">🎯</span>
              <p>
                Over the past 9 weeks, the peak value reached <strong>{stats.max}</strong> and
                the lowest was <strong>{stats.min}</strong>.
              </p>
            </div>
            <div className="insight">
              <span className="icon">📈</span>
              <p>
                The average value over 9 weeks is{' '}
                <strong>{(chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length).toFixed(1)}</strong>.
              </p>
            </div>
          </div>
        </div>

        <div className="records-section" ref={recordsRef}>
          <h2>📄 Detailed Records</h2>
          {recordsLoading && <p className="records-status">Loading records...</p>}
          {recordsError && <p className="records-status error">{recordsError}</p>}

          {selectedWeek && selectedWeek !== 'W9' && (
            <div className="week-unavailable-banner">
              ⚠️ The value for {selectedWeek} ({chartData.find((d) => d.week === selectedWeek)?.value}) is only a
              historical count — individual records for that week aren't saved in the source Excel file, so they
              can't be shown. The records below are from the current/latest (W9) snapshot, shown for reference.
            </div>
          )}

          {records && (
            <>
              <div className="records-controls">
                <label className="control search-control">
                  <span>Search</span>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search all columns..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </label>

                {fleetHeader && (
                  <label className="control">
                    <span>Fleet</span>
                    <select value={fleetFilter} onChange={(e) => setFleetFilter(e.target.value)}>
                      <option value="All">All</option>
                      {fleetOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </label>
                )}

                {vesselHeader && (
                  <label className="control">
                    <span>Vessel Name</span>
                    <select value={vesselFilter} onChange={(e) => setVesselFilter(e.target.value)}>
                      <option value="All">All</option>
                      {vesselOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="control">
                  <span>Sort by</span>
                  <select value={sortField} onChange={(e) => setSortField(e.target.value)}>
                    <option value="">None</option>
                    {records.headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  className="sort-order-btn"
                  onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
                  disabled={!sortField}
                  title="Toggle sort order"
                >
                  {sortOrder === 'asc' ? '⬆ Ascending' : '⬇ Descending'}
                </button>
              </div>

              <p className="records-count">
                {displayRows.length} of {records.rows.length} record{records.rows.length === 1 ? '' : 's'} from sheet "{records.sheet}"
              </p>
              <div className="table-wrapper records-table-wrapper">
                <table className="records-table">
                  <thead>
                    <tr>
                      {records.headers.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.map((row, idx) => (
                      <tr key={idx}>
                        {records.headers.map((h) => (
                          <td key={h}>{String(row[h])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default DetailView;
