import { useState, useEffect } from 'react';
import api from '../api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';

export default function ActionsDashboard() {
    const [tab, setTab] = useState('my_actions');
    const [actions, setActions] = useState([]);
    const [stats, setStats] = useState({ current_status: [], history: [] }); // Updated structure
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    // For editing
    const [editAction, setEditAction] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        api.get('auth/me/').then(res => setCurrentUser(res.data)).catch(console.error);
        api.get('auth/users/').then(res => setUsers(res.data)).catch(console.error);
    }, []);

    useEffect(() => {
        loadData();
    }, [tab, currentUser]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (tab === 'my_actions' && currentUser) {
                const res = await api.get(`actions/?responsible=${currentUser.id}&status=open_all`);
                setActions(res.data);
            } else if (tab === 'all_open') {
                const res = await api.get(`actions/?status=open_all`);
                setActions(res.data);
            } else if (tab === 'all_closed') {
                const res = await api.get(`actions/?status=closed`);
                setActions(res.data);
            } else if (tab === 'stats') {
                const res = await api.get('actions/stats/');
                setStats(res.data);
            }
        } catch (err) {
            console.error("Failed to load actions data", err);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (action) => {
        setEditAction({ ...action, responsible_id: action.responsible });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await api.patch(`actions/${editAction.id}/`, {
                status: editAction.status,
                responsible: editAction.responsible_id,
                description: editAction.description
            });
            alert("Action updated!");
            setEditAction(null);
            loadData();
        } catch (err) {
            console.error("Failed to update action", err);
            alert("Failed to update action.");
        }
    };

    if (!currentUser && tab === 'my_actions') return <div className="container">Loading...</div>;

    return (
        <div className="container">
            <h1 style={{ marginBottom: '20px', color: '#333' }}>Actions Management</h1>

            <div className="tabs" style={{ marginBottom: '20px', borderBottom: '1px solid #ddd' }}>
                {/* Tabs Buttons */}
                <button onClick={() => setTab('my_actions')} style={tabStyle(tab === 'my_actions')}>My Open Actions</button>
                <button onClick={() => setTab('all_open')} style={tabStyle(tab === 'all_open')}>All Open Actions</button>
                <button onClick={() => setTab('all_closed')} style={tabStyle(tab === 'all_closed')}>Closed Actions</button>
                <button onClick={() => setTab('stats')} style={tabStyle(tab === 'stats')}>Statistics</button>
            </div>

            {loading && <div>Loading data...</div>}

            {(tab === 'my_actions' || tab === 'all_open' || tab === 'all_closed') && (
                <div className="card">
                    {/* Action List Table */}
                    {actions.length === 0 && !loading ? (
                        <p>No actions found.</p>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Description</th>
                                        <th>Type</th>
                                        <th>Status</th>
                                        <th>Responsible</th>
                                        {tab === 'all_closed' ? <th>Completed At</th> : <th>Due Date</th>}
                                        {tab === 'all_closed' ? <th>Completion Notes</th> : <th>Action</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {actions.map(a => {
                                        const respUser = users.find(u => u.id === a.responsible);
                                        const respName = respUser ? `${respUser.first_name} ${respUser.last_name} (${respUser.email})` : `User ${a.responsible}`;

                                        const statusColor = a.status === 'open' ? '#fef3c7' : a.status === 'in_progress' ? '#fff7ed' : '#dcfce7';
                                        const statusTextColor = a.status === 'open' ? '#b45309' : a.status === 'in_progress' ? '#c2410c' : '#166534';

                                        return (
                                            <tr key={a.id}>
                                                <td>#{a.id}</td>
                                                <td>{a.description}</td>
                                                <td>{a.action_type}</td>
                                                <td>
                                                    <span className="badge"
                                                        style={{ background: statusColor, color: statusTextColor }}>
                                                        {a.status}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: '0.85rem' }}>{respName}</td>
                                                {tab === 'all_closed' ? (
                                                    <>
                                                        <td>{a.completed_at ? new Date(a.completed_at).toLocaleDateString() : '-'}</td>
                                                        <td style={{ fontSize: '0.85rem' }}>{a.completion_notes || '-'}</td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td>{a.due_date || (a.due_immediate ? 'Immediate' : '-')}</td>
                                                        <td>
                                                            <button className="btn-outline" onClick={() => handleEditClick(a)}>Edit</button>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {tab === 'stats' && (
                <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
                    {/* KPI Summary Row */}
                    {(() => {
                        const totalOpen = (stats.current_status || []).reduce((sum, s) => sum + s.open, 0);
                        const totalInProgress = (stats.current_status || []).reduce((sum, s) => sum + s.in_progress || 0, 0);
                        const totalClosed = (stats.current_status || []).reduce((sum, s) => sum + s.closed, 0);
                        const total = totalOpen + totalInProgress + totalClosed;
                        const compliance = total > 0 ? Math.round((totalClosed / total) * 100) : 100;
                        const topAssignee = (stats.current_status || []).sort((a, b) => b.total - a.total)[0]?.name || 'N/A';

                        const pieData = [
                            { name: 'Open', value: totalOpen, color: '#ef4444' },
                            { name: 'In Progress', value: totalInProgress, color: '#f59e0b' },
                            { name: 'Closed', value: totalClosed, color: '#10b981' }
                        ];

                        return (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '2rem' }}>
                                    <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
                                        <div style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Total Actions</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '5px' }}>{total}</div>
                                    </div>
                                    <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
                                        <div style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Open</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '5px', color: '#ef4444' }}>{totalOpen}</div>
                                    </div>
                                    <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
                                        <div style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>In Progress</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '5px', color: '#f59e0b' }}>{totalInProgress}</div>
                                    </div>
                                    <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
                                        <div style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Compliance</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '5px', color: '#10b981' }}>{compliance}%</div>
                                    </div>
                                </div>

                                <div className="grid-2" style={{ marginBottom: '2rem' }}>
                                    {/* Status Distribution */}
                                    <div className="card">
                                        <h3 style={{ marginBottom: '1.5rem' }}>Action Status Distribution</h3>
                                        <div style={{ width: '100%', height: 250, display: 'flex', justifyContent: 'center' }}>
                                            <ResponsiveContainer>
                                                <PieChart>
                                                    <Pie
                                                        data={pieData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        {pieData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                    <Legend verticalAlign="bottom" height={36} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* Creation Trend */}
                                    <div className="card">
                                        <h3 style={{ marginBottom: '1.5rem' }}>Monthly Creation Trend</h3>
                                        <div style={{ width: '100%', height: 250 }}>
                                            <ResponsiveContainer>
                                                <BarChart data={stats.history || []}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                                    <Tooltip cursor={{ fill: '#f3f4f6' }} />
                                                    <Bar dataKey="total_created" name="Created" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                                                    <Bar dataKey="still_open" name="Still Open" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            </>
                        );
                    })()}

                    {/* Current Status Card */}
                    <div className="card" style={{ marginBottom: '2rem' }}>
                        <div style={{ marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>Team Performance Status</h3>
                            <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#6b7280' }}>Individual action resolution tracking</p>
                        </div>
                        <div className="table-container" style={{ border: 'none' }}>
                            <table style={{ margin: 0 }}>
                                <thead>
                                    <tr>
                                        <th style={{ background: '#f8fafc', color: '#475569', fontSize: '0.75rem', fontWeight: '800' }}>RESPONSIBLE PERSON</th>
                                        <th style={{ background: '#f8fafc', color: '#475569', fontSize: '0.75rem', fontWeight: '800' }}>EMAIL</th>
                                        <th style={{ background: '#f8fafc', color: '#475569', fontSize: '0.75rem', fontWeight: '800', textAlign: 'center' }}>OPEN</th>
                                        <th style={{ background: '#f8fafc', color: '#475569', fontSize: '0.75rem', fontWeight: '800', textAlign: 'center' }}>IN PROGRESS</th>
                                        <th style={{ background: '#f8fafc', color: '#475569', fontSize: '0.75rem', fontWeight: '800', textAlign: 'center' }}>CLOSED</th>
                                        <th style={{ background: '#f3f4f6', color: '#1e293b', fontSize: '0.75rem', fontWeight: '800', textAlign: 'center' }}>TOTAL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(!stats.current_status || stats.current_status.length === 0) ? <tr><td colSpan="5">No stats available.</td></tr> : stats.current_status.map(s => (
                                        <tr key={s.username}>
                                            <td style={{ fontWeight: '600' }}>{s.name}</td>
                                            <td style={{ color: '#64748b' }}>{s.email}</td>
                                            <td style={{ textAlign: 'center', fontWeight: '800', color: '#ef4444' }}>{s.open || '-'}</td>
                                            <td style={{ textAlign: 'center', fontWeight: '800', color: '#f59e0b' }}>{s.in_progress || '-'}</td>
                                            <td style={{ textAlign: 'center', fontWeight: '800', color: '#10b981' }}>{s.closed || '-'}</td>
                                            <td style={{ textAlign: 'center', fontWeight: '800', background: '#f8fafc' }}>{s.total}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Monthly History Card */}
                    <div className="card">
                        <div style={{ marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0 }}>Historical Trends by Manager</h3>
                            <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#6b7280' }}>Monthly volume and resolution density</p>
                        </div>
                        <div className="table-container" style={{ border: 'none' }}>
                            <table style={{ margin: 0 }}>
                                <thead>
                                    <tr>
                                        <th style={{ background: '#f8fafc', color: '#475569', fontSize: '0.75rem', fontWeight: '800' }}>MONTH</th>
                                        <th style={{ background: '#f8fafc', color: '#475569', fontSize: '0.75rem', fontWeight: '800' }}>MANAGER</th>
                                        <th style={{ background: '#f8fafc', color: '#475569', fontSize: '0.75rem', fontWeight: '800', textAlign: 'center' }}>CREATED</th>
                                        <th style={{ background: '#f8fafc', color: '#475569', fontSize: '0.75rem', fontWeight: '800', textAlign: 'center' }}>STILL OPEN</th>
                                        <th style={{ background: '#f8fafc', color: '#475569', fontSize: '0.75rem', fontWeight: '800' }}>COMPLIANCE</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(!stats.history || stats.history.length === 0) ? <tr><td colSpan="5">No history available.</td></tr> : stats.history.map((h, idx) => {
                                        const closed = h.total_created - h.still_open;
                                        const rate = h.total_created > 0 ? Math.round((closed / h.total_created) * 100) : 100;
                                        return (
                                            <tr key={idx}>
                                                <td style={{ fontWeight: '500' }}>{h.month}</td>
                                                <td>{h.manager}</td>
                                                <td style={{ textAlign: 'center', fontWeight: '600' }}>{h.total_created}</td>
                                                <td style={{ textAlign: 'center', fontWeight: '800', color: h.still_open > 0 ? '#ef4444' : '#10b981' }}>{h.still_open}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                                            <div style={{ width: `${rate}%`, height: '100%', background: rate === 100 ? '#10b981' : rate > 50 ? '#f59e0b' : '#ef4444' }}></div>
                                                        </div>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: '800', minWidth: '35px' }}>{rate}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editAction && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div className="card" style={{ width: '400px', maxWidth: '90%' }}>
                        <h3>Edit Action #{editAction.id}</h3>
                        <form onSubmit={handleUpdate}>
                            <div style={{ marginBottom: '10px' }}>
                                <label>Description</label>
                                <textarea
                                    value={editAction.description}
                                    onChange={e => setEditAction({ ...editAction, description: e.target.value })}
                                    style={{ width: '100%', height: '80px' }}
                                />
                            </div>
                            <div style={{ marginBottom: '10px' }}>
                                <label>Status</label>
                                <select
                                    value={editAction.status}
                                    onChange={e => setEditAction({ ...editAction, status: e.target.value })}
                                    style={{ width: '100%', padding: '8px' }}
                                >
                                    <option value="open">Open</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="closed">Closed</option>
                                </select>
                            </div>
                            <div style={{ marginBottom: '10px' }}>
                                <label>Responsible Person</label>
                                <select
                                    value={editAction.responsible_id}
                                    onChange={e => setEditAction({ ...editAction, responsible_id: e.target.value })}
                                    style={{ width: '100%', padding: '8px' }}
                                >
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.first_name} {u.last_name} ({u.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                                <button type="button" className="btn-outline" onClick={() => setEditAction(null)}>Cancel</button>
                                <button type="submit" className="btn-primary">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

const tabStyle = (active) => ({
    padding: '10px 20px',
    border: 'none',
    background: 'none',
    borderBottom: active ? '3px solid #d32f2f' : 'none',
    fontWeight: active ? 'bold' : 'normal',
    color: '#333', // Ensure text is visible
    cursor: 'pointer'
});
