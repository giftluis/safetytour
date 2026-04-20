import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { getTokens } from '../auth';

function Visits() {
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // UI State
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [sortBy, setSortBy] = useState('date_desc');

    const navigate = useNavigate();
    const tokens = getTokens();

    useEffect(() => {
        if (!tokens) {
            setLoading(false);
            return;
        }

        async function fetchVisits() {
            try {
                const res = await api.get('visits/');
                if (Array.isArray(res.data)) {
                    setVisits(res.data);
                } else {
                    console.error("API did not return an array", res.data);
                    setVisits([]);
                }
            } catch (err) {
                console.error(err);
                setError('Failed to load visits. Please try logging in again.');
            } finally {
                setLoading(false);
            }
        }
        fetchVisits();
    }, []);

    if (!tokens) {
        return (
            <div className="container">
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <h1>Welcome to Safety Tour</h1>
                    <p>Please log in to manage your safety tours.</p>
                    <Link to="/login" className="btn-primary" style={{ display: 'inline-block', marginTop: '1rem', color: 'white', textDecoration: 'none', padding: '10px 20px', borderRadius: '8px' }}>Log In</Link>
                </div>
            </div>
        );
    }

    if (loading) return <div className="container">Loading tours...</div>;

    // Filter Logic
    const filteredVisits = visits.filter(v => {
        const matchesSearch =
            v.visit_no.toLowerCase().includes(search.toLowerCase()) ||
            v.visited_area.toLowerCase().includes(search.toLowerCase()) ||
            v.manager_name.toLowerCase().includes(search.toLowerCase());

        const matchesStatus = statusFilter === 'All' || v.status === statusFilter;
        const matchesCategory = categoryFilter === 'All' || v.area_category === categoryFilter;

        return matchesSearch && matchesStatus && matchesCategory;
    }).sort((a, b) => {
        if (sortBy === 'date_desc') return new Date(b.visit_datetime) - new Date(a.visit_datetime);
        if (sortBy === 'date_asc') return new Date(a.visit_datetime) - new Date(b.visit_datetime);
        if (sortBy === 'no_desc') return b.visit_no.localeCompare(a.visit_no);
        if (sortBy === 'no_asc') return a.visit_no.localeCompare(b.visit_no);
        return 0;
    });

    const CATEGORIES = [
        'Network Sites', 'Data Centre', 'Transmissions', 'Network Other',
        'Office', 'Warehouses', 'Retail & Trade', 'Events', 'Fleet', 'Other'
    ];

    return (
        <div className="container" style={{ maxWidth: '1200px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.25rem' }}>My Safety Tours</h1>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>Manage and track your operational safety visits</p>
                </div>
                <Link to="/visits/new" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>+</span> New Visit
                </Link>
            </div>

            {/* Dashboard Controls */}
            <div className="card" style={{ marginBottom: '2rem', padding: '1rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center' }}>
                    {/* Search Field */}
                    <div style={{ flex: 2, minWidth: '250px', position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Search by tour no, area, or manager..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ paddingLeft: '2.5rem' }}
                        />
                        <div style={{ position: 'absolute', left: '12px', top: '12px', color: '#999' }}>🔍</div>
                    </div>

                    {/* Filters */}
                    <div style={{ flex: 1, minWidth: '150px' }}>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="All">All Statuses</option>
                            <option value="draft">Draft</option>
                            <option value="submitted">Submitted</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>

                    <div style={{ flex: 1, minWidth: '150px' }}>
                        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                            <option value="All">All Categories</option>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div style={{ flex: 1, minWidth: '150px' }}>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                            <option value="date_desc">Latest First</option>
                            <option value="date_asc">Oldest First</option>
                            <option value="no_desc">Number Desc</option>
                            <option value="no_asc">Number Asc</option>
                        </select>
                    </div>

                    {/* View Toggle */}
                    <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: '8px', padding: '4px' }}>
                        <button
                            onClick={() => setViewMode('grid')}
                            style={{
                                padding: '6px 12px',
                                background: viewMode === 'grid' ? 'white' : 'transparent',
                                color: viewMode === 'grid' ? 'var(--primary-color)' : '#666',
                                borderRadius: '6px',
                                boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                fontWeight: viewMode === 'grid' ? 'bold' : 'normal',
                                border: 'none'
                            }}
                        >Grid</button>
                        <button
                            onClick={() => setViewMode('list')}
                            style={{
                                padding: '6px 12px',
                                background: viewMode === 'list' ? 'white' : 'transparent',
                                color: viewMode === 'list' ? 'var(--primary-color)' : '#666',
                                borderRadius: '6px',
                                boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                fontWeight: viewMode === 'list' ? 'bold' : 'normal',
                                border: 'none'
                            }}
                        >List</button>
                    </div>
                </div>
            </div>

            {error && <div className="card" style={{ color: 'red', marginBottom: '1rem', borderLeft: '4px solid red' }}>{error}</div>}

            {filteredVisits.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
                    <p style={{ color: '#666', fontSize: '1.1rem' }}>
                        {search || statusFilter !== 'All' || categoryFilter !== 'All'
                            ? "No matching tours found."
                            : "You haven't recorded any safety tours yet."}
                    </p>
                    <Link to="/visits/new" className="btn-primary" style={{ marginTop: '1.5rem' }}>
                        {search || statusFilter !== 'All' || categoryFilter !== 'All' ? "Clear Filters" : "Start Your First Tour"}
                    </Link>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid-3">
                    {filteredVisits.map(visit => (
                        <Link to={`/visits/${visit.id}`} key={visit.id} className="card tour-card" style={{ textDecoration: 'none', color: 'inherit', display: 'block', padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                                <span className={`badge ${visit.status}`}>{visit.status}</span>
                                <span style={{ fontSize: '0.8rem', color: '#888' }}>{new Date(visit.visit_datetime).toLocaleDateString()}</span>
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <h3 style={{ fontSize: '1.2rem', margin: '0 0 5px 0', border: 'none', padding: 0, color: 'var(--secondary-color)' }}>{visit.visit_no}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <span style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', color: '#475569' }}>{visit.area_category}</span>
                                </div>
                            </div>
                            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#444', fontWeight: '500' }}>{visit.visited_area}</p>
                                <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', color: '#888' }}>Manager: {visit.manager_name}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="table-container" style={{ border: 'none' }}>
                        <table style={{ margin: 0 }}>
                            <thead>
                                <tr>
                                    <th style={{ width: '100px' }}>Status</th>
                                    <th>Tour Number</th>
                                    <th>Visited Area / Category</th>
                                    <th>Manager</th>
                                    <th>Date</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredVisits.map(visit => (
                                    <tr key={visit.id}>
                                        <td><span className={`badge ${visit.status}`}>{visit.status}</span></td>
                                        <td style={{ fontWeight: '600', color: 'var(--primary-color)' }}>{visit.visit_no}</td>
                                        <td>
                                            <div style={{ fontWeight: '500' }}>{visit.visited_area}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#888' }}>{visit.area_category}</div>
                                        </td>
                                        <td>{visit.manager_name}</td>
                                        <td>{new Date(visit.visit_datetime).toLocaleDateString()}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button
                                                onClick={() => navigate(`/visits/${visit.id}`)}
                                                className="btn-outline"
                                                style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                                            >View Details</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Visits;
