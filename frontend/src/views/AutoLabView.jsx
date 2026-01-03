import React from 'react';
import { motion } from 'framer-motion';
import { Zap, RefreshCw, Terminal, AlertCircle } from 'lucide-react';
import axios from 'axios';

const AutoLabView = ({
    isLoading,
    setIsLoading,
    smartDiscovery,
    setSmartDiscovery,
    terminalLogs,
    setTerminalLogs,
    fetchProjects,
    setSelectedProject,
    fetchLogs,
    showAlert,
    API_BASE = ''
}) => {

    const handleCreateProject = async () => {
        const name = document.getElementById('projName').value;
        const repo = document.getElementById('repoUrl').value;
        if (!name || !repo) return;

        setIsLoading(true);
        setTerminalLogs('> Initializing Neural Bridge...\n> Requesting resources...');

        try {
            const res = await axios.post(`${API_BASE}/repo/clone-and-train`, {
                project_name: name,
                repo_url: repo,
                epochs: parseInt(document.getElementById('trainEpochs').value),
                batch_size: parseInt(document.getElementById('batchSize').value) || 4,
                file_extensions: smartDiscovery ? ['AUTO'] : document.getElementById('fileExts').value.split(',')
            });

            // Refetch projects and select the new one
            await fetchProjects();
            setSelectedProject(name);
            setTerminalLogs(prev => prev + `\n> Project ${name} created.\n> Training process started (PID: ${res.data.pid}).`);

            // Switch to logs instantly
            setTimeout(fetchLogs, 500);
        } catch (e) {
            setTerminalLogs(prev => prev + `\n[ERROR] ${e.message}`);
            showAlert('Forge Failure: ' + e.message, 'System Error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Forge Neural Bridge</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Synthesize a new reasoning model by bridging a code repository.</p>

            {/* Helper Banner */}
            <div style={{
                background: 'rgba(244, 114, 182, 0.1)',
                border: '1px solid rgba(244, 114, 182, 0.3)',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '32px',
                display: 'flex',
                alignItems: 'start',
                gap: '12px'
            }}>
                <AlertCircle size={20} color="#f472b6" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.85rem' }}>
                    <strong style={{ color: '#f472b6' }}>Advanced Feature:</strong> Train a NEW HRM model from scratch (takes hours/days).
                    <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                        ⚠️ Most users don't need this! Use the <strong>Migration</strong> tab instead for daily use.
                    </div>
                </div>
            </div>

            <div className="glass-card" style={{ maxWidth: '800px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    <div className="grid-cols-auto" style={{ gap: '24px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>PROJECT CODENAME</label>
                            <input id="projName" className="input-field" placeholder="L2J-Global-Core" />
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>GIT REPOSITORY SOURCE</label>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <Zap size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input id="repoUrl" className="input-field" style={{ paddingLeft: '48px' }} placeholder="https://github.com/..." />
                            </div>
                            <input id="repoBranch" className="input-field" style={{ width: '120px' }} defaultValue="master" />
                        </div>
                    </div>
                    <div className="grid-cols-auto">
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>TRAINING EPOCHS</label>
                            <input id="trainEpochs" type="number" className="input-field" defaultValue="3" min="1" max="100" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>BATCH SIZE</label>
                            <input id="batchSize" type="number" className="input-field" defaultValue="4" min="1" max="32" />
                        </div>
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>FILE EXTENSIONS</label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input type="checkbox" checked={smartDiscovery} onChange={(e) => setSmartDiscovery(e.target.checked)} />
                                <span style={{ fontSize: '0.8rem', color: smartDiscovery ? 'var(--primary)' : 'var(--text-muted)' }}>Smart Discovery</span>
                            </label>
                        </div>
                        <input
                            id="fileExts"
                            className="input-field"
                            defaultValue=".java,.xml,.properties,.py"
                            disabled={smartDiscovery}
                            style={{ opacity: smartDiscovery ? 0.5 : 1 }}
                        />
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', marginTop: '8px', borderRadius: '8px' }}>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                                {smartDiscovery ? 'Analyzes all relevant code, configs and constants (.json, .xml, .properties, etc.)' : 'Specify extensions manually (e.g. .java, .py)'}
                            </p>
                        </div>
                    </div>

                    <button
                        className="btn-action"
                        style={{ alignSelf: 'start', padding: '16px 32px' }}
                        disabled={isLoading}
                        onClick={handleCreateProject}
                    >
                        {isLoading ? <RefreshCw className="animate-spin" size={20} /> : <Zap size={20} fill="white" />}
                        {isLoading ? 'FORGING IN PROGRESS...' : 'BAPTIZE & FORGE MODEL'}
                    </button>
                </div>
            </div>

            <div className="glass-card" style={{ marginTop: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Terminal size={20} color="var(--primary)" /> Synthesis Stream</h3>
                    <div className="badge badge-success" style={{ animation: 'pulse 2s infinite' }}>Live Data</div>
                </div>
                <div style={{
                    background: 'rgba(0,0,0,0.5)',
                    padding: '24px',
                    borderRadius: '12px',
                    color: '#10b981',
                    fontFamily: 'monospace',
                    minHeight: '240px',
                    fontSize: '0.9rem',
                    border: '1px solid rgba(16, 185, 129, 0.1)',
                    boxShadow: 'inset 0 0 20px rgba(16, 185, 129, 0.05)'
                }}>
                    <pre style={{ whiteSpace: 'pre-wrap' }}>{terminalLogs}</pre>
                </div>
            </div>
        </motion.div>
    );
};

export default AutoLabView;
