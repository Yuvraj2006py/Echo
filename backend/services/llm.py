"""LLM helpers for generating weekly summaries."""

from __future__ import annotations

import json
import os
import re
from typing import Dict, Tuple

import requests

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover - optional dependency for Airflow/runtime
    OpenAI = None  # type: ignore[assignment]


SUMMARY_PROMPT_TEMPLATE = """You are an analytics writer. Generate a rigorous, actionable weekly emotional report from structured metrics. Be concrete. Use numbers, deltas, and statistically meaningful language. Avoid generic advice.

You must respond with two sections in order:

SUMMARY_JSON
{{"primary_sentiment_signal": "...", "primary_recommendation": "...", "risk_level": "..."}}

MARKDOWN_REPORT
<markdown content>

Metrics JSON:
```json
{metrics_json}
```
"""


def _call_ollama(prompt: str) -> str | None:
    url = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate").strip() or "http://localhost:11434/api/generate"
    model = os.getenv("MODEL_NAME") or os.getenv("OLLAMA_MODEL") or "gemma2:2b"
    payload = {"model": model, "prompt": prompt, "stream": False}
    try:
        response = requests.post(url, json=payload, timeout=90)
        response.raise_for_status()
    except requests.RequestException:
        return None

    data = response.json()
    generated = data.get("response")
    if isinstance(generated, str):
        return generated.strip()
    return None


def _extract_sections(text: str) -> Tuple[Dict[str, str], str]:
    json_match = re.search(r"SUMMARY_JSON\s*```json\s*(\{.*?\})\s*```", text, re.DOTALL)
    if json_match:
        json_block = json_match.group(1)
    else:
        alt_json_match = re.search(r"SUMMARY_JSON\s*(\{.*?\})\s*(?:MARKDOWN_REPORT|$)", text, re.DOTALL)
        if not alt_json_match:
            raise ValueError("LLM response missing SUMMARY_JSON block.")
        json_block = alt_json_match.group(1)
    summary_json = json.loads(json_block)

    markdown_match = re.search(r"MARKDOWN_REPORT\s*(.+)", text, re.DOTALL)
    if not markdown_match:
        raise ValueError("LLM response missing MARKDOWN_REPORT section.")
    markdown = markdown_match.group(1).strip()
    return summary_json, markdown


def generate_weekly_summary(metrics_payload: Dict[str, any], *, model: str | None = None) -> Tuple[Dict[str, str], str]:
    prompt = SUMMARY_PROMPT_TEMPLATE.format(metrics_json=json.dumps(metrics_payload, indent=2))

    api_key = os.getenv("OPENAI_API_KEY")
    if api_key and OpenAI is not None:
        client = OpenAI(api_key=api_key)
        response = client.responses.create(
            model=model or os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            input=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
        )
        text = response.output_text
        return _extract_sections(text)

    ollama_response = _call_ollama(prompt)
    if not ollama_response:
        raise RuntimeError(
            "Weekly summary generation requires either OPENAI_API_KEY or a reachable Ollama model."
        )
    return _extract_sections(ollama_response)
