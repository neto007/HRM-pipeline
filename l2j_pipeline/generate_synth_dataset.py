"""
Gerador de Dataset Sintético Enterprise (HRM-Forge Pro)
Implementa Multi-Stage Prompting: Analyst -> Architect -> Coder
Agora com integração Tree-sitter AST e Modelo Qwen.
+ RL Loop (Compiler Feedback)
"""
import os
import json
import argparse
import time
from pathlib import Path
from typing import List, Dict, Optional
from tqdm import tqdm
from openai import OpenAI
from dotenv import load_dotenv
from ast_parser import EnterpriseJavaParser # AST Integration
from compiler_service import GoCompiler # RL Loop (Syntax)
from behavior_validator import BehaviorValidator # RL Loop (Semantics)
from test_generator import TestGenerator # QA Agent
from rlcoder_adapter import RLCoderAdapter # Context Retrieval

# Carregar variáveis de ambiente
load_dotenv()

class EnterpriseGenerator:
    def __init__(self, target_lang: str = "Go", model: str = "qwen/qwen3-coder"):
        self.target_lang = target_lang
        self.model = model
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        self.parser = EnterpriseJavaParser() # Parse Engine
        self.compiler = GoCompiler() # Validation Engine (Syntax)
        self.validator = BehaviorValidator() # Validation Engine (Semantics)
        self.test_gen = TestGenerator(model=model) # QA Engine
        self.rlcoder = RLCoderAdapter() # Context Retrieval Engine
        
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY não encontrada no ambiente (.env)")
            
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=self.api_key,
        )
        
        self.system_prompt = f"""You are an Expert L2J Migration Team (Powered by Qwen Logic).
Personas:
1. **The Game Analyst**: Uses Structural AST Data to deep-dive into logic.
2. **The Systems Architect**: Designs idiomatic {target_lang} structures.
3. **The Senior Engineer**: Implements production-ready code.

Context Sources:
- AST Metadata (Structure, Inheritance, Imports)
- RLCoder Context (Similar patterns from L2J repository)

Objective: Migrate Java (L2J) to {target_lang}.

INPUT DATA:
- Raw Java Source
- AST Metadata
- Similar L2J Code (from RLCoder retrieval)

OUTPUT FORMAT:
<analysis>
[Analyst Report taking AST and similar code patterns into account]
</analysis>

<architecture>
[Architect Plan considering L2J conventions]
</architecture>

<code>
[Final {target_lang} Code]
</code>
"""

    def generate_translation(self, java_code: str, file_path: str, max_retries: int = 3) -> Dict:
        """Executa pipeline com AST Context + RL Loop."""
        
        # 1. Parse AST
        ast_data = {}
        try:
            ast_data = self.parser.parse_file(file_path)
            ast_json = json.dumps(ast_data, indent=2)
        except Exception as e:
            # print(f"⚠️ AST Parse Warning: {e}")
            ast_json = f"AST Parse Failed: {e}"
        
        # 2. Retrieve RLCoder Context (Similar code from L2J)
        rlcoder_context = self.rlcoder.retrieve_context(java_code, top_k=3)
        context_snippets = ""
        if rlcoder_context.get('relevant_code'):
            context_snippets = "\n\n".join([
                f"// Similar pattern from {rlcoder_context['file_paths'][i]}:\n{code}"
                for i, code in enumerate(rlcoder_context['relevant_code'][:3])
            ])
        
        # 3. Build Rich Prompt with AST + RLCoder Context
        user_prompt = f"""Migrate this file to {self.target_lang}.

CONTEXT [AST Analysis]:
```json
{ast_json}
```

CONTEXT [Similar L2J Code - Use as reference]:
```java
{context_snippets if context_snippets else '(No similar code found)'}
```

SOURCE [Java]:
```java
{java_code}
```
"""
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        # RL Loop: Generate -> Compile -> Fix -> Repeat
        for attempt in range(max_retries + 1):
            try:
                if attempt > 0:
                     print(f"   🔄 Auto-Fix Attempt {attempt}/{max_retries}...")
                
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=0.1 if attempt == 0 else 0.2
                )
                
                content = response.choices[0].message.content
                code = self._extract_tag(content, "code")
                analysis = self._extract_tag(content, "analysis")
                architecture = self._extract_tag(content, "architecture")
                
                if not code and "```" in content:
                     parts = content.split("```")
                     for part in parts:
                         if len(part) > 100 and ("package" in part or "func" in part):
                             code = part.replace(self.target_lang.lower(), "").strip()

                if not code:
                     # Failed to generate code block
                     error_msg = "Output format violation: No <code> block found."
                     messages.append({"role": "assistant", "content": content})
                     messages.append({"role": "user", "content": f"System Error: {error_msg}. Please ensure you wrap the code in <code> tags."})
                     continue

                # 3. Validation Step (The Muscle)
                validation = self.compiler.validate_code(code)
                
                if validation["success"]:
                    # SUCCESS at compilation - Now validate BEHAVIOR
                    print(f"   ✅ Compilation OK. Validating runtime behavior...")
                    
                    behavior_result = self.validator.validate_behavior(
                        java_code=java_code,
                        go_code=code
                    )
                    
                    # Check reward score
                    total_score = behavior_result.get("total_score", 0)
                    match_score = behavior_result["comparison"].get("match_score", 0)
                    
                    if behavior_result["success"] and total_score > 0:
                        # FULL SUCCESS - Semantic match!
                        print(f"   🎯 Behavior Match! Score: {total_score:.1f}, Match: {match_score:.0%}")
                        
                        # Auto-generate tests (100% compliance feature)
                        print(f"   🧪 Generating unit tests...")
                        try:
                            test_code = self.test_gen.generate_test(
                                go_code=code,
                                original_java=java_code,
                                filename=file_path
                            )
                            test_generated = True
                        except Exception as e:
                            print(f"   ⚠️ Test generation failed: {e}")
                            test_code = ""
                            test_generated = False
                        
                        return {
                            "success": True,
                            "analysis": analysis,
                            "architecture": architecture,
                            "target_code": code,
                            "test_code": test_code,
                            "ast_used": True,
                            "attempts": attempt + 1,
                            "behavior_validated": True,
                            "test_generated": test_generated,
                            "reward_score": behavior_result["reward"],
                            "penalty_score": behavior_result["penalty"],
                            "total_score": total_score,
                            "match_score": match_score
                        }
                    else:
                        # Behavior mismatch - give feedback to LLM
                        recommendations = "\n".join(behavior_result.get("recommendations", []))
                        error_log = f"""Runtime Behavior Mismatch:
- Java Output: {behavior_result.get('java_output', 'N/A')[:200]}
- Go Output: {behavior_result.get('go_output', 'N/A')[:200]}
- Match Score: {match_score:.0%}
- Reward: {behavior_result['reward']}, Penalty: {behavior_result['penalty']}
- Recommendations: {recommendations}
"""
                        print(f"   ⚠️ Behavior Mismatch (Score: {total_score:.1f}). Retrying...")
                        
                        messages.append({"role": "assistant", "content": content})
                        messages.append({
                            "role": "user",
                            "content": f"""BEHAVIOR VALIDATION FAILED:
```text
{error_log}
```
The code compiles but produces different runtime behavior. Please FIX the logic to match Java semantics exactly.
"""
                        })
                        continue
                    
                else:
                    # Compilation Failed - Feedback Loop
                    error_log = validation.get("stderr", "Unknown Error")
                    # print(f"❌ Compiler Error: {error_log[:100]}...")
                    
                    messages.append({"role": "assistant", "content": content})
                    messages.append({
                        "role": "user", 
                        "content": f"""COMPILER ERROR (Go Build Failed):
```text
{error_log}
```
Please Analysis the error and FIX the code. Return ONLY the corrected code in <code> tags this time.
"""
                    })
                    
            except Exception as e:
                print(f"❌ API Error: {e}")
                return {"success": False, "error": str(e)}

        return {"success": False, "error": "Max retries exceeded (Compilation Failed)"}

    def _extract_tag(self, text: str, tag: str) -> str:
        start_tag = f"<{tag}>"
        end_tag = f"</{tag}>"
        if start_tag in text and end_tag in text:
            return text.split(start_tag)[1].split(end_tag)[0].strip()
        return ""

    def process_batch(self, file_list: List[Dict], output_dir: str):
        os.makedirs(output_dir, exist_ok=True)
        results = []
        
        print(f"[*] Enterprise Pipeline (AST + Qwen + RL Loop). Model: {self.model}")
        
        for file_info in tqdm(file_list):
            fpath = file_info['file_path']
            fname = os.path.basename(fpath)
            
            try:
                with open(fpath, 'r', encoding='utf-8') as f:
                    java_code = f.read()
            except Exception as e:
                print(f"⚠️ Read Error {fpath}: {e}")
                continue
            
            # Executa com RL Loop
            result = self.generate_translation(java_code, fpath)
            
            if result["success"]:
                entry = {
                    "source_file": fpath,
                    "target_lang": self.target_lang,
                    "model_used": self.model,
                    "input_code": java_code,
                    "analysis_trace": result.get("analysis", ""),
                    "architecture_trace": result.get("architecture", ""),
                    "output_code": result["target_code"],
                    "attempts": result.get("attempts", 1),
                    "timestamp": time.time(),
                    "pipeline_version": "enterprise_rl_v3"
                }
                
                safe_name = fname.replace('.', '_') + ".json"
                with open(os.path.join(output_dir, safe_name), 'w') as f:
                    json.dump(entry, f, indent=2)
                
                results.append(entry)
                time.sleep(1)
            else:
                print(f"❌ Failed (After Retries): {fname}")
        
        print(f"✅ Batch Completed. {len(results)}/{len(file_list)} processed.")

def load_migration_plan(plan_path: str) -> List[Dict]:
    with open(plan_path, 'r') as f:
        data = json.load(f)
    class_to_file = {node['id']: node['file_path'] for node in data['graph_data']['nodes']}
    ordered_files = []
    for class_name in data['migration_order']:
        if class_name in class_to_file:
            ordered_files.append({"class_name": class_name, "file_path": class_to_file[class_name]})
    return ordered_files

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--plan", default="data/migration_plan.json")
    parser.add_argument("--output", default="data/synth_dataset")
    parser.add_argument("--limit", type=int, default=5)
    parser.add_argument("--lang", default="Go")
    parser.add_argument("--model", default="qwen/qwen3-coder") # Default Qwen 3
    
    args = parser.parse_args()
    
    if not os.path.exists(args.plan):
         print(f"❌ Plan not found: {args.plan}")
         return
    
    files = load_migration_plan(args.plan)
    batch = files[:args.limit]
    
    print(f"[*] Processing {len(batch)} files with Qwen + AST + Compiler Loop:")
    for f in batch: print(f"   - {f['class_name']}")
        
    generator = EnterpriseGenerator(target_lang=args.lang, model=args.model)
    generator.process_batch(batch, args.output)

if __name__ == "__main__":
    main()
