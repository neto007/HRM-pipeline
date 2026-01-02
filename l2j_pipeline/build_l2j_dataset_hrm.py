import os
import json
import numpy as np
import argparse
from tqdm import tqdm
from pydantic import BaseModel
from typing import List, Dict, Optional

# Importando metadados do projeto HRM original
# Assumindo que o script é executado da raiz do repositório
import sys
sys.path.append(os.getcwd())
from dataset.common import PuzzleDatasetMetadata

class L2JBuildProgressConfig(BaseModel):
    input_dir: str = "l2j_pipeline/data/mock_java"
    output_dir: str = "data/l2j-transcription"
    seq_len: int = 256
    vocab_size: int = 256  # Byte-level + padding
    extensions: List[str] = [".java"]

CORE_EXTENSIONS = [
    ".java", ".py", ".cpp", ".h", ".c", ".go", ".js", ".ts", 
    ".html", ".css", ".sql", ".xml", ".yaml", ".yml", 
    ".json", ".properties", ".ini", ".sh", ".bat", ".md"
]

def tokenize_code(code: str, seq_len: int) -> np.ndarray:
    """Byte-level tokenization simples."""
    tokens = [ord(c) % 255 + 1 for c in code] # +1 to avoid 0 (PAD)
    if len(tokens) > seq_len:
        tokens = tokens[:seq_len]
    else:
        tokens = tokens + [0] * (seq_len - len(tokens))
    return np.array(tokens, dtype=np.uint8)

def build_dataset(config: L2JBuildProgressConfig):
    exts = config.extensions
    if "AUTO" in [e.upper() for e in exts] or not exts:
        exts = CORE_EXTENSIONS
        print(f"[*] Modo AUTO detectado. Escaneando tipos: {', '.join(exts)}")
    else:
        print(f"[*] Escaneando extensões específicas: {', '.join(exts)} em: {config.input_dir}")
    
    source_files = []
    for root, _, files in os.walk(config.input_dir):
        # Pular pastas ocultas e node_modules
        if any(exc in root for exc in [".git", "node_modules", ".venv", "__pycache__"]):
            continue
            
        for f in files:
            if any(f.endswith(ext) for ext in exts):
                source_files.append(os.path.join(root, f))

    if not source_files:
        print(f"[!] Nenhum arquivo compatível encontrado em {config.input_dir}.")
        return

    # Limitar para processamento inicial (opcional, pode ser removido)
    # if len(source_files) > 5000:
    #     print(f"[*] Repositório muito grande ({len(source_files)} arquivos). Limitando para 5000.")
    #     source_files = source_files[:5000]

    # Preparar listas de dados
    # HRM espera: inputs (o código), labels (o plano ou o código transcrito)
    inputs_list = []
    labels_list = []
    puzzle_identifiers = []
    puzzle_indices = [0]
    group_indices = [0]

    print(f"[*] Processando {len(source_files)} arquivos...")
    for idx, fbase in enumerate(tqdm(source_files)):
        try:
            with open(fbase, "r", encoding="utf-8", errors="ignore") as f:
                code = f.read()
        except:
            continue # Pular binários que passaram pelo filtro
        
        # Tokenizar entrada
        input_tokens = tokenize_code(code, config.seq_len)
        inputs_list.append(input_tokens)
        
        labels_list.append(input_tokens) 
        
        puzzle_identifiers.append(0) 
        puzzle_indices.append(idx + 1)
        group_indices.append(idx + 1)

    # Converter para arrays numpy finais
    final_inputs = np.stack(inputs_list)
    final_labels = np.stack(labels_list)
    final_puzzle_identifiers = np.array(puzzle_identifiers, dtype=np.int32)
    final_puzzle_indices = np.array(puzzle_indices, dtype=np.int32)
    final_group_indices = np.array(group_indices, dtype=np.int32)

    # Metadata
    metadata = PuzzleDatasetMetadata(
        seq_len=config.seq_len,
        vocab_size=config.vocab_size + 1,
        pad_id=0,
        ignore_label_id=0,
        blank_identifier_id=0,
        num_puzzle_identifiers=1,
        total_groups=len(inputs_list), # Usar o que foi realmente processado
        mean_puzzle_examples=1,
        sets=["all"]
    )

    # Salvar estrutura solicitada pelo HRM
    for split in ["train", "test"]:
        split_dir = os.path.join(config.output_dir, split)
        os.makedirs(split_dir, exist_ok=True)
        
        with open(os.path.join(split_dir, "dataset.json"), "w") as f:
            json.dump(metadata.model_dump(), f)
            
        np.save(os.path.join(split_dir, "all__inputs.npy"), final_inputs)
        np.save(os.path.join(split_dir, "all__labels.npy"), final_labels)
        np.save(os.path.join(split_dir, "all__puzzle_identifiers.npy"), final_puzzle_identifiers)
        np.save(os.path.join(split_dir, "all__puzzle_indices.npy"), final_puzzle_indices)
        np.save(os.path.join(split_dir, "all__group_indices.npy"), final_group_indices)

    print(f"[*] Dataset L2J-HRM criado com sucesso em: {config.output_dir}")
    print(f"[*] Total de grupos: {len(inputs_list)}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="l2j_pipeline/data/mock_java")
    parser.add_argument("--output", default="data/l2j-transcription")
    parser.add_argument("--exts", default=".java")
    args = parser.parse_args()
    
    ext_list = args.exts.split(",")
    config = L2JBuildProgressConfig(input_dir=args.input, output_dir=args.output, extensions=ext_list)
    build_dataset(config)
