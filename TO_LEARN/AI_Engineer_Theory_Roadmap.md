# AI Engineer Theory Roadmap

A master checklist for learning AI engineering through theory,
experiments, and the AI coding-agent project.

**Current progress:** Transformers\
**Next topic:** Introduction to Tensors and PyTorch

> Mark a topic complete when you can explain it in your own words and
> use it in a small implementation---not just after watching a lesson.

## How to Use This Roadmap

For each topic: 1. Learn the core idea. 2. Write a short explanation in
your own words. 3. Implement a small example. 4. Connect it to the AI
coding-agent project where possible. 5. Record questions and revisit
anything you cannot explain.

------------------------------------------------------------------------

## Phase 1 --- Mathematics and Machine Learning Foundations

-   [ ] AI vs. machine learning vs. deep learning
-   [ ] Supervised, unsupervised, and reinforcement learning
-   [ ] Vectors, matrices, and matrix multiplication
-   [ ] Dot products, vector norms, and cosine similarity
-   [ ] Probability and statistics
-   [ ] Derivatives, gradients, and the chain rule
-   [ ] Loss functions and optimization
-   [ ] Training, validation, and test datasets
-   [ ] Overfitting, underfitting, and generalization
-   [ ] Classification and regression
-   [ ] Accuracy, precision, recall, F1 score, and confusion matrices
-   [ ] Gradient descent and learning rates

## Phase 2 --- Deep Learning and PyTorch

**This is the next phase to study.**

-   [ ] Introduction to tensors and PyTorch
-   [ ] Tensor shapes, dimensions, indexing, and broadcasting
-   [ ] CPU, GPU, and accelerator execution
-   [ ] Neurons, weights, and biases
-   [ ] Neural network layers and architectures
-   [ ] Activation functions: ReLU, sigmoid, tanh, and softmax
-   [ ] Forward pass and prediction
-   [ ] Loss calculation and loss functions
-   [ ] Backpropagation and computational graphs
-   [ ] Gradients and weight updates
-   [ ] Optimizers: SGD, Momentum, Adam, and AdamW
-   [ ] Learning rate, batch size, epochs, and training loops
-   [ ] `torch.nn`, `torch.autograd`, and `torch.optim`
-   [ ] Dataset and DataLoader
-   [ ] Regularization, dropout, and weight decay
-   [ ] Batch normalization and layer normalization
-   [ ] Training, validation, inference, and checkpoints
-   [ ] Saving and loading a trained model

**Project practice:** Train a small classifier that predicts simple
code-issue categories. Compare a scikit-learn baseline with a PyTorch
neural network.

## Phase 3 --- NLP and Transformers

**Status: Transformers studied. Check each item based on actual
understanding.**

-   [ ] Natural language processing fundamentals
-   [ ] Tokenization, tokens, token IDs, and vocabulary
-   [ ] Word and token embeddings
-   [ ] Positional embeddings and positional encodings
-   [ ] Self-attention
-   [ ] Queries, keys, and values
-   [ ] Scaled dot-product attention
-   [ ] Multi-head attention
-   [ ] Encoder-only, decoder-only, and encoder-decoder architectures
-   [ ] Causal attention masks
-   [ ] Feed-forward blocks
-   [ ] Residual connections and layer normalization
-   [ ] Next-token prediction and language modeling
-   [ ] Transformer training vs. inference
-   [ ] Sampling: temperature, top-k, and top-p
-   [ ] Context windows and sequence length

**Project practice:** Inspect tokenizer output for source code, compare
embeddings, and implement a tiny self-attention example in PyTorch.

## Phase 4 --- LLM Fundamentals

-   [ ] What large language models are and how they are trained
-   [ ] Pretraining, supervised fine-tuning, and instruction tuning
-   [ ] Base models vs. instruct/chat models
-   [ ] Open-weight models and model licenses
-   [ ] System, user, assistant, and tool messages
-   [ ] Prompt engineering
-   [ ] Structured outputs, JSON mode, and schema validation
-   [ ] Function calling and tool calling
-   [ ] Hallucinations and factual reliability
-   [ ] Context windows, token limits, and context overflow
-   [ ] Quantization and model formats
-   [ ] Local inference vs. hosted inference
-   [ ] Model memory footprint and runtime overhead
-   [ ] Latency, throughput, and tokens per second
-   [ ] Streaming generation
-   [ ] Timeouts, retries, and malformed model responses

**Project practice:** Integrate Ollama into FastAPI, support model
selection and streaming, and measure latency for a fixed set of coding
tasks.

## Phase 5 --- Embeddings, Vector Databases, and RAG

-   [ ] What embeddings represent
-   [ ] Embedding models and vector dimensions
-   [ ] Cosine similarity and vector similarity search
-   [ ] Vector databases and indexing
-   [ ] Retrieval-Augmented Generation (RAG)
-   [ ] Document ingestion and preprocessing
-   [ ] Source-code parsing and Abstract Syntax Trees (ASTs)
-   [ ] Code chunking strategies
-   [ ] Metadata extraction and filtering
-   [ ] Semantic search
-   [ ] Keyword search and hybrid retrieval
-   [ ] Reranking and context selection
-   [ ] Query rewriting and multi-query retrieval
-   [ ] Context construction and citation of source locations
-   [ ] Incremental indexing and stale-index cleanup
-   [ ] RAG limitations and common failure modes
-   [ ] Retrieval evaluation: Recall@k and Mean Reciprocal Rank (MRR)
-   [ ] Answer quality and groundedness evaluation
-   [ ] Advanced retrieval: graph-based and dependency-aware retrieval

**Project practice:** Index a repository, retrieve relevant functions
for a bug report, and return file paths and line references. Build a
small retrieval test set.

## Phase 6 --- AI Agents and Orchestration

-   [ ] LLM applications vs. AI agents
-   [ ] Tool definitions and tool calling
-   [ ] Agent loops: observe, act, and verify
-   [ ] Planning and task decomposition
-   [ ] Agent state and workflow state
-   [ ] Short-term and long-term memory
-   [ ] Workflow graphs and conditional routing
-   [ ] LangChain fundamentals
-   [ ] LangGraph fundamentals
-   [ ] ReAct and other agent patterns
-   [ ] Checkpoints and resumable execution
-   [ ] Human-in-the-loop approval
-   [ ] Retries, stopping conditions, and failure recovery
-   [ ] Agent iteration limits and timeouts
-   [ ] MCP (Model Context Protocol)
-   [ ] Multi-agent systems and trade-offs
-   [ ] Deterministic workflows vs. open-ended agents

**Project practice:** Build a stateful workflow that inspects a
repository, plans a change, uses approved tools, and records each step.

## Phase 7 --- Code Agents, Execution, and Verification

-   [ ] Git branches, diffs, and worktrees
-   [ ] Code-editing strategies and patch application
-   [ ] Unified diffs
-   [ ] Static analysis, linters, and formatters
-   [ ] Unit tests and integration tests
-   [ ] Type checking and build verification
-   [ ] Stack-trace and error diagnosis
-   [ ] Iterative repair loops
-   [ ] Regression testing
-   [ ] Patch validation
-   [ ] Sandboxed code execution
-   [ ] Filesystem, process, network, and resource limits
-   [ ] Secrets isolation and audit logs
-   [ ] Approval before risky actions
-   [ ] Comparing test results before and after changes

**Security requirement:** Never give an LLM unrestricted access to the
host shell, filesystem, credentials, or network. Execute untrusted code
in disposable, isolated environments with strict permissions and
resource limits.

**Project practice:** Create an isolated worktree, apply a proposed
patch, run checks, allow a bounded repair attempt, and present the final
diff and test results for review.

## Phase 8 --- Evaluation and Benchmarking

-   [ ] Offline vs. online evaluation
-   [ ] Golden datasets and reproducible test cases
-   [ ] Task success rate
-   [ ] Pass@1 and repeated-sample evaluation
-   [ ] Model and prompt comparisons
-   [ ] Retrieval metrics
-   [ ] LLM-as-a-judge and its limitations
-   [ ] Deterministic vs. nondeterministic outputs
-   [ ] Cost, latency, token usage, and reliability metrics
-   [ ] Regression testing for prompts and agent changes
-   [ ] Statistical significance and reproducibility
-   [ ] Data leakage and benchmark contamination
-   [ ] Failure categorization and error analysis

**Project practice:** Create a fixed suite of bug-fix, feature,
refactoring, and code-explanation tasks. Compare models using the same
starting repositories and automated tests.

## Phase 9 --- Observability and Production AI

-   [ ] Structured logging
-   [ ] Traces, spans, and trace IDs
-   [ ] Metrics and dashboards
-   [ ] Model-call and tool-call observability
-   [ ] Error categorization
-   [ ] Timeouts, retries, and exponential backoff
-   [ ] Rate limiting and concurrency
-   [ ] Background jobs and queues
-   [ ] Caching and idempotency
-   [ ] API authentication and authorization
-   [ ] Database schema and migrations
-   [ ] Secrets management
-   [ ] Data retention and privacy
-   [ ] Health checks and graceful shutdown
-   [ ] Run history, cancellation, and recovery
-   [ ] Monitoring latency, failures, and token usage

**Project practice:** Give every agent run an ID and trace its path from
the user request to retrieval, model calls, tool execution, tests, and
final response.

## Phase 10 --- Fine-Tuning and Alignment

-   [ ] Fine-tuning vs. RAG vs. prompt engineering
-   [ ] Dataset creation, cleaning, and labeling
-   [ ] Training and validation splits
-   [ ] Supervised fine-tuning (SFT)
-   [ ] LoRA (Low-Rank Adaptation)
-   [ ] QLoRA concepts
-   [ ] Adapter weights
-   [ ] Quantization constraints
-   [ ] Preference data and reward models
-   [ ] RLHF concepts
-   [ ] DPO (Direct Preference Optimization)
-   [ ] Reinforcement learning fundamentals
-   [ ] RLVR and test-based reward concepts
-   [ ] Catastrophic forgetting and overfitting
-   [ ] Model and dataset licensing
-   [ ] Fine-tuning evaluation and held-out tests

**Project practice:** Only after building evaluation infrastructure,
compare a compatible small model before and after a small LoRA
fine-tuning experiment. Fine-tuning is optional.

## Phase 11 --- Inference Optimization and Local Hardware

-   [ ] Quantized model formats
-   [ ] Model loading and memory footprint
-   [ ] Context length vs. memory consumption
-   [ ] Time to first token
-   [ ] Tokens per second
-   [ ] KV cache concepts
-   [ ] Batching and concurrency
-   [ ] Streaming and cancellation
-   [ ] Caching repeated requests
-   [ ] CPU/GPU/accelerator utilization
-   [ ] Model routing by task complexity
-   [ ] Quality vs. speed trade-offs
-   [ ] Memory and resource monitoring
-   [ ] Handling models that exceed available resources

**Project practice:** Start with a small quantized coding model on the
16 GB unified-memory laptop. Measure memory, speed, and task success;
avoid loading multiple large models simultaneously.

## Phase 12 --- Full-Stack Integration and Deployment

### Backend

-   [ ] FastAPI route design
-   [ ] Pydantic request and response validation
-   [ ] Async programming and streaming
-   [ ] Background jobs
-   [ ] Database schema and migrations
-   [ ] Authentication and authorization
-   [ ] API, unit, and integration tests
-   [ ] Versioned configuration and error handling

### Frontend

-   [ ] React and TypeScript
-   [ ] Chat and streaming UI
-   [ ] Repository and task selection
-   [ ] Agent execution timeline
-   [ ] Code diff viewer
-   [ ] Test results and logs
-   [ ] Human approval controls
-   [ ] Evaluation dashboard
-   [ ] Loading, error, cancellation, and empty states

### Deployment

-   [ ] Docker and supporting services
-   [ ] Environment variables and secrets
-   [ ] CI for linting and tests
-   [ ] Health checks
-   [ ] Database migration workflow
-   [ ] Local setup documentation
-   [ ] Model installation and hardware requirements
-   [ ] Demo screenshots or walkthrough
-   [ ] Security limitations and supported languages

## Phase 13 --- Advanced Topics (Optional)

-   [ ] Computer vision and convolutional neural networks
-   [ ] Vision-language models and multimodal AI
-   [ ] Speech recognition and audio generation
-   [ ] Diffusion models and image generation
-   [ ] Knowledge graphs and graph neural networks
-   [ ] Small language models and model distillation
-   [ ] Distributed training and parallelism
-   [ ] Advanced inference optimization
-   [ ] AI safety, alignment, and red teaming
-   [ ] Research-paper reproduction and experimental design
-   [ ] Prompt-injection testing against repository content
-   [ ] Distributed agent workers

------------------------------------------------------------------------

## Suggested 60-Day Plan

This is an intensive plan, not a guarantee of mastery. Adjust it based
on your understanding and project complexity.

  -----------------------------------------------------------------------
  Days                    Focus                   Deliverable
  ----------------------- ----------------------- -----------------------
  1--7                    ML, PyTorch, neural     Small code-issue
                          network fundamentals    classifier

  8--14                   NLP, Transformers,      Local inference layer
                          local LLMs              

  15--22                  Embeddings, RAG, code   Semantic code search
                          indexing                

  23--30                  Agent state, tools,     Working agent loop
                          workflow graphs         

  31--38                  Sandboxed repair and    Verified code repair
                          verification            

  39--45                  Evaluation and          Benchmark dashboard
                          observability           

  46--52                  Fine-tuning experiment  Model comparison report
                          and optimization        

  53--60                  Integration, security,  Portfolio-ready release
                          testing, deployment     
  -----------------------------------------------------------------------

## Next 7 Study Sessions

-   [ ] **Day 1:** Introduction to Tensors and PyTorch --- create
    tensors, inspect shapes, and perform operations.
-   [ ] **Day 2:** Neurons, weights, biases, and layers --- build a tiny
    neural network.
-   [ ] **Day 3:** Activation functions --- compare ReLU, sigmoid, tanh,
    and softmax.
-   [ ] **Day 4:** Forward pass and loss functions --- make predictions
    and calculate error.
-   [ ] **Day 5:** Backpropagation --- understand gradients and how loss
    changes.
-   [ ] **Day 6:** Optimizers and training loops --- update weights over
    multiple batches.
-   [ ] **Day 7:** Build a small classifier --- train, evaluate, save,
    and reload it.

## Final Project Acceptance Checklist

-   [ ] A user can select a supported repository.
-   [ ] The system indexes code and retrieves relevant functions with
    source references.
-   [ ] The agent plans a task and uses controlled tools.
-   [ ] Proposed changes are applied in an isolated workspace.
-   [ ] Tests and static checks run automatically.
-   [ ] The agent can diagnose failures and attempt a bounded repair.
-   [ ] The final diff and test results are visible.
-   [ ] Risky actions require explicit approval.
-   [ ] Runs have traceable logs and useful failure details.
-   [ ] Multiple models can be evaluated reproducibly.
-   [ ] Local hardware limits are documented.
-   [ ] Critical backend and agent behavior has automated tests.
-   [ ] Setup, architecture, security, limitations, and benchmark
    results are documented.

## What This Project Demonstrates

  -----------------------------------------------------------------------
  Skill                               Evidence
  ----------------------------------- -----------------------------------
  Machine learning                    Trained classifier and metrics

  Deep learning                       PyTorch model and training loop

  Transformers and LLMs               Tokenization, inference, and
                                      generation

  RAG                                 Code indexing, retrieval, and
                                      evaluation

  Agent engineering                   Stateful workflows and tool use

  Coding agents                       Isolated changes and test-based
                                      verification

  Evaluation                          Reproducible benchmark

  Production AI                       Tracing, retries, monitoring, and
                                      error handling

  Fine-tuning                         Optional LoRA experiment and
                                      comparison

  AI infrastructure                   Local inference and resource
                                      optimization

  Full-stack engineering              React, FastAPI, database, testing,
                                      and deployment

  AI security                         Sandboxing, permissions, approvals,
                                      and audit logs
  -----------------------------------------------------------------------

## Learning Resources

-   [PyTorch Tutorials](https://docs.pytorch.org/tutorials/)
-   [Hugging Face Learn](https://huggingface.co/learn)
-   [Hugging Face Agents
    Course](https://huggingface.co/learn/agents-course/)
-   [Ollama Documentation](https://docs.ollama.com/)
-   [FastAPI Documentation](https://fastapi.tiangolo.com/)
-   [LangGraph
    Documentation](https://docs.langchain.com/oss/python/langgraph/overview)
-   [scikit-learn User
    Guide](https://scikit-learn.org/stable/user_guide.html)

------------------------------------------------------------------------

## Development Principle

**Learn → Implement → Test → Measure → Improve → Document.**

Do not add a technology just to mention it on a résumé. Each major
component should solve a real problem, have tests where appropriate, and
produce measurable results.

Build the smallest complete workflow first. Then improve its quality,
security, reliability, and performance.
