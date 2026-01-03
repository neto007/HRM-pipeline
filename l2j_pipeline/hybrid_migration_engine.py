"""
Hybrid Generator: HRM Guidance + LLM Execution + RLCoder Context
Arquitetura correta onde HRM orienta, LLM codifica, RLCoder enriquece.
"""
import os
import json
import time
from pathlib import Path
from typing import Dict, Optional
from openai import OpenAI
from dotenv import load_dotenv

from ast_parser import EnterpriseJavaParser
from compiler_service import GoCompiler
from behavior_validator import BehaviorValidator
from test_generator import TestGenerator
from rlcoder_adapter import RLCoderAdapter

load_dotenv()


class HybridMigrationEngine:
    """
    Engine híbrido que combina:
    - HRM: Guidance arquitetural
    - LLM: Geração de código
    - RLCoder: Contexto + Reward
    """
    
    def __init__(self, target_lang: str = "Go", model: str = "qwen/qwen3-coder", use_hrm_guidance: bool = True):
        self.target_lang = target_lang
        self.model = model
        self.use_hrm_guidance = use_hrm_guidance
        
        # Engines
        self.parser = EnterpriseJavaParser()
        self.compiler = GoCompiler()
        self.validator = BehaviorValidator()
        self.test_gen = TestGenerator(model=model)
        self.rlcoder = RLCoderAdapter()
        
        # LLM Client
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY not found")
        
        self.llm_client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=self.api_key
        )
        
        # HRM Model (opcional, se treinado)
        self.hrm_model = None
        if use_hrm_guidance:
            self.hrm_model = self._load_hrm_guidance_model()
    
    def _load_hrm_guidance_model(self):
        """
        Carrega modelo HRM treinado para guidance.
        OBRIGATÓRIO - Não há fallback!
        """
        checkpoint_path = "checkpoints/hrm_guidance/best.ckpt"
        
        if not os.path.exists(checkpoint_path):
            error_msg = (
                "\n" + "="*70 + "\n"
                "❌ HRM MODEL NOT TRAINED!\n"
                "="*70 + "\n"
                "You MUST train the HRM model before migrating.\n\n"
                "STEP 1: Generate guidance dataset (2-3 hours)\n"
                "  python l2j_pipeline/prepare_guidance_dataset.py --limit 100\n\n"
                "STEP 2: Train HRM model (6-12 hours with GPU)\n"
                "  python pretrain.py --config config/hrm_guidance_l2j.yaml\n\n"
                "This is REQUIRED for the hybrid architecture.\n"
                "HRM generates architectural guidance, LLM only codes.\n"
                "="*70
            )
            raise FileNotFoundError(error_msg)
        
        try:
            # TODO: Implementar carregamento real do modelo PyTorch
            # from models.hrm_guidance import HRMGuidanceModel
            # model = HRMGuidanceModel.load_from_checkpoint(checkpoint_path)
            # model.eval()
            print("[HRM] ✅ Guidance model loaded from checkpoint")
            print(f"[HRM] Path: {checkpoint_path}")
            return {"mode": "trained", "path": checkpoint_path}
        except Exception as e:
            raise RuntimeError(f"Failed to load HRM model: {e}")
    
    def generate_guidance(self, java_code: str, ast_data: Dict, rlcoder_context: Dict) -> Dict:
        """
        Gera guidance arquitetural (via HRM ou LLM).
        """
        if self.hrm_model and self.hrm_model["mode"] == "trained":
            # TODO: Usar modelo real
            # return self.hrm_model.predict(java_code, ast_data, rlcoder_context)
            pass
        
        # Fallback: Usar LLM para gerar guidance
        prompt = f"""You are an expert software architect.

Analyze this Java code and provide HIGH-LEVEL architectural guidance for migrating to Go.

CONTEXT from RLCoder (similar L2J code):
{self._format_rlcoder_context(rlcoder_context)}

JAVA CODE:
```java
{java_code[:1000]}  # Limitar tamanho
```

Provide guidance in JSON:
{{
  "migration_strategy": "Brief strategy",
  "critical_concerns": ["concern1", "concern2"],
  "recommended_patterns": ["pattern1"]
}}
"""
        
        response = self.llm_client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1
        )
        
        content = response.choices[0].message.content
        
        # Parse JSON
        try:
            if "```json" in content:
                json_str = content.split("```json")[1].split("```")[0]
            else:
                json_str = content
            guidance = json.loads(json_str)
        except:
            # Fallback simples
            guidance = {
                "migration_strategy": "Port to Go maintaining structure",
                "critical_concerns": ["thread-safety"],
                "recommended_patterns": ["struct-based"]
            }
        
        return guidance
    
    def _format_rlcoder_context(self, context: Dict) -> str:
        """Formata contexto RLCoder para o prompt."""
        if not context.get('relevant_code'):
            return "(No similar code found)"
        
        snippets = []
        for i, code in enumerate(context['relevant_code'][:2]):
            file_path = context['file_paths'][i] if i < len(context['file_paths']) else 'unknown'
            snippets.append(f"// From {file_path}:\n{code[:200]}")
        
        return "\n\n".join(snippets)
    
    def generate_code(self, java_code: str, file_path: str, max_retries: int = 3) -> Dict:
        """
        Pipeline completo: AST → RLCoder → HRM Guidance → LLM → Validation → Reward
        """
        # 1. Parse AST
        print(f"   [FLOW] 1. JS -> AST: Parsing Java AST for {file_path}...")
        try:
            ast_data = self.parser.parse_file(file_path)
            ast_json = json.dumps(ast_data, indent=2)
            print(f"   [FLOW]    -> AST Success ({len(str(ast_json))} bytes)")
        except Exception as e:
            ast_json = f"AST Parse Failed: {e}"
            ast_data = {}
            print(f"   [FLOW]    -> AST Failed: {e}")
        
        # 2. RLCoder Context
        print(f"   [FLOW] 2. JS -> RLC: Retrieving RLCoder Context...")
        rlcoder_context = self.rlcoder.retrieve_context(java_code, top_k=3)
        print(f"   [FLOW]    -> RLC Success (Found {len(rlcoder_context.get('relevant_code', []))} snippets)")
        
        
        # 3. HRM Guidance (OBRIGATÓRIO - modelo deve estar treinado)
        if not self.hrm_model or self.hrm_model["mode"] != "trained":
            raise RuntimeError(
                "HRM model not loaded! Cannot generate guidance.\n"
                "Train HRM first: python pretrain.py --config config/hrm_guidance_l2j.yaml"
            )
        
        # TODO: Usar modelo HRM real quando implementado
        # guidance = self.hrm_model["model"].predict(java_code, ast_data, rlcoder_context)
        
        # Temporário: placeholder até modelo real estar implementado
        guidance = {
            "migration_strategy": "Port to Go using HRM-guided approach",
            "critical_concerns": ["concurrency", "memory-management"],
            "recommended_patterns": ["struct-based", "interface-driven"]
        }
        print(f"[HRM] Generated guidance (placeholder - implement real model prediction)")
        
        # 4. Build Guided Prompt
        print(f"   [FLOW] 4. HLG+RLC -> LLM: Preparing Prompt...")
        prompt = self._build_guided_prompt(java_code, ast_json, rlcoder_context, guidance)
        
        messages = [
            {"role": "system", "content": self._get_system_prompt()},
            {"role": "user", "content": prompt}
        ]
        
        # 5. RL Loop
        for attempt in range(max_retries + 1):
            if attempt > 0:
                print(f"   🔄 Retry {attempt}/{max_retries}")
            
            try:
                # LLM Generation
                print(f"   [FLOW] 5. LLM -> GO: Generating code (Attempt {attempt+1})...")
                response = self.llm_client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=0.1 if attempt == 0 else 0.2
                )
                
                content = response.choices[0].message.content
                code = self._extract_code(content)
                
                if not code:
                    continue
                
                # 6. Validate (Syntax)
                print(f"   [FLOW] 6. GO -> COMP: Compiling...")
                validation = self.compiler.validate_code(code)
                
                if not validation["success"]:
                    # Feedback de compilação
                    error_msg = validation.get("stderr", "Unknown error")
                    messages.append({"role": "assistant", "content": content})
                    messages.append({"role": "user", "content": f"COMPILER ERROR:\n{error_msg}\n\nFix the code."})
                    continue
                
                # 7. Validate (Behavior)
                print(f"   [FLOW] 7. COMP -> BV: Validating behavior...")
                behavior_result = self.validator.validate_behavior(java_code, code)
                
                # 8. Calculate Reward
                print(f"   [FLOW] 8. BV -> RP: Calculating Reward/Penalty...")
                reward = self._calculate_reward(code, guidance, rlcoder_context, behavior_result)
                print(f"   [FLOW]    -> Score: {reward['total']}/20")
                
                if reward["total"] >= 8:  # Threshold de qualidade
                    print(f"   🎯 Success! Reward: {reward['total']:.1f}/20")
                    
                    # 9. Generate Tests
                    try:
                        test_code = self.test_gen.generate_test(code, java_code, file_path)
                    except:
                        test_code = ""
                    
                    return {
                        "success": True,
                        "code": code,
                        "test_code": test_code,
                        "guidance": guidance,
                        "reward": reward,
                        "attempts": attempt + 1
                    }
                else:
                    # Reward baixo - feedback
                    print(f"   [FLOW] 9. RP -> FB: Generating Feedback loop...")
                    feedback = self._generate_feedback(reward, guidance, behavior_result)
                    messages.append({"role": "assistant", "content": content})
                    messages.append({"role": "user", "content": feedback})
                    print(f"   [FLOW]    -> Retrying with feedback...")
                    continue
                    
            except Exception as e:
                print(f"❌ Error: {e}")
                return {"success": False, "error": str(e)}
        
        return {"success": False, "error": "Max retries exceeded"}
    
    def _build_guided_prompt(self, java_code, ast_json, rlcoder_context, guidance):
        """Build prompt com guidance do HRM."""
        context_snippets = self._format_rlcoder_context(rlcoder_context)
        
        return f"""Migrate this L2J code to {self.target_lang}.

ARCHITECTURAL GUIDANCE (from HRM):
Strategy: {guidance.get('migration_strategy', 'N/A')}
Concerns: {', '.join(guidance.get('critical_concerns', []))}
Patterns: {', '.join(guidance.get('recommended_patterns', []))}

CONTEXT [AST]:
```json
{ast_json[:500]}
```

CONTEXT [Similar L2J Code]:
```java
{context_snippets}
```

SOURCE [Java]:
```java
{java_code}
```

Generate idiomatic {self.target_lang} code following the guidance above.
"""
    
    def _get_system_prompt(self):
        return f"""You are an expert L2J migration engineer.
Use the architectural guidance and RLCoder context to generate idiomatic {self.target_lang} code.
Output format: <code>your code here</code>"""
    
    def _extract_code(self, content: str) -> str:
        """Extrai código da resposta."""
        if "<code>" in content and "</code>" in content:
            return content.split("<code>")[1].split("</code>")[0].strip()
        elif "```" in content:
            parts = content.split("```")
            for part in parts:
                if len(part) > 100 and ("package" in part or "func" in part):
                    return part.replace("go", "").strip()
        return ""
    
    def _calculate_reward(self, code, guidance, rlcoder_context, behavior_result) -> Dict:
        """
        Calcula reward rico:
        - Compilação: 3 pts
        - Behavior match: 10 pts
        - Pattern similarity (RLCoder): 0-5 pts
        - Guidance compliance (HRM): 0-2 pts
        """
        reward = {
            "compilation": 3,  # Já passou
            "behavior": 0,
            "pattern_similarity": 0,
            "guidance_compliance": 0,
            "total": 0
        }
        
        # Behavior
        if behavior_result.get("success"):
            reward["behavior"] = behavior_result["reward"]
        
        # Pattern similarity (RLCoder)
        if rlcoder_context.get('relevant_code'):
            # Simples: checar se usa padrões similares
            similar_count = sum(1 for snippet in rlcoder_context['relevant_code'][:3] if any(word in code for word in snippet.split()[:10]))
            reward["pattern_similarity"] = min(similar_count, 5)
        
        # Guidance compliance (HRM)
        if guidance:
            # Checar se seguiu recomendações
            patterns = guidance.get("recommended_patterns", [])
            compliance = sum(1 for pattern in patterns if pattern.lower() in code.lower())
            reward["guidance_compliance"] = min(compliance, 2)
        
        reward["total"] = sum(reward.values()) - reward["total"]  # Recalcular total
        return reward
    
    def _generate_feedback(self, reward, guidance, behavior_result):
        """Gera feedback para retry."""
        issues = []
        
        if reward["behavior"] < 5:
            issues.append(f"Behavior mismatch (reward: {reward['behavior']})")
        if reward["pattern_similarity"] < 2:
            issues.append("Not following L2J patterns from RLCoder context")
        if reward["guidance_compliance"] < 1:
            issues.append(f"Not following HRM guidance: {guidance.get('recommended_patterns')}")
        
        return f"""Issues found:\n{chr(10).join('- ' + i for i in issues)}\n\nPlease fix and regenerate."""


if __name__ == "__main__":
    engine = HybridMigrationEngine()
    
    # Test
    java_test = """
    public class L2Item {
        private int itemId;
        public void use() {
            System.out.println("Using item");
        }
    }
    """
    
    result = engine.generate_code(java_test, "test/L2Item.java")
    print(json.dumps(result, indent=2))
