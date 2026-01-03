from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import os
import signal
import torch
import psutil
from typing import List, Optional

import json
from l2j_pipeline.migration_api import router as migration_router

app = FastAPI(title="HRM-Forge: Universal Training Hub")
app.include_router(migration_router)

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

# Global process tracking
active_processes = {}

def sync_project_status():
    """Syncs the in-memory active_processes with the persisted projects.json"""
    projects = load_projects()
    changed = False
    
    # 1. Clean up dead processes from active_processes
    # Copy keys to allow modification during iteration
    for pname, pid in list(active_processes.items()):
        try:
            if pid:
                os.kill(pid, 0) # Check if process is alive
        except OSError:
            # Process died
            del active_processes[pname]
    
    # 2. Update projects status based on reality
    for name, data in projects.items():
        if data.get("status") in ["training", "paused"]:
            # If it's supposed to be running but we don't track it OR the tracked pid is gone
            # Note: On server restart, active_processes is empty, so all "training" tasks 
            # correctly get marked as stopped/interrupted.
            if name not in active_processes:
                if data["status"] != "interrupted":
                     projects[name]["status"] = "interrupted"
                     changed = True
                     
    if changed:
        save_projects(projects)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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

class HuggingFaceUploadRequest(BaseModel):
    repo_id: str
    token: str
    private: bool = False
    latest_only: bool = True


@app.get("/projects")
async def list_projects():
    sync_project_status()
    return load_projects()

@app.get("/system/stats")
async def get_system_stats():
    """Returns real-time system metrics (CPU, RAM, GPU)."""
    
    # CPU & RAM
    cpu_percent = psutil.cpu_percent(interval=None)
    mem = psutil.virtual_memory()
    
    stats = {
        "cpu": {
            "percent": cpu_percent,
        },
        "memory": {
            "total_gb": round(mem.total / (1024**3), 1),
            "used_gb": round(mem.used / (1024**3), 1),
            "percent": mem.percent
        },
        "gpu": None
    }
    
    # GPU (nvidia-smi for system-wide stats)
    stats["gpus"] = []
    try:
        # Query: index, name, utilization.gpu, memory.total, memory.used
        # Format: csv, no header, no units (returns pure numbers)
        cmd = [
            "nvidia-smi", 
            "--query-gpu=index,name,utilization.gpu,memory.total,memory.used", 
            "--format=csv,noheader,nounits"
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            for line in result.stdout.strip().split('\n'):
                if not line: continue
                parts = [p.strip() for p in line.split(',')]
                if len(parts) >= 5:
                    idx, name, util, mem_total, mem_used = parts
                    stats["gpus"].append({
                        "index": int(idx),
                        "name": name,
                        "utilization_percent": float(util),
                        "total_gb": round(float(mem_total) / 1024, 1), # MB to GB
                        "used_gb": round(float(mem_used) / 1024, 1)    # MB to GB
                    })
    except Exception as e:
        print(f"Error getting GPU stats via nvidia-smi: {e}")
        # Fallback to torch if nvidia-smi fails but torch detects cuda
        if not stats["gpus"] and torch.cuda.is_available():
             try:
                count = torch.cuda.device_count()
                for i in range(count):
                    props = torch.cuda.get_device_properties(i)
                    stats["gpus"].append({
                        "index": i,
                        "name": torch.cuda.get_device_name(i),
                        "total_gb": round(props.total_memory / (1024**3), 1),
                        "utilization_percent": 0, # Cannot determine system util via torch
                        "used_gb": 0
                    })
             except: pass
            
    return stats

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
    """Executa transcrição usando o HybridMigrationEngine real (HRM+LLM+RLCoder)."""
    try:
        # Configurar ambiente
        if req.api_key:
            os.environ["OPENROUTER_API_KEY"] = req.api_key
            
        # Mock override
        if req.mock:
            return {
                "go_code": "// [MOCK] Transcrição simulada para " + req.target_lang,
                "guidance": {"strategy": "MOCK Strategy"},
                "reward": {"total": 0}
            }

        # Importar Engine Híbrido
        import sys
        cwd = os.getcwd()
        if cwd not in sys.path:
            sys.path.append(cwd)
            
        from l2j_pipeline.hybrid_migration_engine import HybridMigrationEngine
        
        print(f"[API] Initializing HybridEngine for single file: {req.model}")
        engine = HybridMigrationEngine(
            target_lang=req.target_lang,
            model=req.model,
            use_hrm_guidance=True
        )
        
        # Arquivo dummy para análise AST
        file_path = req.file_path or "StudioExperiment.java"
        
        # Gerar código
        result = engine.generate_code(req.java_code, file_path)
        
        if not result["success"]:
             raise HTTPException(status_code=500, detail=result.get("error", "Generation failed"))
             
        # Retornar estrutura rica para o Test Lab
        return {
            "go_code": result["code"],
            "guidance": result.get("guidance"),
            "reward": result.get("reward"),
            "rlcoder_context": result.get("rlcoder_context")
        }
        
    except Exception as e:
        print(f"❌ Transcribe Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Legacy implementation kept for reference
async def _legacy_transcribe(req: TranscriptionRequest):
    """Executa transcrição usando o HybridMigrationEngine real (HRM+LLM+RLCoder)."""
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
        "--exts", ",".join(req.file_extensions),
        "--project-name", req.project_name  # ✅ Passar nome do projeto
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
    """Remove projeto completamente: processo, arquivos, checkpoints e config."""
    import shutil
    import traceback

    try:
        # 1. Stop if running
        pid = active_processes.get(project_name)
        if pid:
            try: 
                os.kill(pid, signal.SIGKILL)
                print(f"[Delete] ✓ Processo {pid} terminado")
            except: 
                pass
            del active_processes[project_name]
        
        # 2. Remove project data
        proj_dir = f"data/projects/{project_name}"
        if os.path.exists(proj_dir):
            try:
                shutil.rmtree(proj_dir)
                print(f"[Delete] ✓ Removido: {proj_dir}")
            except Exception as e:
                print(f"[Delete] ⚠️ Falha ao remover diretório do projeto: {e}")
        
        # 3. Remove logs
        log_file = f"data/logs/{project_name}.log"
        if os.path.exists(log_file):
            try:
                os.remove(log_file)
                print(f"[Delete] ✓ Removido: {log_file}")
            except Exception as e:
                print(f"[Delete] ⚠️ Falha ao remover log: {e}")
        
        # 4. Remove checkpoints (usando match flexível como no download)
        checkpoint_base = "checkpoints"
        checkpoints_removed = 0
        
        if os.path.exists(checkpoint_base):
            project_key = project_name.lower().split('-')[0]
            
            for dirname in os.listdir(checkpoint_base):
                dirname_lower = dirname.lower()
                
                # Match flexível (mesma lógica do download)
                if (project_name.lower() in dirname_lower or 
                    project_key in dirname_lower or
                    dirname_lower.startswith(project_key)):
                    
                    checkpoint_path = os.path.join(checkpoint_base, dirname)
                    if os.path.isdir(checkpoint_path):
                        # Calcular tamanho antes de remover (protegido)
                        size_mb = 0
                        try:
                            size_mb = sum(os.path.getsize(os.path.join(dirpath, filename))
                                        for dirpath, dirnames, filenames in os.walk(checkpoint_path)
                                        for filename in filenames) / (1024 * 1024)
                        except Exception:
                            pass # Ignorar erro de cálculo de tamanho
                        
                        try:
                            shutil.rmtree(checkpoint_path)
                            checkpoints_removed += 1
                            print(f"[Delete] ✓ Removido checkpoint: {dirname} ({size_mb:.1f} MB)")
                        except Exception as e:
                            print(f"[Delete] ⚠️ Falha ao remover checkpoint {dirname}: {e}")
        
        # 5. Remove from config
        projects = load_projects()
        if project_name in projects:
            del projects[project_name]
            save_projects(projects)
            print(f"[Delete] ✓ Removido do config")
        
        return {
            "message": f"Projeto {project_name} excluído completamente",
            "checkpoints_removed": checkpoints_removed
        }

    except Exception as e:
        print(f"❌ Erro crítico ao deletar projeto {project_name}: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao deletar projeto: {str(e)}")

# ==================== Download / Upload ====================
from fastapi.responses import FileResponse
import shutil

@app.get("/projects/{project_name}/download")
async def download_project(project_name: str):
    """Compacta o projeto (dados + checkpoints) e retorna o ZIP."""
    import tempfile
    
    proj_dir = f"data/projects/{project_name}"
    checkpoint_base = "checkpoints"
    
    # Verificar se existe projeto OU checkpoints
    has_project_data = os.path.exists(proj_dir)
    has_checkpoints = False
    
    # Buscar checkpoints relacionados ao projeto
    # Match mais flexível: parte do nome do projeto ou vice-versa
    if os.path.exists(checkpoint_base):
        for dirname in os.listdir(checkpoint_base):
            # Extrair primeira parte do nome (antes do hífen ou maiúsculas)
            # l2j-server-game -> procura por "l2j"
            # L2J-Auto-Train contém "l2j"
            project_key = project_name.lower().split('-')[0]  # "l2j"
            dirname_lower = dirname.lower()
            
            # Match se:
            # 1. Nome do projeto está no dirname
            # 2. Primeira parte do projeto está no dirname  
            # 3. dirname começa com primeira parte do projeto
            if (project_name.lower() in dirname_lower or 
                project_key in dirname_lower or
                dirname_lower.startswith(project_key)):
                if os.path.isdir(os.path.join(checkpoint_base, dirname)):
                    has_checkpoints = True
                    print(f"[Download Check] Checkpoint encontrado: {dirname}")
                    break
    
    if not has_project_data and not has_checkpoints:
        raise HTTPException(status_code=404, detail=f"Projeto {project_name} não encontrado (sem dados e sem checkpoints)")
    
    # Criar diretório temporário para montar estrutura
    os.makedirs("data/temp_export", exist_ok=True)
    temp_dir = tempfile.mkdtemp(dir="data/temp_export")
    
    try:
        # Copiar data/projects/{name} se existir
        if has_project_data:
            shutil.copytree(proj_dir, os.path.join(temp_dir, "data"))
            print(f"[Download] Incluindo dados do projeto: {proj_dir}")
        
        # Copiar checkpoints se existirem
        checkpoint_found = False
        if os.path.exists(checkpoint_base):
            # Usar a MESMA lógica de match que usamos acima
            project_key = project_name.lower().split('-')[0]
            
            for dirname in os.listdir(checkpoint_base):
                dirname_lower = dirname.lower()
                
                # Match flexível (mesma lógica da verificação)
                if (project_name.lower() in dirname_lower or 
                    project_key in dirname_lower or
                    dirname_lower.startswith(project_key)):
                    source_path = os.path.join(checkpoint_base, dirname)
                    if os.path.isdir(source_path):
                        checkpoint_dest = os.path.join(temp_dir, "checkpoints")
                        os.makedirs(checkpoint_dest, exist_ok=True)
                        print(f"[Download] Copiando checkpoint: {dirname} ({os.path.getsize(source_path)} bytes)")
                        shutil.copytree(source_path, os.path.join(checkpoint_dest, dirname))
                        checkpoint_found = True
                        print(f"[Download] ✓ Checkpoint incluído: {dirname}")
        
        # Criar README informativo
        readme_content = f"""# HRM Project Export: {project_name}

## Contents:
- Project Data: {'✓ Included' if has_project_data else '✗ Not available yet (training in progress)'}
- Checkpoints: {'✓ Included' if checkpoint_found else '✗ Not found'}

## Instructions:
1. Extract this ZIP to your HRM-pipeline directory
2. If checkpoints are included, they will be in checkpoints/
3. If project data is included, it will be in data/projects/{project_name}/

Generated: {os.popen('date').read().strip()}
"""
        with open(os.path.join(temp_dir, "README.txt"), "w") as f:
            f.write(readme_content)
        
        # Criar ZIP
        zip_base_name = f"data/temp_export/{project_name}_complete"
        shutil.make_archive(zip_base_name, 'zip', temp_dir)
        zip_file = f"{zip_base_name}.zip"
        
        return FileResponse(
            zip_file, 
            media_type='application/zip', 
            filename=f"{project_name}_complete.zip",
            headers={
                "X-Checkpoints-Included": str(checkpoint_found),
                "X-Project-Data-Included": str(has_project_data)
            }
        )
    finally:
        # Limpar temp_dir
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

from fastapi import UploadFile, File

@app.post("/projects/upload")
async def upload_project(file: UploadFile = File(...)):
    """Recebe um ZIP de projeto e o restaura."""
    try:
        project_name = file.filename.replace(".zip", "")
        # Sanitize filename
        project_name = "".join([c for c in project_name if c.isalnum() or c in ('-', '_')])
        
        target_dir = f"data/projects/{project_name}"
        if os.path.exists(target_dir):
             raise HTTPException(status_code=400, detail=f"Projeto {project_name} já existe")
             
        os.makedirs(target_dir, exist_ok=True)
        
        # Save zip temp
        temp_zip = f"data/temp_upload_{project_name}.zip"
        with open(temp_zip, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Extract
        shutil.unpack_archive(temp_zip, target_dir)
        os.remove(temp_zip)
        
        # Register in projects.json (minimal info)
        projects = load_projects()
        projects[project_name] = {
            "repo": "Uploaded",
            "epochs": 0,
            "status": "finished",
            "extensions": []
        }
        save_projects(projects)
        
        return {"message": f"Projeto {project_name} importado com sucesso", "project": project_name}
        
    except Exception as e:
        print(f"Error upload: {e}")
        raise HTTPException(status_code=500, detail=f"Erro no upload: {str(e)}")


# ==================== Hugging Face Upload ====================

@app.post("/projects/{project_name}/upload-hf")
async def upload_to_huggingface(project_name: str, req: HuggingFaceUploadRequest, background_tasks: BackgroundTasks):
    """Faz upload do modelo treinado para Hugging Face Hub."""
    
    # Verificar se projeto existe
    projects = load_projects()
    if project_name not in projects:
        raise HTTPException(status_code=404, detail=f"Projeto {project_name} não encontrado")
    
    # Verificar se checkpoint existe
    checkpoint_base = f"checkpoints/{project_name}"
    if not os.path.exists(checkpoint_base):
        raise HTTPException(status_code=404, detail=f"Checkpoints não encontrados para {project_name}")
    
    log_file = f"data/logs/{project_name}_hf_upload.log"
    os.makedirs("data/logs", exist_ok=True)
    
    def run_upload():
        """Executa upload em background."""
        try:
            cmd = [
                ".venv/bin/python", "upload_to_huggingface.py",
                "--project", project_name,
                "--repo-id", req.repo_id,
                "--token", req.token
            ]
            
            if req.private:
                cmd.append("--private")
            
            if req.latest_only:
                cmd.append("--latest-only")
            
            print(f"[HF Upload] Iniciando upload de {project_name} para {req.repo_id}")
            
            with open(log_file, "w") as f:
                process = subprocess.run(
                    cmd,
                    stdout=f,
                    stderr=subprocess.STDOUT,
                    text=True
                )
                
            if process.returncode == 0:
                print(f"[HF Upload] ✅ Upload concluído: {req.repo_id}")
            else:
                print(f"[HF Upload] ❌ Upload falhou com código {process.returncode}")
                
        except Exception as e:
            print(f"[HF Upload] ❌ Erro: {e}")
            with open(log_file, "a") as f:
                f.write(f"\n\nERRO: {str(e)}")
    
    background_tasks.add_task(run_upload)
    
    return {
        "message": f"Upload para Hugging Face iniciado",
        "project": project_name,
        "repo_id": req.repo_id,
        "log_file": log_file
    }

@app.get("/projects/{project_name}/upload-hf/logs")
async def get_hf_upload_logs(project_name: str):
    """Retorna logs do upload para Hugging Face."""
    log_file = f"data/logs/{project_name}_hf_upload.log"
    
    if not os.path.exists(log_file):
        return {"logs": "Aguardando início do upload..."}
    
    with open(log_file, "r") as f:
        lines = f.readlines()
        return {"logs": "".join(lines[-100:])}  # Últimas 100 linhas


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9007)
