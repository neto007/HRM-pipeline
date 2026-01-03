"""
Endpoint para verificar status do modelo HRM.
"""
from fastapi import APIRouter
import os
import torch

router = APIRouter(prefix="/hrm", tags=["hrm"])


@router.get("/status")
async def check_hrm_status():
    """
    Verifica se modelo HRM está treinado e pronto para uso.
    
    Returns:
        {
            "trained": bool,
            "path": str (se existir),
            "epochs": int (se disponível),
            "message": str
        }
    """
    checkpoint_path = "checkpoints/hrm_guidance/best.ckpt"
    
    if not os.path.exists(checkpoint_path):
        return {
            "trained": False,
            "message": (
                "HRM model not trained. "
                "You must train it before migrating:\n"
                "1. Generate dataset: python l2j_pipeline/prepare_guidance_dataset.py --limit 100\n"
                "2. Train model: python pretrain.py --config config/hrm_guidance_l2j.yaml"
            )
        }
    
    # Tentar carregar checkpoint para verificar validade
    try:
        checkpoint = torch.load(checkpoint_path, map_location='cpu')
        
        return {
            "trained": True,
            "path": checkpoint_path,
            "epochs": checkpoint.get('epoch', 'unknown'),
            "message": "HRM model is trained and ready!"
        }
    except Exception as e:
        return {
            "trained": False,
            "error": f"Checkpoint exists but is invalid: {e}",
            "message": "Please retrain the model"
        }


@router.get("/info")
async def get_hrm_info():
    """
    Retorna informações sobre o modelo HRM e processo de treino.
    """
    return {
        "description": "HRM (Hierarchical Reasoning Model) generates architectural guidance",
        "role": "Guidance generation - NOT code generation",
        "llm_role": "Code generation based on HRM guidance",
        "training_required": True,
        "training_steps": [
            "1. Generate guidance dataset (2-3 hours): prepare_guidance_dataset.py",
            "2. Train HRM model (6-12 hours GPU): pretrain.py"
        ],
        "checkpoint_location": "checkpoints/hrm_guidance/best.ckpt"
    }
