import { startOfWeek } from 'date-fns';
import type { Phase, Project, ResourceKind, Task, TaskType, TrackerData, Week } from '../types/schema';
import { toIso } from './dates';
import { newId } from './id';

type R = [title: string, url: string, kind: ResourceKind];
type T = [title: string, type: TaskType, hours: number, resources?: R[], tags?: string[]];
type W = { n: number | null; title: string; tasks: T[] };
type P = { title: string; weekRange: string; goal: string; kind?: Phase['kind']; weeks: W[]; project?: [string, string] };

const PLAN: P[] = [
  {
    title: 'Foundations', weekRange: 'Weeks 1-3',
    goal: 'Solid Python, data tooling, ML basics and the math intuition behind them.',
    weeks: [
      { n: 1, title: 'Python for AI, NumPy, Pandas', tasks: [
        ['Async Python and typing refresher', 'learn', 3, [
          ['asyncio docs', 'https://docs.python.org/3/library/asyncio.html', 'article'],
          ['typing docs', 'https://docs.python.org/3/library/typing.html', 'article'],
        ], ['python']],
        ['FastAPI tutorial: build a small CRUD API', 'build', 3, [
          ['FastAPI tutorial', 'https://fastapi.tiangolo.com/tutorial/', 'course'],
        ], ['python', 'fastapi']],
        ['NumPy quickstart', 'learn', 2, [['NumPy quickstart', 'https://numpy.org/doc/stable/user/quickstart.html', 'article']], ['numpy']],
        ['Pandas: 10 minutes + clean a real CSV', 'practice', 2, [
          ['10 minutes to pandas', 'https://pandas.pydata.org/docs/user_guide/10min.html', 'article'],
        ], ['pandas']],
      ] },
      { n: 2, title: 'ML basics with scikit-learn', tasks: [
        ['Train/test split, overfitting, cross-validation', 'learn', 3, [
          ['Google ML Crash Course', 'https://developers.google.com/machine-learning/crash-course', 'course'],
        ], ['ml']],
        ['Metrics: accuracy, precision/recall, F1, ROC-AUC', 'learn', 2, [], ['ml', 'metrics']],
        ['scikit-learn getting started + pipelines', 'practice', 3, [
          ['scikit-learn getting started', 'https://scikit-learn.org/stable/getting_started.html', 'article'],
        ], ['ml', 'sklearn']],
        ['Week 2 review: write a one-page ML cheatsheet', 'review', 1],
      ] },
      { n: 3, title: 'Math essentials', tasks: [
        ['Vectors and matrices (3Blue1Brown linear algebra)', 'learn', 3, [
          ['Essence of linear algebra', 'https://www.3blue1brown.com/topics/linear-algebra', 'video'],
        ], ['math']],
        ['Gradients and chain rule (3Blue1Brown calculus)', 'learn', 2, [
          ['Essence of calculus', 'https://www.3blue1brown.com/topics/calculus', 'video'],
        ], ['math']],
        ['Probability and statistics (StatQuest)', 'learn', 2, [['StatQuest', 'https://www.youtube.com/@statquest', 'video']], ['math']],
        ['Build: small classifier on a Kaggle dataset', 'build', 3, [['Kaggle datasets', 'https://www.kaggle.com/datasets', 'article']], ['project']],
      ] },
    ],
    project: ['Kaggle classifier', 'End-to-end classifier on a Kaggle dataset: EDA, baseline, tuned model, metrics write-up.'],
  },
  {
    title: 'Deep Learning and LLMs', weekRange: 'Weeks 4-7',
    goal: 'Understand neural nets and transformers from the ground up, then run real open models.',
    weeks: [
      { n: 4, title: 'PyTorch + Zero to Hero (videos 1-2)', tasks: [
        ['PyTorch basics tutorial', 'learn', 3, [['PyTorch basics', 'https://pytorch.org/tutorials/beginner/basics/intro.html', 'course']], ['pytorch']],
        ['Zero to Hero #1: micrograd', 'learn', 3, [['Neural Networks: Zero to Hero', 'https://karpathy.ai/zero-to-hero.html', 'video']], ['karpathy']],
        ['Zero to Hero #2: makemore part 1', 'practice', 3, [['Neural Networks: Zero to Hero', 'https://karpathy.ai/zero-to-hero.html', 'video']], ['karpathy']],
      ] },
      { n: 5, title: 'Zero to Hero (videos 3-4)', tasks: [
        ['Zero to Hero #3: makemore MLP', 'practice', 4, [['Neural Networks: Zero to Hero', 'https://karpathy.ai/zero-to-hero.html', 'video']], ['karpathy']],
        ['Zero to Hero #4: activations, gradients, BatchNorm', 'practice', 4, [['Neural Networks: Zero to Hero', 'https://karpathy.ai/zero-to-hero.html', 'video']], ['karpathy']],
        ['Review: re-implement micrograd from memory', 'review', 2],
      ] },
      { n: 6, title: 'Transformers', tasks: [
        ['Tokenization (BPE) and embeddings', 'learn', 3, [], ['transformers']],
        ['Attention and the transformer block', 'learn', 4, [
          ['The Illustrated Transformer', 'https://jalammar.github.io/illustrated-transformer/', 'article'],
          ['3Blue1Brown neural networks series', 'https://www.3blue1brown.com/topics/neural-networks', 'video'],
        ], ['transformers']],
        ['Implement scaled dot-product attention in PyTorch', 'practice', 3, [], ['transformers', 'pytorch']],
      ] },
      { n: 7, title: 'Hugging Face LLM course', tasks: [
        ['HF course: pipelines and tokenizers', 'learn', 4, [['Hugging Face LLM course', 'https://huggingface.co/learn/llm-course', 'course']], ['huggingface']],
        ['Build: run a small open model locally', 'build', 3, [['Ollama', 'https://ollama.com', 'repo']], ['project', 'huggingface']],
        ['Explore temperature / top-p and write up findings', 'practice', 2, [], ['sampling']],
      ] },
    ],
    project: ['Local open model playground', 'Run a small open model locally and compare outputs across temperature and top-p settings.'],
  },
  {
    title: 'Building with LLMs', weekRange: 'Weeks 8-11',
    goal: 'Ship LLM features: prompting, structured output, RAG and agents.',
    weeks: [
      { n: 8, title: 'LLM APIs and prompting', tasks: [
        ['LLM API basics: messages, system prompts, streaming', 'learn', 3, [['Claude API docs', 'https://docs.anthropic.com', 'article']], ['llm-api']],
        ['Structured JSON outputs validated with a schema', 'practice', 3, [], ['llm-api']],
        ['Prompting techniques: few-shot, chain-of-thought, eval a prompt', 'practice', 3, [], ['prompting']],
      ] },
      { n: 9, title: 'RAG part 1: chunking and embeddings', tasks: [
        ['Chunking strategies', 'learn', 2, [], ['rag']],
        ['Embeddings with sentence-transformers', 'practice', 3, [['Sentence Transformers', 'https://sbert.net', 'article']], ['rag']],
        ['Vector store: pgvector or Qdrant', 'build', 4, [
          ['pgvector', 'https://github.com/pgvector/pgvector', 'repo'],
          ['Qdrant docs', 'https://qdrant.tech/documentation/', 'article'],
        ], ['rag']],
      ] },
      { n: 10, title: 'RAG part 2: hybrid search and reranking', tasks: [
        ['Hybrid search (BM25 + vectors)', 'practice', 3, [], ['rag']],
        ['Reranking with a cross-encoder', 'practice', 3, [], ['rag']],
        ['Build: RAG chatbot over my docs with a React UI', 'build', 4, [], ['project', 'rag']],
      ] },
      { n: 11, title: 'Tool calling and agents', tasks: [
        ['Tool calling with the raw API', 'practice', 4, [], ['agents']],
        ['Rebuild the agent with LangGraph', 'build', 4, [['LangGraph docs', 'https://langchain-ai.github.io/langgraph/', 'article']], ['agents']],
        ['Review: raw API vs framework trade-offs', 'review', 1, [], ['agents']],
      ] },
    ],
    project: ['RAG chatbot', 'Chatbot over my own docs: chunking, embeddings, hybrid search, reranking, React UI.'],
  },
  {
    title: 'Evaluation and Fine-tuning', weekRange: 'Weeks 12-14',
    goal: 'Measure quality with real evals, then fine-tune and prove it with numbers.',
    weeks: [
      { n: 12, title: 'Evals', tasks: [
        ['Build an eval set for the RAG chatbot', 'build', 3, [], ['evals']],
        ['LLM-as-judge', 'learn', 2, [], ['evals']],
        ['Langfuse tracing + Ragas metrics', 'practice', 3, [
          ['Langfuse docs', 'https://langfuse.com/docs', 'article'],
          ['Ragas docs', 'https://docs.ragas.io', 'article'],
        ], ['evals']],
        ['Regression tests for prompts in CI', 'build', 2, [], ['evals']],
      ] },
      { n: 13, title: 'LoRA / QLoRA part 1', tasks: [
        ['LoRA and QLoRA concepts', 'learn', 3, [['PEFT docs', 'https://huggingface.co/docs/peft', 'article']], ['fine-tuning']],
        ['Prepare a fine-tuning dataset', 'practice', 3, [], ['fine-tuning']],
        ['First QLoRA run on a 1-3B model with trl', 'build', 4, [['TRL docs', 'https://huggingface.co/docs/trl', 'article']], ['fine-tuning']],
      ] },
      { n: 14, title: 'LoRA / QLoRA part 2', tasks: [
        ['Tune hyperparameters and re-train', 'practice', 4, [], ['fine-tuning']],
        ['Build: fine-tuned model vs RAG baseline on my eval set', 'build', 4, [], ['project', 'evals']],
        ['Review: write up results', 'review', 2],
      ] },
    ],
    project: ['Fine-tune vs RAG comparison', 'Fine-tuned 1-3B model compared to the RAG baseline on my eval set.'],
  },
  {
    title: 'Production', weekRange: 'Weeks 15-16',
    goal: 'Serve, secure, observe and pay for LLM apps like a professional.',
    weeks: [
      { n: 15, title: 'Serving and deployment', tasks: [
        ['Serve a model with vLLM', 'practice', 3, [['vLLM docs', 'https://docs.vllm.ai', 'article']], ['serving']],
        ['Quantization (GGUF / AWQ / GPTQ)', 'learn', 2, [], ['serving']],
        ['Dockerize and deploy to Modal or RunPod', 'build', 4, [
          ['Modal docs', 'https://modal.com/docs', 'article'],
          ['RunPod docs', 'https://docs.runpod.io', 'article'],
        ], ['deploy']],
      ] },
      { n: 16, title: 'Guardrails, observability, cost', tasks: [
        ['Guardrails and prompt-injection defense', 'learn', 3, [['OWASP Top 10 for LLM apps', 'https://genai.owasp.org/llm-top-10/', 'article']], ['security']],
        ['Observability: logging, tracing, dashboards', 'build', 3, [], ['observability']],
        ['Cost tracking per request', 'build', 2, [], ['cost']],
        ['Capstone: extend JARVIS with logging and automated evals', 'build', 6, [], ['project', 'capstone']],
      ] },
    ],
    project: ['Capstone: JARVIS voice assistant', 'Extend JARVIS into a full app with logging, guardrails and automated evals.'],
  },
  {
    title: 'Side track', weekRange: 'Ongoing', kind: 'side',
    goal: 'Light, steady interview prep alongside the main plan.',
    weeks: [
      { n: null, title: 'DSA practice', tasks: [
        ['Arrays and hashing (5 problems)', 'practice', 2, [['NeetCode', 'https://neetcode.io', 'course']], ['dsa']],
        ['Two pointers and sliding window (5 problems)', 'practice', 2, [], ['dsa']],
        ['Trees and graphs (5 problems)', 'practice', 3, [], ['dsa']],
      ] },
      { n: null, title: 'System design prep', tasks: [
        ['System design primer: core concepts', 'learn', 3, [
          ['System Design Primer', 'https://github.com/donnemartin/system-design-primer', 'repo'],
        ], ['system-design']],
        ['Design an LLM-backed chat service', 'practice', 2, [], ['system-design']],
      ] },
    ],
  },
];

/** Fresh plan with new ids. Start date defaults to Monday of the current week. */
export function createSeed(today = new Date()): TrackerData {
  const d: TrackerData = {
    version: 1,
    phases: {}, weeks: {}, tasks: {}, timeLogs: {}, projects: {}, journal: {},
    settings: { weeklyHourTarget: 10, startDate: toIso(startOfWeek(today, { weekStartsOn: 1 })) },
  };
  PLAN.forEach((p, pi) => {
    const phase: Phase = { id: newId(), title: p.title, weekRange: p.weekRange, goal: p.goal, order: pi, kind: p.kind ?? 'main' };
    d.phases[phase.id] = phase;
    p.weeks.forEach((w, wi) => {
      const week: Week = { id: newId(), phaseId: phase.id, weekNumber: w.n, title: w.title, status: 'not_started', order: wi };
      d.weeks[week.id] = week;
      w.tasks.forEach(([title, type, hours, resources = [], tags = []], ti) => {
        const task: Task = {
          id: newId(), weekId: week.id, title, notes: '', type, status: 'not_started',
          priority: type === 'build' ? 'high' : 'medium', dueDate: null, estimatedHours: hours, tags,
          resources: resources.map(([rt, url, kind]) => ({ id: newId(), title: rt, url, kind, done: false })),
          order: ti,
        };
        d.tasks[task.id] = task;
      });
    });
    if (p.project) {
      const project: Project = {
        id: newId(), phaseId: phase.id, name: p.project[0], description: p.project[1], githubUrl: '',
        status: 'planned', evalResults: '', screenshots: [], order: pi,
      };
      d.projects[project.id] = project;
    }
  });
  return d;
}
