"""
QA Agent (The Tester)
Generates Go unit tests for migrated code using Qwen 3 Coder.
"""
import os
import json
import argparse
from typing import Dict, Optional
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

class TestGenerator:
    def __init__(self, model: str = "qwen/qwen3-coder"):
        self.model = model
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY environment variable not found")
            
        self.client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=self.api_key,
        )

    def generate_test(self, go_code: str, original_java: str, filename: str) -> str:
        """Generates a _test.go file for the given Go code."""
        
        system_prompt = """You are a Senior QA Engineer in Go (Golang).
Your task is to write comprehensive UNIT TESTS for the provided Go code.
- Coverage: Aim for 90%+ code coverage.
- Style: Use standard `testing` package and Table-Driven Tests.
- Invariants: Ensure logical consistency with the original Java logic (if provided).
- Output: Return ONLY the Go code for the test file.
"""

        user_prompt = f"""Generate `_test.go` for this file: {filename}

ORIGINAL JAVA (Reference):
```java
{original_java}
```

MIGRATED GO CODE (Target):
```go
{go_code}
```

Write the `package` declaration matching the source.
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.2
            )
            
            content = response.choices[0].message.content
            test_code = self._extract_code(content)
            return test_code
            
        except Exception as e:
            print(f"Test Generation Error: {e}")
            return f"// Error generating test: {str(e)}"

    def _extract_code(self, text: str) -> str:
        if "```go" in text:
            return text.split("```go")[1].split("```")[0].strip()
        if "```" in text:
            return text.split("```")[1].split("```")[0].strip()
        return text

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", help="Path to JSON dataset entry")
    parser.add_argument("--out", help="Output directory for tests", default="data/tests")
    args = parser.parse_args()
    
    if args.file:
        with open(args.file, "r") as f:
            data = json.load(f)
            
        generator = TestGenerator()
        go_code = data.get("output_code", "")
        # Try input_code if available, or just empty if not (should be there)
        java_code = data.get("input_code", "") 
        fname = data.get("filename", "unknown.go").replace(".json", "")
        
        print(f"[*] Generating test for {fname}...")
        test_code = generator.generate_test(go_code, java_code, fname)
        
        os.makedirs(args.out, exist_ok=True)
        # Assuming filename was something like "Class_java.json", we want "Class_test.go"
        # Ideally we parse the package from go_code to determine folder, but flat is fine for now.
        
        # Heuristic for name: remove _java.json -> .go -> _test.go
        base_name = os.path.basename(args.file).replace("_java.json", "_test.go")
        if not base_name.endswith("_test.go"):
             base_name = base_name.split(".")[0] + "_test.go"

        out_path = os.path.join(args.out, base_name)
        with open(out_path, "w") as f:
            f.write(test_code)
            
        print(f"✅ Test saved to {out_path}")

if __name__ == "__main__":
    main()
