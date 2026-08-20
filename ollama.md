# Ollama Local Development Guide

This guide details the steps to set up, configure, and connect local LLMs using [Ollama](https://ollama.com) to drive the multi-agent system in this project.

---

## 1. Download & Install Ollama

1. Go to the [Ollama Download Page](https://ollama.com/download) and download the version for your OS.
2. Install and launch the Ollama application.
3. Open your terminal and verify Ollama is running:
   ```bash
   ollama --version
   ```

---

## 2. Pull the Models

Since your development machine has **16 GB RAM**, we recommend using **7B/8B models** for standard fast iterations, or **14B models** if you want stronger reasoning (at a slower speed).

Run the following commands in your terminal to download the recommended models:

### Option A: Standard Setup (Fastest & Fits Comfortably in 16GB RAM)
```bash
# Pull the coding and tool-calling model
ollama pull qwen2.5-coder:7b

# Pull the thinking/reasoning model
ollama pull deepseek-r1:8b
```

### Option B: Advanced Setup (More Powerful, Slower)
```bash
# Pull the coding and tool-calling model
ollama pull qwen2.5-coder:14b

# Pull the thinking/reasoning model
ollama pull deepseek-r1:14b
```

To list downloaded models on your machine:
```bash
ollama list
```

---

## 3. Configure the Project Environment

To connect the FastAPI backend to your local Ollama instance, update the configuration files.

### Step 3.1: Update [.env](file:///c:/Users/tejas/Documents/ai-software-engineer/apps/api/.env)
Add the Ollama configuration keys to your local API environment file:

```env
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_CODE_MODEL=qwen2.5-coder:7b
OLLAMA_REASONING_MODEL=deepseek-r1:8b
```

*(Also, update [.env.example](file:///c:/Users/tejas/Documents/ai-software-engineer/apps/api/.env.example) with these placeholders so other developers can see them.)*

### Step 3.2: Update [config.py](file:///c:/Users/tejas/Documents/ai-software-engineer/apps/api/app/config.py)
Extend your `Settings` class to read these environment variables:

```python
class Settings(BaseSettings):
    # ... existing settings ...
    
    # Ollama settings
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_CODE_MODEL: str = "qwen2.5-coder:7b"
    OLLAMA_REASONING_MODEL: str = "deepseek-r1:8b"
```

---

## 4. Code Integration (LangChain)

To integrate these models in the backend under `apps/api/app/agents/`, use the `langchain-ollama` library.

### Prerequisite: Install dependencies
Make sure `langchain-ollama` is installed in your python environment (managed by `uv`):
```bash
cd apps/api
uv add langchain-ollama
```

### Implementation Patterns

Here is how to set up the models in your code:

#### 1. Action/Coding Agent (Requires Tool Calling)
Use `qwen2.5-coder` for agents that need to use filesystem, git, or testing tools:

```python
from langchain_ollama import ChatOllama
from app.config import settings

# Initialize model
code_llm = ChatOllama(
    base_url=settings.OLLAMA_BASE_URL,
    model=settings.OLLAMA_CODE_MODEL,
    temperature=0.0, # low temp for precise code and tool outputs
)

# Bind tools (example tools)
tools = [read_file, write_file, run_tests]
code_llm_with_tools = code_llm.bind_tools(tools)
```

#### 2. Planning/Reviewing Agent (Requires Reasoning)
Use `deepseek-r1` for planning and review nodes where you want the model to "think" before outputting:

```python
from langchain_ollama import ChatOllama
from app.config import settings

# Initialize model
reasoning_llm = ChatOllama(
    base_url=settings.OLLAMA_BASE_URL,
    model=settings.OLLAMA_REASONING_MODEL,
    temperature=0.6, # slightly higher for planning flexibility
)

# DeepSeek-R1 output will automatically contain <think>...</think> blocks.
# You can parse this in your frontend or log it in your console to monitor the agent's thoughts!
```

> [!IMPORTANT]
> **Why not use DeepSeek-R1 for Tool Calling?**
> The distilled DeepSeek-R1 models write out `<think>` chains which often break the standard schema required by tool calling frameworks. By splitting your architecture (using `qwen2.5-coder` for actions and `deepseek-r1` for planning), you get the best of both worlds.

---

## 5. Verifying Connection

To run a simple script verifying your models work locally, run this command inside the `apps/api` directory:

```bash
uv run python -c "
import requests
resp = requests.post('http://localhost:11434/api/generate', json={'model': 'qwen2.5-coder:7b', 'prompt': 'print Hello World in Python', 'stream': False})
print('Qwen output:', resp.json().get('response'))
"
```