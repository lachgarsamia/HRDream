"""
Celery Worker Configuration (Placeholder for Slice 2)
"""

from celery import Celery

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "cvshortlister",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.worker.tasks"],
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour max per task
    task_soft_time_limit=3300,  # Soft limit 55 minutes
    worker_prefetch_multiplier=1,
    worker_concurrency=4,
)
