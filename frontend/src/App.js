import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import MapView from './pages/MapView';
import AlertsPanel from './pages/AlertsPanel';
import PredictPage from './pages/PredictPage';
import AdminPanel from './pages/AdminPanel';
import { getHealth } from './services/api';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './App.css';

const NAV_ITEMS = [
  { path: '/',        label: 'Dashboard',  icon: 'fa-solid fa-chart-line',    section: 'monitoring' },
  { path: '/map',     label: 'Live Map',    icon: 'fa-solid fa-earth-asia',    section: 'monitoring' },
  { path: '/alerts',  label: 'Alerts',      icon: 'fa-solid fa-bell',          section: 'monitoring', badge: true },
  { path: '/predict', label: 'Predict',     icon: 'fa-solid fa-wand-magic-sparkles', section: 'analysis' },
  { path: '/admin',   label: 'Admin',       icon: 'fa-solid fa-gear',          section: 'system' },
];

const PAGE_TITLES = {
  '/':        'Dashboard',
  '/map':     'Live Risk Map',
  '/alerts':  'Alert Center',
  '/predict': 'Risk Prediction',
  '/admin':   'Admin Panel',
};

function Sidebar({ collapsed, setCollapsed, alertCount }) {
  const location = useLocation();
  const sections = {
    monitoring: NAV_ITEMS.filter(n => n.section === 'monitoring'),
    analysis:   NAV_ITEMS.filter(n => n.section === 'analysis'),
    system:     NAV_ITEMS.filter(n => n.section === 'system'),
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <i className="fa-solid fa-satellite-dish" style={{color:'white'}}></i>
        </div>
        <div>
          <div className="sidebar-title">Disaster AI</div>
          <div className="sidebar-subtitle">Early Warning System</div>
        </div>
      </div>

      <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expand' : 'Collapse'}>
        <i className={`fa-solid fa-chevron-${collapsed ? 'right' : 'left'}`}></i>
      </button>

      <nav style={{flex: 1, overflowY: 'auto', padding: '0.5rem 0'}}>
        <div className="nav-section">
          <div className="nav-section-title">Monitoring</div>
          {sections.monitoring.map(item => (
            <Link key={item.path} to={item.path} className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}>
              <span className="nav-icon"><i className={item.icon}></i></span>
              <span className="nav-label">{item.label}</span>
              {item.badge && alertCount > 0 && <span className="nav-badge">{alertCount}</span>}
            </Link>
          ))}
        </div>
        <div className="nav-section">
          <div className="nav-section-title">Analysis</div>
          {sections.analysis.map(item => (
            <Link key={item.path} to={item.path} className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}>
              <span className="nav-icon"><i className={item.icon}></i></span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </div>
        <div className="nav-section">
          <div className="nav-section-title">System</div>
          {sections.system.map(item => (
            <Link key={item.path} to={item.path} className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}>
              <span className="nav-icon"><i className={item.icon}></i></span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-status">
          <span className="status-dot online" id="statusDot"></span>
          <span className="sidebar-footer-text">System Online</span>
        </div>
        <div style={{fontSize:'0.65rem', color:'var(--text-muted)', marginTop:6, opacity:0.7}}>v1.0.0</div>
      </div>
    </aside>
  );
}

function TopBar({ online }) {
  const location = useLocation();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const pageTitle = PAGE_TITLES[location.pathname] || 'Dashboard';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-breadcrumb">
          <i className="fa-solid fa-house" style={{marginRight:'0.4rem', fontSize:'0.75rem'}}></i>
          / <span> {pageTitle}</span>
        </div>
      </div>
      <div className="topbar-right">
        <div className="topbar-time">
          <i className="fa-regular fa-clock" style={{marginRight:'0.4rem'}}></i>
          {time.toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit', second:'2-digit'})}
        </div>
        <div className={`topbar-indicator ${online ? 'live' : 'offline'}`}>
          <span className="status-dot" style={{width:6,height:6, background: online ? 'var(--accent-green)' : 'var(--accent-red)', animation:'none'}}></span>
          {online ? 'API Live' : 'API Offline'}
        </div>
      </div>
    </header>
  );
}

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [online, setOnline] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await getHealth();
        setOnline(res.data?.status === 'healthy');
        setAlertCount(res.data?.active_alerts || 0);
      } catch {
        setOnline(false);
      }
    };
    check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      <div className="app">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} alertCount={alertCount} />
        <div className={`main-wrapper`} style={{marginLeft: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)'}}>
          <TopBar online={online} />
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
            AI-Based Disaster Early Warning Platform &copy; 2026 &nbsp;|&nbsp; Powered by ML &amp; Real-Time Analytics
          </footer>
        </div>
      </div>
    </Router>
  );
}

export default App;
