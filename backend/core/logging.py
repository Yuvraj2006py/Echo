"""Structured logging configuration."""

from __future__ import annotations

import json
import logging
import logging.config
from typing import Any, Dict

from .context import get_request_id
from .settings import Settings


class RequestIdFilter(logging.Filter):
    """Inject the active request identifier into log records."""

    def filter(self, record: logging.LogRecord) -> bool:  # pragma: no cover - trivial
        request_id = get_request_id()
        if request_id:
            record.request_id = request_id
        else:
            record.request_id = "-"
        return True


class StructuredFormatter(logging.Formatter):
    """Emit logs as structured JSON strings."""

    def format(self, record: logging.LogRecord) -> str:  # pragma: no cover - trivial
        log_entry: Dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
        }
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        if record.stack_info:
            log_entry["stack"] = self.formatStack(record.stack_info)
        return json.dumps(log_entry, ensure_ascii=False)


def configure_logging(settings: Settings) -> None:
    """Configure application-wide structured logging."""

    logging_config: Dict[str, Any] = {
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {
            "request_id": {"()": RequestIdFilter},
        },
        "formatters": {
            "structured": {
                "()": StructuredFormatter,
                "datefmt": "%Y-%m-%dT%H:%M:%S%z",
            },
        },
        "handlers": {
            "default": {
                "class": "logging.StreamHandler",
                "filters": ["request_id"],
                "formatter": "structured",
            },
        },
        "root": {
            "handlers": ["default"],
            "level": settings.log_level,
        },
        "loggers": {
            "uvicorn": {"level": settings.log_level, "handlers": ["default"], "propagate": False},
            "uvicorn.error": {
                "level": settings.log_level,
                "handlers": ["default"],
                "propagate": False,
            },
            "uvicorn.access": {
                "level": settings.log_level,
                "handlers": ["default"],
                "propagate": False,
            },
            "asyncio": {"level": settings.log_level, "handlers": ["default"], "propagate": False},
        },
    }

    logging.config.dictConfig(logging_config)
