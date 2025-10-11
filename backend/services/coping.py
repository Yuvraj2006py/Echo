"Echo coping responses backed by Hugging Face free-tier models."

from __future__ import annotations

import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Iterable, Optional

import httpx
import requests


logger = logging.getLogger(__name__)

DEFAULT_USER_ID = "default"
_MODULE_PATH = Path(__file__).resolve()
BASE_DIR = _MODULE_PATH.parents[2] if len(_MODULE_PATH.parents) >= 3 else _MODULE_PATH.parent
MEMORY_DIR = BASE_DIR / "memory"
CONVERSATIONS_PATH = MEMORY_DIR / "conversations.json"
SUMMARIES_PATH = MEMORY_DIR / "summaries.json"
TRAINING_DATA_DIR = BASE_DIR / "training_data"
TRAINING_DATASET_PATH = TRAINING_DATA_DIR / "echo_dataset.jsonl"
SUMMARY_INTERVAL = 5


def _call_ollama(prompt: str) -> Optional[str]:
    """Call the local Ollama Phi-3 model for a response."""

    if not prompt:
        return None

    url = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate").strip() or "http://localhost:11434/api/generate"
    env_model = os.getenv("MODEL_NAME") or os.getenv("OLLAMA_MODEL")
    if env_model and env_model.strip():
        model_name = env_model.strip()
    else:
        model_name = "gemma2:2b"
    payload = {"model": model_name, "prompt": prompt, "stream": False}

    try:
        response = requests.post(url, json=payload, timeout=60)
    except requests.RequestException as exc:
        logger.warning("Ollama request failed: %s", exc)
        return None

    if not response.ok:
        logger.warning("Ollama returned status %s: %s", response.status_code, response.text)
        return None

    try:
        data = response.json()
    except ValueError as exc:
        logger.warning("Failed to decode Ollama response: %s", exc)
        return None

    result = data.get("response")
    if isinstance(result, str):
        cleaned = result.strip()
        return cleaned or None

    return None

HF_MODELS: tuple[str, ...] = (
    "microsoft/phi-2",
    "tiiuae/falcon-7b-instruct",
    "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
)
HF_TIMEOUT_SECONDS = 30.0
FALLBACK_MESSAGE = "I’m here for you. Let’s take a breath and try again soon."

PROMPT_PREAMBLE = (
    "You are Echo, a calm and friendly AI companion. Respond to the following "
    "journal entry with kindness, empathy, and short reflective advice."
)

ACKNOWLEDGEMENTS = {
    "joy": "That spark of joy is a gift you earned through showing up for yourself.",
    "happy": "That spark of joy is a gift you earned through showing up for yourself.",
    "love": "It is beautiful that love is circling back to you after all the care you give out.",
    "sadness": "It makes perfect sense to feel heavy right now; your heart has been working so hard.",
    "anger": "Anyone in your shoes would feel that flare of frustration after being overlooked.",
    "fear": "Feeling unsettled is a natural response when so much is uncertain.",
    "anxiety": "That buzz of anxiety is your body asking for a moment of softness.",
    "neutral": "Noticing this moment is already a win because it means you are paying attention to yourself.",
    "surprise": "That twist caught you off guard and it is okay to take a second to absorb it.",
    "disgust": "Your reaction is a sign that your boundaries deserve a little more protection.",
}

SUPPORTIVE_SUGGESTIONS = {
    "joy": "Savor the moment by sharing the story with someone who will smile with you.",
    "happy": "Savor the moment by sharing the story with someone who will smile with you.",
    "love": "Pass that warmth along with a quick note of gratitude while the feeling is fresh.",
    "sadness": "Give yourself a quiet pause and jot one gentle thought you want to bring into tomorrow.",
    "anger": "Step outside for a breath of air before you decide how you want to respond.",
    "fear": "List one tiny thing you can influence today and let that be your anchor.",
    "anxiety": "Pair a slow inhale with a supportive phrase such as 'You can take this one step at a time.'",
    "neutral": "Name a single detail you appreciate about this moment to tuck it into memory.",
    "surprise": "Write one sentence about what this moment just taught you so you can revisit it later.",
    "disgust": "Sketch a quick boundary you want to reinforce so you feel safer moving forward.",
    "default": "Take a steady breath, place a hand over your heart, and thank yourself for noticing how you feel.",
}


def _load_json_file(path: Path, default: object) -> object:
    if not path.exists():
        return default
    decode_errors: list[str] = []
    for encoding in ("utf-8", "utf-8-sig"):
        try:
            return json.loads(path.read_text(encoding=encoding))
        except (UnicodeDecodeError, ValueError) as exc:
            decode_errors.append(str(exc))
            continue
        except OSError as exc:
            logger.warning("Failed to load %s: %s", path, exc)
            return default
    if decode_errors:
        logger.warning("Failed to load %s: %s", path, "; ".join(decode_errors))
    return default


def _write_json_file(path: Path, payload: object) -> None:
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    except OSError as exc:
        logger.warning("Failed to persist %s: %s", path, exc)


def _append_to_memory(entry_text: str, emotion: Optional[str], reply: str) -> list[dict[str, object]]:
    """Append the latest user/Echo exchange to persistent memory."""

    conversations = _load_json_file(CONVERSATIONS_PATH, {DEFAULT_USER_ID: []})
    entries = conversations.get(DEFAULT_USER_ID)
    if not isinstance(entries, list):
        entries = []
    record = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "entry_text": entry_text,
        "emotion": emotion,
        "reply": reply,
    }
    entries.append(record)
    conversations[DEFAULT_USER_ID] = entries
    _write_json_file(CONVERSATIONS_PATH, conversations)
    return entries


def _get_recent_context(k: int = 3) -> str:
    """Return the last k exchanges as text for prompt conditioning."""

    conversations = _load_json_file(CONVERSATIONS_PATH, {})
    entries = conversations.get(DEFAULT_USER_ID)
    if not isinstance(entries, list) or not entries:
        return "No recent context recorded."

    recent = entries[-k:]
    lines: list[str] = []
    for item in recent:
        entry_text = str(item.get("entry_text", "")).strip()
        reply_text = str(item.get("reply", "")).strip()
        emotion = str(item.get("emotion") or "unclassified").strip()
        if entry_text:
            lines.append(f"User ({emotion}): {entry_text}")
        if reply_text:
            lines.append(f"Echo: {reply_text}")
    return "\n".join(lines).strip() or "No recent context recorded."


def _get_long_term_summary() -> Optional[str]:
    """Fetch the stored long-term summary."""

    summaries = _load_json_file(SUMMARIES_PATH, {})
    summary = summaries.get(DEFAULT_USER_ID)
    if isinstance(summary, str):
        cleaned = summary.strip()
        return cleaned or None
    return None


def _save_long_term_summary(summary: str) -> None:
    """Persist the latest long-term summary."""

    if not summary:
        return
    summaries = _load_json_file(SUMMARIES_PATH, {})
    summaries[DEFAULT_USER_ID] = summary.strip()
    _write_json_file(SUMMARIES_PATH, summaries)


def _maybe_update_summary(entries: list[dict[str, object]]) -> None:
    """Update the conversation summary every SUMMARY_INTERVAL messages."""

    if not entries or len(entries) % SUMMARY_INTERVAL:
        return

    recent = entries[-SUMMARY_INTERVAL:]
    snippet_lines: list[str] = []
    for item in recent:
        entry_text = str(item.get("entry_text", "")).strip()
        emotion = str(item.get("emotion") or "unclassified").strip()
        reply_text = str(item.get("reply", "")).strip()
        if entry_text:
            snippet_lines.append(f"User ({emotion}): {entry_text}")
        if reply_text:
            snippet_lines.append(f"Echo: {reply_text}")

    if not snippet_lines:
        return

    summary_prompt = "Summarize this user's recent emotional pattern in one sentence:\n" + "\n".join(snippet_lines)
    summary = _call_ollama(summary_prompt)
    if summary:
        _save_long_term_summary(summary)


def _record_for_fine_tuning(prompt: str, reply: str) -> None:
    """Store prompt/reply pairs for future LoRA/PEFT fine-tuning."""

    if not prompt or not reply:
        return

    TRAINING_DATA_DIR.mkdir(parents=True, exist_ok=True)
    try:
        with TRAINING_DATASET_PATH.open("a", encoding="utf-8") as handle:
            json.dump({"prompt": prompt, "completion": reply}, handle)
            handle.write("\n")
    except OSError as exc:
        logger.warning("Failed to append training example: %s", exc)


def _resolve_token() -> Optional[str]:
    token = os.getenv("HUGGINGFACE_API_TOKEN")
    if not token:
        logger.warning("HUGGINGFACE_API_TOKEN not set; falling back to static coping replies.")
        return None
    return token.strip()


def _build_prompt(entry_text: str, emotion: Optional[str], tags: Iterable[str]) -> str:
    tag_text = ", ".join(t for t in tags if t) or "none noted"
    emotion_text = (emotion or "unclassified").lower()
    return (
        f"{PROMPT_PREAMBLE}\n\n"
        f"Emotion: {emotion_text}\n"
        f"Tags: {tag_text}\n"
        f"Journal entry:\n{entry_text.strip()}\n\n"
        "Echo:"
    )


def _extract_generated_text(payload: object) -> Optional[str]:
    if isinstance(payload, list):
        for item in payload:
            if isinstance(item, dict) and "generated_text" in item:
                return str(item["generated_text"])
    if isinstance(payload, dict):
        if "generated_text" in payload:
            return str(payload["generated_text"])
        if "error" in payload:
            logger.warning("Hugging Face error response: %s", payload.get("error"))
    return None


def _clean_reply(raw: str, prompt: str) -> str:
    text = raw
    if prompt in text:
        text = text.split(prompt, 1)[-1]
    if "Echo:" in text:
        text = text.split("Echo:", 1)[-1]
    return text.replace("</s>", "").strip()


def _call_huggingface(model_name: str, prompt: str, headers: dict[str, str], client: httpx.Client) -> Optional[str]:
    url = f"https://api-inference.huggingface.co/models/{model_name}"
    payload = {
        "inputs": prompt,
        "parameters": {"max_new_tokens": 120, "temperature": 0.7},
    }
    try:
        response = client.post(url, json=payload, headers=headers)
    except httpx.TimeoutException:
        logger.warning("Timeout when contacting model %s", model_name)
        return None
    except httpx.HTTPError as error:
        logger.warning("HTTP error for model %s: %s", model_name, error)
        return None

    if response.status_code == 503:
        logger.info("Model %s is loading or unavailable: %s", model_name, response.text)
        return None
    if not response.is_success:
        logger.warning("Model %s returned status %s: %s", model_name, response.status_code, response.text)
        return None

    try:
        data = response.json()
    except ValueError:
        logger.warning("Failed to decode Hugging Face response for model %s", model_name)
        return None

    raw_text = _extract_generated_text(data)
    if not raw_text:
        return None

    cleaned = _clean_reply(raw_text, prompt)
    return cleaned or None


def _fallback_response(emotion: Optional[str]) -> str:
    if not emotion:
        return FALLBACK_MESSAGE

    key = emotion.lower()
    acknowledgement = ACKNOWLEDGEMENTS.get(key)
    suggestion = SUPPORTIVE_SUGGESTIONS.get(key) or SUPPORTIVE_SUGGESTIONS.get("default")

    if acknowledgement and suggestion:
        result = f"{acknowledgement} {suggestion}".strip()
        return result if result.endswith(".") else f"{result}."

    if acknowledgement:
        return acknowledgement
    if suggestion:
        return suggestion if suggestion.endswith(".") else f"{suggestion}."

    return FALLBACK_MESSAGE


def generate_reply(user_input: str, *, emotion: Optional[str] = None, tags: Optional[Iterable[str]] = None) -> str:
    """Return an empathetic reply for the supplied journal text."""

    tags = list(tags or [])
    fallback = _fallback_response(emotion)
    context = _get_recent_context()
    long_term_summary = _get_long_term_summary()

    if not user_input or not user_input.strip():
        return fallback

    base_prompt = _build_prompt(user_input, emotion, tags)
    rest_of_prompt = base_prompt
    if base_prompt.startswith(PROMPT_PREAMBLE):
        rest_of_prompt = base_prompt[len(PROMPT_PREAMBLE):].lstrip("\n")

    prompt_segments = [PROMPT_PREAMBLE]
    if long_term_summary:
        prompt_segments.append(f"Long-term summary: {long_term_summary}")
    prompt_segments.append(f"Recent context:\n{context}")
    prompt = "\n".join(prompt_segments) + "\n\n" + rest_of_prompt

    reply = _call_ollama(prompt)

    if not reply:
        token = _resolve_token()
        if not token:
            reply = fallback
        else:
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            }

            with httpx.Client(timeout=HF_TIMEOUT_SECONDS) as client:
                for model in HF_MODELS:
                    candidate = _call_huggingface(model, prompt, headers, client)
                    if candidate:
                        reply = candidate
                        break

            if not reply:
                logger.error("All Hugging Face models failed; returning fallback.")
                reply = fallback

    entries = _append_to_memory(user_input, emotion, reply)
    _maybe_update_summary(entries)
    _record_for_fine_tuning(prompt, reply)

    return reply


def generate_one_liner(
    *,
    top_emotion: str,
    entry_text: Optional[str] = None,
    tags: Optional[Iterable[str]] = None,
) -> str:
    """Compatibility wrapper for legacy callers expecting a one-liner."""

    return generate_reply(entry_text or "", emotion=top_emotion, tags=tags)
