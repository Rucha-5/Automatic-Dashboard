import React from 'react';
import '../styles/ModuleCard.css';

function ModuleCard({ moduleName, items, onClick }) {
  const totalCurrent = items.reduce((sum, item) => {
    const val = item.week9;
    return sum + (typeof val === 'number' ? val : 0);
  }, 0);

  const totalPrevious = items.reduce((sum, item) => {
    const val = item.week8;
    return sum + (typeof val === 'number' ? val : 0);
  }, 0);

  const trend = totalCurrent - totalPrevious;
  const trendPercent = totalPrevious > 0 ? ((trend / totalPrevious) * 100).toFixed(1) : 0;
  const isIncreasing = trend > 0;

  const moduleIcons = {
    'PMS': '🔧',
    'Certificates': '📜',
    'Defects': '⚠️',
    'Vir': '🛡️',
    'Audit Reports': '🗂️',
    'Inspection Reports': '🔍'
  };

  return (
    <div className={`module-card ${isIncreasing ? 'increasing' : 'decreasing'}`} onClick={onClick}>
      <div className="card-header">
        <span className="icon">{moduleIcons[moduleName] || '📋'}</span>
        <h2>{moduleName}</h2>
      </div>

      <div className="card-stats">
        <div className="stat-item">
          <span className="label">Current Issues</span>
          <span className="value">{totalCurrent}</span>
        </div>

        <div className="stat-item">
          <span className="label">Previous Week</span>
          <span className="value">{totalPrevious}</span>
        </div>

        <div className={`trend ${isIncreasing ? 'up' : 'down'}`}>
          <span className="trend-icon">{isIncreasing ? '▲' : '▼'}</span>
          <span className="trend-value">{isIncreasing ? '+' : ''}{trendPercent}%</span>
        </div>
      </div>

      <div className="card-categories">
        {items.slice(0, 3).map((item, idx) => (
          <div key={idx} className="category-preview">
            <span className="cat-name">{item.category}</span>
            <span className="cat-value">{item.week9}</span>
          </div>
        ))}
        {items.length > 3 && <div className="more">+{items.length - 3} more</div>}
      </div>

      <button className="view-btn">View Details</button>
    </div>
  );
}

export default ModuleCard;
