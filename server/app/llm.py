"""Thin wrapper around the Claude API: one structured-output call, errors mapped to HTTP-friendly ones."""

import json
from typing import Any, Literal

import anthropic

MODEL = "claude-opus-5-5"
# Server-side refusal fallback: a declined request is re-run on Anthropic's recommended model.
FALLBACK_BETA = "server-side-fallback-2026-07-01"

Effort = Literal["low", "medium", "high"]


class LLMError(Exception):
    def __init__(self, status: int, detail: str):
        super().__init__(detail)
        self.status = status
        self.detail = detail


class LLM:
    def __init__(self, client: anthropic.AsyncAnthropic | None = None):
        self._client = client

    @property
    def client(self) -> anthropic.AsyncAnthropic:
        # Created on first use so the server starts (and tests run) without credentials.
        if self._client is None:
            try:
                self._client = anthropic.AsyncAnthropic()
            except anthropic.AnthropicError as e:
                raise LLMError(500, f"Claude client could not start: {e}. Set ANTHROPIC_API_KEY in server/.env.") from e
        return self._client

    async def structured(self, *, system: str, user: str, schema: dict[str, Any], effort: Effort) -> dict[str, Any]:
        """Ask Claude for JSON matching `schema`. Raises LLMError on any failure."""
        try:
            response = await self.client.beta.messages.create(
                model=MODEL,
                max_tokens=16000,
                betas=[FALLBACK_BETA],
                fallbacks="default",
                system=system,
                messages=[{"role": "user", "content": user}],
                output_config={"effort": effort, "format": {"type": "json_schema", "schema": schema}},
            )
        except anthropic.AuthenticationError as e:
            raise LLMError(500, "Claude API key is missing or invalid. Set ANTHROPIC_API_KEY in server/.env.") from e
        except anthropic.RateLimitError as e:
            raise LLMError(429, "Rate limited by the Claude API. Try again in a minute.") from e
        except anthropic.APIConnectionError as e:
            raise LLMError(502, "Could not reach the Claude API.") from e
        except anthropic.APIStatusError as e:
            # Pass on the API's own message (e.g. "credit balance is too low") so the user can act on it.
            body = e.body if isinstance(e.body, dict) else {}
            message = body.get("error", {}).get("message") if isinstance(body.get("error"), dict) else None
            raise LLMError(502, f"Claude API error ({e.status_code}): {message or 'request failed'}") from e

        if response.stop_reason == "refusal":
            raise LLMError(422, "Claude declined this request. Try rephrasing it.")
        if response.stop_reason == "max_tokens":
            raise LLMError(502, "Claude's answer was cut off. Try a shorter request.")
        text = next((b.text for b in response.content if b.type == "text"), None)
        if text is None:
            raise LLMError(502, "Claude returned no answer.")
        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            raise LLMError(502, "Claude returned invalid JSON.") from e
