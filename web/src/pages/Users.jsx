import { useState, useEffect } from 'react';
import api from '../api';

export default function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);

    // Form State (New or Edit)
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        first_name: '',
        last_name: '',
        email: '',
        role: 'manager',
        business_unit: '',
        job_level: '',
        region: '',
        is_active: true
    });

    const loadUsers = async () => {
        try {
            // First verify if I am admin by fetching /me or just rely on the fact that /users/ will fail if not admin.
            // But for better UX, let's check /me.
            const meRes = await api.get('auth/me/');
            if (meRes.data.role !== 'safety_admin') {
                navigate('/');
                return;
            }

            const res = await api.get('auth/users/');
            setUsers(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Failed to load users", err);
            navigate('/');
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleEdit = (user) => {
        setIsEditing(true);
        setEditId(user.id);
        setShowForm(true);
        setFormData({
            username: user.username,
            password: '', // Empty means don't change
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            role: user.role || 'manager',
            business_unit: user.business_unit || '',
            job_level: user.job_level || '',
            region: user.region || '',
            is_active: user.is_active
        });
    };

    const handleDelete = async (userId) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        try {
            await api.delete(`auth/users/${userId}/`);
            loadUsers();
        } catch (err) {
            console.error("Failed to delete user", err);
            alert("Failed to delete user.");
        }
    };

    const handleToggleActive = async (user) => {
        try {
            await api.patch(`auth/users/${user.id}/`, { is_active: !user.is_active });
            loadUsers();
        } catch (err) {
            console.error("Failed to update status", err);
            alert("Failed to update user status.");
        }
    };

    const resetForm = () => {
        setShowForm(false);
        setIsEditing(false);
        setEditId(null);
        setFormData({
            email: '', role: 'manager', is_active: true,
            business_unit: '', job_level: '', region: ''
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                // Update
                const payload = { ...formData };
                if (!payload.password) delete payload.password; // Don't send empty password
                await api.patch(`auth/users/${editId}/`, payload);
                alert("User updated successfully!");
            } else {
                // Create
                await api.post('auth/users/', formData);
                alert("User created successfully!");
            }
            resetForm();
            loadUsers();
        } catch (err) {
            console.error("Failed to save user", err);
            alert("Failed to save user. Please check inputs.");
        }
    };

    if (loading) return <div className="container">Loading users...</div>;

    return (
        <div className="container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ color: '#333' }}>User Management</h1>
                <button className="btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }}>
                    {showForm ? 'Cancel' : '+ Add User'}
                </button>
            </div>

            {showForm && (
                <div className="card" style={{ marginBottom: '2rem', border: '1px solid #3b82f6' }}>
                    <h3>{isEditing ? 'Edit User' : 'Add New User'}</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="grid-2">
                            <div>
                                <label>Username *</label>
                                <input name="username" value={formData.username} onChange={handleChange} required />
                            </div>
                            <div>
                                <label>Password {isEditing && '(Leave blank to keep current)'} {isEditing ? '' : '*'}</label>
                                <input type="password" name="password" value={formData.password} onChange={handleChange} required={!isEditing} />
                            </div>
                            <div>
                                <label>First Name</label>
                                <input name="first_name" value={formData.first_name} onChange={handleChange} />
                            </div>
                            <div>
                                <label>Last Name</label>
                                <input name="last_name" value={formData.last_name} onChange={handleChange} />
                            </div>
                            <div>
                                <label>Email</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} />
                            </div>
                            <div>
                                <label>Role</label>
                                <select name="role" value={formData.role} onChange={handleChange}>
                                    <option value="manager">Manager</option>
                                    <option value="safety_admin">Safety Admin</option>
                                </select>
                            </div>
                            <div>
                                <label>Business Unit</label>
                                <select name="business_unit" value={formData.business_unit} onChange={handleChange}>
                                    <option value="">-- Select BU --</option>
                                    <option value="Technology">Technology</option>
                                    <option value="Finance">Finance</option>
                                    <option value="Legal">Legal</option>
                                    <option value="EBU">EBU</option>
                                    <option value="CBU">CBU</option>
                                    <option value="COPS">COPS</option>
                                    <option value="MPESA">MPESA</option>
                                    <option value="HR">HR</option>
                                    <option value="Corporate Affairs">Corporate Affairs</option>
                                    <option value="MD">MD</option>
                                </select>
                            </div>
                            <div>
                                <label>Level</label>
                                <select name="job_level" value={formData.job_level} onChange={handleChange}>
                                    <option value="">-- Select Level --</option>
                                    <option value="Director">Director</option>
                                    <option value="Senior Manager">Senior Manager</option>
                                    <option value="Manager">Manager</option>
                                </select>
                            </div>
                            <div>
                                <label>Region</label>
                                <select name="region" value={formData.region} onChange={handleChange}>
                                    <option value="">-- Select Region --</option>
                                    <option value="South">South</option>
                                    <option value="Centre">Centre</option>
                                    <option value="North">North</option>
                                </select>
                            </div>
                            <div>
                                <label className="checkbox-group" style={{ marginTop: '2rem' }}>
                                    <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} />
                                    <span>Active User</span>
                                </label>
                            </div>
                        </div>
                        <div style={{ marginTop: '1rem', display: 'flex', gap: '10px' }}>
                            <button type="submit" className="btn-primary">{isEditing ? 'Update User' : 'Create User'}</button>
                            <button type="button" className="btn-outline" onClick={resetForm}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card">
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Username</th>
                                <th>Full Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>BU</th>
                                <th>Level</th>
                                <th>Region</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'center', width: '150px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td>{u.username}</td>
                                    <td>{u.first_name} {u.last_name}</td>
                                    <td>{u.email || '-'}</td>
                                    <td>
                                        <span className="badge" style={{ background: u.role === 'safety_admin' ? '#e0e7ff' : '#f3f4f6', color: u.role === 'safety_admin' ? '#3730a3' : '#374151' }}>
                                            {u.role === 'safety_admin' ? 'Safety Admin' : 'Manager'}
                                        </span>
                                    </td>
                                    <td>{u.business_unit || '-'}</td>
                                    <td>{u.job_level || '-'}</td>
                                    <td>{u.region || '-'}</td>
                                    <td>
                                        <span
                                            className="badge"
                                            style={{
                                                backgroundColor: u.is_active ? '#dcfce7' : '#fee2e2',
                                                color: u.is_active ? '#166534' : '#991b1b'
                                            }}
                                        >
                                            {u.is_active ? 'Active' : 'Disabled'}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
                                            <button
                                                className="btn-outline"
                                                style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', color: '#0284c7', borderColor: '#0284c7' }}
                                                onClick={() => handleEdit(u)}
                                                title="Edit"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="btn-outline"
                                                style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', color: u.is_active ? '#f59e0b' : '#16a34a', borderColor: u.is_active ? '#f59e0b' : '#16a34a' }}
                                                onClick={() => handleToggleActive(u)}
                                                title={u.is_active ? "Disable" : "Enable"}
                                            >
                                                {u.is_active ? 'Disable' : 'Enable'}
                                            </button>
                                            <button
                                                className="btn-outline"
                                                style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem', color: '#ef4444', borderColor: '#ef4444' }}
                                                onClick={() => handleDelete(u.id)}
                                                title="Delete"
                                            >
                                                Del
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
