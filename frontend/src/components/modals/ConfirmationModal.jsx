import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", isDanger = false }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.8)', zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(4px)'
            }} onClick={onClose}>
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="glass-card"
                    style={{
                        minWidth: '400px',
                        maxWidth: '500px',
                        padding: '24px',
                        border: '1px solid var(--border-subtle)',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: isDanger ? '#ef4444' : 'var(--text-primary)' }}>
                            {isDanger && <AlertTriangle size={24} />}
                            {title}
                        </h3>
                        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>
                    </div>

                    <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', lineHeight: '1.6' }}>
                        {message}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-subtle)',
                                background: 'transparent',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => { onConfirm(); onClose(); }}
                            className="primary-button"
                            style={{
                                background: isDanger ? '#ef4444' : 'var(--primary)',
                                color: isDanger ? '#fff' : '#000',
                                padding: '10px 20px',
                                borderRadius: '8px',
                                border: 'none',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            {confirmText}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ConfirmationModal;
