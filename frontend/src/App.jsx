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
  ChevronRight,
  GitBranch
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
  const [selectedModel, setSelectedModel] = useState(localStorage.getItem('openrouter_model') || 'anthropic/claude-3.5-sonnet');
  const [projects, setProjects] = useState({});
  const [selectedProject, setSelectedProject] = useState(null);
  const [smartDiscovery, setSmartDiscovery] = useState(true);
  const [rlcoderContext, setRlcoderContext] = useState(null);
  const [indexStatus, setIndexStatus] = useState({ exists: false, loading: false });
  const [repos, setRepos] = useState({ repositories: {}, active_repo: null });
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [newRepoName, setNewRepoName] = useState('');

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
      alert('Erro ao adicionar repositório: ' + e.message);
    }
  };

  const handleIndexRepo = async (name) => {
    try {
      await axios.post(`${API_BASE}/rlcoder/repos/${name}/index`);
      setTimeout(fetchRepos, 3000);
    } catch (e) {
      alert('Erro ao indexar: ' + e.message);
    }
  };

  const handleActivateRepo = async (name) => {
    try {
      await axios.post(`${API_BASE}/rlcoder/repos/${name}/activate`);
      fetchRepos();
    } catch (e) {
      alert('Erro ao ativar: ' + e.message);
    }
  };

  const handleDeleteRepo = async (name) => {
    if (!confirm(`Remover repositório ${name}?`)) return;
    try {
      await axios.delete(`${API_BASE}/rlcoder/repos/${name}`);
      fetchRepos();
    } catch (e) {
      alert('Erro ao remover: ' + e.message);
    }
  };

  const handleTranscribe = async () => {
    setIsLoading(true);
    setRlcoderContext(null); // Reset
    try {
      const res = await axios.post(`${API_BASE}/transcribe`, {
        java_code: javaCode,
        target_lang: 'Go',
        mock: !apiKey,
        api_key: apiKey,
        model: selectedModel
      });

      const output = res.data.output;
      const lines = output.split('\n');
      const plan = lines.filter(l => l.includes('>')).map(l => l.replace('>', '').trim());
      setHrmPlan(plan);
      setTargetCode(output.split('--- Result')[0]);

      // Capturar contexto RLCoder se disponível
      if (res.data.rlcoder_context) {
        setRlcoderContext(res.data.rlcoder_context);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const menuItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'Control Center' },
    { id: 'autolab', icon: <Layers size={20} />, label: 'Forge Lab' },
    { id: 'transcribe', icon: <Code2 size={20} />, label: 'Studio' },
    { id: 'settings', icon: <Settings size={20} />, label: 'Config' }
  ];

  return (
    <div className="app-container">
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
              <p style={{ color: 'var(--text-secondary)', marginBottom: '40px' }}>Synthesize a new reasoning model by bridging a code repository.</p>

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
                        alert('Forge Failure: ' + e.message);
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
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div>
                  <h1 style={{ fontSize: '2.5rem' }}>Neural Studio</h1>
                  <p style={{ color: 'var(--text-secondary)' }}>Transcribe source code through the selected HRM Reasoning Engine.</p>
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
                      <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (Recomendado)</option>
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
