from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.llm import LLMError
from app.main import app, get_llm


class FakeLLM:
    def __init__(self, result: Any):
        self.result = result
        self.calls: list[dict[str, Any]] = []

    async def structured(self, **kwargs: Any) -> Any:
        self.calls.append(kwargs)
        if isinstance(self.result, Exception):
            raise self.result
        return self.result


@pytest.fixture
def use_llm():
    def install(result: Any) -> FakeLLM:
        fake = FakeLLM(result)
        app.dependency_overrides[get_llm] = lambda: fake
        return fake

    yield install
    app.dependency_overrides.clear()


client = TestClient(app)

TASK = {
    "title": "Finish RAG chunking tutorial",
    "type": "learn",
    "priority": "medium",
    "dueDate": "2026-11-01",
    "estimatedHours": 3,
    "tags": ["rag"],
    "notes": "",
}


def test_parse_task_returns_validated_task_and_sends_today(use_llm):
    fake = use_llm(TASK)
    r = client.post("/api/ai/parse-task", json={"text": "finish RAG chunking tutorial by Sunday, 3 hrs", "today": "2026-10-29"})
    assert r.status_code == 200
    assert r.json() == TASK
    assert "Thursday, 2026-10-29" in fake.calls[0]["user"]
    assert fake.calls[0]["schema"]["additionalProperties"] is False


def test_parse_task_rejects_empty_text_without_calling_claude(use_llm):
    fake = use_llm(TASK)
    r = client.post("/api/ai/parse-task", json={"text": "", "today": "2026-10-29"})
    assert r.status_code == 422
    assert fake.calls == []


def test_bad_model_output_is_a_502(use_llm):
    use_llm({**TASK, "type": "party", "dueDate": "next week"})
    r = client.post("/api/ai/parse-task", json={"text": "x", "today": "2026-10-29"})
    assert r.status_code == 502


def test_llm_errors_keep_status_and_message(use_llm):
    use_llm(LLMError(422, "Claude declined this request. Try rephrasing it."))
    r = client.post("/api/ai/subtasks", json={"title": "x", "type": "build", "estimatedHours": 2})
    assert r.status_code == 422
    assert r.json()["detail"].startswith("Claude declined")


def test_subtasks_and_weekly_review(use_llm):
    use_llm({"subtasks": [{"title": "Read docs", "type": "learn", "estimatedHours": 1}]})
    r = client.post("/api/ai/subtasks", json={"title": "Build RAG", "type": "build", "estimatedHours": 4, "notes": ""})
    assert r.json()["subtasks"][0]["title"] == "Read docs"

    review = {"summary": "Solid week.", "wins": ["Shipped"], "blockers": [], "nextWeekFocus": ["Evals"]}
    use_llm(review)
    r = client.post(
        "/api/ai/weekly-review",
        json={
            "week": {"label": "Week 1", "done": ["a"], "open": ["b"]},
            "hoursLogged": 8,
            "hourTarget": 10,
            "journal": [{"date": "2026-10-28", "whatILearned": "x", "blockers": "", "nextSteps": ""}],
        },
    )
    assert r.status_code == 200
    assert r.json() == review
