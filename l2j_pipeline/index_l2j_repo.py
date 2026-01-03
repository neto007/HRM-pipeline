"""
Indexador de Repositório L2J para RLCoder
Cria um índice do repositório L2J para retrieval inteligente durante transcrição.
"""
import os
import json
import argparse
from pathlib import Path
from typing import List, Dict
from tqdm import tqdm
import numpy as np

# Try importing semantic search libs
try:
    from sentence_transformers import SentenceTransformer
    import faiss
    HAS_SEMANTIC = True
except ImportError:
    HAS_SEMANTIC = False
    print("⚠️  Bibliotecas de IA não encontradas. Indexação será apenas por keywords.")



def scan_java_files(repo_path: str) -> List[Dict]:
    """
    Escaneia todos os arquivos Java no repositório.
    
    Args:
        repo_path: Caminho para o repositório L2J
        
    Returns:
        Lista de dicts com informações dos arquivos
    """
    print(f"[*] Escaneando arquivos Java em: {repo_path}")
    java_files = []
    
    repo = Path(repo_path)
    for java_file in tqdm(list(repo.rglob("*.java")), desc="Processando"):
        try:
            with open(java_file, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            java_files.append({
                "path": str(java_file.relative_to(repo)),
                "content": content,
                "size": len(content),
                "lines": content.count('\n'),
                "package": extract_package(content),
                "classes": extract_classes(content)
            })
        except Exception as e:
            print(f"⚠️  Erro ao processar {java_file}: {e}")
    
    return java_files


def extract_package(content: str) -> str:
    """Extrai o nome do pacote do código Java."""
    for line in content.split('\n'):
        if line.strip().startswith('package '):
            return line.strip().replace('package ', '').replace(';', '').strip()
    return "default"


def extract_classes(content: str) -> List[str]:
    """Extrai nomes de classes do código Java."""
    classes = []
    for line in content.split('\n'):
        line = line.strip()
        if 'class ' in line and not line.startswith('//'):
            # Simplified extraction
            parts = line.split('class ')
            if len(parts) > 1:
                class_name = parts[1].split()[0].split('{')[0].split('<')[0]
                classes.append(class_name)
    return classes


def build_simple_index(java_files: List[Dict]) -> Dict:
    """
    Constrói um índice simples para retrieval.
    
    Args:
        java_files: Lista de arquivos escaneados
        
    Returns:
        Índice estruturado
    """
    index = {
        "metadata": {
            "total_files": len(java_files),
            "total_lines": sum(f["lines"] for f in java_files),
            "packages": list(set(f["package"] for f in java_files))
        },
        "files": java_files,
        "class_map": {}
    }
    
    # Criar mapa de classes
    for file_info in java_files:
        for class_name in file_info["classes"]:
            if class_name not in index["class_map"]:
                index["class_map"][class_name] = []
            index["class_map"][class_name].append(file_info["path"])
    
    return index


def build_semantic_index(java_files: List[Dict], output_path: str):
    """Gera embeddings e cria índice FAISS."""
    if not HAS_SEMANTIC:
        return
        
    print("\n[*] Gerando embeddings para busca semântica (pode demorar)...")
    
    # Modelo leve e rápido
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    # Preparar textos (Class + Methods signatures seria ideal, vamos usar os primeiros 512 tokens)
    docs = [f['content'][:1024] for f in java_files]
    
    # Gerar embeddings
    embeddings = model.encode(docs, show_progress_bar=True, batch_size=32)
    
    # Normalizar para cosseno
    faiss.normalize_L2(embeddings)
    
    # Criar índice FAISS (Flat IP = Inner Product = Cosine Similarity após normalização)
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatIP(dimension)
    index.add(embeddings)
    
    # Salvar índice FAISS separado
    faiss_path = output_path.replace('.json', '.faiss')
    faiss.write_index(index, faiss_path)
    print(f"✅ Índice Semântico FAISS salvo: {faiss_path}")



def save_index(index: Dict, output_path: str):
    """Salva o índice em disco."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Salvar versão completa (JSON)
    print(f"[*] Salvando índice completo: {output_path}")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(index, f, indent=2)
    
    # Salvar versão compacta (sem conteúdo completo)
    compact_path = output_path.replace('.json', '_compact.json')
    compact_index = {
        "metadata": index["metadata"],
        "class_map": index["class_map"],
        "file_list": [f["path"] for f in index["files"]]
    }
    
    print(f"[*] Salvando índice compacto: {compact_path}")
    with open(compact_path, 'w', encoding='utf-8') as f:
        json.dump(compact_index, f, indent=2)
    
    print(f"✅ Indexação concluída!")
    print(f"   • Total de arquivos: {index['metadata']['total_files']}")
    print(f"   • Total de linhas: {index['metadata']['total_lines']}")
    print(f"   • Pacotes encontrados: {len(index['metadata']['packages'])}")
    print(f"   • Classes mapeadas: {len(index['class_map'])}")


def main():
    parser = argparse.ArgumentParser(
        description="Indexa repositório L2J para RLCoder"
    )
    parser.add_argument(
        "--repo",
        default="l2j_pipeline/temp_repos/l2j-server-login",
        help="Caminho para o repositório L2J"
    )
    parser.add_argument(
        "--output",
        default="data/rlcoder_index/l2j_index.json",
        help="Caminho de saída para o índice"
    )
    
    args = parser.parse_args()
    
    # Verificar se o repositório existe
    if not os.path.exists(args.repo):
        print(f"❌ Erro: Repositório não encontrado em {args.repo}")
        print(f"   Execute primeiro: make clone-l2j ou clone manualmente")
        return 1
    
    # Escanear arquivos
    java_files = scan_java_files(args.repo)
    
    if not java_files:
        print("❌ Nenhum arquivo Java encontrado!")
        return 1
    
    # Construir índice
    print("\n[*] Construindo índice...")
    index = build_simple_index(java_files)
    
    # Salvar
    save_index(index, args.output)
    
    # Passo Extra: Construir Índice Semântico
    if HAS_SEMANTIC:
        build_semantic_index(java_files, args.output)

    
    print(f"\n🎯 Próximo passo: Use o índice em transcribe.py:")
    print(f"   from l2j_pipeline.rlcoder_adapter import RLCoderAdapter")
    print(f"   adapter = RLCoderAdapter('{args.output}')")
    
    return 0


if __name__ == "__main__":
    exit(main())
