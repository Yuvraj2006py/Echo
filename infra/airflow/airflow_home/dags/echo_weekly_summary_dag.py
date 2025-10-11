import json
import os
import sys
from datetime import datetime, time, timedelta, timezone
from typing import Dict, List

import pendulum
from airflow import DAG
from airflow.decorators import task

REPO_ROOT = os.environ.get("ECHO_REPO_PATH", "/opt/echo")
if REPO_ROOT not in sys.path:
    sys.path.append(REPO_ROOT)

from backend.db import queries  # noqa: E402
from backend.services import analytics, reporting, llm  # noqa: E402


def _week_bounds(now: datetime) -> tuple[datetime, datetime]:
    current_week_start = datetime(
        now.year, now.month, now.day, tzinfo=timezone.utc
    ) - timedelta(days=now.weekday())
    week_start = current_week_start - timedelta(days=7)
    week_end = week_start + timedelta(days=6)
    start_dt = datetime.combine(week_start, time.min, tzinfo=timezone.utc)
    end_dt = datetime.combine(week_end, time.max, tzinfo=timezone.utc)
    return start_dt, end_dt


with DAG(
    dag_id="echo_weekly_summary_dag",
    schedule="0 23 * * SUN",
    start_date=pendulum.datetime(2024, 1, 1, tz="America/Toronto"),
    catchup=False,
    tags=["echo", "analytics"],
) as dag:

    @task()
    def compute_weekly_window() -> dict:
        now = datetime.now(timezone.utc)
        start_dt, end_dt = _week_bounds(now)
        entries = queries.fetch_entries_for_range_all(start=start_dt, end=end_dt)
        daily_records = analytics.compute_daily_metrics(entries)
        queries.upsert_daily_metrics(daily_records)
        weekly_records = analytics.compute_weekly_metrics(entries, daily_records)
        queries.upsert_weekly_metrics(weekly_records)
        return {
            "week_start": start_dt.date().isoformat(),
            "week_end": end_dt.date().isoformat(),
            "entries": entries,
            "daily": daily_records,
            "weekly": weekly_records,
        }

    @task()
    def build_llm_payloads(context: dict) -> List[dict]:
        week_start = datetime.fromisoformat(context["week_start"]).date()
        week_end = datetime.fromisoformat(context["week_end"]).date()
        payloads: List[dict] = []

        for record in context["weekly"]:
            user_id = record.get("user_id")
            if not user_id:
                continue

            prev_week_start = week_start - timedelta(days=7)
            prev_week_metrics = queries.get_weekly_metrics(user_id, prev_week_start, prev_week_start)
            previous_record = prev_week_metrics[0] if prev_week_metrics else None

            user_daily = [item for item in context["daily"] if item.get("user_id") == user_id]
            metrics_payload = reporting.build_weekly_metrics_payload(
                user_id=user_id,
                week_start=week_start,
                week_end=week_end,
                weekly_record=record,
                previous_week_record=previous_record,
                entries=context["entries"],
                daily_records=user_daily,
            )
            payloads.append(
                {
                    "user_id": user_id,
                    "week_start": week_start.isoformat(),
                    "week_end": week_end.isoformat(),
                    "metrics": metrics_payload,
                }
            )
        return payloads

    @task()
    def generate_and_store_summaries(payloads: List[dict]) -> List[dict]:
        summaries: List[dict] = []
        for payload in payloads:
            metrics_payload = payload["metrics"]
            summary_json, markdown = llm.generate_weekly_summary(metrics_payload)
            record = queries.upsert_weekly_summary(
                {
                    "user_id": payload["user_id"],
                    "week_start": payload["week_start"],
                    "week_end": payload["week_end"],
                    "metrics": metrics_payload,
                    "summary_md": markdown,
                }
            )
            summaries.append(
                {
                    "user_id": payload["user_id"],
                    "summary_json": summary_json,
                    "record_id": record["id"],
                }
            )
        return summaries

    @task()
    def log_completion(summaries: List[dict]) -> None:
        for item in summaries:
            print(
                f"[Echo DAG] Generated weekly summary for user={item['user_id']} -> record={item['record_id']}"
            )

    analytics_context = compute_weekly_window()
    llm_payloads = build_llm_payloads(analytics_context)
    summary_records = generate_and_store_summaries(llm_payloads)
    log_completion(summary_records)
