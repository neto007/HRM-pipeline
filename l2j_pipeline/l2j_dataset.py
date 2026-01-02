import os
import json
import torch
import numpy as np
from torch.utils.data import Dataset
from typing import Dict, List

class L2JCodeDataset(Dataset):
    """
    Dataset para lidar com snippets de código L2J (Java) e seus planos de tradução.
    """
    def __init__(self, data_dir: str, tokenizer, seq_len: int = 512):
        self.data_dir = data_dir
        self.tokenizer = tokenizer
        self.seq_len = seq_len
        self.files = [f for f in os.listdir(data_dir) if f.endswith(".java")]

    def __len__(self):
        return len(self.files)

    def __getitem__(self, idx) -> Dict[str, torch.Tensor]:
        file_path = os.path.join(self.data_dir, self.files[idx])
        with open(file_path, "r") as f:
            code = f.read()

        # Tokenização (Simulada para demonstração)
        # Em uma implementação real, usaria um tokenizer de BPE ou similar.
        encoded = self.tokenizer.encode(code)
        
        # Truncar ou preencher para seq_len
        if len(encoded) > self.seq_len:
            encoded = encoded[:self.seq_len]
        else:
            encoded = encoded + [0] * (self.seq_len - len(encoded))

        # Identificador único para o HRM (Puzzle ID)
        puzzle_id = hash(self.files[idx]) % 1000

        return {
            "inputs": torch.tensor(encoded, dtype=torch.long),
            "puzzle_identifiers": torch.tensor([puzzle_id], dtype=torch.long),
            "labels": torch.tensor(encoded, dtype=torch.long) # Exemplo: auto-encoder ou tradução
        }

class MockTokenizer:
    def encode(self, text: str) -> List[int]:
        # Simples mapeamento de caracteres para números para mock
        return [ord(c) % 256 for c in text]

    def decode(self, tokens: List[int]) -> str:
        return "".join([chr(t) for t in tokens])

def prepare_l2j_mock_data(output_dir: str):
    os.makedirs(output_dir, exist_ok=True)
    mock_classes = [
        ("L2ItemInstance.java", "public class L2ItemInstance { private int _itemId; public int getItemId() { return _itemId; } }"),
        ("L2Skill.java", "public abstract class L2Skill { protected int _id; public abstract void use(); }"),
        ("L2Character.java", "public class L2Character { private String _name; public String getName() { return _name; } }")
    ]
    for filename, content in mock_classes:
        with open(os.path.join(output_dir, filename), "w") as f:
            f.write(content)
    print(f"[*] Dados mock de L2J criados em: {output_dir}")

if __name__ == "__main__":
    # Teste do dataset
    output_dir = "l2j_pipeline/data/mock_java"
    prepare_l2j_mock_data(output_dir)
    
    tokenizer = MockTokenizer()
    dataset = L2JCodeDataset(output_dir, tokenizer)
    print(f"[*] Dataset carregado com {len(dataset)} arquivos.")
    sample = dataset[0]
    print(f"[*] Exemplo de input (primeiros 10 tokens): {sample['inputs'][:10]}")
