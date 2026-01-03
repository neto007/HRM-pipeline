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
import ConfirmationModal from '../components/modals/ConfirmationModal';

const DashboardView = ({
    projects,
    selectedProject,
    setSelectedProject,
    fetchProjects,
    handleDownloadProject,
    onUploadClick,
    API_BASE = ''
}) => {
    const [systemStats, setSystemStats] = React.useState(null);
    const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
    const [projectToDelete, setProjectToDelete] = React.useState(null);

    const handleDeleteClick = (projectName) => {
        setProjectToDelete(projectName);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!projectToDelete) return;
        try {
            await axios.delete(`${API_BASE}/projects/${projectToDelete}`);
            fetchProjects();
        } catch (error) {
            console.error("Error deleting project:", error);
        }
    };

    React.useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await axios.get(`${API_BASE}/system/stats`);
                setSystemStats(response.data);
            } catch (error) {
                console.error("Error fetching system stats:", error);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, [API_BASE]);

    return (
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <header style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Forge Command Center</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Orchestrate your neural reasoning models across multiple environments.</p>
            </header>

            <div className="grid-cols-auto">
                <div className="glass-card neon-pulse">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ padding: '10px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px' }}><Cpu color="var(--primary)" size={32} /></div>
                        {systemStats?.gpus?.length > 0 ? (
                            <span className="badge badge-success">{systemStats.gpus.length} GPU{systemStats.gpus.length > 1 ? 's' : ''} Active</span>
                        ) : (
                            <span className="badge" style={{ background: 'rgba(255,255,255,0.1)' }}>CPU Mode</span>
                        )}
                    </div>

                    {systemStats?.gpus?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {systemStats.gpus.map(gpu => (
                                <div key={gpu.index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                                    <h4 style={{ color: 'var(--text-secondary)', marginBottom: '4px', fontSize: '0.9rem' }}>
                                        {gpu.name}
                                    </h4>
                                    <h2 style={{ fontSize: '1.4rem' }}>
                                        {gpu.utilization_percent}%
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {' '}({gpu.used_gb}/{gpu.total_gb}GB)
                                        </span>
                                    </h2>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div>
                            <h4 style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>CPU Utilization</h4>
                            <h2 style={{ fontSize: '1.8rem' }}>{(systemStats?.cpu?.percent || 0)}%</h2>
                        </div>
                    )}
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
                    <h4 style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Memory Usage</h4>
                    <h2 style={{ fontSize: '1.8rem' }}>
                        {systemStats?.memory ? (
                            <>
                                {systemStats.memory.percent}%
                                <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
                                    {' '}({systemStats.memory.used_gb} / {systemStats.memory.total_gb} GB)
                                </span>
                            </>
                        ) : (
                            "--"
                        )}
                    </h2>
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
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(name); }} className="btn-icon-sm hover-danger"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            <ConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Delete Project"
                message={`Are you sure you want to delete the project "${projectToDelete}"? This action cannot be undone and will remove all associated data and checkpoints.`}
                confirmText="Delete Project"
                isDanger={true}
            />
        </motion.div >
    );
};

export default DashboardView;
