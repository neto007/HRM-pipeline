import React from 'react';
import { motion } from 'framer-motion';
import { Zap, ChevronRight, LayoutDashboard, Database, RefreshCw, FileJson, ArrowRight } from 'lucide-react';

const MigrationView = ({
    migrationPlan,
    migrationDataset,
    selectedCheckpoint,
    setSelectedCheckpoint,
    hrmCheckpoints,
    genLimit,
    setGenLimit,
    isGenLoading,
    handleGenerateDataset,
    showAlert,
    onOpenReview // Renamed from handleOpenReview to be generic event handler
}) => {
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '16px' }}>Migration Headquarters</h1>

            {/* Hybrid Engine Banner */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(6, 182, 212, 0.1))',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '32px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <Zap size={24} color="var(--primary)" />
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>🧠 Hybrid Intelligence Migration Engine</h3>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px', lineHeight: '1.5' }}>
                    Autonomous migration powered by <strong style={{ color: 'var(--primary)' }}>HRM Guidance</strong> + <strong style={{ color: 'var(--secondary)' }}>LLM (Qwen)</strong> + <strong style={{ color: '#10b981' }}>RLCoder Context</strong>
                </p>

                {/* Pipeline Visual */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    overflowX: 'auto',
                    whiteSpace: 'nowrap'
                }}>
                    <span style={{ padding: '8px 14px', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(139, 92, 246, 0.15))', borderRadius: '8px', color: 'var(--primary)', fontWeight: 600, border: '1px solid rgba(139, 92, 246, 0.3)', boxShadow: '0 2px 8px rgba(139, 92, 246, 0.2)' }}>AST Parser</span>
                    <ChevronRight size={14} style={{ opacity: 0.5 }} />
                    <span style={{ padding: '8px 14px', background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(6, 182, 212, 0.15))', borderRadius: '8px', color: 'var(--secondary)', fontWeight: 600, border: '1px solid rgba(6, 182, 212, 0.3)', boxShadow: '0 2px 8px rgba(6, 182, 212, 0.2)' }}>RLCoder Context</span>
                    <ChevronRight size={14} style={{ opacity: 0.5 }} />
                    <span style={{ padding: '8px 14px', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(139, 92, 246, 0.15))', borderRadius: '8px', color: 'var(--primary)', fontWeight: 600, border: '1px solid rgba(139, 92, 246, 0.3)', boxShadow: '0 2px 8px rgba(139, 92, 246, 0.2)' }}>HRM Guidance</span>
                    <ChevronRight size={14} style={{ opacity: 0.5 }} />
                    <span style={{ padding: '8px 14px', background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(6, 182, 212, 0.15))', borderRadius: '8px', color: 'var(--secondary)', fontWeight: 600, border: '1px solid rgba(6, 182, 212, 0.3)', boxShadow: '0 2px 8px rgba(6, 182, 212, 0.2)' }}>LLM Generation</span>
                    <ChevronRight size={14} style={{ opacity: 0.5 }} />
                    <span style={{ padding: '8px 14px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(16, 185, 129, 0.15))', borderRadius: '8px', color: '#10b981', fontWeight: 600, border: '1px solid rgba(16, 185, 129, 0.3)', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)' }}>Multi-Validator</span>
                    <ChevronRight size={14} style={{ opacity: 0.5 }} />
                    <span style={{ padding: '8px 16px', background: 'linear-gradient(135deg, rgba(244, 114, 182, 0.3), rgba(244, 114, 182, 0.15))', borderRadius: '8px', color: '#f472b6', fontWeight: 700, border: '1px solid rgba(244, 114, 182, 0.4)', boxShadow: '0 4px 12px rgba(244, 114, 182, 0.3)', fontSize: '0.85rem' }}>🎯 Reward (20 pts)</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>

                {/* Left Column: Plan & Strategy */}
                <div className="glass-card">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                        <LayoutDashboard size={20} color="var(--primary)" /> Strategic Migration Plan
                    </h3>

                    {!migrationPlan || !migrationPlan.stats ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            <p>No plan loaded. Run Phase 1 analysis first.</p>
                            <button className="primary-button" style={{ marginTop: '16px' }}>Run Analysis</button>
                        </div>
                    ) : (
                        <div>
                            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', flex: 1 }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Classes</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{migrationPlan.stats?.nodes || 0}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', flex: 1 }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dependencies</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{migrationPlan.stats?.edges || 0}</div>
                                </div>
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: '12px', flex: 1, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#10b981' }}>Migration Health</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>Ready</div>
                                </div>
                            </div>

                            <h4 style={{ fontSize: '0.9rem', marginBottom: '12px', color: 'var(--text-secondary)' }}>Priority Queue (Topologically Sorted)</h4>
                            <div style={{ maxHeight: '400px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '8px' }}>
                                {migrationPlan.migration_order?.map((cls, idx) => (
                                    <div key={idx} style={{
                                        padding: '10px',
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        fontSize: '0.85rem'
                                    }}>
                                        <span style={{
                                            background: idx < 5 ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                                            color: idx < 5 ? '#000' : 'var(--text-muted)',
                                            width: '24px', height: '24px', borderRadius: '50%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700
                                        }}>{idx + 1}</span>
                                        <span style={{ color: idx < 5 ? '#fff' : 'var(--text-secondary)' }}>{cls}</span>
                                        {idx < 5 && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '2px 8px', borderRadius: '12px' }}>Rec. Batch</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Dataset Factory */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                    {/* Controls */}
                    <div className="glass-card">
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                            <Database size={20} color="var(--primary)" /> Dataset Factory
                        </h3>

                        <div style={{ padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px border rgba(255,255,255,0.05)' }}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Target Language</label>
                                <select className="input-field" disabled>
                                    <option>Go (Golang)</option>
                                </select>
                            </div>

                            {/* HRM Checkpoint Selector */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                    🧠 HRM Checkpoint (Required)
                                </label>
                                <select
                                    className="input-field"
                                    value={selectedCheckpoint}
                                    onChange={(e) => setSelectedCheckpoint(e.target.value)}
                                    style={{
                                        background: hrmCheckpoints.length === 0 ? 'rgba(220, 38, 38, 0.1)' : undefined,
                                        borderColor: hrmCheckpoints.length === 0 ? '#dc2626' : undefined
                                    }}
                                >
                                    {hrmCheckpoints.length === 0 && (
                                        <option value="">No checkpoints available - Train HRM first</option>
                                    )}
                                    {hrmCheckpoints.map((ckpt, idx) => (
                                        <option key={idx} value={ckpt.path} disabled={!ckpt.valid}>
                                            {ckpt.name} {ckpt.is_default ? '(Default)' : ''} - Epoch {ckpt.epoch} {!ckpt.valid ? '(Invalid)' : ''}
                                        </option>
                                    ))}
                                </select>
                                {hrmCheckpoints.length === 0 && (
                                    <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '4px' }}>
                                        ⚠️ Train HRM model in Forge Lab before migrating
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Batch Size</label>
                                    <input type="number" className="input-field" value={genLimit} onChange={e => setGenLimit(parseInt(e.target.value))} min="1" max="50" />
                                </div>
                                <button
                                    className="primary-button"
                                    style={{
                                        flex: 2,
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        gap: '10px',
                                        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                                        color: '#fff',
                                        padding: '14px 24px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        fontWeight: 700,
                                        fontSize: '0.95rem',
                                        boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
                                        cursor: isGenLoading ? 'not-allowed' : 'pointer',
                                        opacity: isGenLoading ? 0.7 : 1,
                                        transition: 'all 0.3s ease',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                    onClick={handleGenerateDataset}
                                    disabled={isGenLoading}
                                    onMouseEnter={(e) => !isGenLoading && (e.currentTarget.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.6)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 4px 15px rgba(139, 92, 246, 0.4)')}
                                >
                                    {isGenLoading ? <RefreshCw className="spin" size={18} /> : <Zap size={18} />}
                                    {isGenLoading ? 'Migrating...' : 'Start Hybrid Migration'}
                                </button>
                            </div>

                            {isGenLoading && (
                                <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--primary)' }}>
                                    🧠 Hybrid engine processing: AST → RLCoder → HRM → LLM → Validators → Rewards
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Download Golden Dataset Button */}
                    {migrationDataset.length > 0 && (
                        <div className="glass-card" style={{ padding: '20px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            <h4 style={{ marginBottom: '12px', color: '#10b981', fontSize: '0.9rem', fontWeight: 600 }}>📦 Golden Dataset Ready</h4>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                                {migrationDataset.filter(e => e.approved).length || 'Some'} approved files ready for production use.
                            </p>
                            <button
                                className="primary-button"
                                style={{ width: '100%', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', padding: '14px 20px', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '0.95rem', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)', cursor: 'pointer', transition: 'all 0.3s ease' }}
                                onClick={() => showAlert('Download feature: Access files in data/golden_dataset/ folder', 'Info')}
                                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.6)'}
                                onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.4)'}
                            >
                                💾 Access Golden Dataset (data/golden_dataset/)
                            </button>
                        </div>
                    )}

                    {/* Generated Files List */}
                    <div className="glass-card" style={{ flex: 1 }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                            <FileJson size={20} color="var(--primary)" /> Synthetic Data ({migrationDataset.length})
                        </h3>

                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {migrationDataset.length === 0 ? (
                                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <FileJson size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                                    <p style={{ fontStyle: 'italic', marginBottom: '8px' }}>No files generated yet</p>
                                    <p style={{ fontSize: '0.75rem' }}>Click "Start Synthesis" above to begin</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {migrationDataset.map((entry, idx) => (
                                        <div key={idx}
                                            style={{
                                                background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                cursor: 'pointer', border: '1px solid transparent'
                                            }}
                                            className="hover-card"
                                            onClick={() => onOpenReview(entry.filename)}
                                        >
                                            <div>
                                                <div style={{ fontWeight: 500, color: '#fff' }}>{entry.source_file}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {entry.filename} • {new Date(entry.timestamp * 1000).toLocaleTimeString()}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span style={{ fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 6px', borderRadius: '4px' }}>
                                                    {entry.target_lang}
                                                </span>
                                                <ArrowRight size={16} color="var(--text-muted)" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </motion.div>
    );
};
export default MigrationView;
