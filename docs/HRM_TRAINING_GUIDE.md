# 🏋️ Guia de Treino do Modelo HRM Customizado

## 🎯 Objetivo

Treinar um modelo HRM (Hierarchical Reasoning Model) específico para migração L2J, que pode ser usado como alternativa ao LLM (Qwen) via OpenRouter.

---

## 📋 Pré-requisitos

### Hardware
- **GPU**: NVIDIA com 8GB+ VRAM (recomendado: RTX 3060+)
- **CPU**: 16+ cores
- **RAM**: 32GB+
- **Storage**: 50GB+ livre

### Software
- Python 3.10+
- CUDA 11.8+ (se usar GPU)
- Git

---

## 🔧 Setup Inicial

### 1. Preparar Dataset L2J

```bash
# 1. Clonar repositório L2J
cd data/
git clone https://github.com/l2jserver/L2J_Server.git l2j_source

# 2. Criar dataset de pares Java→Go
cd ../l2j_pipeline/
python map_dependencies.py --source ../data/l2j_source --output ../data/migration_plan.json

# 3. Gerar pares sintéticos (usar LLM primeiro para criar ground truth)
python generate_synth_dataset.py --plan ../data/migration_plan.json --output ../data/hrm_training_data/ --limit 100
```

**Resultado**: Dataset em `data/hrm_training_data/` com 100 pares Java→Go aprovados.

---

## 📚 Preparar Dataset para HRM

O modelo HRM espera formato específico. Criar script de conversão:

```bash
# Criar conversor
cat > data/convert_to_hrm_format.py << 'EOF'
import json
import os
from pathlib import Path

def convert_dataset():
    input_dir = Path("hrm_training_data")
    output_dir = Path("hrm_dataset")
    output_dir.mkdir(exist_ok=True)
    
    examples = []
    for json_file in input_dir.glob("*.json"):
        with open(json_file) as f:
            data = json.load(f)
        
        # Formato HRM: input, output, metadata
        example = {
            "input": data["input_code"],  # Java
            "output": data["output_code"],  # Go
            "metadata": {
                "source_file": data["source_file"],
                "analysis": data.get("analysis_trace", ""),
                "architecture": data.get("architecture_trace", "")
            }
        }
        examples.append(example)
    
    # Salvar dataset único
    with open(output_dir / "l2j_migration.jsonl", "w") as f:
        for ex in examples:
            f.write(json.dumps(ex) + "\n")
    
    print(f"✅ Convertidos {len(examples)} exemplos")

if __name__ == "__main__":
    convert_dataset()
EOF

python data/convert_to_hrm_format.py
```

---

## 🚀 Treinamento

### Configurar Hyperparâmetros

Editar `config/train_l2j.yaml`:

```yaml
# config/train_l2j_hrm.yaml
arch:
  name: HierarchicalReasoningModel
  loss:
    name: CrossEntropyLoss

data_path: data/hrm_dataset/l2j_migration.jsonl

# Hyperparâmetros
global_batch_size: 8  # Reduzir se GPU pequena
epochs: 50
lr: 0.0001
lr_min_ratio: 0.1
lr_warmup_steps: 100

weight_decay: 0.01
beta1: 0.9
beta2: 0.999

# Embedding
puzzle_emb_lr: 0.001
puzzle_emb_weight_decay: 0.0

# Projeto
project_name: "L2J-HRM-Migration"
run_name: "v1-baseline"
checkpoint_path: "checkpoints/l2j_hrm/"

# Extras
seed: 42
checkpoint_every_eval: true
eval_interval: 500
```

### Iniciar Treino

```bash
# Ativar ambiente
source .venv/bin/activate

# Treinar
python pretrain.py --config config/train_l2j_hrm.yaml

# OU via Forge Lab (frontend)
# 1. Abrir Forge Lab
# 2. Preencher:
#    - Project: "L2J-HRM-v1"
#    - Repo: https://github.com/l2jserver/L2J_Server
#    - Epochs: 50
#    - Batch Size: 8
# 3. Clicar "BAPTIZE & FORGE MODEL"
```

**Duração Estimada**: 
- GPU RTX 3060: ~6-12 horas
- CPU only: ~2-3 dias

---

## 📊 Monitoramento

### Via WandB (Weights & Biases)

```bash
# Login WandB
wandb login

# Dashboard automático em:
# https://wandb.ai/<seu_usuario>/L2J-HRM-Migration
```

### Via Logs Locais

```bash
# Acompanhar progresso
tail -f data/projects/L2J-HRM-v1/train.log

# Verificar checkpoints
ls -lh checkpoints/l2j_hrm/
```

---

## ✅ Validação do Modelo

### Testar Modelo Treinado

```python
# test_hrm_model.py
import torch
from models.hierarchical_reasoning import HierarchicalReasoningModel

# Carregar checkpoint
checkpoint_path = "checkpoints/l2j_hrm/epoch_50.ckpt"
model = HierarchicalReasoningModel.load_from_checkpoint(checkpoint_path)
model.eval()

# Testar com código Java
java_code = """
public class L2Item {
    private int itemId;
    public void use() {
        System.out.println("Using item");
    }
}
"""

with torch.no_grad():
    output = model.generate(java_code, max_length=512)
    print("Generated Go code:")
    print(output)
```

---

## 🔄 Usar Modelo HRM no Frontend

### 1. Frontend (Migration Tab)

Adicionar checkbox:

```jsx
// App.jsx - Migration controls
<div>
  <label>
    <input 
      type="checkbox" 
      checked={useHRMModel}
      onChange={(e) => setUseHRMModel(e.target.checked)}
    />
    Use Trained HRM Model (instead of LLM)
  </label>
</div>
```

### 2. Backend (API)

Modificar endpoint:

```python
# migration_api.py
@router.post("/generate")
async def generate_dataset(request: GenerateRequest):
    generator = EnterpriseGenerator(
        target_lang=request.target_lang,
        model=request.model,
        use_hrm_model=request.use_hrm_model  # Novo parâmetro
    )
    # ...
```

### 3. Generator

```python
# generate_synth_dataset.py
def __init__(self, ..., use_hrm_model=False):
    if use_hrm_model:
        # Carregar modelo HRM local
        self.hrm_model = load_hrm_checkpoint("checkpoints/l2j_hrm/best.ckpt")
        self.use_llm = False
    else:
        # Usar LLM (Qwen)
        self.client = OpenAI(...)
        self.use_llm = True
```

---

## 📈 Comparação: LLM vs HRM

| Métrica | LLM (Qwen) | HRM Treinado |
|---------|------------|--------------|
| **Setup Time** | Imediato | 6-12 horas treino |
| **Custo** | ~$0.001/req | Grátis após treino |
| **Qualidade (inicial)** | Excelente | Média |
| **Qualidade (pós fine-tune)** | Excelente | Pode superar |
| **Velocidade** | ~2s/arquivo | ~0.5s/arquivo |
| **Offline?** | ❌ Requer internet | ✅ Funciona offline |
| **Customização** | ❌ Limitada | ✅ Total |

---

## 🎯 Recomendações

### Quando Usar LLM (Qwen):
- ✅ Começar projeto AGORA
- ✅ Prototipagem rápida
- ✅ Qualidade garantida
- ✅ Sem GPU disponível

### Quando Usar HRM Treinado:
- ✅ Produção em larga escala (1000+ arquivos)
- ✅ Ambiente sem internet
- ✅ Custo de API é problema
- ✅ Tem GPU potente

### Estratégia Híbrida (Melhor):
1. Usar LLM para gerar 100-500 exemplos "ground truth"
2. Treinar HRM com esses exemplos
3. Usar HRM para o resto (reduz custo)
4. LLM apenas para casos difíceis

---

## 🔧 Troubleshooting

### GPU Out of Memory
```bash
# Reduzir batch size
# config/train_l2j_hrm.yaml
global_batch_size: 4  # ou 2
```

### Treino Muito Lento
```bash
# Verificar GPU está sendo usada
python -c "import torch; print(torch.cuda.is_available())"

# Se False, instalar CUDA toolkit
```

### Modelo Não Converge
```bash
# Aumentar learning rate warmup
lr_warmup_steps: 500

# Ou reduzir learning rate inicial
lr: 0.00005
```

---

## ✅ Checklist de Sucesso

- [ ] Dataset com 100+ pares Java→Go
- [ ] GPU funcionando (ou paciência para CPU)
- [ ] Treino completou 50 épocas
- [ ] Loss convergiu (< 0.5)
- [ ] Modelo gera código válido Go
- [ ] Checkbox no frontend funciona
- [ ] Backend carrega modelo corretamente

---

**Pronto para produção!** 🚀

O modelo HRM treinado pode ser usado como alternativa ao LLM, oferecendo:
- Independência de APIs externas
- Velocidade de inferência maior
- Customização total para L2J
