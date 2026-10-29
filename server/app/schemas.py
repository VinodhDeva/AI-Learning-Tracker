"""Request/response models. Responses are validated with these after Claude answers, so bad output never reaches the app."""

import datetime as dt
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

TaskType = Literal["learn", "build", "practice", "review"]
Priority = Literal["low", "medium", "high"]

Title = Field(min_length=1, max_length=200)
ShortText = Field(default="", max_length=5000)


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


# --- Natural-language add ---------------------------------------------------

class ParseTaskRequest(Strict):
    text: str = Field(min_length=1, max_length=500)
    today: dt.date


class ParsedTask(Strict):
    title: str = Title
    type: TaskType
    priority: Priority
    dueDate: dt.date | None
    estimatedHours: float = Field(ge=0, le=200)
    tags: list[str] = Field(max_length=10)
    notes: str = Field(max_length=2000)


PARSED_TASK_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string", "description": "Short imperative task title, without the date or hours"},
        "type": {"type": "string", "enum": ["learn", "build", "practice", "review"]},
        "priority": {"type": "string", "enum": ["low", "medium", "high"]},
        "dueDate": {"anyOf": [{"type": "string", "format": "date"}, {"type": "null"}]},
        "estimatedHours": {"type": "number"},
        "tags": {"type": "array", "items": {"type": "string"}},
        "notes": {"type": "string"},
    },
    "required": ["title", "type", "priority", "dueDate", "estimatedHours", "tags", "notes"],
    "additionalProperties": False,
}


# --- Subtasks ---------------------------------------------------------------

class SubtasksRequest(Strict):
    title: str = Title
    notes: str = ShortText
    type: TaskType
    estimatedHours: float = Field(ge=0, le=200)


class Subtask(Strict):
    title: str = Title
    type: TaskType
    estimatedHours: float = Field(ge=0, le=200)


class SubtasksResponse(Strict):
    subtasks: list[Subtask] = Field(min_length=1, max_length=10)


SUBTASKS_SCHEMA = {
    "type": "object",
    "properties": {
        "subtasks": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "type": {"type": "string", "enum": ["learn", "build", "practice", "review"]},
                    "estimatedHours": {"type": "number"},
                },
                "required": ["title", "type", "estimatedHours"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["subtasks"],
    "additionalProperties": False,
}


# --- Weekly review ----------------------------------------------------------

class JournalItem(Strict):
    date: dt.date
    whatILearned: str = ShortText
    blockers: str = ShortText
    nextSteps: str = ShortText


class WeekTasks(Strict):
    label: str = Field(max_length=200)
    done: list[str] = Field(default=[], max_length=100)
    open: list[str] = Field(default=[], max_length=100)


class WeeklyReviewRequest(Strict):
    week: WeekTasks
    nextWeek: WeekTasks | None = None
    hoursLogged: float = Field(ge=0, le=200)
    hourTarget: float = Field(ge=1, le=80)
    journal: list[JournalItem] = Field(default=[], max_length=14)


class WeeklyReview(Strict):
    summary: str = Field(max_length=2000)
    wins: list[str] = Field(max_length=10)
    blockers: list[str] = Field(max_length=10)
    nextWeekFocus: list[str] = Field(max_length=10)


WEEKLY_REVIEW_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "wins": {"type": "array", "items": {"type": "string"}},
        "blockers": {"type": "array", "items": {"type": "string"}},
        "nextWeekFocus": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["summary", "wins", "blockers", "nextWeekFocus"],
    "additionalProperties": False,
}
