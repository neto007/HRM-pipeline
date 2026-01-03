"""
Script de Mapeamento de Dependências do L2J
Analisa os imports Java e gera um grafo direcionado para determinar a ordem de migração.
"""
import os
import re
import json
import networkx as nx
import argparse
from pathlib import Path
from typing import Dict, List, Set, Tuple

def scan_imports(file_path: Path) -> Tuple[str, List[str]]:
    """Lê um arquivo Java e extrai o pacote e as importações."""
    package = ""
    imports = []
    
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            for line in f:
                line = line.strip()
                if line.startswith("package "):
                    package = line.replace("package ", "").replace(";", "").strip()
                elif line.startswith("import "):
                    imp = line.replace("import ", "").replace(";", "").strip()
                    # Ignorar imports do sistema java.* e javax.* por enquanto
                    # Focamos nas dependências internas do projeto
                    if not imp.startswith("java.") and not imp.startswith("javax."):
                        imports.append(imp)
    except Exception as e:
        print(f"Erro ao ler {file_path}: {e}")
        
    return package, imports

def build_dependency_graph(repo_path: str) -> nx.DiGraph:
    """Constrói o grafo de dependências do projeto."""
    G = nx.DiGraph()
    
    # Mapa: FullClassName -> FilePath
    class_map = {}
    
    # 1. Primeiro passo: Mapear todas as classes disponíveis no projeto
    print("[*] Mapeando classes do projeto...")
    repo = Path(repo_path)
    java_files = list(repo.rglob("*.java"))
    
    for file_path in java_files:
        package, _ = scan_imports(file_path)
        class_name = file_path.stem
        full_name = f"{package}.{class_name}" if package else class_name
        
        class_map[full_name] = str(file_path)
        G.add_node(full_name, file_path=str(file_path))

    print(f"[*] Total de classes mapeadas: {len(class_map)}")

    # 2. Segundo passo: Criar arestas baseadas nos imports
    print("[*] Analisando dependências...")
    for file_path in java_files:
        package, imports = scan_imports(file_path)
        class_name = file_path.stem
        current_full_name = f"{package}.{class_name}" if package else class_name
        
        for imp in imports:
            # Dependência explícita (import com.l2j.Config)
            if imp in class_map:
                G.add_edge(current_full_name, imp)
            
            # Dependência Wildcard (import com.l2j.*)
            elif imp.endswith(".*"):
                base_pkg = imp[:-2]
                for node in G.nodes():
                    if node.startswith(base_pkg) and node != current_full_name:
                         # Simplificação: assume dependência se estiver no mesmo pacote importado
                         # (Idealmente checaria uso no código, mas imports servem como proxy forte)
                         G.add_edge(current_full_name, node)

    return G

def analyze_migration_order(G: nx.DiGraph) -> List[str]:
    """Retorna a ordem topológica para migração (Leaves -> Roots)."""
    
    # Resolver ciclos (dependências circulares são comuns em legado)
    # L2J tem muitos ciclos. Para ordem de migração, usaremos aproximação.
    # Se houver ciclos, topological_sort falha. 
    # Usaremos Strongly Connected Components (SCC) para agrupar ciclos.
    
    try:
        # Tenta ordem topológica direta (se for DAG perfeito)
        order = list(nx.topological_sort(G))
        # Reverse para ter (Independentes -> Dependentes)
        # Queremos migrar primeiro quem não depende de ninguem (ou depende de coisas externas)
        return list(reversed(order))
        
    except nx.NetworkXUnfeasible:
        print("[!] Ciclos detectados! Usando agrupamento por componentes fortemente conectados.")
        
        # Condensar o grafo: cada nó vira um SCC (grupo de classes que se dependem ciclicamente)
        condensed_G = nx.condensation(G)
        
        # Ordem topológica no grafo condensado
        scc_order = list(nx.topological_sort(condensed_G))
        
        final_order = []
        # Expandir os grupos (dentro do ciclo, a ordem não importa tanto, precisam ser migrados juntos)
        for scc_idx in reversed(scc_order):
            members = condensed_G.nodes[scc_idx]['members']
            final_order.extend(members)
            
        return final_order

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default="l2j_pipeline/temp_repos/l2j-server-login")
    parser.add_argument("--output", default="data/migration_plan.json")
    args = parser.parse_args()
    
    if not os.path.exists(args.repo):
        print(f"Repo não encontrado: {args.repo}")
        return

    G = build_dependency_graph(args.repo)
    
    print(f"[*] Grafo construído: {G.number_of_nodes()} nós, {G.number_of_edges()} arestas")
    
    migration_order = analyze_migration_order(G)
    
    print(f"[*] Ordem de migração definida ({len(migration_order)} arquivos)")
    print(f"   Top 5 primeiros (Independentes): {migration_order[:5]}")
    print(f"   Top 5 últimos (Mais dependentes): {migration_order[-5:]}")
    
    result = {
        "stats": {
            "nodes": G.number_of_nodes(),
            "edges": G.number_of_edges()
        },
        "migration_order": migration_order,
        "graph_data": nx.node_link_data(G)
    }
    
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    with open(args.output, 'w') as f:
        json.dump(result, f, indent=2)
        
    print(f"✅ Plano de migração salvo em: {args.output}")

if __name__ == "__main__":
    main()
