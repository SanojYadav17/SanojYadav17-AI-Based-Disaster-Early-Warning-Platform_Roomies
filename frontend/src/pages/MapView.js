import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip as MapTooltip } from 'react-leaflet';
import { getDashboardMetrics } from '../services/api';

const DEMO_REGIONS = [
  { id: 'R001', name: 'Mumbai Coast', latitude: 19.076, longitude: 72.877, risk_score: 78, risk_level: 'High', disaster_type: 'Flood' },
  { id: 'R002', name: 'Delhi NCR', latitude: 28.704, longitude: 77.102, risk_score: 35, risk_level: 'Low', disaster_type: 'None' },
  { id: 'R003', name: 'Chennai', latitude: 13.083, longitude: 80.271, risk_score: 62, risk_level: 'Medium', disaster_type: 'Cyclone' },
  { id: 'R004', name: 'Assam Valley', latitude: 26.140, longitude: 91.736, risk_score: 85, risk_level: 'High', disaster_type: 'Flood' },
  { id: 'R005', name: 'Rajasthan Desert', latitude: 26.912, longitude: 70.901, risk_score: 22, risk_level: 'Low', disaster_type: 'None' },
  { id: 'R006', name: 'Kerala Coast', latitude: 10.851, longitude: 76.271, risk_score: 55, risk_level: 'Medium', disaster_type: 'Flood' },
  { id: 'R007', name: 'Gujarat Coast', latitude: 22.258, longitude: 71.192, risk_score: 72, risk_level: 'High', disaster_type: 'Cyclone' },
  { id: 'R008', name: 'Uttarakhand Hills', latitude: 30.067, longitude: 79.017, risk_score: 45, risk_level: 'Medium', disaster_type: 'Earthquake' },
  { id: 'R009', name: 'Odisha Coast', latitude: 20.296, longitude: 85.825, risk_score: 68, risk_level: 'Medium', disaster_type: 'Cyclone' },
  { id: 'R010', name: 'Andhra Pradesh', latitude: 15.912, longitude: 79.740, risk_score: 30, risk_level: 'Low', disaster_type: 'None' },
];

const RISK_COLORS = { Low: '#22c55e', Medium: '#f59e0b', High: '#ef4444' };

export default function MapView() {
  const [regions, setRegions] = useState(DEMO_REGIONS);
  const [selectedRegion, setSelectedRegion] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getDashboardMetrics();
        if (res.data.regions && res.data.regions.length > 0) {
          const enriched = res.data.regions.map(r => ({
            ...r,
            risk_score: res.data.region_risks?.[r.id]?.risk_score || Math.floor(Math.random() * 100),
            risk_level: res.data.region_risks?.[r.id]?.risk_level || 'Low',
            disaster_type: res.data.region_risks?.[r.id]?.disaster_type || 'None',
          }));
          setRegions(enriched);
        }
      } catch (err) {
        console.log('Using demo map data');
      }
    };
    fetchData();
  }, []);

  return (
    <div>
      <h2 className="page-title">🗺️ Live Risk Map</h2>
      <div className="card" style={{padding: '0.5rem'}}>
        <div className="map-container">
          <MapContainer center={[22.5, 78.9]} zoom={5} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            {regions.map(region => (
              <CircleMarker
                key={region.id}
                center={[region.latitude, region.longitude]}
                radius={Math.max(12, (region.risk_score || 0) / 5)}
                fillColor={RISK_COLORS[region.risk_level] || '#64748b'}
                color={RISK_COLORS[region.risk_level] || '#64748b'}
                fillOpacity={0.6}
                weight={2}
                eventHandlers={{ click: () => setSelectedRegion(region) }}
              >
                <MapTooltip direction="top" permanent={false}>
                  <strong>{region.name}</strong><br />
                  Risk: {region.risk_score}/100 ({region.risk_level})<br />
                  Type: {region.disaster_type}
                </MapTooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Legend */}
      <div className="stats-grid" style={{marginTop: '1.5rem'}}>
        {['Low', 'Medium', 'High'].map(level => (
          <div className="card stat-card" key={level}>
            <div style={{width: 20, height: 20, borderRadius: '50%', background: RISK_COLORS[level], margin: '0 auto 0.5rem'}}></div>
            <div className="stat-label">{level === 'Low' ? '🟢' : level === 'Medium' ? '🟠' : '🔴'} {level} Risk (0-{level === 'Low' ? '40' : level === 'Medium' ? '70' : '100'})</div>
          </div>
        ))}
      </div>

      {/* Selected Region Detail */}
      {selectedRegion && (
        <div className="card" style={{marginTop: '1.5rem'}}>
          <div className="card-header">📍 {selectedRegion.name}</div>
          <div className="result-box">
            <div className="result-row"><span className="result-label">Region ID</span><span className="result-value">{selectedRegion.id}</span></div>
            <div className="result-row"><span className="result-label">Coordinates</span><span className="result-value">{selectedRegion.latitude}, {selectedRegion.longitude}</span></div>
            <div className="result-row"><span className="result-label">Risk Score</span><span className="result-value">{selectedRegion.risk_score}/100</span></div>
            <div className="result-row"><span className="result-label">Risk Level</span><span className={`risk-badge ${selectedRegion.risk_level.toLowerCase()}`}>{selectedRegion.risk_level}</span></div>
            <div className="result-row"><span className="result-label">Disaster Type</span><span className="result-value">{selectedRegion.disaster_type}</span></div>
            <div className="risk-meter"><div className={`risk-meter-fill ${selectedRegion.risk_level.toLowerCase()}`} style={{width: `${selectedRegion.risk_score}%`}}></div></div>
          </div>
        </div>
      )}
    </div>
  );
}
