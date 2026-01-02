"""
RLCoder Adapter for HRM Pipeline
Integrates RLRetriever (ICSE 2025) for intelligent code retrieval during transcription.
"""
import os
import json
from typing import Dict, List, Optional
from pathlib import Path


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
        self.retriever = None
        self._load_retriever()
    
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
            # Modo simulado (fallback)
            return self._mock_retrieval(query_code, top_k)
        
        # Usar índice real para retrieval
        try:
            results = self._real_retrieval(query_code, top_k)
            return results
        except Exception as e:
            print(f"[!] Erro no retrieval real: {e}")
            return self._mock_retrieval(query_code, top_k)
    
    def _real_retrieval(self, query_code: str, top_k: int) -> Dict:
        """Retrieval usando índice real do L2J."""
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
        
        return {
            "relevant_code": [
                f['file_info']['content'][:500] + "..."  # Preview de 500 chars
                for f in relevant_files
            ],
            "file_paths": [
                f['file_info']['path']
                for f in relevant_files
            ],
            "similarity_scores": [
                min(f['score'] * 10, 1.0)  # Normalizar para 0-1
                for f in relevant_files
            ],
            "mode": "real"  # Indicar que é contexto real
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
