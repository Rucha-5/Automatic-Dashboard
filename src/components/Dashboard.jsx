import React, { useState } from 'react';
import '../styles/Dashboard.css';
import ModuleCard from './ModuleCard';
import DetailView from './DetailView';

function Dashboard({ data }) {
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const handleModuleClick = (moduleName) => {
    setSelectedModule(moduleName);
    setSelectedCategory(null);
  };

  const handleBack = () => {
    setSelectedModule(null);
    setSelectedCategory(null);
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
  };

  if (selectedModule && selectedCategory) {
    return (
      <DetailView
        module={selectedModule}
        category={selectedCategory}
        data={data[selectedModule].find(item => item.category === selectedCategory)}
        onBack={handleBack}
      />
    );
  }

  if (selectedModule) {
    return (
      <div className="module-view">
        <div className="header">
          <button className="back-btn" onClick={handleBack}>
            ← Back
          </button>
          <h1>{selectedModule}</h1>
        </div>
        <div className="categories-grid">
          {data[selectedModule].map((item, idx) => (
            <div
              key={idx}
              className="category-item"
              onClick={() => handleCategorySelect(item.category)}
            >
              <h3>{item.category}</h3>
              <p className="current-value">{item.week9}</p>
              <p className="label">Current (Week 9)</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="header-section">
        <h1>📊 SPPL Operations Dashboard</h1>
        <p className="subtitle">Summary Report as of 17th June 2026</p>
      </div>

      <div className="modules-grid">
        {Object.entries(data).map(([moduleName, items]) => (
          <ModuleCard
            key={moduleName}
            moduleName={moduleName}
            items={items}
            onClick={() => handleModuleClick(moduleName)}
          />
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
