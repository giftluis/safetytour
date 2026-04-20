import { useState, useEffect } from 'react';
import api from '../api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export default function Reports() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedBU, setSelectedBU] = useState('All');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedRegion, setSelectedRegion] = useState('All');
    const [selectedRole, setSelectedRole] = useState('All');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [period, setPeriod] = useState('all');

    const fetchStats = () => {
        setLoading(true);
        let url = 'visits/stats/';
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        if (params.toString()) url += `?${params.toString()}`;

        api.get(url)
            .then(res => {
                setStats(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load stats", err);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchStats();
    }, [startDate, endDate]);

    const handlePeriodChange = (val) => {
        setPeriod(val);
        const now = new Date();
        let start = '';
        let end = '';

        if (val === 'month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            end = now.toISOString().split('T')[0];
        } else if (val === 'quarter') {
            const currentQuarter = Math.floor(now.getMonth() / 3);
            start = new Date(now.getFullYear(), currentQuarter * 3, 1).toISOString().split('T')[0];
            end = now.toISOString().split('T')[0];
        } else if (val === 'ytd') {
            start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
            end = now.toISOString().split('T')[0];
        } else if (val === 'custom') {
            return; // Don't reset dates, let user pick
        } else {
            start = '';
            end = '';
        }

        setStartDate(start);
        setEndDate(end);
    };

    if (loading) return <div className="container">Loading reports...</div>;

    if (!stats) return <div className="container">Error loading reports.</div>;

    const maxMonthValue = Math.max(...stats.by_month.map(m => m.count), 1);

    // Business Unit Filter logic
    // Dynamic Filter Extraction
    const uniqueBUs = ['All', ...new Set(stats.by_blended.map(item => item.created_by__profile__business_unit || 'Unassigned'))].sort();
    const uniqueRegions = ['All', ...new Set(stats.by_blended.map(item => item.created_by__profile__region || 'Unassigned'))].sort();
    const uniqueRoles = ['All', ...new Set(stats.by_blended.map(item => item.created_by__profile__role || 'Unassigned'))].sort();

    // Transform blended stats for Recharts
    // Format: { label: 'FY2025 Q1', South: 5, Centre: 2, North: 3 }
    const isMatch = (item) => {
        const buMatch = selectedBU === 'All' || (item.created_by__profile__business_unit || 'Unassigned') === selectedBU;
        const regionMatch = selectedRegion === 'All' || (item.created_by__profile__region || 'Unassigned') === selectedRegion;
        const roleMatch = selectedRole === 'All' || (item.created_by__profile__role || 'Unassigned') === selectedRole;
        return buMatch && regionMatch && roleMatch;
    };

    const filteredBlended = stats.by_blended.filter(item => {
        const categoryMatch = selectedCategory === 'All' || item.area_category === selectedCategory;
        return isMatch(item) && categoryMatch;
    });

    const filteredManager = stats.by_manager.filter(isMatch).reduce((acc, curr) => {
        let entry = acc.find(i => i.manager_name === curr.manager_name);
        if (!entry) {
            entry = { manager_name: curr.manager_name, count: 0 };
            acc.push(entry);
        }
        entry.count += curr.count;
        return acc;
    }, []).sort((a, b) => b.count - a.count);

    const filteredCategoryManager = stats.by_category_manager.filter(isMatch);

    const blendedChartData = filteredBlended.reduce((acc, curr) => {
        const label = `FY${curr.fiscal_year} ${curr.quarter}`;
        let entry = acc.find(item => item.label === label);
        if (!entry) {
            entry = { label, South: 0, Centre: 0, North: 0 };
            acc.push(entry);
        }
        const region = curr.created_by__profile__region || 'Unassigned';
        if (['South', 'Centre', 'North'].includes(region)) {
            entry[region] += curr.count;
        } else {
            if (!entry['Other']) entry['Other'] = 0;
            entry['Other'] += curr.count;
        }
        return acc;
    }, []).sort((a, b) => a.label.localeCompare(b.label));

    // KPI Calculations
    const totalTours = filteredBlended.reduce((sum, item) => sum + item.count, 0);
    const topManager = filteredManager[0]?.manager_name || 'N/A';
    const topCategory = [...new Set(filteredBlended.map(i => i.area_category))].reduce((a, b) => {
        const countA = filteredBlended.filter(i => i.area_category === a).reduce((s, x) => s + x.count, 0);
        const countB = filteredBlended.filter(i => i.area_category === b).reduce((s, x) => s + x.count, 0);
        return countA > countB ? a : b;
    }, 'N/A');

    const getHeatmapColor = (count, max) => {
        if (!count || count === 0) return 'transparent';
        const opacity = Math.max(0.1, count / max);
        return `rgba(230, 0, 0, ${opacity})`; // Vodafone Red with opacity
    };

    const matrixData = Array.from(new Set(filteredCategoryManager.map(i => i.manager_name))).sort().map(mgr => {
        const categories = Array.from(new Set(stats.by_category_manager.map(i => i.area_category))).sort();
        let rowTotal = 0;
        const rowData = categories.reduce((acc, cat) => {
            const matches = filteredCategoryManager.filter(i => i.manager_name === mgr && i.area_category === cat);
            const count = matches.reduce((sum, m) => sum + m.count, 0);
            rowTotal += count;
            acc[cat] = count;
            return acc;
        }, {});
        return { manager: mgr, ...rowData, total: rowTotal };
    });

    const maxMatrixValue = Math.max(...filteredCategoryManager.map(i => i.count), 1);

    return (
        <div className="container" style={{ maxWidth: '1200px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.5rem', color: '#111827' }}>Safety Intelligence Dashboard</h1>
                    <p style={{ color: '#6b7280', margin: 0 }}>High-level insights into operational safety performance</p>
                </div>
                <div style={{ background: '#fff', padding: '1.2rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '15px' }}>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase' }}>Period</label>
                            <select value={period} onChange={(e) => handlePeriodChange(e.target.value)} style={{ padding: '6px 10px', fontSize: '0.85rem' }}>
                                <option value="all">All Time</option>
                                <option value="month">This Month</option>
                                <option value="quarter">This Quarter</option>
                                <option value="ytd">Year to Date</option>
                                <option value="custom">Custom Range</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase' }}>Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setPeriod('custom'); }}
                                style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase' }}>End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setPeriod('custom'); }}
                                style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <button onClick={() => { setStartDate(''); setEndDate(''); setPeriod('all'); }} className="btn-outline" style={{ padding: '6px 12px', width: '100%', fontSize: '0.8rem' }}>Reset Dates</button>
                        </div>
                    </div>
                    <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '15px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase' }}>Region</label>
                            <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)} style={{ padding: '6px 10px', fontSize: '0.85rem' }}>
                                {uniqueRegions.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase' }}>BU</label>
                            <select value={selectedBU} onChange={(e) => setSelectedBU(e.target.value)} style={{ padding: '6px 10px', fontSize: '0.85rem' }}>
                                {uniqueBUs.map(bu => <option key={bu} value={bu}>{bu}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase' }}>Role</label>
                            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} style={{ padding: '6px 10px', fontSize: '0.85rem' }}>
                                {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#9ca3af', textTransform: 'uppercase' }}>Category</label>
                            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={{ padding: '6px 10px', fontSize: '0.85rem' }}>
                                <option value="All">All Categories</option>
                                <option value="Network Sites">Network Sites</option>
                                <option value="Data Centre">Data Centre</option>
                                <option value="Transmissions">Transmissions</option>
                                <option value="Network Other">Network Other</option>
                                <option value="Office">Office</option>
                                <option value="Warehouses">Warehouses</option>
                                <option value="Retail & Trade">Retail & Trade</option>
                                <option value="Events">Events</option>
                                <option value="Fleet">Fleet</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '2rem' }}>
                <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '15px', borderLeft: '4px solid #e60000' }}>
                    <div style={{ fontSize: '2rem' }}>📊</div>
                    <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#6b7280' }}>Total Tours</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#111827' }}>{totalTours}</div>
                    </div>
                </div>
                <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '15px', borderLeft: '4px solid #3b82f6' }}>
                    <div style={{ fontSize: '2rem' }}>👷</div>
                    <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#6b7280' }}>Top Manager</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#111827' }}>{topManager}</div>
                    </div>
                </div>
                <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '15px', borderLeft: '4px solid #10b981' }}>
                    <div style={{ fontSize: '2rem' }}>📍</div>
                    <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#6b7280' }}>Lead Category</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#111827' }}>{topCategory}</div>
                    </div>
                </div>
                <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '15px', borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ fontSize: '2rem' }}>📈</div>
                    <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#6b7280' }}>Avg Visits / Month</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#111827' }}>{(totalTours / (stats.by_month.length || 1)).toFixed(1)}</div>
                    </div>
                </div>
            </div>

            {/* Quarterly Trends */}
            <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0 }}>Safety Tours by Quarter and Region</h3>
                    <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '5px 0 0 0' }}>Trend analysis across fiscal periods</p>
                </div>
                <div style={{ width: '100%', height: 350 }}>
                    <ResponsiveContainer>
                        <BarChart data={blendedChartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                            <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                            <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
                            <Bar dataKey="South" fill="#e60000" radius={[4, 4, 0, 0]} barSize={40} />
                            <Bar dataKey="Centre" fill="#333333" radius={[4, 4, 0, 0]} barSize={40} />
                            <Bar dataKey="North" fill="#9ca3af" radius={[4, 4, 0, 0]} barSize={40} />
                            <Bar dataKey="Other" fill="#e5e7eb" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid-2">
                {/* Visits by Manager */}
                <div className="card">
                    <h3>Visits by Manager</h3>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Manager Name</th>
                                    <th style={{ width: '100px', textAlign: 'center' }}>Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredManager.length === 0 ? (
                                    <tr><td colSpan="2" className="text-center text-secondary">No data available.</td></tr>
                                ) : (
                                    filteredManager.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>{item.manager_name}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.count}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Visits by Month */}
                <div className="card">
                    <h3>Visits by Month (Last 12 Months)</h3>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Month</th>
                                    <th style={{ width: '100px', textAlign: 'center' }}>Count</th>
                                    <th>Trend</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.by_month.length === 0 ? (
                                    <tr><td colSpan="3" className="text-center text-secondary">No data available.</td></tr>
                                ) : (
                                    stats.by_month.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>{item.month}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.count}</td>
                                            <td>
                                                <div style={{
                                                    background: '#e0f2fe',
                                                    height: '10px',
                                                    borderRadius: '4px',
                                                    width: '100%',
                                                    maxWidth: '150px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <div style={{
                                                        width: `${(item.count / maxMonthValue) * 100}%`,
                                                        background: '#0284c7',
                                                        height: '100%'
                                                    }}></div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Visits by Business Unit */}
                <div className="card">
                    <h3>Visits by Business Unit</h3>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Business Unit</th>
                                    <th style={{ width: '100px', textAlign: 'center' }}>Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(stats.by_bu || []).length === 0 ? (
                                    <tr><td colSpan="2" className="text-center text-secondary">No data available.</td></tr>
                                ) : (
                                    stats.by_bu.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>{item.created_by__profile__business_unit || 'Unassigned'}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.count}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Visits by Region */}
                <div className="card">
                    <h3>Visits by Region</h3>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Region</th>
                                    <th style={{ width: '100px', textAlign: 'center' }}>Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(stats.by_region || []).length === 0 ? (
                                    <tr><td colSpan="2" className="text-center text-secondary">No data available.</td></tr>
                                ) : (
                                    stats.by_region.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>{item.created_by__profile__region || 'Unassigned'}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.count}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Visits by Fiscal Quarter */}
                <div className="card">
                    <h3>Visits by Fiscal Quarter (Apr-Mar)</h3>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Quarter</th>
                                    <th>Fiscal Year</th>
                                    <th style={{ width: '100px', textAlign: 'center' }}>Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(stats.by_quarter || []).length === 0 ? (
                                    <tr><td colSpan="3" className="text-center text-secondary">No data available.</td></tr>
                                ) : (
                                    stats.by_quarter.map((item, idx) => (
                                        <tr key={idx}>
                                            <td style={{ fontWeight: '500' }}>{item.quarter}</td>
                                            <td>FY{item.fiscal_year}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.count}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                {/* Category by Manager Heatmap Matrix */}
                <div className="card" style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div>
                            <h3 style={{ margin: 0 }}>Category by Manager Heatmap</h3>
                            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '5px 0 0 0' }}>Intensity shows volume density per area and manager</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Low</div>
                            <div style={{ width: '80px', height: '10px', background: 'linear-gradient(to right, rgba(230,0,0,0.1), rgba(230,0,0,1))', borderRadius: '5px' }}></div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>High</div>
                        </div>
                    </div>
                    <div className="table-container" style={{ overflowX: 'auto', border: 'none' }}>
                        <table style={{ borderCollapse: 'separate', borderSpacing: '2px' }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left', minWidth: '150px', background: 'white', border: 'none' }}>Manager</th>
                                    {Array.from(new Set(stats.by_category_manager.map(i => i.area_category))).sort().map(cat => (
                                        <th key={cat} style={{ textAlign: 'center', fontSize: '0.7rem', background: '#f8fafc', border: 'none', fontWeight: '800', color: '#4b5563', padding: '12px' }}>{cat.toUpperCase()}</th>
                                    ))}
                                    <th style={{ textAlign: 'center', fontWeight: 'bold', background: '#f3f4f6', border: 'none', padding: '12px' }}>TOTAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {matrixData.length === 0 ? (
                                    <tr><td colSpan="100%" className="text-center" style={{ padding: '3rem', color: '#9ca3af' }}>No data matching filters.</td></tr>
                                ) : (
                                    matrixData.map(row => {
                                        const categories = Array.from(new Set(stats.by_category_manager.map(i => i.area_category))).sort();
                                        return (
                                            <tr key={row.manager}>
                                                <td style={{ fontWeight: '600', color: '#111827', padding: '12px', border: 'none', background: '#fff' }}>{row.manager}</td>
                                                {categories.map(cat => (
                                                    <td
                                                        key={cat}
                                                        style={{
                                                            textAlign: 'center',
                                                            background: getHeatmapColor(row[cat], maxMatrixValue),
                                                            color: row[cat] > (maxMatrixValue / 2) ? 'white' : '#111827',
                                                            fontWeight: '700',
                                                            borderRadius: '4px',
                                                            padding: '12px',
                                                            border: 'none',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        {row[cat] || '-'}
                                                    </td>
                                                ))}
                                                <td style={{ textAlign: 'center', fontWeight: '800', background: '#f3f4f6', padding: '12px', border: 'none', borderRadius: '4px' }}>{row.total}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
