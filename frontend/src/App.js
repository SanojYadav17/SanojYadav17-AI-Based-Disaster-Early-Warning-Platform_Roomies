import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import MapView from './pages/MapView';
import AlertsPanel from './pages/AlertsPanel';
import PredictPage from './pages/PredictPage';
import AdminPanel from './pages/AdminPanel';
import './App.css';

const NAV_ITEMS = [
  { path: '/', label: '📊 Dashboard', icon: '📊' },
  { path: '/map', label: '🗺️ Live Map', icon: '🗺️' },
  { path: '/alerts', label: '🚨 Alerts', icon: '🚨' },
  { path: '/predict', label: '🔮 Predict', icon: '🔮' },
  { path: '/admin', label: '⚙️ Admin', icon: '⚙️' },
];

function NavBar() {
  const location = useLocation();
  return (
    <nav className="navbar">
      <div className="nav-brand">
        <span className="nav-logo">🌍</span>
        <h1>Disaster Early Warning</h1>
      </div>
      <div className="nav-links">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="app">
        <NavBar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/alerts" element={<AlertsPanel />} />
            <Route path="/predict" element={<PredictPage />} />
            <Route path="/admin" element={<AdminPanel />} />
          </Routes>
        </main>
        <footer className="footer">
          <p>AI-Based Disaster Early Warning Platform &copy; 2026 | Powered by ML & Real-Time Analytics</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
