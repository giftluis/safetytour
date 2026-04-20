import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';

function VisitDetail() {
    const { id } = useParams();
    const [visit, setVisit] = useState(null);
    const [observations, setObservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]); // List of users for assignment

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({
        visited_area: '',
        area_category: 'Other',
        theme: '',
        prep_other: false,
        prep_other_comments: '',
    });

    // Add Observation State
    const [showObsForm, setShowObsForm] = useState(false);
    const [newObs, setNewObs] = useState({ text: '', category: 'SP' });

    // Add Action State
    const [activeObsForAction, setActiveObsForAction] = useState(null); // ID of active obs
    const [newAction, setNewAction] = useState({ description: '', action_type: 'F', responsible: '', due_date: '', due_immediate: false });

    // Participant State
    const [showParticipantForm, setShowParticipantForm] = useState(false);
    const [newParticipant, setNewParticipant] = useState({ name: '', role: '' });

    // Helper to format date
    const formatDate = (isoString) => {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleString();
    };

    const loadData = async () => {
        try {
            const [vRes, uRes] = await Promise.all([
                api.get(`visits/${id}/`),
                api.get('auth/users/')
            ]);
            console.log('Visit Data Loaded:', vRes.data);
            setVisit(vRes.data);
            setEditData(vRes.data);
            setUsers(uRes.data);

            if (vRes.data.observations) {
                setObservations(vRes.data.observations);
            }
        } catch (err) {
            console.error("Failed to load visit or users", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    const handleEditChange = (e) => {
        const { name, value, type, checked } = e.target;
        setEditData(prev => {
            const newData = {
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            };
            // UX: If typing in comments, automatically check the 'Other' box
            if (name === 'prep_other_comments' && value.trim() !== '') {
                newData.prep_other = true;
            }
            return newData;
        });
    };

    const saveVisitDetails = async () => {
        try {
            await api.patch(`visits/${id}/`, editData);
            setIsEditing(false);
            loadData();
        } catch (err) {
            alert("Failed to save changes.");
        }
    };

    const handleAddObservation = async (e) => {
        e.preventDefault();
        try {
            // 1. Create Observation first
            const payload = {
                visit: id,
                number: observations.length + 1,
                text: newObs.text,
                category: newObs.category
            };
            const res = await api.post('observations/', payload);
            const newObsId = res.data.id;

            // 2. Upload Image if selected
            if (newObs.image) {
                const formData = new FormData();
                formData.append('link_type', 'observation');
                formData.append('observation', newObsId);
                formData.append('image', newObs.image);
                // formData.append('caption', 'Observation Photo'); 
                await api.post('attachments/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            setShowObsForm(false);
            setNewObs({ text: '', category: 'SP', image: null });
            loadData();
        } catch (err) {
            console.error(err);
            alert("Failed to add observation or upload photo.");
        }
    };

    const handleAddAction = async (e) => {
        // ... existing handleAddAction code (omitted for brevity, keep unchanged if possible or I'll just paste references)
        // actually I need to be careful not to delete handleAddAction.
        // It's defined separately. I am replacing the block containing handleAddObservation.
        // wait, previous tool call showed handleAddObservation end ~line 83.
        // ... [Original handleAddAction is safe if I target correctly]
        // But wait, I need to render the form too. 

        // Let me update the render part in a separate chunks or just one big chunk?
        // I will replace the handleAddObservation function first.

        // ...
        // Wait I'll assume I can replace just the function.
        // The previous view_file showed handleAddObservation at line 67.

        e.preventDefault();
        if (!activeObsForAction) return;
        try {
            const payload = {
                observation: activeObsForAction,
                description: newAction.description,
                action_type: newAction.action_type,
                due_immediate: newAction.due_immediate,
                due_date: newAction.due_date || null,
                responsible: newAction.responsible || visit.created_by
            };

            await api.post('actions/', payload);
            setActiveObsForAction(null);
            setNewAction({ description: '', action_type: 'F', responsible: '', due_date: '', due_immediate: false });
            loadData();
        } catch (err) {
            console.error(err);
            alert("Failed to add action.");
        }
    }

    const handleAddParticipant = async (e) => {
        e.preventDefault();
        try {
            await api.post('participants/', {
                visit: id,
                name: newParticipant.name,
                role: newParticipant.role
            });
            setNewParticipant({ name: '', role: '' });
            setShowParticipantForm(false);
            loadData();
        } catch (err) {
            console.error(err);
            alert("Failed to add participant.");
        }
    };
    // ...
    // Actually, I'll do a multi-chunk replacement to be safe.
    // Chunk 1: Update handleAddObservation
    // Chunk 2: Update the Form to include file input
    // Chunk 3: Update the Table Component to show images


    const handleDownloadPdf = async () => {
        try {
            const response = await api.get(`visits/${id}/pdf/`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `visit_${visit?.visit_no || id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert('Failed to download PDF report.');
        }
    };

    const handlePrintPdf = async () => {
        try {
            const response = await api.get(`visits/${id}/pdf/`, {
                responseType: 'blob'
            });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = url;
            document.body.appendChild(iframe);
            iframe.onload = () => {
                iframe.contentWindow.print();
                setTimeout(() => {
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(iframe);
                }, 1000);
            };
        } catch (error) {
            console.error('Error printing PDF:', error);
            alert('Failed to print PDF.');
        }
    };

    const handlePreviewPdf = async () => {
        try {
            const response = await api.get(`visits/${id}/pdf/?preview=true`, {
                responseType: 'blob'
            });
            const file = new Blob([response.data], { type: 'application/pdf' });
            const fileURL = URL.createObjectURL(file);
            window.open(fileURL, '_blank');
        } catch (err) {
            console.error("Failed to preview PDF", err);
            alert("Failed to load PDF preview.");
        }
    };


    if (loading) return <div className="container">Loading...</div>;
    if (!visit) return <div className="container">Visit not found.</div>;

    // Collect all actions
    const allActions = observations.flatMap(obs =>
        (obs.actions || []).map(action => ({ ...action, obs_number: obs.number }))
    );

    return (
        <div className="container">
            <div className="card">

                {/* Header Section */}
                <div style={{ borderBottom: '2px solid #e60000', paddingBottom: '1rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', color: '#333' }}>Health and Safety Tour Report Form</h1>
                        <span className="badge submitted" style={{ marginTop: '0.5rem' }}>Visit N° {visit.visit_no}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        {isEditing ? (
                            <>
                                <button onClick={saveVisitDetails} className="btn-primary">Save Info</button>
                                <button onClick={() => setIsEditing(false)} className="btn-outline">Cancel</button>
                            </>
                        ) : (
                            <>
                                <button onClick={handlePreviewPdf} className="btn-outline" style={{ color: '#0284c7', borderColor: '#0284c7' }}>Preview PDF</button>
                                <button onClick={handlePrintPdf} className="btn-outline" style={{ color: '#16a34a', borderColor: '#16a34a' }}>Print Report</button>
                                <button onClick={handleDownloadPdf} className="btn-outline" style={{ color: '#ef4444', borderColor: '#ef4444' }}>Download PDF</button>
                                <button onClick={() => setIsEditing(true)} className="btn-primary">Edit Details</button>
                            </>
                        )}
                    </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid-4" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
                    <div>
                        <strong className="text-secondary small" style={{ display: 'block' }}>Manager Name</strong>
                        {isEditing ? (
                            <input name="manager_name" value={editData.manager_name} onChange={handleEditChange} />
                        ) : (
                            <span>{visit.manager_name}</span>
                        )}
                    </div>
                    <div>
                        <strong className="text-secondary small" style={{ display: 'block' }}>Date/Time</strong>
                        <span>{formatDate(visit.visit_datetime)}</span>
                    </div>
                    <div>
                        <strong className="text-secondary small" style={{ display: 'block' }}>Visited Area</strong>
                        {isEditing ? (
                            <input name="visited_area" value={editData.visited_area} onChange={handleEditChange} />
                        ) : (
                            <span>{visit.visited_area}</span>
                        )}
                    </div>
                    <div>
                        <strong className="text-secondary small" style={{ display: 'block' }}>Area Category</strong>
                        {isEditing ? (
                            <select name="area_category" value={editData.area_category} onChange={handleEditChange}>
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
                        ) : (
                            <span className="badge draft">{visit.area_category}</span>
                        )}
                    </div>
                </div>

                {/* Participants Section */}
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h3>Participants</h3>
                        <button className="btn-outline" onClick={() => setShowParticipantForm(!showParticipantForm)} style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>+ Add</button>
                    </div>

                    {showParticipantForm && (
                        <form onSubmit={handleAddParticipant} style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', gap: '10px', alignItems: 'end' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.8rem' }}>Name</label>
                                <input value={newParticipant.name} onChange={e => setNewParticipant({ ...newParticipant, name: e.target.value })} required placeholder="John Doe" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '0.8rem' }}>Role</label>
                                <input value={newParticipant.role} onChange={e => setNewParticipant({ ...newParticipant, role: e.target.value })} placeholder="Safety Officer" />
                            </div>
                            <button type="submit" className="btn-primary">Save</button>
                            <button type="button" className="btn-outline" onClick={() => setShowParticipantForm(false)}>Cancel</button>
                        </form>
                    )}

                    {Array.isArray(visit.participants) && visit.participants.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {visit.participants.map(p => (
                                <div key={p.id || Math.random()} className="badge" style={{ background: '#e0f2fe', color: '#0284c7', border: '1px solid #bae6fd' }}>
                                    <strong>{p.name || 'Unknown'}</strong> {p.role && <span style={{ opacity: 0.8 }}>({p.role})</span>}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="small text-secondary">No participants added.</p>
                    )}
                </div>

                {/* Preparation Section */}
                <h3>Preparation</h3>
                <div className="grid-2" style={{ marginBottom: '2rem' }}>
                    <label className="checkbox-group" style={{ cursor: isEditing ? 'pointer' : 'default' }}>
                        <input type="checkbox" name="prep_previous_read" checked={isEditing ? editData.prep_previous_read : visit.prep_previous_read} onChange={handleEditChange} disabled={!isEditing} />
                        <span>Understand the work activity and its potential hazards.</span>
                    </label>
                    <label className="checkbox-group" style={{ cursor: isEditing ? 'pointer' : 'default' }}>
                        <input type="checkbox" name="prep_scope_defined" checked={isEditing ? editData.prep_scope_defined : visit.prep_scope_defined} onChange={handleEditChange} disabled={!isEditing} />
                        <span>Know the ground rules for safe behavior.</span>
                    </label>
                    <label className="checkbox-group" style={{ cursor: isEditing ? 'pointer' : 'default' }}>
                        <input type="checkbox" name="prep_risks_considered" checked={isEditing ? editData.prep_risks_considered : visit.prep_risks_considered} onChange={handleEditChange} disabled={!isEditing} />
                        <span>Know the procedures which would ensure safe working.</span>
                    </label>
                    <label className="checkbox-group" style={{ cursor: isEditing ? 'pointer' : 'default' }}>
                        <input type="checkbox" name="prep_checked_equip" checked={isEditing ? editData.prep_checked_equip : visit.prep_checked_equip} onChange={handleEditChange} disabled={!isEditing} />
                        <span>Apply injury and incident experience.</span>
                    </label>

                    {(visit.prep_other || visit.prep_other_comments || isEditing) && (
                        <div className="checkbox-group" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <label style={{ cursor: isEditing ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input type="checkbox" name="prep_other" checked={isEditing ? editData.prep_other : visit.prep_other} onChange={handleEditChange} disabled={!isEditing} />
                                <span>Other</span>
                            </label>
                            {isEditing ? (
                                <input
                                    name="prep_other_comments"
                                    value={editData.prep_other_comments || ''}
                                    onChange={handleEditChange}
                                    placeholder="Specify other..."
                                    style={{ flex: 1, padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
                                />
                            ) : (
                                <span>{visit.prep_other_comments ? `: ${visit.prep_other_comments}` : ''}</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Observations Table */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', marginBottom: '1rem' }}>
                    <h3>Observations</h3>
                    <button className="btn-primary" onClick={() => setShowObsForm(true)} style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>+ Add Observation</button>
                </div>

                {/* Add Observation Form */}
                {showObsForm && (
                    <div className="card" style={{ background: '#f9fafb', marginBottom: '1rem', border: '1px solid #3b82f6' }}>
                        <h4>New Observation</h4>
                        <form onSubmit={handleAddObservation}>
                            <div className="grid-2">
                                <div>
                                    <label>Category</label>
                                    <select value={newObs.category} onChange={(e) => setNewObs({ ...newObs, category: e.target.value })}>
                                        <option value="SP">Safe Practice (SP)</option>
                                        <option value="RB">At-risk Behavior (RB)</option>
                                        <option value="RC">At-risk Condition (RC)</option>
                                    </select>
                                </div>
                                <div>
                                    <label>Photo (Optional)</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setNewObs({ ...newObs, image: e.target.files[0] })}
                                    />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label>Observation Details</label>
                                    <textarea
                                        value={newObs.text}
                                        onChange={(e) => setNewObs({ ...newObs, text: e.target.value })}
                                        required
                                        placeholder="Describe what you observed..."
                                        rows="2"
                                    />
                                </div>
                            </div>
                            <div style={{ marginTop: '1rem', display: 'flex', gap: '10px' }}>
                                <button type="submit" className="btn-primary">Save Observation</button>
                                <button type="button" onClick={() => setShowObsForm(false)} className="btn-outline">Cancel</button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Add Action Form (Contextual) */}
                {activeObsForAction && (
                    <div className="card" style={{ background: '#fff7ed', marginBottom: '1rem', border: '1px solid #f97316' }}>
                        <h4>Add Action for Observation #{observations.find(o => o.id === activeObsForAction)?.number}</h4>
                        <form onSubmit={handleAddAction}>
                            <div className="grid-2">
                                <div>
                                    <label>Description</label>
                                    <input value={newAction.description} onChange={(e) => setNewAction({ ...newAction, description: e.target.value })} required />
                                </div>
                                <div>
                                    <label>Type</label>
                                    <select value={newAction.action_type} onChange={(e) => setNewAction({ ...newAction, action_type: e.target.value })}>
                                        <option value="F">Fix (F)</option>
                                        <option value="CA">Corrective Action (CA)</option>
                                        <option value="PA">Preventive Action (PA)</option>
                                    </select>
                                </div>
                                <div>
                                    <label>Deadline</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <input type="date" value={newAction.due_date} onChange={(e) => setNewAction({ ...newAction, due_date: e.target.value })} disabled={newAction.due_immediate} />
                                        <label style={{ marginBottom: 0, display: 'flex', alignItems: 'center' }}>
                                            <input type="checkbox" checked={newAction.due_immediate} onChange={(e) => setNewAction({ ...newAction, due_immediate: e.target.checked })} /> Immediate
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label>Responsible Person</label>
                                    <select value={newAction.responsible} onChange={(e) => setNewAction({ ...newAction, responsible: e.target.value })} style={{ width: '100%', padding: '8px' }}>
                                        <option value="">Select Responsible...</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>
                                                {u.first_name} {u.last_name} ({u.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div style={{ marginTop: '1rem', display: 'flex', gap: '10px' }}>
                                <button type="submit" className="btn-primary" style={{ background: '#ea580c' }}>Save Action</button>
                                <button type="button" onClick={() => setActiveObsForAction(null)} className="btn-outline">Cancel</button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: '60px' }}>N°</th>
                                <th>Observations</th>
                                <th style={{ width: '150px' }}>Photos</th>
                                <th style={{ width: '150px' }}>Type (*)</th>
                                <th style={{ width: '100px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {observations.length === 0 ? (
                                <tr><td colSpan="4" style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>No observations recorded yet. Click "+ Add Observation" to start.</td></tr>
                            ) : (
                                observations.map(obs => (
                                    <tr key={obs.id}>
                                        <td>{obs.number}</td>
                                        <td>{obs.text}</td>
                                        <td>
                                            {obs.attachments && obs.attachments.length > 0 ? (
                                                obs.attachments.map(att => (
                                                    <a key={att.id} href={att.image_url} target="_blank" rel="noopener noreferrer">
                                                        <img src={att.image_url} alt="obs" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ccc' }} />
                                                    </a>
                                                ))
                                            ) : (
                                                <span className="text-secondary small">-</span>
                                            )}
                                        </td>
                                        <td><span className="badge draft">{obs.category}</span></td>
                                        <td>
                                            <button onClick={() => setActiveObsForAction(obs.id)} className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', minWidth: '90px' }}>
                                                + Add Action
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <p className="small text-secondary" style={{ marginTop: '0.5rem' }}>
                    (*) Observation Category: <strong>SP</strong>: Safe Practice, <strong>RB</strong>: At-risk Behavior, <strong>RC</strong>: At-risk Condition
                </p>


                {/* Actions Table (Read Only) */}
                <h3 style={{ marginTop: '2rem' }}>Actions Points</h3>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: '80px' }}>N° Observ</th>
                                <th>Actions Points</th>
                                <th style={{ width: '100px' }}>F/CA / PA(**)</th>
                                <th style={{ width: '150px' }}>Responsibility</th>
                                <th style={{ width: '150px' }}>Immediate or Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allActions.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: 'center', color: '#999' }}>No actions recorded yet. Add actions via the Observations table above.</td></tr>
                            ) : (
                                allActions.map(action => (
                                    <tr key={action.id}>
                                        <td>{action.obs_number}</td>
                                        <td>{action.description}</td>
                                        <td>{action.action_type}</td>
                                        <td>{action.responsible_detail?.username || action.responsible}</td>
                                        <td>{action.due_immediate ? 'Immediate' : action.due_date}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <p className="small text-secondary" style={{ marginTop: '0.5rem' }}>
                    (**) Action Type: <strong>F</strong>: Fix, <strong>CA</strong>: Corrective Action, <strong>PA</strong>: Preventive Action
                </p>

                <div style={{ marginTop: '3rem' }}>
                    <Link to="/visits" className="btn-outline" style={{ padding: '10px 20px', borderRadius: '8px' }}>Back to Visits</Link>
                </div>

            </div >
        </div >
    );
}

export default VisitDetail;
