from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import os
import json
import subprocess
import glob
import time

router = APIRouter(prefix="/migration", tags=["migration"])

class GenerateRequest(BaseModel):
    limit: int = 5
    target_lang: str = "Go"
    model: str = "qwen/qwen3-coder"
    use_hrm_model: bool = False  # Mantido por compatibilidade, mas sempre usa híbrido

@router.get("/plan")
async def get_migration_plan():
    """Retorna o plano de migração (dependências e ordem)."""
    return load_migration_plan_data()

@router.post("/generate")
async def generate_dataset(req: GenerateRequest, background_tasks: BackgroundTasks):
    """Inicia a geração usando HybridMigrationEngine (HRM+LLM+RLCoder)."""
    
    def run_generation():
        print(f"[*] Starting Hybrid Migration (HRM+LLM+RLCoder) - limit={req.limit}")
        
        try:
            # Usar HybridMigrationEngine diretamente
            import sys
            sys.path.append('l2j_pipeline')
            from hybrid_migration_engine import HybridMigrationEngine
            import json
            
            # Carregar plano de migração
            plan = load_migration_plan_data()
            if not plan or 'migration_order' not in plan:
                print("❌ Migration plan not found")
                return
            
            # Inicializar engine híbrido
            engine = HybridMigrationEngine(
                target_lang=req.target_lang,
                model=req.model,
                use_hrm_guidance=True  # Sempre usa guidance
            )
            
            # Processar files em batch
            processed = 0
            for class_name in plan['migration_order'][:req.limit]:
                # Encontrar file path
                file_path = None
                for node in plan.get('graph_data', {}).get('nodes', []):
                    if node['id'] == class_name:
                        file_path = node['file_path']
                        break
                
                if not file_path or not os.path.exists(file_path):
                    continue
                
                # Ler Java code
                with open(file_path, 'r') as f:
                    java_code = f.read()
                
                print(f"[{processed+1}/{req.limit}] Processing {class_name}...")
                
                # Gerar com engine híbrido
                result = engine.generate_code(java_code, file_path)
                
                if result.get('success'):
                    # Salvar no dataset
                    os.makedirs("data/synth_dataset", exist_ok=True)
                    safe_name = os.path.basename(file_path).replace('.', '_') + "_java.json"
                    output_path = os.path.join("data/synth_dataset", safe_name)
                    
                    entry = {
                        "source_file": file_path,
                        "target_lang": req.target_lang,
                        "model_used": req.model,
                        "input_code": java_code,
                        "output_code": result['code'],
                        "test_code": result.get('test_code', ''),
                        "guidance": result.get('guidance', {}),
                        "reward": result.get('reward', {}),
                        "attempts": result.get('attempts', 1),
                        "timestamp": time.time(),
                        "pipeline_version": "hybrid_v1_hrm_llm_rlcoder"
                    }
                    
                    with open(output_path, 'w') as f:
                        json.dump(entry, f, indent=2)
                    
                    print(f"   ✅ Success! Reward: {result['reward']['total']:.1f}/20")
                    processed += 1
                else:
                    print(f"   ❌ Failed: {result.get('error')}")
            
            print(f"\n🎉 Batch complete: {processed}/{req.limit} files migrated")
            
        except Exception as e:
            print(f"❌ Generation error: {e}")
            import traceback
            traceback.print_exc()
            
    background_tasks.add_task(run_generation)
    return {"message": "Hybrid migration started (HRM+LLM+RLCoder)", "status": "processing"}

@router.get("/dataset")
async def list_dataset_entries():
    """Lista os arquivos gerados no dataset sintético."""
    dataset_dir = "data/synth_dataset"
    if not os.path.exists(dataset_dir):
        return {"entries": []}
    
    files = glob.glob(os.path.join(dataset_dir, "*_java.json"))
    entries = []
    
    for fpath in files:
        try:
            with open(fpath, "r") as f:
                data = json.load(f)
                entries.append({
                    "filename": os.path.basename(fpath),
                    "source_file": os.path.basename(data.get("source_file", "")),
                    "target_lang": data.get("target_lang"),
                    "timestamp": data.get("timestamp")
                })
        except:
            pass
            
    # Ordenar por mais recente
    entries.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
    return {"entries": entries}

@router.get("/dataset/{filename}")
async def get_dataset_entry(filename: str):
    """Retorna o conteúdo de uma entrada específica do dataset."""
    fpath = os.path.join("data/synth_dataset", filename)
    if not os.path.exists(fpath):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    
    with open(fpath, "r") as f:
        return json.load(f)

@router.get("/generation-log")
async def get_generation_log():
    """Retorna o log da última geração."""
    log_file = "data/logs/synth_gen.log"
    if os.path.exists(log_file):
        with open(log_file, "r") as f:
            lines = f.readlines()
            return {"log": "".join(lines[-50:])} # Últimas 50 linhas
    return {"log": ""}

class ApprovalRequest(BaseModel):
    filename: str
    modifications: Optional[str] = None # Caso o humano edite o codigo

@router.post("/approve")
async def approve_entry(req: ApprovalRequest):
    """Move uma entrada para o 'Golden Dataset' (Aprovado)."""
    src_path = os.path.join("data/synth_dataset", req.filename)
    dest_dir = "data/golden_dataset"
    os.makedirs(dest_dir, exist_ok=True)
    
    if not os.path.exists(src_path):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
        
    with open(src_path, "r") as f:
        data = json.load(f)
        
    # Se houver edições manuais, atualizar
    if req.modifications:
        data["output_code"] = req.modifications
        data["human_verified"] = True
        
    dest_path = os.path.join(dest_dir, req.filename)
    with open(dest_path, "w") as f:
        json.dump(data, f, indent=2)
        
    # Opcional: Remover do staged? Ou marcar como aprovado?
    # Vamos manter no staged mas marcado.
    data["status"] = "approved"
    with open(src_path, "w") as f:
        json.dump(data, f, indent=2)
        
    return {"status": "approved", "path": dest_path}

@router.delete("/dataset/{filename}")
async def delete_entry(filename: str):
    """Remove uma entrada ruim."""
    fpath = os.path.join("data/synth_dataset", filename)
    if os.path.exists(fpath):
        os.remove(fpath)
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Not found")

@router.post("/qa/generate_test")
async def generate_test_case(filename: str):
    """Gera um arquivo de teste (_test.go) para um arquivo migrado."""
    src_path = os.path.join("data/synth_dataset", filename)
    if not os.path.exists(src_path):
        raise HTTPException(status_code=404, detail="Source not found")
        
    cmd = [
        ".venv/bin/python", "l2j_pipeline/test_generator.py",
        "--file", src_path
    ]
    try:
        subprocess.run(cmd, check=True)
        # O script gera nome_test.go em data/tests
        # Vamos tentar adivinhar o nome para retornar
        base_name = filename.replace("_java.json", "_test.go")
        if not base_name.endswith("_test.go"):
             base_name = base_name.split(".")[0] + "_test.go"
             
        test_path = os.path.join("data/tests", base_name)
        if os.path.exists(test_path):
             with open(test_path, "r") as f:
                 return {"status": "success", "test_code": f.read(), "path": test_path}
                 
        return {"status": "error", "detail": "Test file not created"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def load_migration_plan_data():
    plan_path = "data/migration_plan.json"
    if os.path.exists(plan_path):
        with open(plan_path, "r") as f:
            return json.load(f)
    return {"error": "Plano não encontrado. Execute a Fase 1."}
