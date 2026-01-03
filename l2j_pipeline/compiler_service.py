"""
Compiler Service (The Muscle)
Validates generated Go code by attempting to build it.
"""
import subprocess
import os
import tempfile
import uuid
from typing import Dict, Tuple

class GoCompiler:
    def __init__(self, working_dir: str = "data/compiler_sandbox"):
        self.working_dir = working_dir
        os.makedirs(self.working_dir, exist_ok=True)
        
        # Ensure a go.mod exists for dependency tracking
        if not os.path.exists(os.path.join(self.working_dir, "go.mod")):
            self._init_module()

    def _init_module(self):
        """Initializes a dummy go module for the sandbox."""
        cmd = ["go", "mod", "init", "l2j_migration_sandbox"]
        subprocess.run(cmd, cwd=self.working_dir, capture_output=True)

    def validate_code(self, go_code: str) -> Dict:
        """
        Writes code to a temp file and tries to build it.
        Returns: {success: bool, output: str, errors: str}
        """
        # Create a unique filename to avoid collisions in parallel (future proof)
        # But for Go build to work easily with packages, we might need structure.
        # For now, we assume single file compilation or main package.
        
        # Clean up code format (sometimes LLM leaves markdown blocks)
        clean_code = self._clean_markdown(go_code)
        
        filename = f"gen_{uuid.uuid4().hex[:8]}.go"
        filepath = os.path.join(self.working_dir, filename)
        
        try:
            with open(filepath, "w") as f:
                f.write(clean_code)
            
            # 1. Format code (go fmt) - fixes trivial syntax issues
            subprocess.run(["go", "fmt", filename], cwd=self.working_dir, capture_output=True)
            
            # 2. Try to compile
            # -o /dev/null throws away the binary, just checks buildability
            build_cmd = ["go", "build", "-o", os.devnull, filename]
            result = subprocess.run(build_cmd, cwd=self.working_dir, capture_output=True, text=True)
            
            success = (result.returncode == 0)
            
            return {
                "success": success,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "filepath": filepath 
            }
            
        except Exception as e:
            return {
                "success": False,
                "stderr": f"System Error: {str(e)}"
            }
        finally:
            # Cleanup? For debugging maybe keep it, but for prod clean it.
            # Keeping for now to inspect "bad" code.
            pass

    def _clean_markdown(self, code: str) -> str:
        if code.strip().startswith("```go"):
            code = code.strip().replace("```go", "", 1)
        if code.strip().endswith("```"):
            code = code.strip()[:-3]
        return code

if __name__ == "__main__":
    # Test
    compiler = GoCompiler()
    
    good_code = """
    package main
    import "fmt"
    func main() {
        fmt.Println("Hello L2J")
    }
    """
    
    bad_code = """
    package main
    func main() {
        fmt.Println("Missing Import")
    }
    """
    
    print("Testing Good Code:")
    print(compiler.validate_code(good_code))
    
    print("\nTesting Bad Code:")
    print(compiler.validate_code(bad_code))
