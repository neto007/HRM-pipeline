import os
import subprocess
import argparse
import sys

def run_command(cmd, msg):
    print(f"[*] {msg}...")
    try:
        subprocess.run(cmd, check=True, text=True)
    except subprocess.CalledProcessError as e:
        print(f"[!] Erro: {e}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Auto L2J Training Pipeline")
    parser.add_argument("--repo", required=True, help="URL do repositório L2J no Git")
    parser.add_argument("--branch", default="master", help="Branch do repositório")
    parser.add_argument("--output", default="data/l2j-auto", help="Pasta para o dataset")
    parser.add_argument("--epochs", type=int, default=10, help="Número de épocas")
    parser.add_argument("--batch-size", type=int, default=4, help="Tamanho do batch para treinamento")
    parser.add_argument("--exts", default=".java", help="Extensões de arquivo para o dataset (separadas por vírgula ou 'AUTO')")
    parser.add_argument("--project-name", default=None, help="Nome do projeto (usado para checkpoints)")
    
    args = parser.parse_args()

    repo_name = args.repo.split("/")[-1].replace(".git", "")
    clone_path = os.path.join("l2j_pipeline/temp_repos", repo_name)
    
    # Usar project_name se fornecido, senão usar repo_name
    project_name = args.project_name if args.project_name else repo_name

    # 1. Clonar
    if not os.path.exists(clone_path):
        os.makedirs("l2j_pipeline/temp_repos", exist_ok=True)
        run_command(["git", "clone", "-b", args.branch, args.repo, clone_path], f"Clonando {args.repo}")
    else:
        print(f"[*] Repositório {repo_name} já existe em {clone_path}. Pulando clone.")

    # 2. Build Dataset
    run_command([
        ".venv/bin/python", "l2j_pipeline/build_l2j_dataset_hrm.py",
        "--input", clone_path,
        "--output", args.output,
        "--exts", args.exts
    ], "Convertendo código Java para binário HRM")

    # 3. Train
    # Detectar GPUs
    gpu_count = 0
    try:
        import torch
        if torch.cuda.is_available():
            gpu_count = torch.cuda.device_count()
            print(f"[*] Detectadas {gpu_count} GPUs disponíveis.")
    except ImportError:
        pass

    train_cmd = [".venv/bin/python"]
    if gpu_count > 1:
        print(f"[*] Ativando treinamento distribuído em {gpu_count} GPUs via torchrun...")
        train_cmd = [
            ".venv/bin/torchrun",
            f"--nproc_per_node={gpu_count}",
            "pretrain.py"
        ]
    else:
        print("[*] Treinamento single-GPU/CPU...")
        train_cmd.append("pretrain.py")

    train_cmd.extend([
        f"data_path={args.output}",
        f"epochs={args.epochs}",
        f"global_batch_size={args.batch_size}",
        "lr=1e-4",
        "eval_interval=10",
        f"+project_name={project_name}"  # ✅ Usando project_name dinâmico
    ])
    
    print(f"[*] Nome do projeto para checkpoints: {project_name}")
    run_command(train_cmd, f"Iniciando treinamento HRM por {args.epochs} épocas")

    print("\n[SUCCESS] Pipeline completado com sucesso!")

if __name__ == "__main__":
    main()

