"""
Repository Manager for RLCoder
Gerencia múltiplos repositórios para indexação e retrieval.
"""
import os
import json
import subprocess
from typing import Dict, List, Optional
from datetime import datetime


class RepositoryManager:
    """Gerenciador de repositórios para RLCoder."""
    
    def __init__(self, config_path: str = "data/rlcoder_repos.json"):
        self.config_path = config_path
        self.repos_dir = "l2j_pipeline/temp_repos"
        self.index_dir = "data/rlcoder_index"
        self._ensure_directories()
        self.config = self._load_config()
    
    def _ensure_directories(self):
        """Garante que os diretórios necessários existem."""
        os.makedirs(self.repos_dir, exist_ok=True)
        os.makedirs(self.index_dir, exist_ok=True)
        os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
    
    def _load_config(self) -> Dict:
        """Carrega configuração de repositórios."""
        if os.path.exists(self.config_path):
            with open(self.config_path, 'r') as f:
                return json.load(f)
        return {"repositories": {}, "active_repo": None}
    
    def _save_config(self):
        """Salva configuração de repositórios."""
        with open(self.config_path, 'w') as f:
            json.dump(self.config, f, indent=2)
    
    def list_repos(self) -> Dict:
        """Lista todos os repositórios."""
        return {
            "repositories": self.config["repositories"],
            "active_repo": self.config["active_repo"]
        }
    
    def add_repo(self, name: str, url: str) -> Dict:
        """
        Adiciona e clona um novo repositório.
        
        Args:
            name: Nome do repositório (usado como ID)
            url: URL do repositório Git
            
        Returns:
            Informações do repositório adicionado
        """
        if name in self.config["repositories"]:
            raise ValueError(f"Repositório '{name}' já existe")
        
        local_path = os.path.join(self.repos_dir, name)
        
        # Clonar repositório
        print(f"[*] Clonando {url}...")
        try:
            subprocess.run(
                ["git", "clone", url, local_path],
                check=True,
                capture_output=True,
                text=True
            )
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"Erro ao clonar repositório: {e.stderr}")
        
        # Adicionar à configuração
        repo_info = {
            "name": name,
            "url": url,
            "local_path": local_path,
            "indexed": False,
            "index_path": None,
            "stats": None,
            "created_at": datetime.now().isoformat()
        }
        
        self.config["repositories"][name] = repo_info
        
        # Se for o primeiro repo, ativar automaticamente
        if self.config["active_repo"] is None:
            self.config["active_repo"] = name
        
        self._save_config()
        return repo_info
    
    def index_repo(self, name: str) -> Dict:
        """
        Indexa um repositório.
        
        Args:
            name: Nome do repositório
            
        Returns:
            Stats da indexação
        """
        if name not in self.config["repositories"]:
            raise ValueError(f"Repositório '{name}' não encontrado")
        
        repo = self.config["repositories"][name]
        index_path = os.path.join(self.index_dir, f"{name}.json")
        
        # Executar indexação
        print(f"[*] Indexando {name}...")
        try:
            result = subprocess.run(
                [
                    ".venv/bin/python",
                    "l2j_pipeline/index_l2j_repo.py",
                    "--repo", repo["local_path"],
                    "--output", index_path
                ],
                check=True,
                capture_output=True,
                text=True
            )
            print(result.stdout)
        except subprocess.CalledProcessError as e:
            raise RuntimeError(f"Erro na indexação: {e.stderr}")
        
        # Carregar stats do índice
        with open(index_path, 'r') as f:
            index_data = json.load(f)
        
        stats = {
            "files": index_data["metadata"]["total_files"],
            "lines": index_data["metadata"]["total_lines"],
            "classes": len(index_data["class_map"])
        }
        
        # Atualizar configuração
        self.config["repositories"][name]["indexed"] = True
        self.config["repositories"][name]["index_path"] = index_path
        self.config["repositories"][name]["stats"] = stats
        self._save_config()
        
        return stats
    
    def activate_repo(self, name: str):
        """Define um repositório como ativo."""
        if name not in self.config["repositories"]:
            raise ValueError(f"Repositório '{name}' não encontrado")
        
        self.config["active_repo"] = name
        self._save_config()
    
    def delete_repo(self, name: str):
        """
        Remove um repositório.
        
        Args:
            name: Nome do repositório
        """
        if name not in self.config["repositories"]:
            raise ValueError(f"Repositório '{name}' não encontrado")
        
        repo = self.config["repositories"][name]
        
        # Remover diretório local
        if os.path.exists(repo["local_path"]):
            import shutil
            shutil.rmtree(repo["local_path"])
        
        # Remover índice
        if repo["index_path"] and os.path.exists(repo["index_path"]):
            os.remove(repo["index_path"])
        
        # Remover da configuração
        del self.config["repositories"][name]
        
        # Se era o ativo, limpar
        if self.config["active_repo"] == name:
            # Ativar outro repo se houver
            if self.config["repositories"]:
                self.config["active_repo"] = list(self.config["repositories"].keys())[0]
            else:
                self.config["active_repo"] = None
        
        self._save_config()
    
    def get_active_repo(self) -> Optional[Dict]:
        """Retorna informações do repositório ativo."""
        active_name = self.config["active_repo"]
        if active_name and active_name in self.config["repositories"]:
            return self.config["repositories"][active_name]
        return None
