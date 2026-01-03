import React from 'react';
import { motion } from 'framer-motion';
import {
    Cpu,
    Layers,
    Zap,
    Globe,
    ShieldCheck,
    Pause,
    Play,
    Square,
    Download,
    Cloud,
    Trash2
} from 'lucide-react';
import axios from 'axios';

const DashboardView = ({
    projects,
    selectedProject,
    setSelectedProject,
    fetchProjects,
    handleDownloadProject,
    onUploadClick,
    API_BASE = ''
}) => {
    return (
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <header style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Forge Command Center</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Orchestrate your neural reasoning models across multiple environments.</p>
            </header>

            <div className="grid-cols-auto">
                <div className="glass-card neon-pulse">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div style={{ padding: '10px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px' }}><Cpu color="var(--primary)" size={32} /></div>
                        <span className="badge badge-success">Active</span>
                    </div>
                    <h4 style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>GPU Utilization</h4>
                    <h2 style={{ fontSize: '1.8rem' }}>74.2% <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ 12GB</span></h2>
                </div>

                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div style={{ padding: '10px', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '12px' }}><Layers color="var(--secondary)" size={32} /></div>
                        <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>6 Total</span>
                    </div>
                    <h4 style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Active Projects</h4>
                    <h2 style={{ fontSize: '1.8rem' }}>{Object.keys(projects).length} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Neural Hubs</span></h2>
                </div>

                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div style={{ padding: '10px', background: 'rgba(244, 114, 182, 0.1)', borderRadius: '12px' }}><Zap color="var(--accent)" size={32} /></div>
                    </div>
                    <h4 style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Inference Speed</h4>
                    <h2 style={{ fontSize: '1.8rem' }}>14ms <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>latency</span></h2>
                </div>
            </div>

            <div style={{ marginTop: '40px' }}>
                <h2 style={{ marginBottom: '24px' }}>Neural Hubs</h2>
                <div className="grid-cols-auto">
                    {Object.entries(projects).map(([name, data]) => (
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            key={name}
                            className="glass-card"
                            style={{
                                cursor: 'pointer',
                                borderLeft: `4px solid ${selectedProject === name ? 'var(--primary)' : 'transparent'}`,
                                background: selectedProject === name ? 'rgba(139, 92, 246, 0.05)' : 'var(--glass-bg)'
                            }}
                            onClick={() => setSelectedProject(name)}
                        >
                            <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{name}</h3>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}><Globe size={14} /> {data.repo.slice(0, 30)}...</p>
                                </div>
                                <ShieldCheck size={20} color={selectedProject === name ? 'var(--primary)' : 'var(--text-muted)'} />
                            </div>
                            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    {data.extensions.map(ext => <span key={ext} style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>{ext}</span>)}
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', marginRight: '8px' }}>{data.status.toUpperCase()}</span>

                                    {data.status === 'training' && (
                                        <button onClick={(e) => { e.stopPropagation(); axios.post(`${API_BASE}/projects/${name}/pause`).then(fetchProjects); }} className="btn-icon-sm"><Pause size={14} /></button>
                                    )}
                                    {data.status === 'paused' && (
                                        <button onClick={(e) => { e.stopPropagation(); axios.post(`${API_BASE}/projects/${name}/resume`).then(fetchProjects); }} className="btn-icon-sm" style={{ color: 'var(--success)' }}><Play size={14} /></button>
                                    )}
                                    {(data.status === 'training' || data.status === 'paused') && (
                                        <button onClick={(e) => { e.stopPropagation(); axios.post(`${API_BASE}/projects/${name}/cancel`).then(fetchProjects); }} className="btn-icon-sm" style={{ color: '#ef4444' }}><Square size={14} /></button>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); handleDownloadProject(name); }} className="btn-icon-sm" title="Download"><Download size={14} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); onUploadClick(name); }} className="btn-icon-sm" title="Upload to HuggingFace" style={{ color: '#FFD21E' }}><Cloud size={14} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete project ${name}?`)) axios.delete(`${API_BASE}/projects/${name}`).then(fetchProjects); }} className="btn-icon-sm hover-danger"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

export default DashboardView;
