"""
RLCoder Adapter for HRM Pipeline
Integrates RLRetriever (ICSE 2025) for intelligent code retrieval during transcription.
"""
import os
import json
from typing import Dict, List, Optional
from pathlib import Path

try:
    from sentence_transformers import SentenceTransformer
    import faiss
    import numpy as np
    HAS_SEMANTIC = True
except ImportError:
    HAS_SEMANTIC = False

class RLCoderAdapter:
    """
    Adaptador para integrar o RLRetriever ao pipeline HRM.
    Permite busca inteligente de código relevante no repositório L2J.
    """
    
    def __init__(self, index_path: Optional[str] = None):
        """
        Inicializa o adaptador RLCoder.
        
        Args:
            index_path: Caminho para o índice pré-construído do repositório.
                       Se None, será usado o caminho padrão.
        """
        self.index_path = index_path or "data/rlcoder_index/l2j_index.json"
        self.index_path = index_path or "data/rlcoder_index/l2j_index.json"
        self.faiss_path = self.index_path.replace('.json', '.faiss')
        self.retriever = None
        self.semantic_index = None
        self.model = None
        self._load_retriever()
        
    def _load_semantic_model(self):
        """Carrega modelo e índice FAISS se disponíveis."""
        if not HAS_SEMANTIC: 
            return
            
        if os.path.exists(self.faiss_path):
            try:
                print(f"[RLCoder] 🧠 Carregando índice semântico: {self.faiss_path}")
                self.semantic_index = faiss.read_index(self.faiss_path)
                self.model = SentenceTransformer('all-MiniLM-L6-v2')
            except Exception as e:
                print(f"[!] Falha ao carregar busca semântica: {e}")

    
    def _load_retriever(self):
        """Carrega o RLRetriever ou cria um mock se o índice não existir."""
        # Tentar carregar repositório ativo
        try:
            from repo_manager import RepositoryManager
            manager = RepositoryManager()
            active_repo = manager.get_active_repo()
            
            if active_repo and active_repo['indexed'] and active_repo['index_path']:
                self.index_path = active_repo['index_path']
                print(f"[RLCoder] Usando repositório ativo: {active_repo['name']}")
        except Exception as e:
            print(f"[RLCoder] Erro ao carregar repo ativo: {e}")
            # Fallback para caminho padrão
            pass
        
        if os.path.exists(self.index_path):
            print(f"[RLCoder] Carregando índice: {self.index_path}")
            with open(self.index_path, 'r') as f:
                self.index_data = json.load(f)
            
            # Tentar carregar semântico também
            self._load_semantic_model()
        else:
            print(f"[RLCoder] ⚠️  Índice não encontrado. Usando modo simulado.")
            print(f"[RLCoder] Acesse Config e adicione um repositório")
            self.index_data = None
    
    def retrieve_context(self, query_code: str, top_k: int = 5) -> Dict:
        """
        Busca código relevante usando RLRetriever.
        
        Args:
            query_code: Código Java que será traduzido
            top_k: Número de snippets relevantes a retornar
            
        Returns:
            Dict com:
                - relevant_code: Lista de snippets relevantes
                - file_paths: Caminhos dos arquivos de origem
                - similarity_scores: Scores de similaridade
        """
        if self.index_data is None:
            # ERRO EXPLICITO - Nunca usar simulado!
            raise RuntimeError(
                "❌ RLCoder index not found!\n"
                "You MUST add and index a repository first:\n"
                "1. Go to Config tab\n"
                "2. Add L2J repository\n"
                "3. Click 'Index' (or wait for auto-indexing)\n"
                "Context is REQUIRED for accurate migration."
            )
        
        # Usar índice real para retrieval
        try:
            if self.semantic_index:
                 results = self._semantic_retrieval(query_code, top_k)
            else:
                 results = self._keyword_retrieval(query_code, top_k)
            return results
        except Exception as e:
            print(f"[!] Erro no retrieval (fallback para keyword): {e}")
            return self._keyword_retrieval(query_code, top_k)
    
    def _semantic_retrieval(self, query_code: str, top_k: int) -> Dict:
        """Retrieval usando Embeddings + FAISS."""
        # Gerar embedding da query (usar apenas primeiros 512 chars para velocidade)
        query_embedding = self.model.encode([query_code[:1024]])
        faiss.normalize_L2(query_embedding)
        
        # Buscar no FAISS
        scores, indices = self.semantic_index.search(query_embedding, top_k)
        
        relevant_files = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < len(self.index_data['files']):
                file_info = self.index_data['files'][idx]
                relevant_files.append({
                    'file_info': file_info,
                    'score': float(score)
                })
                
        return self._format_results(relevant_files, "semantic")

    def _keyword_retrieval(self, query_code: str, top_k: int) -> Dict:
        """Retrieval legado usando Keywords (Backup)."""
        # Extrair palavras-chave do código de consulta
        keywords = set()
        for word in query_code.split():
            clean_word = word.strip('();{}[].,')
            if clean_word and clean_word[0].isupper():  # Classes começam com maiúscula
                keywords.add(clean_word)
        
        # Buscar arquivos relevantes
        relevant_files = []
        for file_info in self.index_data['files'][:top_k * 2]:  # Pegar mais arquivos para filtrar
            score = 0.0
            content = file_info['content']
            
            # Calcular score baseado em keywords
            for keyword in keywords:
                if keyword in content:
                    score += content.count(keyword) / len(content)
            
            if score > 0:
                relevant_files.append({
                    'file_info': file_info,
                    'score': score
                })
        
        # Ordenar por score e pegar top_k
        relevant_files.sort(key=lambda x: x['score'], reverse=True)
        relevant_files = relevant_files[:top_k]
        
        # Se não encontrou nada relevante, pegar os primeiros arquivos
        if not relevant_files:
            relevant_files = [
                {'file_info': f, 'score': 0.5}
                for f in self.index_data['files'][:top_k]
            ]
        
        return self._format_results(relevant_files, "keyword")
        
    def _format_results(self, relevant_files: List, mode: str) -> Dict:
        return {
            "relevant_code": [
                f['file_info']['content'][:800] + "..."  
                for f in relevant_files
            ],
            "file_paths": [
                f['file_info']['path']
                for f in relevant_files
            ],
            "similarity_scores": [
                f['score']
                for f in relevant_files
            ],
            "mode": mode
        }
    
    def _mock_retrieval(self, query_code: str, top_k: int) -> Dict:
        """Retrieval simulado para desenvolvimento."""
        return {
            "relevant_code": [
                "// Exemplo de classe L2J relacionada\npublic class L2Character { ... }",
                "// Padrão Singleton usado no L2J\npublic static L2World getInstance() { ... }",
                "// Gerenciamento de inventário\npublic void addItem(L2ItemInstance item) { ... }"
            ][:top_k],
            "file_paths": [
                "l2j/gameserver/model/actor/L2Character.java",
                "l2j/gameserver/L2World.java",
                "l2j/gameserver/model/actor/instance/L2PcInstance.java"
            ][:top_k],
            "similarity_scores": [0.92, 0.87, 0.81][:top_k],
            "mode": "simulated"
        }
    
    def format_context_for_hrm(self, context: Dict) -> str:
        """
        Formata o contexto recuperado para ser usado pelo HRM.
        
        Args:
            context: Dicionário retornado por retrieve_context()
            
        Returns:
            String formatada com o contexto
        """
        lines = ["=== Contexto Recuperado pelo RLCoder ===\n"]
        
        # Adicionar aviso APENAS se modo simulado
        if context.get('mode') == 'simulated':
            lines.insert(1, "⚠️  [MODO SIMULADO - Acesse Config e clique em 'CRIAR ÍNDICE DO L2J' para contexto real]\n")
        elif context.get('mode') == 'real':
            lines.insert(1, "✅ [Usando índice real do repositório L2J]\n")
        
        for i, (code, path, score) in enumerate(zip(
            context['relevant_code'],
            context['file_paths'],
            context['similarity_scores']
        ), 1):
            lines.append(f"\n[{i}] Arquivo: {path} (similaridade: {score:.2f})")
            lines.append(f"```java\n{code}\n```\n")
        
        return "\n".join(lines)


# Utility functions for external use
def create_default_adapter() -> RLCoderAdapter:
    """Cria uma instância padrão do adaptador."""
    return RLCoderAdapter()


def get_context(java_code: str, top_k: int = 5) -> Dict:
    """
    Função utilitária para obter contexto rapidamente.
    
    Args:
        java_code: Código Java para buscar contexto
        top_k: Número de resultados
        
    Returns:
        Contexto formatado
    """
    adapter = create_default_adapter()
    return adapter.retrieve_context(java_code, top_k)
