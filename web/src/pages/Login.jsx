import React, { useState } from "react";
import api from "../api";
import { setTokens } from "../auth";
import { useNavigate } from "react-router-dom";

export default function Login() {
    const nav = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");

    async function onSubmit(e) {
        e.preventDefault();
        setErr("");
        try {
            const res = await api.post("auth/login/", { username, password });
            setTokens(res.data);
            nav("/visits");
        } catch (ex) {
            console.error(ex);
            setErr("Login failed. Check credentials.");
        }
    }

    return (
        <div className="container" style={{ maxWidth: '400px', marginTop: '4rem' }}>
            <div className="card">
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <img src="/vodafone_logo.png" alt="Vodafone" style={{ height: '60px' }} />
                </div>
                <h2 style={{ textAlign: 'center', color: '#e60000' }}>Safety Tour Login</h2>
                {err && <div style={{ color: "crimson", padding: '10px', background: '#fee2e2', borderRadius: '8px', marginBottom: '1rem' }}>{err}</div>}
                <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label>Username</label>
                        <input value={username} onChange={(e) => setUsername(e.target.value)} required />
                    </div>
                    <div>
                        <label>Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>Sign In</button>
                </form>
            </div>
        </div>
    );
}

