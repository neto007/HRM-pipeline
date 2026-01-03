import React from 'react';
import { motion } from 'framer-motion';
import {
    LayoutDashboard,
    Layers,
    Code2,
    ArrowRightLeft,
    Settings,
    Zap,
    ChevronRight
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, sysStatus }) => {
    const menuItems = [
        { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Control Center' },
        { id: 'autolab', icon: <Layers size={20} />, label: 'Forge Lab' },
        { id: 'transcribe', icon: <Code2 size={20} />, label: 'Studio' },
        { id: 'migration', icon: <ArrowRightLeft size={20} />, label: 'Migration' },
        { id: 'settings', icon: <Settings size={20} />, label: 'Config' }
    ];

    return (
        <aside className="sidebar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
                <div style={{ background: 'var(--primary)', padding: '8px', borderRadius: '10px', boxShadow: '0 0 15px var(--primary-glow)' }}>
                    <Zap size={24} fill="white" color="white" />
                </div>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>HRM FORCE</h2>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em' }}>NEURAL REASONING v2.0</p>
                </div>
            </div>

            <nav style={{ flex: 1 }}>
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`btn-nav ${activeTab === item.id ? 'active' : ''}`}
                    >
                        {item.icon}
                        {item.label}
                        {activeTab === item.id && <motion.div layoutId="activeNav" style={{ marginLeft: 'auto' }}><ChevronRight size={16} /></motion.div>}
                    </button>
                ))}
            </nav>

            <div className="glass-card" style={{ padding: '16px', marginTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: sysStatus.status === 'online' ? '#10b981' : '#ef4444', boxShadow: `0 0 10px ${sysStatus.status === 'online' ? '#10b981' : '#ef4444'}` }}></div>
                    <span style={{ fontWeight: 600 }}>KERNEL: {sysStatus.status.toUpperCase()}</span>
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px' }}>Uptime: Active Session</p>
            </div>
        </aside>
    );
};

export default Sidebar;
