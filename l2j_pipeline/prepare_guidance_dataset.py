"""
Preparador de Dataset HRM-Guidance
Gera dados de treino para o modelo HRM aprender a dar orientação arquitetural.
"""
import json
import os
from pathlib import Path
from typing import Dict, List
from openai import OpenAI
from dotenv import load_dotenv
from ast_parser import EnterpriseJavaParser
from domain_orchestrator import DomainOrchestrator

load_dotenv()

class GuidanceDatasetGenerator:
    """
    Gera dataset de guidance usando LLM para bootstrap.
    Output: Triplas (Java + AST) -> Architectural Guidance
    """
    
    def __init__(self, model: str = "qwen/qwen3-coder"):
        self.model = model
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=os.getenv("OPENROUTER_API_KEY")
        )
        self.parser = EnterpriseJavaParser()
        self.orchestrator = DomainOrchestrator()
    
    def generate_guidance(self, java_code: str, file_path: str) -> Dict:
        """
        Usa LLM para gerar guidance arquitetural de alto nível.
        """
        # Parse AST
        ast_data = self.parser.parse_file(file_path)
        
        # Classificar domínio
        domain = self.orchestrator.classify_file(file_path, ast_data)
        
        # Prompt para guidance
        prompt = f"""You are an expert software architect for MMORPG servers.

Analyze this Java class from L2J server and provide HIGH-LEVEL architectural guidance for migrating it to Go.

DO NOT generate code. Only provide strategic guidance.

JAVA CLASS:
```java
{java_code}
```

AST CONTEXT:
- Package: {ast_data.get('package', 'unknown')}
- Classes: {len(ast_data.get('classes', []))}
- Methods: {sum(len(c.get('methods', [])) for c in ast_data.get('classes', []))}

Provide guidance in JSON format:
{{
  "domain": "core|gameplay|network|data|ai|scripts",
  "migration_strategy": "Brief strategy (1 sentence)",
  "critical_concerns": ["concern1", "concern2"],
  "recommended_patterns": ["pattern1", "pattern2"],
  "threading_model": "single|concurrent|actor",
  "state_management": "stateless|stateful-local|stateful-shared"
}}
"""
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1
        )
        
        content = response.choices[0].message.content
        
        # Extrair JSON
        try:
            # Procurar bloco JSON
            if "```json" in content:
                json_str = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                json_str = content.split("```")[1].split("```")[0].strip()
            else:
                json_str = content.strip()
            
            guidance = json.loads(json_str)
            return guidance
        except Exception as e:
            print(f"⚠️ Failed to parse guidance JSON: {e}")
            # Fallback
            return {
                "domain": domain,
                "migration_strategy": "Port to Go maintaining original structure",
                "critical_concerns": ["thread-safety", "memory-management"],
                "recommended_patterns": ["struct-based", "method-receivers"],
                "threading_model": "concurrent",
                "state_management": "stateful-local"
            }
    
    def prepare_dataset(self, migration_plan: str, output_dir: str, limit: int = 50):
        """
        Prepara dataset completo de guidance.
        """
        os.makedirs(output_dir, exist_ok=True)
        
        # Carregar plano
        with open(migration_plan) as f:
            plan = json.load(f)
        
        class_to_file = {node['id']: node['file_path'] for node in plan['graph_data']['nodes']}
        
        dataset = []
        print(f"[*] Generating guidance dataset for {limit} files...")
        
        for class_name in plan['migration_order'][:limit]:
            if class_name not in class_to_file:
                continue
            
            file_path = class_to_file[class_name]
            
            try:
                with open(file_path, 'r') as f:
                    java_code = f.read()
            except Exception as e:
                print(f"⚠️ Failed to read {file_path}: {e}")
                continue
            
            # Gerar guidance
            print(f"   Generating guidance for {class_name}...")
            guidance = self.generate_guidance(java_code, file_path)
            
            # Salvar entrada
            entry = {
                "input": {
                    "java_code": java_code,
                    "file_path": file_path,
                    "class_name": class_name,
                    "ast": self.parser.parse_file(file_path)
                },
                "output": {
                    "guidance": guidance
                }
            }
            
            dataset.append(entry)
            
            # Salvar individual
            safe_name = class_name.replace('.', '_') + '_guidance.json'
            with open(os.path.join(output_dir, safe_name), 'w') as f:
                json.dump(entry, f, indent=2)
        
        # Salvar dataset completo
        with open(os.path.join(output_dir, 'full_guidance_dataset.jsonl'), 'w') as f:
            for entry in dataset:
                f.write(json.dumps(entry) + '\n')
        
        print(f"✅ Generated {len(dataset)} guidance examples")
        print(f"   Saved to: {output_dir}")
        
        return dataset


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser()
    parser.add_argument("--plan", default="data/migration_plan.json")
    parser.add_argument("--output", default="data/hrm_guidance_dataset")
    parser.add_argument("--limit", type=int, default=50)
    parser.add_argument("--model", default="qwen/qwen3-coder")
    
    args = parser.parse_args()
    
    generator = GuidanceDatasetGenerator(model=args.model)
    generator.prepare_dataset(args.plan, args.output, args.limit)
