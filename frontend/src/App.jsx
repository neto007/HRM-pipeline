import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Database,
  Cpu,
  Code2,
  Settings,
  Play,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  LayoutDashboard,
  Box,
  Layers,
  Globe,
  ShieldCheck,
  Zap,
  Pause,
  Square,
  Trash2,
  ArrowRight,
  Check,
  ChevronRight,
  ChevronDown,
  GitBranch,
  ArrowRightLeft,
  FileJson,
  ListOrdered
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:9007';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [javaCode, setJavaCode] = useState('// Paste your Java code here\npublic class L2ItemInstance {\n  private int _itemId;\n  private String _name;\n\n  public void initialize() {\n    System.out.println("Processing item...");\n  }\n}');
  const [targetCode, setTargetCode] = useState('// Transcribed result will appear here');
  const [hrmPlan, setHrmPlan] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sysStatus, setSysStatus] = useState({ status: 'offline', cuda_available: false });
  const [terminalLogs, setTerminalLogs] = useState('> Ready for synthesis...');
  const [apiKey, setApiKey] = useState(localStorage.getItem('openrouter_key') || '');
  const [selectedModel, setSelectedModel] = useState(localStorage.getItem('openrouter_model') || 'qwen/qwen3-coder');
  const [projects, setProjects] = useState({});
  const [selectedProject, setSelectedProject] = useState(null);
  const [smartDiscovery, setSmartDiscovery] = useState(true);
  const [rlcoderContext, setRlcoderContext] = useState(null);
  const [indexStatus, setIndexStatus] = useState({ exists: false, loading: false });
  const [repos, setRepos] = useState({ repositories: {}, active_repo: null });
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [newRepoName, setNewRepoName] = useState('');
  // Migration State
  const [migrationPlan, setMigrationPlan] = useState(null);
  const [migrationDataset, setMigrationDataset] = useState([]);
  const [isGenLoading, setIsGenLoading] = useState(false);
  const [genLimit, setGenLimit] = useState(5);
  const [reviewItem, setReviewItem] = useState(null); // Item sendo revisado
  const [reviewCode, setReviewCode] = useState(''); // Codigo editavel
  const [alertState, setAlertState] = useState({ visible: false, message: '', title: 'Notification' });
  // useHRMModel removido - sistema sempre usa arquitetura híbrida
  const [hrmCheckpoints, setHrmCheckpoints] = useState([]);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState('default');

  const showAlert = (message, title = 'Notification') => {
    setAlertState({ visible: true, message, title });
  };

  const closeAlert = () => {
    setAlertState({ ...alertState, visible: false });
  };

  useEffect(() => {
    const timer = setInterval(checkStatus, 5000);
    fetchProjects();
    checkIndexStatus(); // Verificar status do índice ao iniciar
    fetchRepos(); // Carregar repositórios
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    fetchLogs();
    const logTimer = setInterval(fetchLogs, 2000);
    return () => clearInterval(logTimer);
  }, [selectedProject]);

  useEffect(() => {
    if (activeTab === 'migration') {
      fetchMigrationPlan();
      fetchDataset();
      const interval = setInterval(fetchDataset, 5000); // Poll dataset changes
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const fetchProjects = async () => {
    try {
      const res = await axios.get(`${API_BASE}/projects`);
      setProjects(res.data);
      if (!selectedProject && Object.keys(res.data).length > 0) {
        setSelectedProject(Object.keys(res.data)[0]);
      }
    } catch (e) { console.error(e); }
  };

  const checkStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE}/status`);
      setSysStatus(res.data);
    } catch (e) { setSysStatus({ status: 'offline' }); }
  };

  const fetchLogs = async () => {
    if (!selectedProject) return;
    try {
      const res = await axios.get(`${API_BASE}/logs/${selectedProject}`);
      if (res.data.logs) setTerminalLogs(res.data.logs);
    } catch (e) { }
  };

  const checkIndexStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE}/index-status`);
      setIndexStatus({ ...res.data, loading: false });
    } catch (e) {
      setIndexStatus({ exists: false, loading: false });
    }
  };

  const handleIndexL2J = async () => {
    setIndexStatus({ ...indexStatus, loading: true });
    try {
      await axios.post(`${API_BASE}/index-l2j`);
      setTimeout(() => {
        checkIndexStatus();
      }, 3000); // Aguardar 3s e verificar novamente
    } catch (e) {
      console.error(e);
      setIndexStatus({ ...indexStatus, loading: false });
    }
  };

  const fetchRepos = async () => {
    try {
      const res = await axios.get(`${API_BASE}/rlcoder/repos`);
      setRepos(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddRepo = async () => {
    if (!newRepoName || !newRepoUrl) return;
    try {
      await axios.post(`${API_BASE}/rlcoder/repos/add`, {
        name: newRepoName,
        url: newRepoUrl
      });
      setNewRepoName('');
      setNewRepoUrl('');
      setTimeout(fetchRepos, 2000);
    } catch (e) {
      showAlert('Erro ao adicionar repositório: ' + e.message, 'Error');
    }
  };

  const handleIndexRepo = async (name) => {
    try {
      await axios.post(`${API_BASE}/rlcoder/repos/${name}/index`);
      setTimeout(fetchRepos, 3000);
    } catch (e) {
      showAlert('Erro ao indexar: ' + e.message, 'Indexing Error');
    }
  };

  const handleActivateRepo = async (name) => {
    try {
      await axios.post(`${API_BASE}/rlcoder/repos/${name}/activate`);
      fetchRepos();
    } catch (e) {
      showAlert('Erro ao ativar: ' + e.message, 'Activation Error');
    }
  };

  const handleDeleteRepo = async (name) => {
    if (!confirm(`Remover repositório ${name}?`)) return;
    try {
      await axios.delete(`${API_BASE}/rlcoder/repos/${name}`);
      fetchRepos();
    } catch (e) {
      showAlert('Erro ao remover: ' + e.message, 'Error');
    }
  };

  // Migration Handlers
  const fetchMigrationPlan = async () => {
    try {
      const res = await axios.get(`${API_BASE}/migration/plan`);
      setMigrationPlan(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchDataset = async () => {
    try {
      const res = await axios.get(`${API_BASE}/migration/dataset`);
      setMigrationDataset(res.data.entries || []);
    } catch (e) { console.error(e); }
  };

  const handleGenerateDataset = async () => {
    setIsGenLoading(true);
    try {
      await axios.post(`${API_BASE}/migration/generate`, {
        limit: genLimit,
        target_lang: 'Go',
        model: selectedModel
        // HRM+LLM+RLCoder sempre ativo no backend
      });
      // Show immediate feedback
      setTerminalLogs(prev => prev + '\n> Synthetic generation started in background...');
      setTimeout(fetchDataset, 2000);
    } catch (e) {
      showAlert('Error: ' + e.message, 'Generation Error');
    } finally {
      setIsGenLoading(false);
    }
  };

  const handleTranscribe = async () => {
    setIsLoading(true);
    setRlcoderContext(null); // Reset
    setHrmPlan([]);

    try {
      // Force mock=false to use Hybrid Engine
      const res = await axios.post(`${API_BASE}/transcribe`, {
        java_code: javaCode,
        target_lang: 'Go',
        mock: false,
        api_key: apiKey,
        model: selectedModel
      });

      // Handle new structured response
      if (res.data.go_code) {
        setTargetCode(res.data.go_code);

        // Populate Plan/Guidance
        if (res.data.guidance) {
          const g = res.data.guidance;
          const planItems = [];
          if (g.migration_strategy) planItems.push(`Strategy: ${g.migration_strategy}`);
          if (g.critical_concerns) g.critical_concerns.forEach(c => planItems.push(`Concern: ${c}`));
          if (g.recommended_patterns) g.recommended_patterns.forEach(p => planItems.push(`Pattern: ${p}`));
          setHrmPlan(planItems);
        }

        // Show reward in logs or somewhere (optional, maybe append to code comment?)
        if (res.data.reward) {
          setTargetCode(prev => `// [HRM Reward Score: ${res.data.reward.total}/20]\n` + prev);
        }

      } else {
        // Fallback or Legacy Output
        setTargetCode(res.data.output || "// No output received");
      }

      // RLCoder Context
      if (res.data.rlcoder_context) {
        setRlcoderContext(res.data.rlcoder_context);
      }

    } catch (e) {
      console.error(e);
      setTargetCode('// Transcription Failed: ' + (e.response?.data?.detail || e.message));
    } finally {
      setIsLoading(false);
    }
  };

  const menuItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Control Center' },
    { id: 'autolab', icon: <Layers size={20} />, label: 'Forge Lab' },
    { id: 'transcribe', icon: <Code2 size={20} />, label: 'Studio' },
    { id: 'migration', icon: <ArrowRightLeft size={20} />, label: 'Migration' },
    { id: 'settings', icon: <Settings size={20} />, label: 'Config' }
  ];

  const handleOpenReview = async (filename) => {
    try {
      const response = await axios.get(`http://localhost:9007/migration/dataset/${filename}`);
      // Ensure filename is preserved
      setReviewItem({ ...response.data, filename });
      setReviewCode(response.data.output_code || '');
    } catch (err) {
      console.error("Failed to open review", err);
    }
  };

  const handleApprove = async () => {
    if (!reviewItem) return;
    try {
      await axios.post('http://localhost:9007/migration/approve', {
        filename: reviewItem.filename,
        modifications: reviewCode
      });
      showAlert("Item approved to Golden Dataset!", "Success");
      setReviewItem(null);
      fetchDataset(); // Refresh list
    } catch (err) {
      showAlert("Failed to approve", "Error");
    }
  };

  const handleDeleteEntry = async () => {
    if (!reviewItem) return;
    if (!confirm("Delete this entry?")) return;
    try {
      await axios.delete(`http://localhost:9007/migration/dataset/${reviewItem.filename}`);
      setReviewItem(null);
      fetchDataset();
    } catch (err) {
      showAlert("Failed to delete", "Error");
    }
  };

  const handleGenerateTest = async () => {
    if (!reviewItem) return;
    try {
      showAlert("Generating test... check console/logs.", "Processing");
      await axios.post(`http://localhost:9007/migration/qa/generate_test?filename=${reviewItem.filename}`);
      showAlert("Test file generated in data/tests!", "Success");
    } catch (err) {
      showAlert("Failed to generate test: " + err.message, "Error");
    }
  };

  return (
    <div className="app-container">
      {/* Global Alert Modal */}
      {alertState.visible && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }} onClick={closeAlert}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card"
            style={{ minWidth: '350px', maxWidth: '500px', border: '1px solid var(--border-subtle)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
          >
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={20} color="var(--primary)" /> {alertState.title}
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
              {alertState.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={closeAlert}
                className="primary-button"
                style={{ background: 'var(--primary)', color: '#000', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                Confirm (OK)
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Review Modal */}
      {reviewItem && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass-card" style={{ width: '90%', height: '90%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3>Reviewing: <span style={{ color: 'var(--primary)' }}>{reviewItem.source_file}</span></h3>
              <button onClick={() => setReviewItem(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>Close</button>
            </div>

            <div style={{ flex: 1, display: 'flex', gap: '20px', minHeight: 0 }}>
              {/* Java Source */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ color: 'var(--text-muted)', marginBottom: '5px' }}>Original (Java)</label>
                <textarea
                  value={reviewItem.input_code}
                  readOnly
                  style={{ flex: 1, background: '#1e1e1e', color: '#d4d4d4', padding: '10px', borderRadius: '8px', border: 'none', fontFamily: 'monospace', resize: 'none' }}
                />
              </div>

              {/* Go Target */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ color: 'var(--text-muted)', marginBottom: '5px' }}>Target (Go) - Editable</label>
                <textarea
                  value={reviewCode}
                  onChange={(e) => setReviewCode(e.target.value)}
                  style={{ flex: 1, background: '#1e1e1e', color: '#10b981', padding: '10px', borderRadius: '8px', border: '1px solid var(--primary)', fontFamily: 'monospace', resize: 'none' }}
                />
              </div>
            </div>

            {/* Analysis Trace */}
            <div style={{ height: '100px', marginTop: '20px', overflowY: 'auto', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>AI Reasoning Trace:</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{reviewItem.analysis_trace}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '20px' }}>
              <button
                onClick={handleGenerateTest}
                style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--primary)', background: 'transparent', color: 'var(--primary)', cursor: 'pointer', marginRight: 'auto' }}
              >
                🧪 Generate Test
              </button>
              <button
                onClick={handleDeleteEntry}
                style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #ef4444', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', cursor: 'pointer' }}
              >
                Reject / Delete
              </button>
              <button
                className="primary-button"
                onClick={handleApprove}
                style={{ background: '#10b981', color: '#000' }}
              >
                <Check size={18} /> Approve to Golden Dataset
              </button>
            </div>
          </div>
        </div>
      )}

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

      <main className="main-content">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
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
                          <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete project ${name}?`)) axios.delete(`${API_BASE}/projects/${name}`).then(fetchProjects); }} className="btn-icon-sm hover-danger"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'autolab' && (
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
                        <Globe size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input id="repoUrl" className="input-field" style={{ paddingLeft: '48px' }} placeholder="https://github.com/..." />
                      </div>
                      <input id="repoBranch" className="input-field" style={{ width: '120px' }} defaultValue="master" />
                    </div>
                  </div>
                  <div className="grid-cols-auto">
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>TRAINING EPOCHS</label>
                      <input id="trainEpochs" type="number" className="input-field" defaultValue="50" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>BATCH SIZE</label>
                      <input id="batchSize" type="number" className="input-field" defaultValue="4" min="1" max="128" />
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px' }}>Lower values = faster training on CPU (recommended: 4-8)</p>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>TARGET EXTENSIONS</label>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                          id="fileExts"
                          className="input-field"
                          defaultValue=".java"
                          disabled={smartDiscovery}
                          style={{ opacity: smartDiscovery ? 0.5 : 1 }}
                        />
                        <button
                          onClick={() => setSmartDiscovery(!smartDiscovery)}
                          className="btn-nav"
                          style={{
                            width: 'auto',
                            margin: 0,
                            background: smartDiscovery ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                            color: 'white',
                            borderColor: smartDiscovery ? 'var(--primary-bright)' : 'var(--border-subtle)'
                          }}
                        >
                          {smartDiscovery ? '✦ Smart Auto' : 'Manual'}
                        </button>
                      </div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                        {smartDiscovery ? 'Analyzes all relevant code, configs and constants (.json, .xml, .properties, etc.)' : 'Specify extensions manually (e.g. .java, .py)'}
                      </p>
                    </div>
                  </div>

                  <button
                    className="btn-action"
                    style={{ alignSelf: 'start', padding: '16px 32px' }}
                    disabled={isLoading}
                    onClick={async () => {
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
                    }}
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
          )}

          {activeTab === 'transcribe' && (
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
          )}


          {activeTab === 'migration' && (
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

                  {!migrationPlan ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      <p>No plan loaded. Run Phase 1 analysis first.</p>
                      <button className="primary-button" style={{ marginTop: '16px' }}>Run Analysis</button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', flex: 1 }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Classes</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{migrationPlan.stats.nodes}</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', flex: 1 }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dependencies</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{migrationPlan.stats.edges}</div>
                        </div>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: '12px', flex: 1, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                          <div style={{ fontSize: '0.75rem', color: '#10b981' }}>Migration Health</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>Ready</div>
                        </div>
                      </div>

                      <h4 style={{ fontSize: '0.9rem', marginBottom: '12px', color: 'var(--text-secondary)' }}>Priority Queue (Topologically Sorted)</h4>
                      <div style={{ maxHeight: '400px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '8px' }}>
                        {migrationPlan.migration_order.map((cls, idx) => (
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
                              onClick={() => handleOpenReview(entry.filename)}
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
          )}

          {activeTab === 'settings' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 style={{ fontSize: '2.5rem', marginBottom: '40px' }}>Kernel Settings</h1>
              <div className="glass-card" style={{ maxWidth: '600px' }}>
                <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}><Settings size={20} color="var(--primary)" /> API Core Configuration</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>OPENROUTER MODEL</label>
                    <select
                      className="input-field"
                      value={selectedModel}
                      onChange={(e) => {
                        setSelectedModel(e.target.value);
                        localStorage.setItem('openrouter_model', e.target.value);
                      }}
                      style={{ background: 'rgba(255, 255, 255, 0.05)', cursor: 'pointer' }}
                    >
                      <option value="qwen/qwen3-coder">Qwen 3 Coder (User Choice)</option>
                      <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                      <option value="openai/gpt-4o">GPT-4o</option>
                      <option value="meta-llama/llama-3.1-405b-instruct">Llama 3.1 405B</option>
                      <option value="google/gemini-pro-1.5">Gemini Pro 1.5</option>
                      <option value="deepseek/deepseek-chat">DeepSeek Chat</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>OPENROUTER API KEY</label>
                    <input
                      type="password"
                      className="input-field"
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value);
                        localStorage.setItem('openrouter_key', e.target.value);
                      }}
                      placeholder="sk-or-v1-..."
                    />
                    <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: apiKey ? '#10b981' : '#f59e0b' }}></div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{apiKey ? 'API Auth Active' : 'Running in Simulation Mode'}</span>
                    </div>
                  </div>

                  <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                    <h4 style={{ marginBottom: '8px', fontSize: '0.9rem' }}>Security Protocol</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Keys are encrypted and stored within your local session vault. No keys are transmitted to our primary logs.</p>
                  </div>
                </div>
              </div>

              <div className="glass-card" style={{ maxWidth: '600px', marginTop: '32px' }}>
                <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Database size={20} color="var(--secondary)" /> RLCoder Indexing
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ padding: '16px', background: 'rgba(6, 182, 212, 0.05)', borderRadius: '12px', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--secondary)' }}>Status do Índice</h4>
                    {indexStatus.exists ? (
                      <div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--success)', marginBottom: '8px' }}>✅ Índice criado e ativo</p>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <p>• Arquivos: {indexStatus.total_files}</p>
                          <p>• Linhas: {indexStatus.total_lines?.toLocaleString()}</p>
                          <p>• Classes: {indexStatus.classes}</p>
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.85rem', color: 'var(--warning)' }}>⚠️ Índice não encontrado - usando modo simulado</p>
                    )}
                  </div>

                  <button
                    className="btn-action"
                    onClick={handleIndexL2J}
                    disabled={indexStatus.loading}
                    style={{ width: '100%' }}
                  >
                    {indexStatus.loading ? <RefreshCw className="animate-spin" size={20} /> : <Database size={20} />}
                    {indexStatus.loading ? 'Indexando...' : (indexStatus.exists ? 'REINDEXAR REPOSITÓRIO' : 'CRIAR ÍNDICE DO L2J')}
                  </button>

                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    O índice permite que o RLCoder recupere contexto real do repositório L2J durante transcrições.
                  </p>
                </div>
              </div>

              <div className="glass-card" style={{ maxWidth: '800px', marginTop: '32px' }}>
                <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Globe size={20} color="var(--accent)" /> Repository Management
                </h3>

                {/* Form para adicionar novo repositório */}
                <div style={{ padding: '20px', background: 'rgba(244, 114, 182, 0.05)', borderRadius: '12px', border: '1px solid rgba(244, 114, 182, 0.2)', marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '16px', color: 'var(--accent)' }}>+ Adicionar Novo Repositório</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '12px' }}>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Nome (ex: l2j-server-game)"
                      value={newRepoName}
                      onChange={(e) => setNewRepoName(e.target.value)}
                      style={{ fontSize: '0.85rem' }}
                    />
                    <input
                      type="text"
                      className="input-field"
                      placeholder="URL do GitHub (ex: https://github.com/...)"
                      value={newRepoUrl}
                      onChange={(e) => setNewRepoUrl(e.target.value)}
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>
                  <button
                    className="btn-action"
                    onClick={handleAddRepo}
                    disabled={!newRepoName || !newRepoUrl}
                    style={{ width: '100%' }}
                  >
                    <Globe size={18} /> CLONAR E ADICIONAR
                  </button>
                </div>

                {/* Lista de repositórios */}
                <div>
                  <h4 style={{ fontSize: '0.85rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>
                    Repositórios Cadastrados ({Object.keys(repos.repositories || {}).length})
                  </h4>
                  {Object.entries(repos.repositories || {}).map(([name, repo]) => (
                    <div
                      key={name}
                      style={{
                        padding: '16px',
                        background: repos.active_repo === name ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255,255,255,0.02)',
                        borderRadius: '12px',
                        border: `1px solid ${repos.active_repo === name ? 'var(--primary)' : 'var(--border-subtle)'}`,
                        marginBottom: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                            <span style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: repos.active_repo === name ? 'var(--primary)' : 'var(--text-muted)',
                              boxShadow: repos.active_repo === name ? '0 0 8px var(--primary)' : 'none'
                            }}></span>
                            <h4 style={{ fontSize: '1rem', margin: 0 }}>{name}</h4>
                            {repos.active_repo === name && (
                              <span style={{
                                fontSize: '0.65rem',
                                padding: '2px 8px',
                                background: 'var(--primary)',
                                borderRadius: '6px',
                                fontWeight: 700
                              }}>ATIVO</span>
                            )}
                          </div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', margin: '4px 0' }}>
                            {repo.url}
                          </p>
                          {repo.stats && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '4px 0' }}>
                              📊 {repo.stats.files} arquivos • {repo.stats.lines?.toLocaleString()} linhas • {repo.stats.classes} classes
                            </p>
                          )}
                          {!repo.indexed && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--warning)', margin: '4px 0' }}>
                              ⚠️ Não indexado
                            </p>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {repos.active_repo !== name && repo.indexed && (
                          <button
                            className="btn-action"
                            onClick={() => handleActivateRepo(name)}
                            style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                          >
                            <Zap size={14} /> Ativar
                          </button>
                        )}
                        <button
                          className="btn-action"
                          onClick={() => handleIndexRepo(name)}
                          style={{ fontSize: '0.75rem', padding: '6px 12px', background: 'rgba(6, 182, 212, 0.15)' }}
                        >
                          <Database size={14} /> {repo.indexed ? 'Reindexar' : 'Indexar'}
                        </button>
                        <button
                          className="btn-icon-sm hover-danger"
                          onClick={() => handleDeleteRepo(name)}
                          style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                        >
                          <Trash2 size={14} /> Remover
                        </button>
                      </div>
                    </div>
                  ))}

                  {Object.keys(repos.repositories || {}).length === 0 && (
                    <p style={{
                      textAlign: 'center',
                      padding: '40px',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '12px',
                      border: '1px dashed var(--border-subtle)'
                    }}>
                      Nenhum repositório cadastrado. Adicione um acima para começar.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <style>{`
        .animate-spin { animation: spin 2s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
      `}</style>
    </div >
  );
}

export default App;
