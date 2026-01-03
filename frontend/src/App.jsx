import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import axios from 'axios';
import HuggingFaceUploadModal from './components/modals/HuggingFaceUploadModal';
import ReviewModal from './components/modals/ReviewModal';
import Sidebar from './components/layout/Sidebar';
import DashboardView from './views/DashboardView';
import AutoLabView from './views/AutoLabView';
import StudioView from './views/StudioView';
import MigrationView from './views/MigrationView';
import SettingsView from './views/SettingsView';

const API_BASE = '';

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
  // HuggingFace Upload State
  const [hfModalOpen, setHfModalOpen] = useState(false);
  const [hfUploadProject, setHfUploadProject] = useState(null);
  const [hfRepoId, setHfRepoId] = useState('');
  const [hfToken, setHfToken] = useState('');
  const [hfPrivate, setHfPrivate] = useState(false);
  const [hfLatestOnly, setHfLatestOnly] = useState(true);
  const [hfUploading, setHfUploading] = useState(false);


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
      fetchCheckpoints();
      const interval = setInterval(fetchDataset, 5000); // Poll dataset changes
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const fetchCheckpoints = async () => {
    try {
      const res = await axios.get(`${API_BASE}/migration/checkpoints`);
      setHrmCheckpoints(res.data);
      // Auto-select first if available
      if (res.data.length > 0 && selectedCheckpoint === 'default') {
        setSelectedCheckpoint(res.data[0].path);
      }
    } catch (e) {
      console.error("Failed to fetch checkpoints", e);
    }
  };

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


  const handleDownloadProject = async (projectName) => {
    try {
      console.log('[Download] Iniciando download de:', projectName);
      const downloadUrl = `${window.location.origin}/projects/${projectName}/download`;
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/zip' },
      });
      if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectName}_complete.zip`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
      showAlert(`Project ${projectName} downloaded! (${(blob.size / 1024 / 1024).toFixed(2)} MB)`, 'Success');
    } catch (err) {
      console.error('[Download] Erro:', err);
      showAlert('Download failed: ' + err.message, 'Error');
    }
  };

  const handleUploadToHuggingFace = async () => {
    if (!hfRepoId || !hfToken) {
      showAlert('Por favor, preencha Repo ID e Token', 'Error');
      return;
    }
    setHfUploading(true);
    try {
      const res = await axios.post(`${API_BASE}/projects/${hfUploadProject}/upload-hf`, {
        repo_id: hfRepoId,
        token: hfToken,
        private: hfPrivate,
        latest_only: hfLatestOnly
      });
      showAlert(`Upload iniciado! ${res.data.message}`, 'Success');
      setHfModalOpen(false);
      setHfRepoId('');
      setHfToken('');
    } catch (err) {
      showAlert('Upload failed: ' + (err.response?.data?.detail || err.message), 'Error');
    } finally {
      setHfUploading(false);
    }
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

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sysStatus={sysStatus}
      />

      <main className="main-content">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <DashboardView
              projects={projects}
              selectedProject={selectedProject}
              setSelectedProject={setSelectedProject}
              fetchProjects={fetchProjects}
              handleDownloadProject={handleDownloadProject}
              onUploadClick={(name) => { setHfUploadProject(name); setHfModalOpen(true); }}
              API_BASE={API_BASE}
            />
          )}

          {activeTab === 'autolab' && (
            <AutoLabView
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              smartDiscovery={smartDiscovery}
              setSmartDiscovery={setSmartDiscovery}
              terminalLogs={terminalLogs}
              setTerminalLogs={setTerminalLogs}
              fetchProjects={fetchProjects}
              setSelectedProject={setSelectedProject}
              fetchLogs={fetchLogs}
              showAlert={showAlert}
              API_BASE={API_BASE}
            />
          )}

          {activeTab === 'transcribe' && (
            <StudioView
              isLoading={isLoading}
              handleTranscribe={handleTranscribe}
              javaCode={javaCode}
              setJavaCode={setJavaCode}
              targetCode={targetCode}
              hrmPlan={hrmPlan}
              rlcoderContext={rlcoderContext}
            />
          )}


          {activeTab === 'migration' && (
            <MigrationView
              migrationPlan={migrationPlan}
              migrationDataset={migrationDataset}
              selectedCheckpoint={selectedCheckpoint}
              setSelectedCheckpoint={setSelectedCheckpoint}
              hrmCheckpoints={hrmCheckpoints}
              genLimit={genLimit}
              setGenLimit={setGenLimit}
              isGenLoading={isGenLoading}
              handleGenerateDataset={handleGenerateDataset}
              showAlert={showAlert}
              onOpenReview={handleOpenReview}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              apiKey={apiKey}
              setApiKey={setApiKey}
              indexStatus={indexStatus}
              handleIndexL2J={handleIndexL2J}
              newRepoName={newRepoName}
              setNewRepoName={setNewRepoName}
              newRepoUrl={newRepoUrl}
              setNewRepoUrl={setNewRepoUrl}
              handleAddRepo={handleAddRepo}
              repos={repos}
              handleActivateRepo={handleActivateRepo}
              handleIndexRepo={handleIndexRepo}
              handleDeleteRepo={handleDeleteRepo}
            />
          )}
        </AnimatePresence>

        {/* HuggingFace Upload Modal */}
        <HuggingFaceUploadModal
          isOpen={hfModalOpen}
          onClose={() => setHfModalOpen(false)}
          project={hfUploadProject}
          repoId={hfRepoId}
          setRepoId={setHfRepoId}
          token={hfToken}
          setToken={setHfToken}
          isPrivate={hfPrivate}
          setIsPrivate={setHfPrivate}
          latestOnly={hfLatestOnly}
          setLatestOnly={setHfLatestOnly}
          uploading={hfUploading}
          onUpload={handleUploadToHuggingFace}
        />
        <ReviewModal
          reviewItem={reviewItem}
          onClose={() => setReviewItem(null)}
          code={reviewCode}
          setCode={setReviewCode}
          onApprove={handleApprove}
          onDelete={handleDeleteEntry}
        />
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
