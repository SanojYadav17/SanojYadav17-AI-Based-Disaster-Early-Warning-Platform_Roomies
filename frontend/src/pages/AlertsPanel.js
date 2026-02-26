import React, { useState, useEffect } from 'react';
import { getActiveAlerts, getAlertHistory, resolveAlert } from '../services/api';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const DEMO_ALERTS = [
  { id: 1, title: 'HIGH RISK - Flood Alert - Mumbai Coast', severity: 'critical', region_id: 'R001', message: 'Risk score: 78/100. Heavy rainfall detected. Evacuate low-lying areas.', status: 'active', created_at: new Date().toISOString(), affected_population: 125000 },
  { id: 2, title: 'Medium Risk - Cyclone Warning - Chennai', severity: 'warning', region_id: 'R003', message: 'Risk score: 62/100. Wind speeds increasing. Prepare emergency supplies.', status: 'active', created_at: new Date().toISOString(), affected_population: 89000 },
  { id: 3, title: 'HIGH RISK - Flood Alert - Assam Valley', severity: 'critical', region_id: 'R004', message: 'Risk score: 85/100. River levels critically high. Immediate evacuation.', status: 'active', created_at: new Date().toISOString(), affected_population: 156000 },
  { id: 4, title: 'Medium Risk - Earthquake Watch - Uttarakhand', severity: 'warning', region_id: 'R008', message: 'Risk score: 45/100. Seismic activity detected. Stay alert.', status: 'resolved', created_at: new Date(Date.now() - 86400000).toISOString(), resolved_at: new Date().toISOString(), affected_population: 67000 },
];

/* Region data with population */
const REGIONS = {
  R001: { name: 'Mumbai Coast', population: 1250000, lat: 19.0760, lng: 72.8777 },
  R002: { name: 'Delhi NCR', population: 2500000, lat: 28.6139, lng: 77.2090 },
  R003: { name: 'Chennai', population: 890000, lat: 13.0827, lng: 80.2707 },
  R004: { name: 'Assam Valley', population: 560000, lat: 26.1445, lng: 91.7362 },
  R005: { name: 'Rajasthan Desert', population: 320000, lat: 26.9124, lng: 75.7873 },
  R006: { name: 'Kerala Coast', population: 780000, lat: 9.9312, lng: 76.2673 },
  R007: { name: 'Gujarat Coast', population: 920000, lat: 21.1702, lng: 72.8311 },
  R008: { name: 'Uttarakhand Hills', population: 450000, lat: 30.0668, lng: 79.0193 },
  R009: { name: 'Odisha Coast', population: 680000, lat: 20.2961, lng: 85.8245 },
  R010: { name: 'Andhra Pradesh', population: 750000, lat: 15.9129, lng: 79.7400 }
};

const SEVERITY_CONFIG = {
  critical: { icon: 'fa-solid fa-circle-radiation', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: 'Critical', priority: 1 },
  warning: { icon: 'fa-solid fa-triangle-exclamation', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', label: 'Warning', priority: 2 },
  info: { icon: 'fa-solid fa-circle-info', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', label: 'Info', priority: 3 }
};

const DISASTER_ICONS = {
  Flood: 'fa-solid fa-house-flood-water',
  Cyclone: 'fa-solid fa-wind',
  Earthquake: 'fa-solid fa-house-crack',
  Drought: 'fa-solid fa-sun',
  Landslide: 'fa-solid fa-hill-rockslide',
  default: 'fa-solid fa-triangle-exclamation'
};

/* Broadcast message templates */
const BROADCAST_TEMPLATES = [
  { id: 1, name: 'Evacuation Order', message: '🚨 EMERGENCY: Immediate evacuation required in your area. Move to designated safe zones immediately. Follow instructions from local authorities.' },
  { id: 2, name: 'Warning Alert', message: '⚠️ WARNING: Potential disaster threat detected. Stay alert, prepare emergency supplies, and await further instructions.' },
  { id: 3, name: 'Safety Update', message: '📢 SAFETY UPDATE: The situation is being monitored. Stay indoors, avoid travel, and keep emergency contacts ready.' },
  { id: 4, name: 'All Clear', message: '✅ ALL CLEAR: The threat has passed. You may resume normal activities. Stay vigilant for updates.' },
];

export default function AlertsPanel() {
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('active');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  
  /* Broadcast Modal State */
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastData, setBroadcastData] = useState({
    region_id: '',
    message: '',
    channels: ['sms', 'app', 'email'],
    priority: 'high',
    template_id: null
  });
  const [broadcastHistory, setBroadcastHistory] = useState([
    { id: 1, region_id: 'R001', message: 'Evacuation order issued', recipients: 125000, sent_at: new Date(Date.now() - 3600000).toISOString(), status: 'delivered', channels: ['sms', 'app'] },
    { id: 2, region_id: 'R004', message: 'Flood warning for low-lying areas', recipients: 89000, sent_at: new Date(Date.now() - 7200000).toISOString(), status: 'delivered', channels: ['sms', 'app', 'email'] },
  ]);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(null);

  useEffect(() => { fetchAlerts(); }, []);

  const fetchAlerts = async () => {
    try {
      const [activeRes, histRes] = await Promise.all([getActiveAlerts(), getAlertHistory()]);
      setActiveAlerts(activeRes.data.alerts || []);
      setHistory(histRes.data.alerts || []);
    } catch (err) {
      setActiveAlerts(DEMO_ALERTS.filter(a => a.status === 'active'));
      setHistory(DEMO_ALERTS);
    } finally { setLoading(false); }
  };

  const handleResolve = async (alertId) => {
    try {
      await resolveAlert(alertId);
      fetchAlerts();
    } catch (err) {
      setActiveAlerts(prev => prev.filter(a => a.id !== alertId));
    }
  };

  /* Handle Emergency Broadcast */
  const handleBroadcast = async () => {
    if (!broadcastData.region_id || !broadcastData.message) {
      alert('Please select a region and enter a message');
      return;
    }

    setBroadcasting(true);
    try {
      // Simulate API call for broadcasting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const region = REGIONS[broadcastData.region_id];
      const newBroadcast = {
        id: broadcastHistory.length + 1,
        region_id: broadcastData.region_id,
        message: broadcastData.message,
        recipients: region?.population || 50000,
        sent_at: new Date().toISOString(),
        status: 'delivered',
        channels: broadcastData.channels
      };
      
      setBroadcastHistory(prev => [newBroadcast, ...prev]);
      setBroadcastSuccess(`Successfully sent to ${(region?.population || 50000).toLocaleString()} recipients in ${region?.name || broadcastData.region_id}`);
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setShowBroadcast(false);
        setBroadcastSuccess(null);
        setBroadcastData({
          region_id: '',
          message: '',
          channels: ['sms', 'app', 'email'],
          priority: 'high',
          template_id: null
        });
      }, 3000);
      
    } catch (err) {
      alert('Failed to send broadcast');
    } finally {
      setBroadcasting(false);
    }
  };

  /* Apply template */
  const applyTemplate = (template) => {
    setBroadcastData(prev => ({
      ...prev,
      message: template.message,
      template_id: template.id
    }));
  };

  /* Filter and sort alerts */
  const getFilteredAlerts = () => {
    let alerts = tab === 'active' ? activeAlerts : history;
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      alerts = alerts.filter(a => 
        a.title?.toLowerCase().includes(term) ||
        a.message?.toLowerCase().includes(term) ||
        REGIONS[a.region_id]?.name?.toLowerCase().includes(term) ||
        a.region_id?.toLowerCase().includes(term)
      );
    }
    
    // Severity filter
    if (severityFilter !== 'all') {
      alerts = alerts.filter(a => a.severity === severityFilter);
    }
    
    // Sort
    alerts = [...alerts].sort((a, b) => {
      let compare = 0;
      if (sortBy === 'date') {
        compare = new Date(b.created_at) - new Date(a.created_at);
      } else if (sortBy === 'severity') {
        compare = (SEVERITY_CONFIG[a.severity]?.priority || 3) - (SEVERITY_CONFIG[b.severity]?.priority || 3);
      } else if (sortBy === 'region') {
        compare = (REGIONS[a.region_id]?.name || a.region_id).localeCompare(REGIONS[b.region_id]?.name || b.region_id);
      }
      return sortOrder === 'desc' ? compare : -compare;
    });
    
    return alerts;
  };

  const displayAlerts = getFilteredAlerts();
  const critCount = activeAlerts.filter(a => a.severity === 'critical').length;
  const warnCount = activeAlerts.filter(a => a.severity === 'warning').length;
  const totalRecipients = broadcastHistory.reduce((sum, b) => sum + b.recipients, 0);

  /* Styles */
  const styles = {
    container: { padding: '0' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' },
    headerLeft: { flex: 1 },
    headerRight: { display: 'flex', gap: '0.75rem' },
    broadcastBtn: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: 'white',
      border: 'none',
      padding: '0.875rem 1.5rem',
      borderRadius: '12px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '0.95rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      boxShadow: '0 4px 15px rgba(239,68,68,0.3)',
      transition: 'all 0.3s ease',
    },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' },
    statCard: {
      background: 'linear-gradient(135deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.9) 100%)',
      borderRadius: '16px',
      padding: '1.25rem',
      border: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statIcon: {
      width: '52px',
      height: '52px',
      borderRadius: '14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.4rem',
    },
    controlsBar: {
      background: 'linear-gradient(135deg, rgba(30,41,59,0.6) 0%, rgba(15,23,42,0.8) 100%)',
      borderRadius: '14px',
      padding: '1rem',
      marginBottom: '1rem',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '1rem',
      alignItems: 'center',
      border: '1px solid rgba(255,255,255,0.06)',
    },
    searchBox: {
      display: 'flex',
      alignItems: 'center',
      background: 'rgba(0,0,0,0.3)',
      borderRadius: '10px',
      padding: '0.625rem 1rem',
      flex: '1',
      minWidth: '200px',
      border: '1px solid rgba(255,255,255,0.08)',
    },
    searchInput: {
      background: 'transparent',
      border: 'none',
      outline: 'none',
      color: 'white',
      width: '100%',
      marginLeft: '0.5rem',
      fontSize: '0.9rem',
    },
    filterSelect: {
      background: 'rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '10px',
      padding: '0.625rem 1rem',
      color: 'white',
      fontSize: '0.9rem',
      cursor: 'pointer',
      minWidth: '140px',
    },
    tabsContainer: {
      display: 'flex',
      gap: '0.5rem',
      marginBottom: '1rem',
      background: 'rgba(0,0,0,0.2)',
      padding: '0.4rem',
      borderRadius: '12px',
      width: 'fit-content',
    },
    tab: (isActive) => ({
      padding: '0.75rem 1.5rem',
      borderRadius: '10px',
      border: 'none',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '0.9rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      transition: 'all 0.3s ease',
      background: isActive ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'transparent',
      color: isActive ? 'white' : 'rgba(255,255,255,0.6)',
    }),
    tabBadge: (isActive, color) => ({
      background: isActive ? 'rgba(255,255,255,0.2)' : `rgba(${color}, 0.15)`,
      padding: '0.2rem 0.6rem',
      borderRadius: '6px',
      fontSize: '0.8rem',
      fontWeight: '700',
    }),
    alertCard: (severity) => ({
      background: 'linear-gradient(135deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.95) 100%)',
      borderRadius: '16px',
      padding: '1.25rem',
      marginBottom: '1rem',
      border: `1px solid ${SEVERITY_CONFIG[severity]?.color || 'rgba(255,255,255,0.1)'}30`,
      borderLeft: `4px solid ${SEVERITY_CONFIG[severity]?.color || '#3b82f6'}`,
      position: 'relative',
      overflow: 'hidden',
    }),
    alertHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' },
    alertTitle: { display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.1rem', fontWeight: '600', color: 'white' },
    alertBadge: (severity) => ({
      background: SEVERITY_CONFIG[severity]?.bg || 'rgba(59,130,246,0.15)',
      color: SEVERITY_CONFIG[severity]?.color || '#3b82f6',
      padding: '0.4rem 0.8rem',
      borderRadius: '8px',
      fontSize: '0.8rem',
      fontWeight: '700',
      display: 'flex',
      alignItems: 'center',
      gap: '0.4rem',
    }),
    alertMessage: { color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1rem', paddingLeft: '2rem' },
    alertMeta: { display: 'flex', flexWrap: 'wrap', gap: '1.5rem', paddingLeft: '2rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' },
    metaItem: { display: 'flex', alignItems: 'center', gap: '0.4rem' },
    alertActions: { display: 'flex', gap: '0.75rem', marginTop: '1rem', paddingLeft: '2rem' },
    actionBtn: (variant) => ({
      padding: '0.6rem 1.2rem',
      borderRadius: '10px',
      border: 'none',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '0.85rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      transition: 'all 0.3s ease',
      ...((variant === 'success') ? {
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white',
      } : (variant === 'broadcast') ? {
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        color: 'white',
      } : {
        background: 'rgba(255,255,255,0.1)',
        color: 'rgba(255,255,255,0.8)',
      }),
    }),
    
    /* Modal Styles */
    modalOverlay: {
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem',
    },
    modal: {
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      borderRadius: '20px',
      width: '100%',
      maxWidth: '700px',
      maxHeight: '90vh',
      overflow: 'auto',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
    },
    modalHeader: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      padding: '1.5rem',
      borderRadius: '20px 20px 0 0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    modalTitle: { color: 'white', fontSize: '1.3rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.75rem' },
    modalClose: {
      background: 'rgba(255,255,255,0.2)',
      border: 'none',
      color: 'white',
      width: '36px',
      height: '36px',
      borderRadius: '10px',
      cursor: 'pointer',
      fontSize: '1.1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalBody: { padding: '1.5rem' },
    formGroup: { marginBottom: '1.25rem' },
    formLabel: { display: 'block', color: 'rgba(255,255,255,0.8)', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600' },
    formSelect: {
      width: '100%',
      background: 'rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '10px',
      padding: '0.875rem 1rem',
      color: 'white',
      fontSize: '0.95rem',
    },
    formTextarea: {
      width: '100%',
      background: 'rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '10px',
      padding: '0.875rem 1rem',
      color: 'white',
      fontSize: '0.95rem',
      minHeight: '120px',
      resize: 'vertical',
      fontFamily: 'inherit',
    },
    templateGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1rem' },
    templateCard: (isSelected) => ({
      background: isSelected ? 'rgba(59,130,246,0.2)' : 'rgba(0,0,0,0.2)',
      border: isSelected ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
      borderRadius: '10px',
      padding: '0.875rem',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    }),
    channelToggle: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' },
    channelBtn: (isActive) => ({
      padding: '0.6rem 1rem',
      borderRadius: '10px',
      border: isActive ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
      background: isActive ? 'rgba(59,130,246,0.2)' : 'rgba(0,0,0,0.2)',
      color: isActive ? '#3b82f6' : 'rgba(255,255,255,0.6)',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '0.85rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    }),
    sendBtn: {
      width: '100%',
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: 'white',
      border: 'none',
      padding: '1rem',
      borderRadius: '12px',
      cursor: 'pointer',
      fontWeight: '700',
      fontSize: '1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      marginTop: '1rem',
      boxShadow: '0 4px 15px rgba(239,68,68,0.3)',
    },
    successMsg: {
      background: 'rgba(16,185,129,0.15)',
      border: '1px solid rgba(16,185,129,0.3)',
      borderRadius: '12px',
      padding: '1rem',
      color: '#10b981',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      marginTop: '1rem',
    },
    broadcastSection: {
      background: 'linear-gradient(135deg, rgba(30,41,59,0.6) 0%, rgba(15,23,42,0.8) 100%)',
      borderRadius: '16px',
      padding: '1.25rem',
      marginTop: '1.5rem',
      border: '1px solid rgba(245,158,11,0.2)',
    },
    broadcastHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1rem',
    },
    broadcastHistoryItem: {
      background: 'rgba(0,0,0,0.2)',
      borderRadius: '12px',
      padding: '1rem',
      marginBottom: '0.75rem',
      border: '1px solid rgba(255,255,255,0.05)',
    },
    emptyState: {
      textAlign: 'center',
      padding: '3rem',
      color: 'rgba(255,255,255,0.6)',
    },
    emptyIcon: {
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      background: 'rgba(16,185,129,0.15)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 1rem',
      fontSize: '2rem',
      color: '#10b981',
    },
  };

  return (
    <div style={styles.container}>
      {/* Header with Broadcast Button */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h2 className="page-title">
            <span className="page-title-icon red"><i className="fa-solid fa-bell"></i></span>
            Alert Command Center
          </h2>
          <p className="page-description">Monitor, manage alerts and broadcast emergency notifications to affected populations.</p>
        </div>
        <div style={styles.headerRight}>
          <button 
            style={styles.broadcastBtn}
            onClick={() => setShowBroadcast(true)}
            onMouseOver={(e) => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 6px 20px rgba(239,68,68,0.4)'; }}
            onMouseOut={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 4px 15px rgba(239,68,68,0.3)'; }}
          >
            <i className="fa-solid fa-tower-broadcast"></i>
            Emergency Broadcast
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div>
            <div style={{color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: '0.25rem'}}>Active Alerts</div>
            <div style={{fontSize: '2rem', fontWeight: '700', color: '#ef4444'}}>{activeAlerts.length}</div>
          </div>
          <div style={{...styles.statIcon, background: 'rgba(239,68,68,0.15)', color: '#ef4444'}}>
            <i className="fa-solid fa-bell"></i>
          </div>
        </div>
        <div style={styles.statCard}>
          <div>
            <div style={{color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: '0.25rem'}}>Critical</div>
            <div style={{fontSize: '2rem', fontWeight: '700', color: '#ef4444'}}>{critCount}</div>
          </div>
          <div style={{...styles.statIcon, background: 'rgba(239,68,68,0.15)', color: '#ef4444'}}>
            <i className="fa-solid fa-circle-radiation"></i>
          </div>
        </div>
        <div style={styles.statCard}>
          <div>
            <div style={{color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: '0.25rem'}}>Warnings</div>
            <div style={{fontSize: '2rem', fontWeight: '700', color: '#f59e0b'}}>{warnCount}</div>
          </div>
          <div style={{...styles.statIcon, background: 'rgba(245,158,11,0.15)', color: '#f59e0b'}}>
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>
        </div>
        <div style={styles.statCard}>
          <div>
            <div style={{color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: '0.25rem'}}>Broadcasts Sent</div>
            <div style={{fontSize: '2rem', fontWeight: '700', color: '#3b82f6'}}>{broadcastHistory.length}</div>
          </div>
          <div style={{...styles.statIcon, background: 'rgba(59,130,246,0.15)', color: '#3b82f6'}}>
            <i className="fa-solid fa-tower-broadcast"></i>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(245,158,11,0.1) 100%)',
        borderRadius: '14px',
        padding: '1rem 1.25rem',
        marginBottom: '1rem',
        border: '1px solid rgba(239,68,68,0.2)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1rem',
      }}>
        <i className="fa-solid fa-circle-info" style={{color: '#f59e0b', fontSize: '1.2rem', marginTop: '0.2rem'}}></i>
        <div>
          <div style={{fontWeight: '600', color: 'white', marginBottom: '0.25rem'}}>Emergency Broadcast System</div>
          <div style={{fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5'}}>
            Send mass notifications via SMS, Mobile App, and Email to all registered citizens in affected areas. 
            Use during critical alerts to ensure public safety. Total reach: <strong style={{color: '#10b981'}}>{totalRecipients.toLocaleString()}</strong> recipients.
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div style={styles.controlsBar}>
        <div style={styles.searchBox}>
          <i className="fa-solid fa-search" style={{color: 'rgba(255,255,255,0.4)'}}></i>
          <input 
            type="text"
            placeholder="Search alerts by title, region, or message..."
            style={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select style={styles.filterSelect} value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
          <option value="all">All Severity</option>
          <option value="critical">Critical Only</option>
          <option value="warning">Warning Only</option>
          <option value="info">Info Only</option>
        </select>
        <select style={styles.filterSelect} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="date">Sort by Date</option>
          <option value="severity">Sort by Severity</option>
          <option value="region">Sort by Region</option>
        </select>
        <button 
          style={{...styles.filterSelect, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'}}
          onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
        >
          <i className={`fa-solid fa-arrow-${sortOrder === 'desc' ? 'down' : 'up'}-wide-short`}></i>
          {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
        </button>
      </div>

      {/* Tabs */}
      <div style={styles.tabsContainer}>
        <button style={styles.tab(tab === 'active')} onClick={() => setTab('active')}>
          <i className="fa-solid fa-bolt"></i> Active
          <span style={styles.tabBadge(tab === 'active', '239,68,68')}>{activeAlerts.length}</span>
        </button>
        <button style={styles.tab(tab === 'history')} onClick={() => setTab('history')}>
          <i className="fa-solid fa-clock-rotate-left"></i> History
          <span style={styles.tabBadge(tab === 'history', '245,158,11')}>{history.length}</span>
        </button>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="loading"><div className="spinner"></div><p className="loading-text">Loading alerts...</p></div>
      ) : displayAlerts.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <h3 style={{color: 'white', marginBottom: '0.5rem'}}>All Clear!</h3>
          <p>No {tab === 'active' ? 'active' : ''} alerts {searchTerm || severityFilter !== 'all' ? 'matching your filters' : ''}. All monitored regions are safe.</p>
        </div>
      ) : (
        <div>
          {displayAlerts.map((alert, i) => {
            const severity = alert.severity || 'info';
            const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info;
            const region = REGIONS[alert.region_id];
            const disasterType = alert.title?.includes('Flood') ? 'Flood' : 
                                 alert.title?.includes('Cyclone') ? 'Cyclone' :
                                 alert.title?.includes('Earthquake') ? 'Earthquake' : 'default';
            
            return (
              <div key={alert.id || i} style={styles.alertCard(severity)} className="animate-in">
                <div style={styles.alertHeader}>
                  <div style={styles.alertTitle}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '12px',
                      background: config.bg, color: config.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem'
                    }}>
                      <i className={DISASTER_ICONS[disasterType] || DISASTER_ICONS.default}></i>
                    </div>
                    {alert.title}
                  </div>
                  <div style={styles.alertBadge(severity)}>
                    <i className={config.icon}></i>
                    {config.label}
                  </div>
                </div>
                
                <p style={styles.alertMessage}>{alert.message}</p>
                
                <div style={styles.alertMeta}>
                  <div style={styles.metaItem}>
                    <i className="fa-solid fa-location-dot" style={{color: '#3b82f6'}}></i>
                    <span>{region?.name || alert.region_id}</span>
                    <span style={{opacity: 0.5}}>({alert.region_id})</span>
                  </div>
                  <div style={styles.metaItem}>
                    <i className="fa-solid fa-users" style={{color: '#10b981'}}></i>
                    <span>{(region?.population || 0).toLocaleString()} at risk</span>
                  </div>
                  <div style={styles.metaItem}>
                    <i className="fa-regular fa-clock" style={{color: '#f59e0b'}}></i>
                    <span>{new Date(alert.created_at).toLocaleString()}</span>
                  </div>
                  {alert.resolved_at && (
                    <div style={{...styles.metaItem, color: '#10b981'}}>
                      <i className="fa-solid fa-check-circle"></i>
                      <span>Resolved: {new Date(alert.resolved_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>
                
                {alert.status === 'active' && (
                  <div style={styles.alertActions}>
                    <button 
                      style={styles.actionBtn('success')}
                      onClick={() => handleResolve(alert.id)}
                    >
                      <i className="fa-solid fa-check"></i> Resolve Alert
                    </button>
                    <button 
                      style={styles.actionBtn('broadcast')}
                      onClick={() => {
                        setBroadcastData(prev => ({...prev, region_id: alert.region_id}));
                        setShowBroadcast(true);
                      }}
                    >
                      <i className="fa-solid fa-tower-broadcast"></i> Send Broadcast
                    </button>
                    <button style={styles.actionBtn('default')}>
                      <i className="fa-solid fa-expand"></i> Details
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Broadcast History Section */}
      <div style={styles.broadcastSection}>
        <div style={styles.broadcastHeader}>
          <h3 style={{color: 'white', display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0}}>
            <i className="fa-solid fa-tower-broadcast" style={{color: '#f59e0b'}}></i>
            Recent Broadcasts
          </h3>
          <span style={{color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem'}}>
            {totalRecipients.toLocaleString()} total recipients reached
          </span>
        </div>
        
        {broadcastHistory.length === 0 ? (
          <p style={{color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '1rem'}}>No broadcasts sent yet</p>
        ) : (
          broadcastHistory.slice(0, 5).map((broadcast, i) => (
            <div key={broadcast.id} style={styles.broadcastHistoryItem}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <i className="fa-solid fa-paper-plane"></i>
                  </div>
                  <div>
                    <div style={{color: 'white', fontWeight: '600'}}>{REGIONS[broadcast.region_id]?.name || broadcast.region_id}</div>
                    <div style={{fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)'}}>{broadcast.message.substring(0, 50)}...</div>
                  </div>
                </div>
                <span style={{
                  background: broadcast.status === 'delivered' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                  color: broadcast.status === 'delivered' ? '#10b981' : '#f59e0b',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                }}>
                  {broadcast.status === 'delivered' ? '✓ Delivered' : 'Pending'}
                </span>
              </div>
              <div style={{display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginLeft: '3rem'}}>
                <span><i className="fa-solid fa-users" style={{marginRight: '0.3rem'}}></i>{broadcast.recipients.toLocaleString()} recipients</span>
                <span><i className="fa-regular fa-clock" style={{marginRight: '0.3rem'}}></i>{new Date(broadcast.sent_at).toLocaleString()}</span>
                <span>
                  {broadcast.channels.map(ch => (
                    <i key={ch} className={`fa-solid fa-${ch === 'sms' ? 'message' : ch === 'app' ? 'mobile-screen' : 'envelope'}`} style={{marginRight: '0.4rem', color: '#3b82f6'}}></i>
                  ))}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Broadcast Modal */}
      {showBroadcast && (
        <div style={styles.modalOverlay} onClick={() => setShowBroadcast(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>
                <i className="fa-solid fa-tower-broadcast"></i>
                Emergency Broadcast System
              </div>
              <button style={styles.modalClose} onClick={() => setShowBroadcast(false)}>
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            
            <div style={styles.modalBody}>
              {broadcastSuccess ? (
                <div style={styles.successMsg}>
                  <i className="fa-solid fa-check-circle" style={{fontSize: '1.5rem'}}></i>
                  <div>
                    <div style={{fontWeight: '600', marginBottom: '0.25rem'}}>Broadcast Sent Successfully!</div>
                    <div style={{fontSize: '0.9rem', opacity: 0.8}}>{broadcastSuccess}</div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Region Selection */}
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>
                      <i className="fa-solid fa-location-dot" style={{marginRight: '0.5rem', color: '#3b82f6'}}></i>
                      Target Region *
                    </label>
                    <select 
                      style={styles.formSelect}
                      value={broadcastData.region_id}
                      onChange={(e) => setBroadcastData(prev => ({...prev, region_id: e.target.value}))}
                    >
                      <option value="">Select a region...</option>
                      {Object.entries(REGIONS).map(([id, region]) => (
                        <option key={id} value={id}>{region.name} ({id}) - {region.population.toLocaleString()} people</option>
                      ))}
                    </select>
                  </div>

                  {/* Quick Templates */}
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>
                      <i className="fa-solid fa-file-lines" style={{marginRight: '0.5rem', color: '#f59e0b'}}></i>
                      Quick Templates
                    </label>
                    <div style={styles.templateGrid}>
                      {BROADCAST_TEMPLATES.map(template => (
                        <div 
                          key={template.id}
                          style={styles.templateCard(broadcastData.template_id === template.id)}
                          onClick={() => applyTemplate(template)}
                        >
                          <div style={{fontWeight: '600', color: 'white', marginBottom: '0.25rem', fontSize: '0.9rem'}}>{template.name}</div>
                          <div style={{fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', lineHeight: '1.4'}}>{template.message.substring(0, 60)}...</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Message */}
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>
                      <i className="fa-solid fa-message" style={{marginRight: '0.5rem', color: '#10b981'}}></i>
                      Broadcast Message *
                    </label>
                    <textarea
                      style={styles.formTextarea}
                      placeholder="Enter your emergency message here..."
                      value={broadcastData.message}
                      onChange={(e) => setBroadcastData(prev => ({...prev, message: e.target.value}))}
                    />
                    <div style={{fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem'}}>
                      {broadcastData.message.length}/500 characters
                    </div>
                  </div>

                  {/* Delivery Channels */}
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>
                      <i className="fa-solid fa-paper-plane" style={{marginRight: '0.5rem', color: '#8b5cf6'}}></i>
                      Delivery Channels
                    </label>
                    <div style={styles.channelToggle}>
                      {[
                        { id: 'sms', icon: 'fa-message', label: 'SMS' },
                        { id: 'app', icon: 'fa-mobile-screen', label: 'Mobile App' },
                        { id: 'email', icon: 'fa-envelope', label: 'Email' },
                      ].map(channel => (
                        <button
                          key={channel.id}
                          style={styles.channelBtn(broadcastData.channels.includes(channel.id))}
                          onClick={() => {
                            setBroadcastData(prev => ({
                              ...prev,
                              channels: prev.channels.includes(channel.id)
                                ? prev.channels.filter(c => c !== channel.id)
                                : [...prev.channels, channel.id]
                            }));
                          }}
                        >
                          <i className={`fa-solid ${channel.icon}`}></i>
                          {channel.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Estimated Reach */}
                  {broadcastData.region_id && (
                    <div style={{
                      background: 'rgba(16,185,129,0.1)',
                      borderRadius: '12px',
                      padding: '1rem',
                      border: '1px solid rgba(16,185,129,0.2)',
                      marginBottom: '1rem',
                    }}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                        <i className="fa-solid fa-users" style={{color: '#10b981', fontSize: '1.2rem'}}></i>
                        <div>
                          <div style={{color: 'white', fontWeight: '600'}}>Estimated Reach</div>
                          <div style={{fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)'}}>
                            <strong style={{color: '#10b981', fontSize: '1.2rem'}}>{(REGIONS[broadcastData.region_id]?.population || 0).toLocaleString()}</strong> residents in {REGIONS[broadcastData.region_id]?.name || 'selected region'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Send Button */}
                  <button 
                    style={{
                      ...styles.sendBtn,
                      opacity: broadcasting ? 0.7 : 1,
                      cursor: broadcasting ? 'not-allowed' : 'pointer',
                    }}
                    onClick={handleBroadcast}
                    disabled={broadcasting}
                  >
                    {broadcasting ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i>
                        Sending Broadcast...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-paper-plane"></i>
                        Send Emergency Broadcast
                      </>
                    )}
                  </button>

                  <p style={{fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '1rem'}}>
                    <i className="fa-solid fa-shield-halved" style={{marginRight: '0.5rem'}}></i>
                    This broadcast will be logged and sent to all registered devices in the selected region.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
