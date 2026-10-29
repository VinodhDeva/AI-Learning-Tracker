"""FastAPI server for the tracker's AI features. Run: uv run uvicorn app.main:app --port 8787"""

import json
from functools import lru_cache
from pathlib import Path
from typing import Annotated, Any

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel, ValidationError

from .llm import LLM, LLMError
from .schemas import (
    PARSED_TASK_SCHEMA,
    SUBTASKS_SCHEMA,
    WEEKLY_REVIEW_SCHEMA,
    ParsedTask,
    ParseTaskRequest,
    SubtasksRequest,
    SubtasksResponse,
    WeeklyReview,
    WeeklyReviewRequest,
)

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

app = FastAPI(title="AI Learning Tracker API")


@lru_cache
def get_llm() -> LLM:
    return LLM()


LLMDep = Annotated[LLM, Depends(get_llm)]

CONTEXT = "The user is an engineer following a 16-week plan to become an AI engineer (Python, ML, deep learning, LLM apps, RAG, evals, fine-tuning, production)."


async def ask[T: BaseModel](llm: LLM, model: type[T], **kwargs: Any) -> T:
    try:
        data = await llm.structured(**kwargs)
        return model.model_validate(data)
    except LLMError as e:
        raise HTTPException(e.status, e.detail) from e
    except ValidationError as e:
        raise HTTPException(502, "Claude's answer did not match the expected format. Try again.") from e


@app.get("/api/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/api/ai/parse-task")
async def parse_task(req: ParseTaskRequest, llm: LLMDep) -> ParsedTask:
    return await ask(
        llm,
        ParsedTask,
        effort="low",
        schema=PARSED_TASK_SCHEMA,
        system=(
            f"{CONTEXT} Turn their one-line request into a task for their tracker.\n"
            "- title: short and imperative; drop the date, hours and filler like 'add task'.\n"
            "- type: learn (reading, videos, courses), build (making something), practice (exercises, problems), review (recap, write-up).\n"
            "- priority: high only if they signal urgency or importance, otherwise medium.\n"
            "- dueDate: resolve relative dates ('by Sunday', 'tomorrow', 'next Friday') against today; a weekday means the next one on or after today. null if no date is given.\n"
            "- estimatedHours: the hours they state; otherwise a realistic estimate.\n"
            "- tags: 0-3 short lowercase topic tags such as rag, pytorch, evals.\n"
            "- notes: empty unless the request has extra detail worth keeping."
        ),
        user=f"Today is {req.today:%A, %Y-%m-%d}.\nRequest: {req.text}",
    )


@app.post("/api/ai/subtasks")
async def subtasks(req: SubtasksRequest, llm: LLMDep) -> SubtasksResponse:
    return await ask(
        llm,
        SubtasksResponse,
        effort="low",
        schema=SUBTASKS_SCHEMA,
        system=(
            f"{CONTEXT} Break one task into 3-7 concrete, ordered subtasks that each fit in one study session. "
            "Titles are short and imperative. Hour estimates should add up to roughly the parent's estimate when one is given."
        ),
        user=json.dumps(req.model_dump(), ensure_ascii=False),
    )


@app.post("/api/ai/weekly-review")
async def weekly_review(req: WeeklyReviewRequest, llm: LLMDep) -> WeeklyReview:
    return await ask(
        llm,
        WeeklyReview,
        effort="medium",
        schema=WEEKLY_REVIEW_SCHEMA,
        system=(
            f"{CONTEXT} Write their weekly review from the data provided: their journal, hours against target, and tasks done and open. "
            "Be specific and honest, like a supportive mentor. Refer to their actual tasks and journal notes; don't invent progress.\n"
            "- summary: 2-4 sentences on how the week went.\n"
            "- wins: 1-4 concrete things they achieved.\n"
            "- blockers: recurring problems or gaps you see (empty if none).\n"
            "- nextWeekFocus: 2-4 prioritized suggestions for next week, including carry-over of important open tasks."
        ),
        user=json.dumps(req.model_dump(mode="json"), ensure_ascii=False),
    )
