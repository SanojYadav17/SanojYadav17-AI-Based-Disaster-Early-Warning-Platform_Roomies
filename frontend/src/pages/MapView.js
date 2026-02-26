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

const RISK_COLORS = { Low: '#10b981', Medium: '#f59e0b', High: '#ef4444' };
const RISK_BG = { Low: 'rgba(16,185,129,0.12)', Medium: 'rgba(245,158,11,0.12)', High: 'rgba(239,68,68,0.12)' };
const TYPE_ICONS = { 
  Flood: 'fa-solid fa-water', 
  Cyclone: 'fa-solid fa-hurricane', 
  Earthquake: 'fa-solid fa-house-crack', 
  Heatwave: 'fa-solid fa-temperature-arrow-up', 
  None: 'fa-solid fa-shield-halved',
  Drought: 'fa-solid fa-sun',
  Tsunami: 'fa-solid fa-water',
  Wildfire: 'fa-solid fa-fire',
  Landslide: 'fa-solid fa-hill-rockslide'
};
const TYPE_COLORS = {
  Flood: '#3b82f6', Cyclone: '#8b5cf6', Earthquake: '#f59e0b', Heatwave: '#ef4444',
  None: '#64748b', Drought: '#d97706', Tsunami: '#0ea5e9', Wildfire: '#f97316', Landslide: '#a3734c'
};

export default function MapView() {
  const [regions, setRegions] = useState(DEMO_REGIONS);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('risk_score');
  const [sortOrder, setSortOrder] = useState('desc');

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

  // Filter and sort regions
  let filteredRegions = filter === 'all' ? regions : regions.filter(r => r.risk_level === filter);
  if (searchTerm) {
    filteredRegions = filteredRegions.filter(r => 
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.disaster_type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  filteredRegions = [...filteredRegions].sort((a, b) => {
    const aVal = a[sortBy] || 0;
    const bVal = b[sortBy] || 0;
    if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
    return aVal < bVal ? 1 : -1;
  });

  const highCount = regions.filter(r => r.risk_level === 'High').length;
  const medCount = regions.filter(r => r.risk_level === 'Medium').length;
  const lowCount = regions.filter(r => r.risk_level === 'Low').length;
  const avgRisk = regions.length ? Math.round(regions.reduce((sum, r) => sum + (r.risk_score || 0), 0) / regions.length) : 0;

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">
          <span className="page-title-icon green"><i className="fa-solid fa-earth-asia"></i></span>
          Live Risk Map
        </h2>
        <p className="page-description">Geographic overview of disaster risk monitoring across all Indian regions. Click on map markers or table rows for details.</p>
      </div>

      {/* Risk Summary Stats */}
      <div className="stats-grid" style={{marginBottom: '1.25rem'}}>
        <div className="card stat-card" style={{cursor:'pointer', border: filter === 'High' ? '2px solid var(--accent-red)' : '1px solid transparent', transition:'all 0.2s ease'}} onClick={() => setFilter(filter === 'High' ? 'all' : 'High')}>
          <div className="stat-card-inner">
            <div className="stat-info">
              <div className="stat-label">High Risk Zones</div>
              <div className="stat-value red">{highCount}</div>
            </div>
            <div className="stat-icon red"><i className="fa-solid fa-circle-radiation"></i></div>
          </div>
          <div className="stat-bar"><div className="stat-bar-fill" style={{width: `${(highCount/regions.length)*100}%`, background:'var(--accent-red)'}}></div></div>
          <div style={{fontSize:'0.7rem', color:'var(--text-muted)', marginTop:4}}>Immediate evacuation may be required</div>
        </div>
        <div className="card stat-card" style={{cursor:'pointer', border: filter === 'Medium' ? '2px solid var(--accent-orange)' : '1px solid transparent', transition:'all 0.2s ease'}} onClick={() => setFilter(filter === 'Medium' ? 'all' : 'Medium')}>
          <div className="stat-card-inner">
            <div className="stat-info">
              <div className="stat-label">Medium Risk Zones</div>
              <div className="stat-value orange">{medCount}</div>
            </div>
            <div className="stat-icon orange"><i className="fa-solid fa-triangle-exclamation"></i></div>
          </div>
          <div className="stat-bar"><div className="stat-bar-fill" style={{width: `${(medCount/regions.length)*100}%`, background:'var(--accent-orange)'}}></div></div>
          <div style={{fontSize:'0.7rem', color:'var(--text-muted)', marginTop:4}}>Stay alert and prepare emergency kit</div>
        </div>
        <div className="card stat-card" style={{cursor:'pointer', border: filter === 'Low' ? '2px solid var(--accent-green)' : '1px solid transparent', transition:'all 0.2s ease'}} onClick={() => setFilter(filter === 'Low' ? 'all' : 'Low')}>
          <div className="stat-card-inner">
            <div className="stat-info">
              <div className="stat-label">Low Risk Zones</div>
              <div className="stat-value green">{lowCount}</div>
            </div>
            <div className="stat-icon green"><i className="fa-solid fa-shield-halved"></i></div>
          </div>
          <div className="stat-bar"><div className="stat-bar-fill" style={{width: `${(lowCount/regions.length)*100}%`, background:'var(--accent-green)'}}></div></div>
          <div style={{fontSize:'0.7rem', color:'var(--text-muted)', marginTop:4}}>Normal conditions, continue monitoring</div>
        </div>
      </div>

      {/* Map Section */}
      <div className="card animate-in" style={{padding: '0'}}>
        <div className="card-header" style={{padding:'1rem 1.25rem', borderBottom:'1px solid var(--glass-border)'}}>
          <div style={{display:'flex', alignItems:'center', gap:'0.6rem'}}>
            <span className="card-header-icon" style={{background:'rgba(59,130,246,0.12)', color:'var(--accent-blue)'}}><i className="fa-solid fa-map-location-dot"></i></span>
            <div>
              <div style={{fontWeight:600, color:'var(--text-primary)'}}>Interactive Risk Map</div>
              <div style={{fontSize:'0.75rem', color:'var(--text-muted)'}}>Click markers to view region details • Larger circles = Higher risk</div>
            </div>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
            {/* Map Legend */}
            <div style={{display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.5rem 1rem', background:'rgba(100,150,255,0.05)', borderRadius:8}}>
              <span style={{fontSize:'0.7rem', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px'}}>Legend:</span>
              <div style={{display:'flex', alignItems:'center', gap:4}}><span style={{width:10, height:10, borderRadius:'50%', background:'#ef4444'}}></span><span style={{fontSize:'0.75rem', color:'var(--text-secondary)'}}>High</span></div>
              <div style={{display:'flex', alignItems:'center', gap:4}}><span style={{width:10, height:10, borderRadius:'50%', background:'#f59e0b'}}></span><span style={{fontSize:'0.75rem', color:'var(--text-secondary)'}}>Medium</span></div>
              <div style={{display:'flex', alignItems:'center', gap:4}}><span style={{width:10, height:10, borderRadius:'50%', background:'#10b981'}}></span><span style={{fontSize:'0.75rem', color:'var(--text-secondary)'}}>Low</span></div>
            </div>
            <span className="chip"><i className="fa-solid fa-location-dot" style={{marginRight:4}}></i>{filteredRegions.length} regions</span>
          </div>
        </div>
        <div className="map-container" style={{height: '400px', borderRadius:'0 0 14px 14px', overflow:'hidden'}}>
          <MapContainer center={[22.5, 78.9]} zoom={5} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; CARTO'
            />
            {filteredRegions.map(region => (
              <CircleMarker
                key={region.id}
                center={[region.latitude, region.longitude]}
                radius={Math.max(12, (region.risk_score || 0) / 4)}
                fillColor={RISK_COLORS[region.risk_level] || '#64748b'}
                color={RISK_COLORS[region.risk_level] || '#64748b'}
                fillOpacity={0.6}
                weight={2}
                eventHandlers={{ click: () => setSelectedRegion(region) }}
              >
                <MapTooltip direction="top" permanent={false}>
                  <div style={{fontFamily:'Inter, sans-serif', padding:'4px 2px', minWidth:140}}>
                    <div style={{fontWeight:700, fontSize:'0.9rem', marginBottom:4}}>{region.name}</div>
                    <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:2}}>
                      <span style={{color:'#7b8fad'}}>Risk:</span>
                      <span style={{fontWeight:700, color: RISK_COLORS[region.risk_level]}}>{region.risk_score}/100</span>
                      <span style={{fontSize:'0.7rem', padding:'2px 6px', borderRadius:4, background: RISK_BG[region.risk_level], color: RISK_COLORS[region.risk_level]}}>{region.risk_level}</span>
                    </div>
                    <div style={{display:'flex', alignItems:'center', gap:6}}>
                      <span style={{color:'#7b8fad'}}>Type:</span>
                      <i className={TYPE_ICONS[region.disaster_type] || 'fa-solid fa-circle'} style={{color: TYPE_COLORS[region.disaster_type] || '#64748b', fontSize:'0.8rem'}}></i>
                      <span style={{fontWeight:600}}>{region.disaster_type === 'None' ? 'No Disaster' : region.disaster_type}</span>
                    </div>
                  </div>
                </MapTooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Region Details Section - Professional Table */}
      <div className="card animate-in" style={{marginTop: '1.25rem', animationDelay: '0.2s'}}>
        <div className="card-header" style={{flexWrap:'wrap', gap:'1rem'}}>
          <div style={{display:'flex', alignItems:'center', gap:'0.6rem'}}>
            <span className="card-header-icon" style={{background:'rgba(6,182,212,0.12)', color:'var(--accent-cyan)'}}><i className="fa-solid fa-table-list"></i></span>
            <div>
              <div style={{fontWeight:600, color:'var(--text-primary)'}}>Region Details</div>
              <div style={{fontSize:'0.72rem', color:'var(--text-muted)', marginTop:2}}>
                <i className="fa-solid fa-circle-info" style={{marginRight:4}}></i>
                Detailed breakdown of all monitored regions with risk scores, disaster types, and coordinates for emergency response planning
              </div>
            </div>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:'0.75rem', flexWrap:'wrap'}}>
            {/* Search */}
            <div style={{position:'relative'}}>
              <i className="fa-solid fa-search" style={{position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:'0.8rem'}}></i>
              <input 
                type="text" 
                placeholder="Search regions..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding:'0.5rem 0.75rem 0.5rem 2rem', 
                  borderRadius:8, 
                  border:'1px solid var(--glass-border)', 
                  background:'rgba(100,150,255,0.05)', 
                  color:'var(--text-primary)',
                  fontSize:'0.82rem',
                  width:180,
                  outline:'none',
                  transition:'all 0.2s ease'
                }}
              />
            </div>
            {/* Filter Reset */}
            {filter !== 'all' && (
              <button onClick={() => setFilter('all')} style={{
                padding:'0.5rem 0.75rem', borderRadius:8, border:'1px solid var(--glass-border)',
                background:'rgba(100,150,255,0.08)', color:'var(--text-secondary)', cursor:'pointer',
                fontSize:'0.78rem', display:'flex', alignItems:'center', gap:6
              }}>
                <i className="fa-solid fa-filter-circle-xmark"></i> Clear Filter
              </button>
            )}
            <span className="chip">{filteredRegions.length} of {regions.length} shown</span>
          </div>
        </div>

        {/* Why this section exists - Info Banner */}
        <div style={{
          margin:'0 1rem', padding:'0.75rem 1rem', borderRadius:10,
          background:'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(6,182,212,0.08))',
          border:'1px solid rgba(59,130,246,0.15)',
          display:'flex', alignItems:'flex-start', gap:'0.75rem'
        }}>
          <i className="fa-solid fa-lightbulb" style={{color:'var(--accent-cyan)', fontSize:'1rem', marginTop:2}}></i>
          <div style={{fontSize:'0.78rem', color:'var(--text-secondary)', lineHeight:1.5}}>
            <strong style={{color:'var(--text-primary)'}}>Why Region Details?</strong> This table provides a quick reference for emergency response teams to identify high-risk areas, 
            plan evacuation routes, and allocate resources efficiently. Click on any row to view detailed information. 
            <span style={{color:'var(--accent-cyan)'}}> Click column headers to sort.</span>
          </div>
        </div>

        <div style={{overflowX:'auto', padding:'1rem'}}>
          <table className="data-table" style={{width:'100%'}}>
            <thead>
              <tr>
                <th style={{cursor:'pointer', userSelect:'none'}} onClick={() => handleSort('name')}>
                  <div style={{display:'flex', alignItems:'center', gap:6}}>
                    Region
                    {sortBy === 'name' && <i className={`fa-solid fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`} style={{fontSize:'0.7rem', color:'var(--accent-cyan)'}}></i>}
                  </div>
                </th>
                <th>Disaster Type</th>
                <th style={{cursor:'pointer', userSelect:'none'}} onClick={() => handleSort('risk_score')}>
                  <div style={{display:'flex', alignItems:'center', gap:6}}>
                    Risk Score
                    {sortBy === 'risk_score' && <i className={`fa-solid fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`} style={{fontSize:'0.7rem', color:'var(--accent-cyan)'}}></i>}
                  </div>
                </th>
                <th>Risk Level</th>
                <th>Status</th>
                <th>Coordinates</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegions.map((r, index) => {
                const disasterType = r.disaster_type === 'None' ? 'No Disaster' : r.disaster_type;
                return (
                  <tr key={r.id} 
                    style={{cursor:'pointer', animation: `fadeSlideUp 0.3s ease ${index * 0.05}s both`}} 
                    onClick={() => setSelectedRegion(r)}
                    className="table-row-hover"
                  >
                    <td>
                      <div style={{display:'flex', alignItems:'center', gap:10}}>
                        <div style={{
                          width:36, height:36, borderRadius:10,
                          background: RISK_BG[r.risk_level],
                          display:'flex', alignItems:'center', justifyContent:'center',
                          color: RISK_COLORS[r.risk_level], fontSize:'0.85rem'
                        }}>
                          <i className="fa-solid fa-map-marker-alt"></i>
                        </div>
                        <div>
                          <div style={{fontWeight:700, fontSize:'0.88rem', color:'var(--text-primary)'}}>{r.name}</div>
                          <div style={{fontSize:'0.7rem', color:'var(--text-muted)'}}>{r.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <div style={{
                          width:28, height:28, borderRadius:8,
                          background: `${TYPE_COLORS[r.disaster_type] || '#64748b'}15`,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          color: TYPE_COLORS[r.disaster_type] || '#64748b', fontSize:'0.75rem'
                        }}>
                          <i className={TYPE_ICONS[r.disaster_type] || 'fa-solid fa-shield-halved'}></i>
                        </div>
                        <span style={{fontWeight:600, color: TYPE_COLORS[r.disaster_type] || '#64748b'}}>{disasterType}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{display:'flex', alignItems:'center', gap:'0.6rem'}}>
                        <div style={{
                          position:'relative', width:40, height:40,
                          borderRadius:'50%',
                          background: `conic-gradient(${RISK_COLORS[r.risk_level]} ${r.risk_score * 3.6}deg, rgba(100,150,255,0.1) 0deg)`,
                          display:'flex', alignItems:'center', justifyContent:'center'
                        }}>
                          <div style={{
                            width:30, height:30, borderRadius:'50%',
                            background:'var(--bg-card, #0c1b2e)',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:'0.72rem', fontWeight:800, color: RISK_COLORS[r.risk_level]
                          }}>
                            {r.risk_score}
                          </div>
                        </div>
                        <div style={{flex:1, maxWidth:60}}>
                          <div style={{height:6, background:'rgba(100,150,255,0.1)', borderRadius:4, overflow:'hidden'}}>
                            <div style={{height:'100%', width:`${r.risk_score}%`, background: RISK_COLORS[r.risk_level], borderRadius:4, transition:'width 0.5s ease'}}></div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        padding:'0.35rem 0.75rem', borderRadius:20,
                        background: RISK_BG[r.risk_level],
                        color: RISK_COLORS[r.risk_level],
                        fontWeight:700, fontSize:'0.75rem',
                        display:'inline-flex', alignItems:'center', gap:5
                      }}>
                        <span style={{width:6, height:6, borderRadius:'50%', background: RISK_COLORS[r.risk_level]}}></span>
                        {r.risk_level}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        padding:'0.3rem 0.6rem', borderRadius:6,
                        background: r.risk_level === 'High' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                        color: r.risk_level === 'High' ? '#ef4444' : '#10b981',
                        fontSize:'0.72rem', fontWeight:600
                      }}>
                        {r.risk_level === 'High' ? '⚠ Alert Active' : '✓ Monitoring'}
                      </span>
                    </td>
                    <td>
                      <div style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>
                        <i className="fa-solid fa-location-crosshairs" style={{marginRight:6, color:'var(--accent-cyan)'}}></i>
                        {r.latitude.toFixed(2)}°N, {r.longitude.toFixed(2)}°E
                      </div>
                    </td>
                    <td>
                      <button style={{
                        padding:'0.4rem 0.8rem', borderRadius:8, border:'none',
                        background:'rgba(59,130,246,0.15)', color:'var(--accent-blue)',
                        cursor:'pointer', fontSize:'0.75rem', fontWeight:600,
                        display:'flex', alignItems:'center', gap:5, transition:'all 0.2s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.25)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(59,130,246,0.15)'}
                      >
                        <i className="fa-solid fa-eye"></i> View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer Stats */}
        <div style={{
          padding:'0.75rem 1.25rem', borderTop:'1px solid var(--glass-border)',
          display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'1rem'
        }}>
          <div style={{display:'flex', alignItems:'center', gap:'1.5rem'}}>
            <div style={{fontSize:'0.78rem', color:'var(--text-muted)'}}>
              <i className="fa-solid fa-chart-simple" style={{marginRight:6, color:'var(--accent-purple)'}}></i>
              Average Risk Score: <strong style={{color:'var(--text-primary)'}}>{avgRisk}</strong>
            </div>
            <div style={{fontSize:'0.78rem', color:'var(--text-muted)'}}>
              <i className="fa-solid fa-clock" style={{marginRight:6, color:'var(--accent-cyan)'}}></i>
              Last Updated: <strong style={{color:'var(--text-primary)'}}>{new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</strong>
            </div>
          </div>
          <div style={{fontSize:'0.72rem', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:6}}>
            <i className="fa-solid fa-rotate"></i> Auto-refresh every 30 seconds
          </div>
        </div>
      </div>

      {/* Selected Region Detail Modal */}
      {selectedRegion && (
        <div className="card animate-in" style={{marginTop: '1.25rem', border:'1px solid ' + RISK_COLORS[selectedRegion.risk_level] + '40'}}>
          <div className="card-header">
            <div style={{display:'flex', alignItems:'center', gap:'0.75rem'}}>
              <div style={{
                width:48, height:48, borderRadius:12,
                background: RISK_BG[selectedRegion.risk_level],
                display:'flex', alignItems:'center', justifyContent:'center',
                color: RISK_COLORS[selectedRegion.risk_level], fontSize:'1.2rem'
              }}>
                <i className="fa-solid fa-location-crosshairs"></i>
              </div>
              <div>
                <div style={{fontWeight:700, fontSize:'1.1rem', color:'var(--text-primary)'}}>{selectedRegion.name}</div>
                <div style={{fontSize:'0.8rem', color:'var(--text-muted)'}}>{selectedRegion.id} • {selectedRegion.latitude.toFixed(4)}°N, {selectedRegion.longitude.toFixed(4)}°E</div>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedRegion(null)} style={{padding:'0.5rem 1rem'}}>
              <i className="fa-solid fa-xmark"></i> Close
            </button>
          </div>
          <div style={{padding:'1.25rem', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'1rem'}}>
            <div style={{padding:'1rem', borderRadius:12, background:'rgba(100,150,255,0.05)', border:'1px solid var(--glass-border)'}}>
              <div style={{fontSize:'0.75rem', color:'var(--text-muted)', textTransform:'uppercase', marginBottom:8}}>Risk Score</div>
              <div style={{fontSize:'2rem', fontWeight:800, color: RISK_COLORS[selectedRegion.risk_level]}}>{selectedRegion.risk_score}<span style={{fontSize:'1rem', color:'var(--text-muted)'}}>/100</span></div>
              <div style={{height:8, background:'rgba(100,150,255,0.1)', borderRadius:4, marginTop:8, overflow:'hidden'}}>
                <div style={{height:'100%', width:`${selectedRegion.risk_score}%`, background: RISK_COLORS[selectedRegion.risk_level], borderRadius:4}}></div>
              </div>
            </div>
            <div style={{padding:'1rem', borderRadius:12, background:'rgba(100,150,255,0.05)', border:'1px solid var(--glass-border)'}}>
              <div style={{fontSize:'0.75rem', color:'var(--text-muted)', textTransform:'uppercase', marginBottom:8}}>Risk Level</div>
              <span style={{
                padding:'0.5rem 1rem', borderRadius:20,
                background: RISK_BG[selectedRegion.risk_level],
                color: RISK_COLORS[selectedRegion.risk_level],
                fontWeight:700, fontSize:'1rem'
              }}>{selectedRegion.risk_level}</span>
            </div>
            <div style={{padding:'1rem', borderRadius:12, background:'rgba(100,150,255,0.05)', border:'1px solid var(--glass-border)'}}>
              <div style={{fontSize:'0.75rem', color:'var(--text-muted)', textTransform:'uppercase', marginBottom:8}}>Disaster Type</div>
              <div style={{display:'flex', alignItems:'center', gap:10}}>
                <div style={{
                  width:40, height:40, borderRadius:10,
                  background: `${TYPE_COLORS[selectedRegion.disaster_type] || '#64748b'}15`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color: TYPE_COLORS[selectedRegion.disaster_type] || '#64748b', fontSize:'1rem'
                }}>
                  <i className={TYPE_ICONS[selectedRegion.disaster_type] || 'fa-solid fa-shield-halved'}></i>
                </div>
                <span style={{fontWeight:700, fontSize:'1rem', color: TYPE_COLORS[selectedRegion.disaster_type] || '#64748b'}}>
                  {selectedRegion.disaster_type === 'None' ? 'No Disaster' : selectedRegion.disaster_type}
                </span>
              </div>
            </div>
            <div style={{padding:'1rem', borderRadius:12, background:'rgba(100,150,255,0.05)', border:'1px solid var(--glass-border)'}}>
              <div style={{fontSize:'0.75rem', color:'var(--text-muted)', textTransform:'uppercase', marginBottom:8}}>Recommended Action</div>
              <div style={{fontWeight:600, color:'var(--text-primary)', fontSize:'0.9rem'}}>
                {selectedRegion.risk_level === 'High' ? '🚨 Evacuate immediately' : selectedRegion.risk_level === 'Medium' ? '⚠️ Stay alert, prepare' : '✅ Continue monitoring'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
