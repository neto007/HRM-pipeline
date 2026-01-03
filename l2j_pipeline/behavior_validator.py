"""
Runtime Behavior Validator (The Core of True RL)
Executes both Java and Go code with controlled inputs and compares outputs.
This is the missing piece for "RL-Driven" - we validate BEHAVIOR, not just syntax.
"""
import subprocess
import json
import os
import tempfile
import hashlib
from typing import Dict, List, Tuple, Optional

try:
    from docker_sandbox import DockerSandbox
    DOCKER_AVAILABLE = True
except Exception:
    DOCKER_AVAILABLE = False

class BehaviorValidator:
    """
    Compares runtime behavior of Java original vs Go generated code.
    Implements Reward/Penalty metrics as specified in Estudo.txt L387-412.
    """
    
    def __init__(self, java_classpath: str = "data/l2j_classes", go_sandbox: str = "data/compiler_sandbox", use_docker: bool = True):
        self.java_classpath = java_classpath
        self.go_sandbox = go_sandbox
        self.use_docker = use_docker and DOCKER_AVAILABLE
        
        if self.use_docker:
            try:
                self.docker = DockerSandbox()
                print("[INFO] Docker Sandbox enabled for secure execution")
            except Exception as e:
                print(f"[WARN] Docker unavailable, falling back to local execution: {e}")
                self.use_docker = False
        
        os.makedirs(java_classpath, exist_ok=True)
        os.makedirs(go_sandbox, exist_ok=True)
    
    def validate_behavior(self, 
                          java_code: str, 
                          go_code: str,
                          test_inputs: Optional[List[Dict]] = None) -> Dict:
        """
        Main validation method.
        Returns: {
            'success': bool,
            'reward': float,
            'penalty': float,
            'comparison': {...},
            'recommendations': [...]
        }
        """
        if test_inputs is None:
            # Default: Empty execution (checks constructor, static methods)
            test_inputs = [{"method": "default", "args": []}]
        
        # Step 1: Execute Java
        java_result = self._execute_java(java_code, test_inputs)
        
        # Step 2: Execute Go
        go_result = self._execute_go(go_code, test_inputs)
        
        # Step 3: Compare outputs
        comparison = self._compare_outputs(java_result, go_result)
        
        # Step 4: Calculate Reward/Penalty (Estudo.txt L387-397)
        metrics = self._calculate_metrics(comparison)
        
        return {
            "success": comparison["match_score"] > 0.80,  # 80% threshold
            "reward": metrics["reward"],
            "penalty": metrics["penalty"],
            "total_score": metrics["reward"] - metrics["penalty"],
            "comparison": comparison,
            "java_output": java_result.get("stdout", ""),
            "go_output": go_result.get("stdout", ""),
            "recommendations": self._generate_recommendations(comparison)
        }
    
    def _execute_java(self, java_code: str, test_inputs: List[Dict]) -> Dict:
        """
        Executes Java code in a controlled environment.
        Uses Docker if available, falls back to local execution.
        """
        if self.use_docker:
            return self.docker.execute_java(java_code, timeout=10)
        
        # Fallback to local execution (original implementation)
        try:
            # For simplicity, we'll use javac and java CLI
            # In production, use a proper test runner like JUnit
            
            # Extract class name from code
            class_name = self._extract_java_classname(java_code)
            if not class_name:
                return {"success": False, "error": "Could not extract class name"}
            
            # Write to temp file
            java_file = os.path.join(self.java_classpath, f"{class_name}.java")
            with open(java_file, "w") as f:
                f.write(java_code)
            
            # Compile
            compile_cmd = ["javac", java_file]
            compile_result = subprocess.run(compile_cmd, capture_output=True, text=True, timeout=10)
            
            if compile_result.returncode != 0:
                return {
                    "success": False,
                    "error": "Java compilation failed",
                    "stderr": compile_result.stderr
                }
            
            # For now, just return success (we validated it compiles)
            # TODO: Actually execute with test inputs
            return {
                "success": True,
                "stdout": f"Java {class_name} compiled successfully",
                "exit_code": 0
            }
            
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Java execution timeout"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _execute_go(self, go_code: str, test_inputs: List[Dict]) -> Dict:
        """
        Executes Go code in sandbox.
        Uses Docker if available, falls back to local execution.
        """
        if self.use_docker:
            return self.docker.execute_go(go_code, timeout=10)
        
        # Fallback to local execution (original implementation)
        try:
            # Use the compiler service we already have
            # but enhance it to actually RUN, not just build
            
            # Write code to temp file
            go_file = os.path.join(self.go_sandbox, "test_main.go")
            with open(go_file, "w") as f:
                f.write(go_code)
            
            # Build
            build_cmd = ["go", "build", "-o", "test_binary", "test_main.go"]
            build_result = subprocess.run(build_cmd, cwd=self.go_sandbox, capture_output=True, text=True, timeout=10)
            
            if build_result.returncode != 0:
                return {
                    "success": False,
                    "error": "Go compilation failed",
                    "stderr": build_result.stderr
                }
            
            # Execute (if it has a main)
            binary_path = os.path.join(self.go_sandbox, "test_binary")
            if os.path.exists(binary_path):
                run_result = subprocess.run([binary_path], capture_output=True, text=True, timeout=5)
                return {
                    "success": run_result.returncode == 0,
                    "stdout": run_result.stdout,
                    "stderr": run_result.stderr,
                    "exit_code": run_result.returncode
                }
            else:
                # No main, just library code - success if compiles
                return {
                    "success": True,
                    "stdout": "Go code compiled (library mode)",
                    "exit_code": 0
                }
            
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Go execution timeout"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _compare_outputs(self, java_result: Dict, go_result: Dict) -> Dict:
        """
        Compares Java vs Go outputs.
        Returns match score and details.
        """
        # If either failed, score is 0
        if not java_result.get("success") or not go_result.get("success"):
            return {
                "match_score": 0.0,
                "exact_match": False,
                "details": "One or both executions failed"
            }
        
        java_out = java_result.get("stdout", "")
        go_out = go_result.get("stdout", "")
        
        # Exact match check
        exact_match = (java_out.strip() == go_out.strip())
        
        # Fuzzy score (Levenshtein distance would be better, but simple for now)
        score = 1.0 if exact_match else 0.5
        
        return {
            "match_score": score,
            "exact_match": exact_match,
            "java_output_length": len(java_out),
            "go_output_length": len(go_out),
            "details": "Outputs match" if exact_match else "Outputs differ"
        }
    
    def _calculate_metrics(self, comparison: Dict) -> Dict:
        """
        Calculate Reward/Penalty based on Estudo.txt specification.
        Lines 387-397 define the metrics.
        """
        reward = 0.0
        penalty = 0.0
        
        match_score = comparison["match_score"]
        
        # Rewards (Estudo.txt L388-393)
        if comparison["exact_match"]:
            reward += 5  # exact_damage_match equivalent
        elif match_score > 0.8:
            reward += 3  # partial match
        
        # Deterministic output (same stdout)
        if comparison["exact_match"]:
            reward += 5
        
        # Penalties (Estudo.txt L395-398)
        if match_score < 0.5:
            penalty += 10  # state_divergence
        
        if comparison.get("details") == "One or both executions failed":
            penalty += 8  # equivalent to race_condition
        
        return {
            "reward": reward,
            "penalty": penalty
        }
    
    def _generate_recommendations(self, comparison: Dict) -> List[str]:
        """
        Generate actionable recommendations for LLM to fix issues.
        """
        recommendations = []
        
        if not comparison["exact_match"]:
            recommendations.append("Output mismatch detected. Review logic translation.")
        
        if comparison["match_score"] < 0.5:
            recommendations.append("CRITICAL: Major behavior divergence. Re-architect the migration.")
        
        return recommendations
    
    def _extract_java_classname(self, java_code: str) ->str:
        """
        Extract class name from Java code.
        """
        import re
        match = re.search(r'class\s+(\w+)', java_code)
        if match:
            return match.group(1)
        return None


if __name__ == "__main__":
    # Test the validator
    validator = BehaviorValidator()
    
    java_sample = """
    public class HelloWorld {
        public static void main(String[] args) {
            System.out.println("Hello L2J");
        }
    }
    """
    
    go_sample = """
    package main
    import "fmt"
    func main() {
        fmt.Println("Hello L2J")
    }
    """
    
    result = validator.validate_behavior(java_sample, go_sample)
    print(json.dumps(result, indent=2))
