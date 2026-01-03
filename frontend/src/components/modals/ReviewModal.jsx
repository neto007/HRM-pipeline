import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Trash2, X, Code2 } from 'lucide-react';
import Editor from '@monaco-editor/react';

const ReviewModal = ({
    reviewItem,
    onClose,
    code,
    setCode,
    onApprove,
    onDelete
}) => {
    if (!reviewItem) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
            zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={onClose}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                style={{
                    width: '90vw', height: '90vh',
                    background: '#1e1e2e', border: '1px solid #444', borderRadius: '12px',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ padding: '20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)' }}>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem', color: '#fff' }}>
                        <Code2 color="#a855f7" size={24} /> Review: <span style={{ fontFamily: 'monospace', color: '#e2e8f0' }}>{reviewItem.filename}</span>
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X /></button>
                </div>

                {/* Editor */}
                <div style={{ flex: 1, position: 'relative' }}>
                    <Editor
                        height="100%"
                        defaultLanguage="go"
                        theme="vs-dark"
                        value={code}
                        onChange={setCode}
                        options={{
                            padding: { top: 20 },
                            minimap: { enabled: false },
                            fontSize: 14
                        }}
                    />
                </div>

                {/* Footer */}
                <div style={{ padding: '20px', borderTop: '1px solid #333', display: 'flex', justifyContent: 'flex-end', gap: '16px', background: 'rgba(255,255,255,0.02)' }}>
                    <button onClick={onDelete} className="btn-icon-sm hover-danger" style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' }}>
                        <Trash2 size={16} /> Discard Entry
                    </button>
                    <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #555', color: '#fff', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={onApprove} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}>
                        <Check size={18} /> Approve to Golden Dataset
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
export default ReviewModal;
