# apps/api/app/tools/terminal.py
import subprocess
from pathlib import Path

WORKSPACE_ROOT = Path.cwd()


def run_command(command: str) -> str:
    """Executes a shell command inside the project workspace directory."""
    try:
        # Basic safety check to prevent obviously destructive actions
        forbidden_keywords = {"rm -rf /", "rm -rf ~", "mkfs", "dd if="}
        if any(keyword in command for keyword in forbidden_keywords):
            return "Error: Command blocked. Destructive commands are forbidden."

        # Run command with a 15-second timeout to avoid locking the backend thread
        result = subprocess.run(
            command,
            shell=True,
            cwd=WORKSPACE_ROOT,
            capture_output=True,
            text=True,
            timeout=15.0,
            check=False,
        )

        output = []
        if result.stdout:
            output.append(f"STDOUT:\n{result.stdout}")
        if result.stderr:
            output.append(f"STDERR:\n{result.stderr}")

        if not output:
            return f"Command executed successfully (Exit Code: {result.returncode}). No output."

        return f"Exit Code: {result.returncode}\n" + "\n".join(output)

    except subprocess.TimeoutExpired:
        return "Error: Command execution timed out after 15 seconds."
    except Exception as e:  # noqa: BLE001
        return f"Error executing command: {e!s}"
