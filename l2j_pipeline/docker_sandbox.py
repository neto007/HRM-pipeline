"""
Docker Sandbox Manager
Provides isolated execution environment for Java and Go code.
Implements security and resource limits as per Estudo.txt requirements.
"""
import subprocess
import os
import tempfile
import json
from typing import Dict, Optional

class DockerSandbox:
    """
    Manages Docker containers for isolated code execution.
    Prevents resource exhaustion and security risks.
    """
    
    def __init__(self):
        self.java_image = "openjdk:17-slim"
        self.go_image = "golang:1.21-alpine"
        self._ensure_docker_available()
    
    def _ensure_docker_available(self):
        """Check if Docker is available."""
        try:
            subprocess.run(["docker", "--version"], capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            raise RuntimeError("Docker not available. Install Docker to use sandbox.")
    
    def execute_java(self, java_code: str, timeout: int = 10) -> Dict:
        """
        Execute Java code in isolated Docker container.
        
        Args:
            java_code: Java source code
            timeout: Maximum execution time in seconds
            
        Returns:
            Dict with success, stdout, stderr, exit_code
        """
        # Extract class name
        import re
        match = re.search(r'class\s+(\w+)', java_code)
        if not match:
            return {"success": False, "error": "Could not extract class name"}
        
        class_name = match.group(1)
        
        # Create temp directory for code
        with tempfile.TemporaryDirectory() as tmpdir:
            # Write Java file
            java_file = os.path.join(tmpdir, f"{class_name}.java")
            with open(java_file, "w") as f:
                f.write(java_code)
            
            # Compile in Docker
            compile_cmd = [
                "docker", "run", "--rm",
                "-v", f"{tmpdir}:/code",
                "-w", "/code",
                "--network", "none",  # No network access
                "--memory", "256m",   # Memory limit
                "--cpus", "0.5",      # CPU limit
                self.java_image,
                "javac", f"{class_name}.java"
            ]
            
            try:
                compile_result = subprocess.run(
                    compile_cmd,
                    capture_output=True,
                    text=True,
                    timeout=timeout
                )
                
                if compile_result.returncode != 0:
                    return {
                        "success": False,
                        "error": "Java compilation failed",
                        "stderr": compile_result.stderr
                    }
                
                # Execute in Docker
                run_cmd = [
                    "docker", "run", "--rm",
                    "-v", f"{tmpdir}:/code",
                    "-w", "/code",
                    "--network", "none",
                    "--memory", "256m",
                    "--cpus", "0.5",
                    self.java_image,
                    "java", class_name
                ]
                
                run_result = subprocess.run(
                    run_cmd,
                    capture_output=True,
                    text=True,
                    timeout=timeout
                )
                
                return {
                    "success": run_result.returncode == 0,
                    "stdout": run_result.stdout,
                    "stderr": run_result.stderr,
                    "exit_code": run_result.returncode
                }
                
            except subprocess.TimeoutExpired:
                return {"success": False, "error": "Java execution timeout"}
            except Exception as e:
                return {"success": False, "error": str(e)}
    
    def execute_go(self, go_code: str, timeout: int = 10) -> Dict:
        """
        Execute Go code in isolated Docker container.
        
        Args:
            go_code: Go source code
            timeout: Maximum execution time in seconds
            
        Returns:
            Dict with success, stdout, stderr, exit_code
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            # Write Go file
            go_file = os.path.join(tmpdir, "main.go")
            with open(go_file, "w") as f:
                f.write(go_code)
            
            # Build and run in Docker
            run_cmd = [
                "docker", "run", "--rm",
                "-v", f"{tmpdir}:/code",
                "-w", "/code",
                "--network", "none",
                "--memory", "256m",
                "--cpus", "0.5",
                self.go_image,
                "sh", "-c", "go run main.go"
            ]
            
            try:
                result = subprocess.run(
                    run_cmd,
                    capture_output=True,
                    text=True,
                    timeout=timeout
                )
                
                return {
                    "success": result.returncode == 0,
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "exit_code": result.returncode
                }
                
            except subprocess.TimeoutExpired:
                return {"success": False, "error": "Go execution timeout"}
            except Exception as e:
                return {"success": False, "error": str(e)}


if __name__ == "__main__":
    # Test Docker Sandbox
    sandbox = DockerSandbox()
    
    java_test = """
    public class HelloWorld {
        public static void main(String[] args) {
            System.out.println("Hello from Java in Docker!");
        }
    }
    """
    
    go_test = """
    package main
    import "fmt"
    func main() {
        fmt.Println("Hello from Go in Docker!")
    }
    """
    
    print("Testing Java Docker Sandbox...")
    result = sandbox.execute_java(java_test)
    print(json.dumps(result, indent=2))
    
    print("\nTesting Go Docker Sandbox...")
    result = sandbox.execute_go(go_test)
    print(json.dumps(result, indent=2))
