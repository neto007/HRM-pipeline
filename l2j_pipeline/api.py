from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import os
import signal
import torch
from typing import List, Optional

import json

app = FastAPI(title="HRM-Forge: Universal Training Hub")

# Project management
PROJECTS_FILE = "hrm_projects.json"

def load_projects():
    if os.path.exists(PROJECTS_FILE):
        with open(PROJECTS_FILE, "r") as f:
            return json.load(f)
    return {}

def save_projects(projects):
    with open(PROJECTS_FILE, "w") as f:
        json.dump(projects, f, indent=2)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global process tracking
active_processes = {}

class TranscriptionRequest(BaseModel):
    file_path: Optional[str] = None
    java_code: Optional[str] = None
    target_lang: str = "Go"
    mock: bool = False
    api_key: Optional[str] = None
    model: Optional[str] = "anthropic/claude-3.5-sonnet"

class DatasetRequest(BaseModel):
    input_dir: str
    output_dir: str

class AddRepoRequest(BaseModel):
    name: str
    url: str

class AutoTrainRequest(BaseModel):
    project_name: str
    repo_url: str
    epochs: int = 10
    batch_size: int = 4
    branch: str = "master"
    file_extensions: List[str] = [".java"]

@app.get("/projects")
async def list_projects():
    return load_projects()

# ==================== RLCoder Repository Management ====================

@app.get("/rlcoder/repos")
async def list_repos():
    """Lista todos os repositórios cadastrados."""
    try:
        from l2j_pipeline.repo_manager import RepositoryManager
    except ImportError:
        from repo_manager import RepositoryManager
    manager = RepositoryManager()
    return manager.list_repos()

@app.post("/rlcoder/repos/add")
async def add_repo(req: AddRepoRequest, background_tasks: BackgroundTasks):
    """Adiciona e clona um novo repositório."""
    try:
        from l2j_pipeline.repo_manager import RepositoryManager
    except ImportError:
        from repo_manager import RepositoryManager
    
    def clone_repo():
        try:
            manager = RepositoryManager()
            result = manager.add_repo(req.name, req.url)
            print(f"[✅] Repositório {req.name} adicionado com sucesso!")
            return result
        except Exception as e:
            print(f"[❌] Erro ao adicionar repositório: {e}")
    
    background_tasks.add_task(clone_repo)
    return {"message": f"Clonando repositório {req.name} em background", "status": "processing"}

@app.post("/rlcoder/repos/{name}/index")
async def index_repo(name: str, background_tasks: BackgroundTasks):
    """Indexa um repositório específico."""
    try:
        from l2j_pipeline.repo_manager import RepositoryManager
    except ImportError:
        from repo_manager import RepositoryManager
    
    def run_indexing():
        try:
            manager = RepositoryManager()
            stats = manager.index_repo(name)
            print(f"[✅] Repositório {name} indexado com sucesso!")
            print(f"   Stats: {stats}")
        except Exception as e:
            print(f"[❌] Erro ao indexar: {e}")
    
    background_tasks.add_task(run_indexing)
    return {"message": f"Indexando repositório {name} em background", "status": "processing"}

@app.post("/rlcoder/repos/{name}/activate")
async def activate_repo(name: str):
    """Define um repositório como ativo."""
    try:
        from l2j_pipeline.repo_manager import RepositoryManager
    except ImportError:
        from repo_manager import RepositoryManager
    manager = RepositoryManager()
    manager.activate_repo(name)
    return {"message": f"Repositório {name} ativado", "active_repo": name}

@app.delete("/rlcoder/repos/{name}")
async def delete_repo(name: str):
    """Remove um repositório."""
    try:
        from l2j_pipeline.repo_manager import RepositoryManager
    except ImportError:
        from repo_manager import RepositoryManager
    manager = RepositoryManager()
    manager.delete_repo(name)
    return {"message": f"Repositório {name} removido"}

# =====================================================================
@app.get("/status")
async def get_status():
    return {"status": "online", "cuda_available": torch.cuda.is_available()}

@app.post("/index-l2j")
async def index_l2j_repo(background_tasks: BackgroundTasks):
    """Executa indexação do repositório L2J para RLCoder."""
    def run_indexing():
        try:
            cmd = [".venv/bin/python", "l2j_pipeline/index_l2j_repo.py"]
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            print("[✅] Indexação concluída!")
            print(result.stdout)
        except subprocess.CalledProcessError as e:
            print(f"[❌] Erro na indexação: {e.stderr}")
    
    background_tasks.add_task(run_indexing)
    return {"message": "Indexação iniciada em background", "status": "processing"}

@app.get("/index-status")
async def get_index_status():
    """Verifica se o índice RLCoder existe."""
    index_path = "data/rlcoder_index/l2j_index.json"
    if os.path.exists(index_path):
        with open(index_path, 'r') as f:
            import json
            index = json.load(f)
            return {
                "exists": True,
                "total_files": index["metadata"]["total_files"],
                "total_lines": index["metadata"]["total_lines"],
                "classes": len(index["class_map"])
            }
    return {"exists": False}

@app.post("/transcribe")
async def run_transcribe(req: TranscriptionRequest):
    # Executa o script de transcrição via subprocesso e retorna a saída
    cmd = [".venv/bin/python", "l2j_pipeline/transcribe.py"]
    
    env = os.environ.copy()
    if req.api_key:
        env["OPENROUTER_API_KEY"] = req.api_key

    # Sempre usar --mock se não tiver API key ou código
    if req.mock or not req.api_key:
        cmd.append("--mock")
    
    cmd.extend(["--lang", req.target_lang])
    if req.model:
        cmd.extend(["--model", req.model])
    
    try:
        # Importar RLCoder Adapter para capturar contexto
        rlcoder_context = None
        if req.java_code: # Only retrieve context if java_code is provided
            try:
                import sys
                sys.path.insert(0, "l2j_pipeline")
                from rlcoder_adapter import RLCoderAdapter
                rlcoder = RLCoderAdapter()
                rlcoder_context = rlcoder.retrieve_context(req.java_code, top_k=3)
            except Exception as e:
                print(f"[!] Erro ao capturar contexto RLCoder: {e}")
        
        # Se não está em modo mock e tem código, passar via stdin
        subprocess_input = None
        if not req.mock and req.java_code and req.api_key:
            subprocess_input = req.java_code
            # Remover --mock se foi adicionado
            if "--mock" in cmd:
                cmd.remove("--mock")
        
        result = subprocess.run(cmd, capture_output=True, text=True, check=True, input=subprocess_input, env=env)
        
        return {
            "output": result.stdout,
            "rlcoder_context": rlcoder_context  # Adicionar contexto à resposta
        }
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=e.stderr or e.stdout)

@app.post("/repo/clone-and-train")
async def clone_and_train(req: AutoTrainRequest, background_tasks: BackgroundTasks):
    log_file = f"data/logs/{req.project_name}.log"
    os.makedirs("data/logs", exist_ok=True)
    
    # Salva o projeto no histórico
    projects = load_projects()
    projects[req.project_name] = {
        "repo": req.repo_url,
        "epochs": req.epochs,
        "status": "training",
        "extensions": req.file_extensions
    }
    save_projects(projects)

    cmd = [
        ".venv/bin/python", "-u", "l2j_pipeline/auto_train.py",
        "--repo", req.repo_url,
        "--epochs", str(req.epochs),
        "--batch-size", str(req.batch_size),
        "--branch", req.branch,
        "--output", f"data/projects/{req.project_name}",
        "--exts", ",".join(req.file_extensions)
    ]
    
    f = open(log_file, "w")
    process = subprocess.Popen(cmd, stdout=f, stderr=f, text=True, bufsize=1)
    active_processes[req.project_name] = process.pid
    
    return {"message": f"Pipeline para {req.project_name} iniciado", "project": req.project_name, "pid": process.pid}

@app.get("/logs/{project_name}")
async def get_project_logs(project_name: str):
    log_file = f"data/logs/{project_name}.log"
    if not os.path.exists(log_file):
        return {"logs": "Aguardando logs..."}
    
    with open(log_file, "r") as f:
        lines = f.readlines()
        return {"logs": "".join(lines[-100:])}

@app.get("/logs/{process_name}")
async def get_logs(process_name: str):
    # Idealmente usaria WebSockets, mas para o MVP vamos retornar status
    pid = active_processes.get(process_name)
    if not pid:
        return {"status": "idle"}
    
    try:
        os.kill(pid, 0) # Check if process exists
        return {"status": "running", "pid": pid}
    except OSError:
        if process_name in active_processes:
            del active_processes[process_name]
        return {"status": "finished"}

@app.post("/projects/{project_name}/cancel")
async def cancel_project(project_name: str):
    pid = active_processes.get(project_name)
    if pid:
        try:
            os.kill(pid, signal.SIGTERM)
            del active_processes[project_name]
            # Update project status
            projects = load_projects()
            if project_name in projects:
                projects[project_name]["status"] = "cancelled"
                save_projects(projects)
            return {"message": f"Projeto {project_name} cancelado"}
        except OSError:
            return {"message": "Processo não encontrado ou já encerrado"}
    raise HTTPException(status_code=404, detail="Processo não está rodando")

@app.post("/projects/{project_name}/pause")
async def pause_project(project_name: str):
    pid = active_processes.get(project_name)
    if pid:
        try:
            os.kill(pid, signal.SIGSTOP)
            projects = load_projects()
            if project_name in projects:
                projects[project_name]["status"] = "paused"
                save_projects(projects)
            return {"message": f"Projeto {project_name} pausado"}
        except OSError:
            raise HTTPException(status_code=500, detail="Erro ao pausar processo")
    raise HTTPException(status_code=404, detail="Processo não está rodando")

@app.post("/projects/{project_name}/resume")
async def resume_project(project_name: str):
    pid = active_processes.get(project_name)
    if pid:
        try:
            os.kill(pid, signal.SIGCONT)
            projects = load_projects()
            if project_name in projects:
                projects[project_name]["status"] = "training"
                save_projects(projects)
            return {"message": f"Projeto {project_name} retomado"}
        except OSError:
            raise HTTPException(status_code=500, detail="Erro ao retomar processo")
    raise HTTPException(status_code=404, detail="Processo não está rodando")

@app.delete("/projects/{project_name}")
async def delete_project(project_name: str):
    # 1. Stop if running
    pid = active_processes.get(project_name)
    if pid:
        try: os.kill(pid, signal.SIGKILL)
        except: pass
        del active_processes[project_name]
    
    # 2. Remove files
    proj_dir = f"data/projects/{project_name}"
    log_file = f"data/logs/{project_name}.log"
    
    import shutil
    if os.path.exists(proj_dir):
        shutil.rmtree(proj_dir)
    if os.path.exists(log_file):
        os.remove(log_file)
        
    # 3. Remove from config
    projects = load_projects()
    if project_name in projects:
        del projects[project_name]
        save_projects(projects)
        
    return {"message": f"Projeto {project_name} excluído com sucesso"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9007)
