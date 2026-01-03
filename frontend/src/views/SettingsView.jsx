import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Database, RefreshCw, Globe, Zap, Trash2 } from 'lucide-react';

const SettingsView = ({
    selectedModel, setSelectedModel,
    apiKey, setApiKey,
    indexStatus, handleIndexL2J,
    newRepoName, setNewRepoName,
    newRepoUrl, setNewRepoUrl,
    handleAddRepo,
    repos,
    handleActivateRepo,
    handleIndexRepo,
    handleDeleteRepo
}) => {
    return (
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
    );
};
export default SettingsView;
