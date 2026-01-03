import React from 'react';
import { motion } from 'framer-motion';
import { Zap, RefreshCw, Code2, ShieldCheck, Database } from 'lucide-react';
import Editor from '@monaco-editor/react';

const StudioView = ({
    isLoading,
    handleTranscribe,
    javaCode,
    setJavaCode,
    targetCode,
    hrmPlan,
    rlcoderContext
}) => {
    return (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '2.5rem' }}>Neural Studio</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Transcribe source code through the selected HRM Reasoning Engine.</p>

                    {/* Helper Banner */}
                    <div style={{
                        background: 'rgba(6, 182, 212, 0.1)',
                        border: '1px solid rgba(6, 182, 212, 0.3)',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        marginTop: '16px',
                        fontSize: '0.8rem'
                    }}>
                        <strong style={{ color: 'var(--secondary)' }}>Quick Test Tool:</strong> Try 1 Java file at a time. For batch migration, use <strong>Migration</strong> tab.
                    </div>
                </div>
                <button className="btn-action" onClick={handleTranscribe} disabled={isLoading}>
                    {isLoading ? <RefreshCw className="animate-spin" /> : <Zap size={20} />}
                    {isLoading ? 'Synthesizing...' : 'EXECUTE TRANSCRIBER'}
                </button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Code2 size={16} color="var(--primary)" /> <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em' }}>SOURCE: JAVA</span>
                    </div>
                    <div style={{ height: '500px' }}>
                        <Editor
                            height="100%"
                            defaultLanguage="java"
                            theme="vs-dark"
                            value={javaCode}
                            onChange={(v) => setJavaCode(v)}
                            options={{ minimap: { enabled: false }, fontSize: 14, padding: { top: 20 } }}
                        />
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Zap size={16} color="var(--secondary)" /> <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em' }}>OUTPUT: SYNTHESIZED GO</span>
                    </div>
                    <div style={{ height: '500px' }}>
                        <Editor
                            height="100%"
                            defaultLanguage="go"
                            theme="vs-dark"
                            value={targetCode}
                            options={{ readOnly: true, minimap: { enabled: false }, fontSize: 14, padding: { top: 20 } }}
                        />
                    </div>
                </div>
            </div>

            {hrmPlan.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ marginTop: '32px', borderLeft: '6px solid var(--primary)' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}><ShieldCheck color="var(--primary)" /> Architectural Reasoning Strategy</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        {hrmPlan.map((step, idx) => (
                            <div key={idx} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                                <p style={{ fontSize: '0.85rem', color: 'var(--primary-bright)', fontWeight: 600 }}>{step}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {rlcoderContext && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ marginTop: '32px', borderLeft: '6px solid var(--secondary)' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <Database color="var(--secondary)" /> RLCoder Context Retrieval
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                        {rlcoderContext.mode === 'simulated' ? '⚠️ Modo Simulado - Execute make index-l2j para contexto real' : `✅ ${rlcoderContext.relevant_code.length} snippets recuperados`}
                    </p>
                    <div style={{ display: 'grid', gap: '16px' }}>
                        {rlcoderContext.relevant_code.map((code, idx) => (
                            <div key={idx} style={{
                                padding: '16px',
                                background: 'rgba(6, 182, 212, 0.05)',
                                borderRadius: '12px',
                                border: '1px solid rgba(6, 182, 212, 0.2)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontFamily: 'monospace' }}>
                                        📄 {rlcoderContext.file_paths[idx]}
                                    </span>
                                    <span style={{
                                        fontSize: '0.7rem',
                                        padding: '4px 8px',
                                        background: 'rgba(6, 182, 212, 0.15)',
                                        borderRadius: '6px',
                                        color: 'var(--secondary)'
                                    }}>
                                        {(rlcoderContext.similarity_scores[idx] * 100).toFixed(0)}% match
                                    </span>
                                </div>
                                <pre style={{
                                    fontSize: '0.75rem',
                                    background: 'rgba(0,0,0,0.3)',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    overflow: 'auto',
                                    maxHeight: '150px',
                                    margin: 0
                                }}>
                                    {code}
                                </pre>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};
export default StudioView;
