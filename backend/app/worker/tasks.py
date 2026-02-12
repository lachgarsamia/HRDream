"""
Celery Tasks (Placeholder for Slice 2)
"""

from app.worker import celery_app


@celery_app.task(bind=True, name="tasks.placeholder")
def placeholder_task(self, message: str) -> dict:
    """Placeholder task to verify Celery is working."""
    return {"status": "success", "message": message}
