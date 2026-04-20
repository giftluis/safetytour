import React, { useState, useEffect } from "react";
import api from "./api";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Visits from "./pages/Visits.jsx";
import VisitDetail from "./pages/VisitDetail.jsx";
import NewVisit from "./pages/NewVisit.jsx";
import Reports from "./pages/Reports.jsx";
import Users from "./pages/Users.jsx";
import ActionsDashboard from "./pages/ActionsDashboard.jsx";
import { clearTokens, getTokens } from "./auth.js";

function Nav() {
    const nav = useNavigate();
    const tokens = getTokens();
    const [user, setUser] = useState(null);

    useEffect(() => {
        if (tokens) {
            api.get('auth/me/')
                .then(res => setUser(res.data))
                .catch(err => console.error("Failed to fetch user", err));
        } else {
            setUser(null);
        }
    }, [tokens]);

    return (
        <div className="nav">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src="/vodafone_logo.png" alt="Vodafone" style={{ height: '30px' }} />
                <Link to="/" style={{ fontWeight: 800 }}>Safety Tour</Link>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
                {tokens ? (
                    <>
                        {user && (
                            <span style={{ marginRight: '15px', color: '#666', fontSize: '0.9rem', alignSelf: 'center' }}>
                                Hello, {user.first_name || user.username}
                            </span>
                        )}
                        <button className="btn-secondary" onClick={() => nav("/visits")}>Visits</button>
                        <button className="btn-secondary" onClick={() => nav("/actions")}>Actions</button>
                        <button className="btn-secondary" onClick={() => nav("/reports")}>Reports</button>
                        {user?.role === 'safety_admin' && (
                            <button className="btn-secondary" onClick={() => nav("/users")}>Users</button>
                        )}
                        <button onClick={() => { clearTokens(); nav("/login"); }}>Logout</button>
                    </>
                ) : (
                    <button onClick={() => nav("/login")}>Login</button>
                )}
            </div>
        </div>
    );
}

export default function App() {
    return (
        <>
            <Nav />
            <div className="container">
                <Routes>
                    <Route path="/" element={<Visits />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/visits" element={<Visits />} />
                    <Route path="/visits/new" element={<NewVisit />} />
                    <Route path="/visits/:id" element={<VisitDetail />} />
                    <Route path="/actions" element={<ActionsDashboard />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/users" element={<Users />} />
                </Routes>
            </div>
        </>
    );
}
