# AI Software Engineer — Local-First AI Coding Agent

> Build an AI coding engineer that understands a codebase, plans changes, writes code, runs tests, diagnoses failures, and verifies its own solutions — using local LLMs wherever practical.

The goal of this project is to learn and implement the core skills required for an **AI Engineer / Full-Stack AI Engineer** role through one production-oriented project.

## 🎯 Project Goals

- [ ] Build an AI agent that can understand and modify existing codebases.
- [ ] Run small language models locally using Ollama.
- [ ] Understand how Transformers, LLMs, embeddings, and neural networks work.
- [ ] Implement Retrieval-Augmented Generation (RAG) for code understanding.
- [ ] Build agent workflows with tools, state, planning, and controlled execution.
- [ ] Execute code safely and verify changes using automated tests.
- [ ] Evaluate models and agent workflows using reproducible benchmarks.
- [ ] Monitor model calls, latency, token usage, failures, and resource consumption.
- [ ] Experiment with PyTorch, fine-tuning, and inference optimization.
- [ ] Build a usable full-stack application with a reliable backend and frontend.

---

## 🏗️ High-Level Architecture

```text
React + TypeScript Frontend
            |
            v
       FastAPI Backend
            |
            v
     AI Agent Orchestrator
       /     |      \
      /      |       \
   RAG     LLMs     Tools
    |        |        |
 Vector DB  Ollama  Git / Files
                      |
                      v
                Sandboxed Worker
                      |
               Tests / Lint / Build
                      |
                      v
              Verification Engine
                      |
                      v
            Results + Evaluation
```

Supporting systems:

- Database for users, projects, sessions, and agent runs.
- Observability for traces, errors, latency, and token usage.
- Evaluation framework for comparing models and prompts.
- Security controls for filesystem access, commands, and secrets.

---

# 🗺️ AI Engineer Learning Roadmap

## Phase 1 — Python, Mathematics, and ML Foundations

**Objective:** Understand the fundamentals behind machine learning and neural networks.

### Mathematics

- [ ] Vectors, matrices, and tensors.
- [ ] Matrix multiplication and dot products.
- [ ] Basic probability and statistics.
- [ ] Mean, variance, and standard deviation.
- [ ] Derivatives and gradients.
- [ ] Chain rule and partial derivatives.
- [ ] Loss functions and optimization.

### Machine Learning

- [ ] Supervised vs. unsupervised learning.
- [ ] Features, labels, and datasets.
- [ ] Training, validation, and test sets.
- [ ] Overfitting and underfitting.
- [ ] Data preprocessing and normalization.
- [ ] Classification and regression.
- [ ] Accuracy, precision, recall, and F1 score.
- [ ] Gradient descent and learning rates.

### Implement in This Project

- [ ] Build a small classifier that predicts common code issues.
- [ ] Create a labeled dataset of code snippets and bug categories.
- [ ] Train a baseline model using scikit-learn.
- [ ] Measure performance on unseen examples.

**Deliverable:** A working ML model that classifies simple code issues.

---

## Phase 2 — PyTorch and Deep Learning

**Objective:** Understand how neural networks learn instead of treating models as black boxes.

### Topics to Learn

- [ ] Tensors and tensor operations.
- [ ] Tensor shapes, dimensions, and broadcasting.
- [ ] CPU vs. GPU and accelerator execution.
- [ ] Neurons and layers.
- [ ] Weights and biases.
- [ ] Activation functions: ReLU, sigmoid, tanh, and softmax.
- [ ] Forward pass.
- [ ] Loss calculation.
- [ ] Backpropagation.
- [ ] Gradient calculation and computational graphs.
- [ ] Optimizers: SGD and Adam.
- [ ] Training loops and batches.
- [ ] Epochs, learning rates, and checkpoints.
- [ ] Dataset and DataLoader.
- [ ] `torch.nn`, `torch.autograd`, and `torch.optim`.
- [ ] Model evaluation and inference.

### Implement in This Project

- [ ] Build a tiny neural network in PyTorch.
- [ ] Train it to classify code issue categories.
- [ ] Track training and validation loss.
- [ ] Save and load model checkpoints.
- [ ] Expose model predictions through FastAPI.
- [ ] Compare its performance against the scikit-learn baseline.

**Deliverable:** A trained model integrated into the application.

---

## Phase 3 — NLP, Embeddings, and Transformers

**Objective:** Understand how modern LLMs represent and process language and code.

### NLP Foundations

- [ ] Tokens, tokenization, and vocabulary.
- [ ] Token IDs and attention masks.
- [ ] Word and token embeddings.
- [ ] Context windows and sequence length.
- [ ] Positional information.
- [ ] Similarity measures and cosine similarity.

### Transformers

- [ ] Encoder and decoder architectures.
- [ ] Self-attention.
- [ ] Query, key, and value matrices.
- [ ] Scaled dot-product attention.
- [ ] Multi-head attention.
- [ ] Positional embeddings and positional encodings.
- [ ] Feed-forward network blocks.
- [ ] Residual connections.
- [ ] Layer normalization.
- [ ] Causal attention masks.
- [ ] Next-token prediction.
- [ ] Temperature, top-k, and top-p sampling.
- [ ] Why Transformers scale better for language tasks than older sequence models.

### Implement in This Project

- [ ] Load a pretrained tokenizer.
- [ ] Inspect tokens and token counts for source code.
- [ ] Generate embeddings for code chunks.
- [ ] Compare embedding similarity between related functions.
- [ ] Build a tiny self-attention implementation in PyTorch.
- [ ] Run inference with a small local code model.

**Deliverable:** A working understanding of how code LLMs process and generate text.

---

## Phase 4 — LLMs and Local Inference

**Objective:** Use and compare LLMs without relying entirely on hosted APIs.

### Topics to Learn

- [ ] Pretraining vs. instruction tuning.
- [ ] Base models vs. instruct models.
- [ ] Open-weight models and model licenses.
- [ ] Quantization: 16-bit, 8-bit, and 4-bit concepts.
- [ ] Context windows and context overflow.
- [ ] Prompt design and structured outputs.
- [ ] System, user, and tool messages.
- [ ] Streaming generation.
- [ ] Function calling and tool calling.
- [ ] Model parameters vs. runtime memory.
- [ ] Latency, throughput, and tokens per second.
- [ ] Local inference vs. hosted inference.
- [ ] Handling timeouts, malformed responses, and model failures.

### Implement in This Project

- [ ] Integrate Ollama with the FastAPI backend.
- [ ] Configure a small local coding model.
- [ ] Create a model-provider abstraction.
- [ ] Support streaming responses to the frontend.
- [ ] Add configurable model selection.
- [ ] Record latency, model name, and token usage where available.
- [ ] Add timeout handling and retry policies.
- [ ] Compare at least two suitable models on the same coding tasks.
- [ ] Keep model configuration separate from application code.

**Deliverable:** A reliable local LLM inference layer.

---

## Phase 5 — Codebase RAG and Semantic Search

**Objective:** Let the agent understand an existing repository before making changes.

### Topics to Learn

- [ ] What RAG is and when it is useful.
- [ ] Document ingestion pipelines.
- [ ] Parsing source code by language.
- [ ] ASTs (Abstract Syntax Trees).
- [ ] Chunking strategies for code.
- [ ] Metadata extraction.
- [ ] Embedding models.
- [ ] Vector databases.
- [ ] Similarity search.
- [ ] Hybrid search: keyword + semantic retrieval.
- [ ] Metadata filtering.
- [ ] Reranking retrieved results.
- [ ] Context construction.
- [ ] Retrieval evaluation.
- [ ] Incremental indexing and file change detection.
- [ ] Deleting stale or removed files from the index.

### Implement in This Project

- [ ] Allow users to select a local Git repository.
- [ ] Index supported source files.
- [ ] Exclude generated files, dependencies, build output, and secrets.
- [ ] Extract functions, classes, imports, and file paths.
- [ ] Generate embeddings and store them in a vector database.
- [ ] Search for relevant code using natural language.
- [ ] Retrieve related functions and their dependencies.
- [ ] Include file paths and line references in answers.
- [ ] Update the index when files change.
- [ ] Build a fixed retrieval test set.
- [ ] Measure Recall@k and Mean Reciprocal Rank (MRR).

**Deliverable:** A codebase assistant that answers questions with traceable source references.

---

## Phase 6 — AI Agents and Workflow Orchestration

**Objective:** Move from a chatbot that answers questions to an agent that performs controlled multi-step tasks.

### Topics to Learn

- [ ] LLM agents vs. ordinary LLM chains.
- [ ] Tool definitions and tool calling.
- [ ] Agent state and persistent workflow state.
- [ ] Planning and task decomposition.
- [ ] Observe → reason → act → observe loops.
- [ ] Conditional routing.
- [ ] Workflow graphs.
- [ ] Checkpoints and resumable execution.
- [ ] Short-term and long-term memory.
- [ ] Human approval and interruption points.
- [ ] Retry policies and error recovery.
- [ ] Agent termination conditions.
- [ ] Multi-agent systems and when not to use them.
- [ ] MCP (Model Context Protocol).
- [ ] Deterministic workflows vs. open-ended agents.

### Implement in This Project

- [ ] Create an agent workflow using LangGraph or an equivalent state-machine approach.
- [ ] Define typed state for each agent run.
- [ ] Build tools for repository search, file reading, diff generation, and test execution.
- [ ] Make the agent inspect code before editing it.
- [ ] Create a plan before applying changes.
- [ ] Track each step in an execution timeline.
- [ ] Add iteration limits and execution timeouts.
- [ ] Persist run state and support resuming interrupted runs.
- [ ] Require approval before risky actions.
- [ ] Add cancellation support.
- [ ] Add MCP integration as an optional extension.

**Deliverable:** An observable, resumable coding-agent workflow.

---

## Phase 7 — Automated Code Repair and Verification

**Objective:** Build the core feature: an agent that fixes code and proves that its changes work.

### Topics to Learn

- [ ] Git branches, diffs, and worktrees.
- [ ] Code editing strategies.
- [ ] Unified diffs and patch application.
- [ ] Static analysis and linters.
- [ ] Unit and integration testing.
- [ ] Build and type-checking pipelines.
- [ ] Diagnosing stack traces.
- [ ] Iterative repair loops.
- [ ] Regression testing.
- [ ] Patch validation.
- [ ] Sandboxed execution.
- [ ] Resource limits and command restrictions.
- [ ] Filesystem and network permissions.
- [ ] Secrets isolation and audit logs.

### Implement in This Project

- [ ] Create a task from a bug report or failing test.
- [ ] Inspect relevant files and dependencies.
- [ ] Generate a proposed change plan.
- [ ] Create an isolated Git worktree for the task.
- [ ] Apply changes only inside the approved workspace.
- [ ] Run formatting, linting, type checks, and tests.
- [ ] Feed test failures back into a bounded repair loop.
- [ ] Compare test results before and after the change.
- [ ] Produce a final diff and execution summary.
- [ ] Require user approval before merging or applying changes to the main branch.
- [ ] Save logs for every tool call and code modification.
- [ ] Add safeguards against destructive commands and unauthorized access.

**Security requirement:** Never give the LLM unrestricted access to the host shell, filesystem, credentials, or network. Run untrusted code in disposable isolated environments with strict resource and permission limits.

**Deliverable:** A coding agent that proposes, executes, and verifies code repairs.

---

## Phase 8 — Evaluation and Benchmarking

**Objective:** Measure whether the agent actually works instead of relying on impressive demos.

### Topics to Learn

- [ ] Offline and online evaluation.
- [ ] Test-case design.
- [ ] Golden datasets.
- [ ] Deterministic vs. nondeterministic outputs.
- [ ] Task success rate.
- [ ] Pass@1 and repeated-sample evaluation.
- [ ] Regression testing for prompts and models.
- [ ] LLM-as-a-judge and its limitations.
- [ ] Retrieval metrics.
- [ ] Cost, latency, and token efficiency.
- [ ] Statistical significance and reproducibility.
- [ ] Benchmark contamination and data leakage.

### Implement in This Project

- [ ] Create a dataset of real or synthetic coding tasks.
- [ ] Include bug fixes, feature changes, refactoring, and code explanation tasks.
- [ ] Create reproducible initial repository states.
- [ ] Define expected outcomes and automated tests.
- [ ] Run tasks against multiple models and prompts.
- [ ] Record pass rate, test success, latency, token usage, and failures.
- [ ] Compare single-attempt and bounded-retry performance.
- [ ] Store evaluation results and configuration versions.
- [ ] Build a dashboard for comparing runs.
- [ ] Add regression checks before changing the agent workflow.
- [ ] Publish a benchmark report with limitations and failure examples.

**Deliverable:** Evidence-based model and agent comparisons.

---

## Phase 9 — Observability and Production Reliability

**Objective:** Make the application debuggable, reliable, and maintainable.

### Topics to Learn

- [ ] Structured logging.
- [ ] Distributed tracing.
- [ ] Spans and trace IDs.
- [ ] Metrics and dashboards.
- [ ] Model and tool call observability.
- [ ] Error categorization.
- [ ] Timeouts, retries, and exponential backoff.
- [ ] Rate limiting and concurrency.
- [ ] Queue-based background jobs.
- [ ] Caching and idempotency.
- [ ] Database migrations.
- [ ] Secrets management.
- [ ] API authentication and authorization.
- [ ] Data retention and privacy.
- [ ] Health checks and graceful shutdown.

### Implement in This Project

- [ ] Assign a unique ID to every agent run.
- [ ] Trace the full path from user request to final result.
- [ ] Log model calls, tool inputs and outputs, and execution duration.
- [ ] Track model latency, errors, retries, and token usage.
- [ ] Add user-friendly failure messages.
- [ ] Persist run history and status.
- [ ] Add background processing for long-running tasks.
- [ ] Support cancellation and recovery.
- [ ] Add API rate limits and authentication.
- [ ] Keep sensitive values out of logs.
- [ ] Add health checks and structured error handling.
- [ ] Create dashboards for operational metrics.

**Deliverable:** An observable and resilient AI application.

---

## Phase 10 — Fine-Tuning and Model Adaptation

**Objective:** Understand when a model should be adapted instead of relying only on prompting and retrieval.

### Topics to Learn

- [ ] Pretraining vs. fine-tuning.
- [ ] Supervised fine-tuning (SFT).
- [ ] Dataset preparation and cleaning.
- [ ] Training and validation splits.
- [ ] LoRA (Low-Rank Adaptation).
- [ ] QLoRA concepts.
- [ ] Adapter weights.
- [ ] Quantization-aware constraints.
- [ ] Catastrophic forgetting.
- [ ] Overfitting and evaluation.
- [ ] Model licensing and dataset permissions.
- [ ] Fine-tuning vs. RAG vs. prompt engineering.

### Implement in This Project

- [ ] Create a small dataset of code issue explanations or repair examples.
- [ ] Establish a baseline before fine-tuning.
- [ ] Fine-tune a compatible small model using LoRA or a supported training setup.
- [ ] Compare the adapted model against the original.
- [ ] Evaluate on held-out tasks.
- [ ] Record training configuration and dataset version.
- [ ] Document whether fine-tuning meaningfully improved results.

**Deliverable:** A measured model-adaptation experiment. Fine-tuning is optional and should come after evaluation infrastructure exists.

---

## Phase 11 — Inference Optimization and Local Hardware

**Objective:** Make the project practical on a laptop with 16 GB unified memory.

### Topics to Learn

- [ ] Quantized model formats.
- [ ] Model loading and memory footprint.
- [ ] Context length vs. memory consumption.
- [ ] Prompt and response token limits.
- [ ] Time to first token.
- [ ] Tokens per second.
- [ ] KV cache concepts.
- [ ] Batching and concurrency.
- [ ] Streaming.
- [ ] Caching repeated requests.
- [ ] CPU/GPU or accelerator utilization.
- [ ] Model routing by task complexity.
- [ ] Quality vs. speed trade-offs.

### Implement in This Project

- [ ] Start with a small quantized coding model.
- [ ] Measure actual memory usage and response speed.
- [ ] Test different context sizes.
- [ ] Avoid loading several large models simultaneously.
- [ ] Use smaller models for classification and simple tasks.
- [ ] Route harder tasks to a more capable model when available.
- [ ] Benchmark quality alongside speed.
- [ ] Add clear handling for models that exceed available resources.

**Deliverable:** A local-first AI system with measured hardware constraints.

---

## Phase 12 — Full-Stack Integration and Deployment

**Objective:** Deliver a usable product rather than a collection of experiments.

### Backend

- [ ] FastAPI route design.
- [ ] Request and response validation with Pydantic.
- [ ] Async programming and streaming.
- [ ] Background jobs.
- [ ] Database schema and migrations.
- [ ] Authentication and authorization.
- [ ] API tests and integration tests.
- [ ] Versioned configuration and error handling.

### Frontend

- [ ] React and TypeScript.
- [ ] Chat and streaming UI.
- [ ] Repository and task selection.
- [ ] Agent execution timeline.
- [ ] Code diff viewer.
- [ ] Test results and logs.
- [ ] Human approval controls.
- [ ] Evaluation dashboard.
- [ ] Error, loading, cancellation, and empty states.

### Deployment

- [ ] Dockerize backend and supporting services.
- [ ] Configure environment variables and secrets.
- [ ] Add CI for linting and tests.
- [ ] Add database migrations to deployment workflow.
- [ ] Add health checks.
- [ ] Document local setup.
- [ ] Document model installation and hardware requirements.
- [ ] Add demo screenshots or a walkthrough video.
- [ ] Document security limitations and supported languages.

**Deliverable:** A documented, testable, deployable application.

---

# 🧪 Advanced Topics — Explore After the Core Project

These are optional extensions, not prerequisites for completing the first working version.

- [ ] **Multimodal AI:** Analyze screenshots, UI bugs, and error images.
- [ ] **Vision-language models:** Explore models that accept images and text.
- [ ] **Reinforcement learning concepts:** Understand rewards, policies, and feedback loops.
- [ ] **Test-based agent rewards:** Experiment with test outcomes as a reward signal without assuming this alone constitutes full RL training.
- [ ] **Advanced retrieval:** Graph-based code retrieval and dependency-aware context.
- [ ] **MCP servers:** Expose repository tools through a reusable tool interface.
- [ ] **Agent collaboration:** Compare a single agent with specialized reviewer and implementer agents.
- [ ] **Inference serving:** Explore batching and dedicated inference servers if the project outgrows local Ollama.
- [ ] **Security evaluation:** Test prompt injection in repository files and malicious tool instructions.
- [ ] **Distributed execution:** Queue tasks across isolated workers.
- [ ] **Research reproduction:** Reproduce one relevant paper or benchmark result.

---

# 🗓️ Suggested 60-Day Execution Plan

This is an intensive learning plan, not a guarantee of mastery. Prioritize working implementations and understanding over checking boxes quickly.

| Days | Focus | Main Deliverable |
|---|---|---|
| 1–7 | ML, PyTorch, neural network fundamentals | Code issue classifier |
| 8–14 | NLP, Transformers, local LLMs | Local inference layer |
| 15–22 | Embeddings, RAG, code indexing | Semantic code search |
| 23–30 | Agent state, tools, workflow graphs | Working coding-agent loop |
| 31–38 | Sandboxed repair and verification | Tested code repair |
| 39–45 | Evaluation and observability | Benchmark dashboard |
| 46–52 | Fine-tuning experiment and optimization | Model comparison report |
| 53–60 | Integration, security, testing, deployment | Portfolio-ready release |

Adjust the schedule if a foundational topic takes longer. It is better to understand a smaller number of systems deeply than to implement many features superficially.

---

# 🏁 Final Acceptance Checklist

The project is ready for a strong portfolio demonstration when the following work end to end:

- [ ] A user can connect or select a supported code repository.
- [ ] The system indexes code and retrieves relevant functions with source references.
- [ ] The agent plans a task and uses controlled tools.
- [ ] The agent proposes changes in an isolated workspace.
- [ ] Tests and static checks run automatically.
- [ ] The agent can diagnose a failure and attempt a bounded repair.
- [ ] The system shows the final diff and test results.
- [ ] Risky actions require explicit approval.
- [ ] Every run has traceable logs and useful failure details.
- [ ] Evaluation results can compare multiple models reproducibly.
- [ ] The app runs on the target laptop with documented resource limits.
- [ ] Automated tests cover critical backend and agent behavior.
- [ ] Setup, architecture, security, limitations, and benchmark results are documented.

---

# 📊 What This Project Demonstrates

| Skill Area | Evidence |
|---|---|
| Machine learning | Trained classifier and metrics |
| Deep learning | PyTorch model and training loop |
| Transformers and LLMs | Tokenization, inference, generation |
| RAG | Code indexing, retrieval, retrieval evaluation |
| Agent engineering | Stateful workflows and tool use |
| Coding agents | Isolated changes and test-based verification |
| Evaluation | Reproducible task benchmark |
| Production AI | Tracing, retries, error handling, monitoring |
| Fine-tuning | Optional LoRA experiment and comparison |
| AI infrastructure | Local inference and resource optimization |
| Full-stack engineering | React, FastAPI, database, testing, deployment |
| AI security | Sandboxing, permissions, approvals, audit logs |

---

# 📚 Learning Resources

- [PyTorch Tutorials](https://docs.pytorch.org/tutorials/)
- [Hugging Face Learn](https://huggingface.co/learn)
- [Hugging Face Agents Course](https://huggingface.co/learn/agents-course/)
- [Ollama Documentation](https://docs.ollama.com/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [LangGraph Documentation](https://docs.langchain.com/oss/python/langgraph/overview)
- [scikit-learn User Guide](https://scikit-learn.org/stable/user_guide.html)

---

## Development Principle

**Learn → Implement → Test → Measure → Improve → Document.**

Do not add a technology just to mention it on your résumé. Every major component should solve a real problem in the coding agent, have tests where appropriate, and have measurable results.

Build the smallest complete workflow first. Then improve its quality, security, reliability, and performance.