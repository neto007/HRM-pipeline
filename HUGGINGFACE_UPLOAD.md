# 🚀 Upload de Modelos HRM para Hugging Face

## 📋 Pré-requisitos

### 1. Instalar biblioteca
```bash
pip install huggingface_hub
```

### 2. Autenticação

**Opção A: Login interativo (recomendado)**
```bash
huggingface-cli login
```

**Opção B: Token via ambiente**
```bash
export HF_TOKEN=hf_seu_token_aqui
```

**Opção C: Token como argumento**
```bash
python upload_to_huggingface.py --token hf_seu_token_aqui ...
```

> 💡 **Obter token:** https://huggingface.co/settings/tokens

---

## 🎯 Uso Básico

### Upload Completo (todos os checkpoints ~5.2GB)
```bash
python upload_to_huggingface.py \
  --project l2j-server-game \
  --repo-id seu-username/l2j-hrm-model
```

### Upload Apenas Checkpoint Final (~106MB) ⚡
```bash
python upload_to_huggingface.py \
  --project l2j-server-game \
  --repo-id seu-username/l2j-hrm-model \
  --latest-only
```

### Upload Privado 🔒
```bash
python upload_to_huggingface.py \
  --project l2j-server-game \
  --repo-id seu-username/l2j-hrm-model \
  --private
```

---

## 📝 Argumentos

| Argumento | Obrigatório | Descrição | Exemplo |
|-----------|-------------|-----------|---------|
| `--project` | ✅ | Nome do projeto | `l2j-server-game` |
| `--repo-id` | ✅ | Repositório HF | `username/model-name` |
| `--checkpoint-dir` | ❌ | Caminho customizado | `checkpoints/...` |
| `--token` | ❌ | Token HF | `hf_xxxxx` |
| `--private` | ❌ | Repo privado | flag |
| `--latest-only` | ❌ | Só último checkpoint | flag |

---

## 📦 O que é enviado?

### Upload Completo
```
📦 Repositório HF
├── README.md              # Model card com informações
├── .gitattributes         # Configuração Git LFS
├── step_36                # Checkpoint 1 (106 MB)
├── step_72                # Checkpoint 2 (106 MB)
├── ...
├── step_1800              # Checkpoint final (106 MB)
├── all_config.yaml        # Configuração do modelo
├── hrm_act_v1.py          # Código da arquitetura
└── losses.py              # Funções de loss
```

### Upload Latest Only (Recomendado)
```
📦 Repositório HF
├── README.md
├── .gitattributes
├── step_1800              # Apenas checkpoint final
├── all_config.yaml
├── hrm_act_v1.py
└── losses.py
```

---

## 🔗 Depois do Upload

Acesse seu modelo em:
```
https://huggingface.co/seu-username/nome-do-modelo
```

### Carregar o modelo:
```python
from huggingface_hub import hf_hub_download
import torch

# Download do checkpoint
checkpoint_path = hf_hub_download(
    repo_id="seu-username/l2j-hrm-model",
    filename="step_1800"
)

# Carregar modelo
model = torch.load(checkpoint_path)
```

---

## 💡 Dicas

### ⚡ Economizar Tempo/Espaço
Use `--latest-only` para upload de apenas 106MB ao invés de 5.2GB

### 🔒 Modelo Privado
Adicione `--private` se não quiser tornar público

### 📊 Atualizar Estatísticas
Edite o README.md gerado para incluir métricas mais detalhadas

### 🔄 Versionamento
Faça commits com mensagens descritivas:
```bash
# O script já faz isso automaticamente com:
# "Upload HRM model: {project_name}"
```

---

## ❓ Troubleshooting

### Erro: "401 Unauthorized"
→ Token inválido ou expirado. Execute `huggingface-cli login` novamente

### Erro: "Repository not found"
→ O repositório será criado automaticamente se não existir

### Upload muito lento?
→ Use `--latest-only` para fazer upload de apenas 106MB

### Erro: "Git LFS quota exceeded"
→ Verifique seu plano no Hugging Face (gratuito: 50GB de LFS)

---

## 📚 Mais Informações

- [Documentação Hugging Face Hub](https://huggingface.co/docs/hub)
- [Sobre Git LFS](https://git-lfs.github.com/)
- [Model Cards](https://huggingface.co/docs/hub/model-cards)
