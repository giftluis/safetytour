import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function NewVisit() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        visit_no: '',
        manager_name: '',
        visited_area: '',
        area_category: 'Other',
        theme: '',
        visit_datetime: new Date().toISOString().slice(0, 16),
        prep_previous_read: false,
        prep_scope_defined: false,
        prep_risks_considered: false,
        prep_checked_equip: false,
        prep_other: false,
        prep_other_comments: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Auto-generate visit number roughly
    // Auto-generate visit number roughly & fetch current user
    useEffect(() => {
        const random = Math.floor(1000 + Math.random() * 9000);

        api.get('auth/me/')
            .then(res => {
                const user = res.data;
                const managerName = user.first_name || user.last_name
                    ? `${user.first_name} ${user.last_name}`.trim()
                    : user.username;

                setFormData(prev => ({
                    ...prev,
                    visit_no: `VT-${new Date().getFullYear()}-${random}`,
                    manager_name: managerName
                }));
            })
            .catch(() => {
                // If auth fails or endpoint missing, just set visit_no
                setFormData(prev => ({ ...prev, visit_no: `VT-${new Date().getFullYear()}-${random}` }));
            });
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { data } = await api.post('visits/', formData);
            if (data && data.id) {
                navigate(`/visits/${data.id}`);
            } else {
                setError('Visit created but ID not returned. Please check the visits list.');
            }
        } catch (err) {
            console.error(err);
            setError('Failed to create visit. Ensure Visit No is unique.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <div className="card">
                <div className="card-header">
                    <h2>New Safety Tour Visit</h2>
                </div>

                {error && <div style={{ color: 'red', marginBottom: '1rem', padding: '10px', background: '#fee2e2', borderRadius: '8px' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <h3>Visit Details</h3>
                    <div className="grid-2">
                        <div>
                            <label>Visit N°</label>
                            <input
                                type="text"
                                name="visit_no"
                                value={formData.visit_no}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div>
                            <label>Date/Time</label>
                            <input
                                type="datetime-local"
                                name="visit_datetime"
                                value={formData.visit_datetime}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div>
                            <label>Manager Name</label>
                            <input
                                type="text"
                                name="manager_name"
                                value={formData.manager_name}
                                onChange={handleChange}
                                required
                                placeholder="e.g. Gift Luis"
                            />
                        </div>
                        <div>
                            <label>Visited Area</label>
                            <input
                                type="text"
                                name="visited_area"
                                value={formData.visited_area}
                                onChange={handleChange}
                                required
                                placeholder="e.g. Matola Warehouse"
                            />
                        </div>
                        <div>
                            <label>Area Category</label>
                            <select
                                name="area_category"
                                value={formData.area_category}
                                onChange={handleChange}
                                required
                            >
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

                    <div style={{ marginTop: '1rem' }}>
                        <label>Theme of Visit</label>
                        <input
                            type="text"
                            name="theme"
                            value={formData.theme}
                            onChange={handleChange}
                            placeholder="Optional theme..."
                        />
                    </div>

                    <h3>Preparation Checklist</h3>
                    <p className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                        Mark yes if the following have been completed:
                    </p>

                    <div className="grid-2">
                        <label className="checkbox-group">
                            <input
                                type="checkbox"
                                name="prep_previous_read"
                                checked={formData.prep_previous_read}
                                onChange={handleChange}
                            />
                            <span>Understand the work activity and its potential hazards.</span>
                        </label>

                        <label className="checkbox-group">
                            <input
                                type="checkbox"
                                name="prep_scope_defined"
                                checked={formData.prep_scope_defined}
                                onChange={handleChange}
                            />
                            <span>Know the ground rules for safe behavior.</span>
                        </label>

                        <label className="checkbox-group">
                            <input
                                type="checkbox"
                                name="prep_risks_considered"
                                checked={formData.prep_risks_considered}
                                onChange={handleChange}
                            />
                            <span>Know the procedures which would ensure safe working.</span>
                        </label>

                        <label className="checkbox-group">
                            <input
                                type="checkbox"
                                name="prep_checked_equip"
                                checked={formData.prep_checked_equip}
                                onChange={handleChange}
                            />
                            <span>Apply injury and incident experience.</span>
                        </label>

                        <div className="checkbox-group" style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                    type="checkbox"
                                    name="prep_other"
                                    checked={formData.prep_other}
                                    onChange={handleChange}
                                />
                                <span>Other</span>
                            </label>
                            {formData.prep_other && (
                                <input
                                    type="text"
                                    name="prep_other_comments"
                                    value={formData.prep_other_comments || ''}
                                    onChange={handleChange}
                                    placeholder="Please specify..."
                                    style={{
                                        marginLeft: '10px',
                                        flex: 1,
                                        padding: '5px',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px'
                                    }}
                                />
                            )}
                        </div>
                    </div>

                    <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Creating...' : 'Start Tour'}
                        </button>
                        <button type="button" className="btn-outline" onClick={() => navigate('/visits')}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
}

export default NewVisit;
