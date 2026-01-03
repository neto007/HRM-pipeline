import React from 'react';
import { motion } from 'framer-motion';
import { Cloud, Upload } from 'lucide-react';

const HuggingFaceUploadModal = ({
    isOpen,
    onClose,
    project,
    repoId,
    setRepoId,
    token,
    setToken,
    isPrivate,
    setIsPrivate,
    latestOnly,
    setLatestOnly,
    uploading,
    onUpload
}) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease-out'
        }} onClick={() => !uploading && onClose()}>
            <div
                style={{
                    width: '90%',
                    maxWidth: '500px',
                    background: 'rgba(20, 20, 30, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '24px',
                    padding: '32px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    position: 'relative',
                    overflow: 'hidden'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                    <div style={{
                        padding: '12px',
                        background: 'rgba(255, 210, 30, 0.1)',
                        borderRadius: '16px',
                        border: '1px solid rgba(255, 210, 30, 0.2)'
                    }}>
                        <Cloud size={32} color="#FFD21E" />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>Upload Model</h2>
                        <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                            Target: <span style={{ color: '#FFD21E' }}>Hugging Face Hub</span>
                        </div>
                    </div>
                </div>

                {/* Context */}
                <div style={{
                    marginBottom: '24px',
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    fontSize: '0.9rem',
                    display: 'flex',
                    justifyContent: 'space-between'
                }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Project Source:</span>
                    <strong style={{ color: '#fff' }}>{project}</strong>
                </div>

                {/* Inputs */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>
                        Repository ID <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                        type="text"
                        placeholder="username/model-name"
                        value={repoId}
                        onChange={(e) => setRepoId(e.target.value)}
                        disabled={uploading}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '1rem',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#FFD21E'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                </div>

                <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>
                        Access Token <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                        type="password"
                        placeholder="hf_xxxxxxxxxxxxx"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        disabled={uploading}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            color: '#fff',
                            fontSize: '1rem',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#FFD21E'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                    <div style={{ textAlign: 'right', marginTop: '6px' }}>
                        <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', color: '#FFD21E', textDecoration: 'none', opacity: 0.8 }}>
                            Get token →
                        </a>
                    </div>
                </div>

                {/* Checkboxes */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        padding: '12px',
                        background: isPrivate ? 'rgba(255, 210, 30, 0.1)' : 'rgba(255,255,255,0.03)',
                        borderRadius: '12px',
                        border: isPrivate ? '1px solid #FFD21E' : '1px solid rgba(255,255,255,0.1)',
                        transition: 'all 0.2s'
                    }}>
                        <input
                            type="checkbox"
                            checked={isPrivate}
                            onChange={(e) => setIsPrivate(e.target.checked)}
                            disabled={uploading}
                            style={{ accentColor: '#FFD21E' }}
                        />
                        <span style={{ fontSize: '0.9rem', color: isPrivate ? '#FFD21E' : 'rgba(255,255,255,0.7)' }}>Privado</span>
                    </label>

                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        padding: '12px',
                        background: latestOnly ? 'rgba(255, 210, 30, 0.1)' : 'rgba(255,255,255,0.03)',
                        borderRadius: '12px',
                        border: latestOnly ? '1px solid #FFD21E' : '1px solid rgba(255,255,255,0.1)',
                        transition: 'all 0.2s'
                    }}>
                        <input
                            type="checkbox"
                            checked={latestOnly}
                            onChange={(e) => setLatestOnly(e.target.checked)}
                            disabled={uploading}
                            style={{ accentColor: '#FFD21E' }}
                        />
                        <span style={{ fontSize: '0.9rem', color: latestOnly ? '#FFD21E' : 'rgba(255,255,255,0.7)' }}>Último Checkpoint</span>
                    </label>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <button
                        onClick={onClose}
                        disabled={uploading}
                        style={{
                            padding: '12px 24px',
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(255,255,255,0.6)',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: 600,
                            transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.color = '#fff'}
                        onMouseLeave={(e) => e.target.style.color = 'rgba(255,255,255,0.6)'}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onUpload}
                        disabled={uploading || !repoId || !token}
                        style={{
                            padding: '12px 32px',
                            background: 'linear-gradient(135deg, #FFD21E 0%, #D4AF37 100%)',
                            border: 'none',
                            borderRadius: '12px',
                            color: '#000',
                            cursor: (uploading || !repoId || !token) ? 'not-allowed' : 'pointer',
                            fontSize: '1rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            opacity: (uploading || !repoId || !token) ? 0.5 : 1,
                            boxShadow: '0 4px 15px rgba(255, 210, 30, 0.3)'
                        }}
                    >
                        {uploading ? 'Uploading...' : 'Start Upload'}
                        {!uploading && <Upload size={18} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HuggingFaceUploadModal;
