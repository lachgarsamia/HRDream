"""Projects and job-scoped workflow API routes."""

import logging
import mimetypes
import os
import zipfile
from datetime import UTC, datetime
from io import BytesIO, StringIO
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Body, Depends, File as FastAPIFile, HTTPException, Query, Response, UploadFile, status
from fastapi.responses import FileResponse as FastAPIFileResponse, JSONResponse
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.candidate import Candidate
from app.models.file import File
from app.models.project import Project
from app.models.role import Role
from app.models.score import Score
from app.models.shortlist_run import ShortlistRun
from app.models.user import User
from app.schemas.job_flow import (
    CandidateDetailResponse,
    CandidateListResponse,
    CandidateSummaryResponse,
    FileListResponse,
    FileResponse,
    RunCreateRequest,
    RunCreateResponse,
    RunListItem,
    RunListResponse,
    RunResultItem,
    RunResultsResponse,
    SaveCriteriaRequest,
    SaveCriteriaResponse,
    UploadResponse,
)
from app.schemas.project import (
    ProjectCreate,
    ProjectListResponse,
    ProjectResponse,
    ProjectUpdate,
)
from app.schemas.role import (
    RoleCriteriaIntake,
    RoleResponse,
    RoleSuggestRequest,
    RoleSuggestResponse,
)
from app.services.parsing import deterministic_extract
from app.services.scoring import compute_score

router = APIRouter(tags=["Projects"])
logger = logging.getLogger(__name__)
settings = get_settings()

SUPPORTED_EXTENSIONS = {".pdf", ".docx"}


def _safe_filename(filename: str) -> str:
    name = Path(filename).name.strip()
    return name or f"upload-{uuid4().hex}.bin"


def _is_supported(name: str) -> bool:
    return Path(name).suffix.lower() in SUPPORTED_EXTENSIONS


async def _ensure_project_owned(project_id: int, current_user: User, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def _suggest_defaults(payload: RoleSuggestRequest) -> RoleCriteriaIntake:
    """Conservative stub suggestion for UI integration."""
    jd = payload.job_description.lower()

    must_have_frameworks = []
    for framework in ["react", "next.js", "vue", "angular", "django", "fastapi"]:
        if framework in jd:
            must_have_frameworks.append(framework)

    must_have_technical_skills = []
    for skill in ["typescript", "python", "sql", "aws", "kubernetes", "docker"]:
        if skill in jd:
            must_have_technical_skills.append(skill)

    return RoleCriteriaIntake(
        role_title=payload.role_title,
        seniority="senior",
        role_category="engineering",
        employment_type="full_time",
        work_mode="hybrid",
        allowed_cities=[],
        allowed_countries=[],
        relocation_accepted=False,
        location_strictness="soft_preference",
        must_have_technical_skills=must_have_technical_skills,
        must_have_frameworks=must_have_frameworks,
        must_have_tools=["git"],
        nice_to_have_skills=["system design"],
        nice_to_have_frameworks=[],
        nice_to_have_tools=["jira"],
        soft_skills_required=["communication"],
        soft_skills_preferred=["stakeholder management"],
        min_years_experience=4,
        domain_experience=[],
        career_stability_rule=False,
        required_languages=[],
        education_requirement=None,
        keywords_boost=["ownership"],
        keywords_penalize=[],
        scoring_preset="balanced",
    )


@router.get("/projects", response_model=ProjectListResponse)
async def list_projects(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=200, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectListResponse:
    """List all projects for the current user with pagination."""
    count_result = await db.execute(
        select(func.count()).select_from(Project).where(Project.user_id == current_user.id)
    )
    total = count_result.scalar() or 0

    offset = (page - 1) * page_size
    result = await db.execute(
        select(Project)
        .where(Project.user_id == current_user.id)
        .order_by(Project.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    projects = list(result.scalars().all())

    return ProjectListResponse(
        items=projects,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/jobs", response_model=ProjectListResponse)
async def list_jobs(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=200, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProjectListResponse:
    """Job alias endpoint for projects list."""
    return await list_projects(page=page, page_size=page_size, current_user=current_user, db=db)


@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Project:
    """Create a new project."""
    logger.info(
        "create_project requested by user_id=%s name=%s",
        current_user.id,
        project_data.name,
    )
    project = Project(
        user_id=current_user.id,
        name=project_data.name,
        description=project_data.description,
    )

    db.add(project)
    await db.commit()
    await db.refresh(project)

    return project


@router.post("/jobs", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Project:
    """Job alias endpoint for project creation."""
    return await create_project(project_data=project_data, current_user=current_user, db=db)


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Project:
    """Get a specific project by ID scoped to current user."""
    logger.info(
        "get_project requested user_id=%s project_id=%s filter=(id=%s,user_id=%s)",
        current_user.id,
        project_id,
        project_id,
        current_user.id,
    )
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    logger.info(
        "get_project result user_id=%s project_id=%s found=%s",
        current_user.id,
        project_id,
        project is not None,
    )

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    return project


@router.get("/jobs/{job_id}", response_model=ProjectResponse)
async def get_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Project:
    """Job alias endpoint for project detail."""
    return await get_project(project_id=job_id, current_user=current_user, db=db)


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Project:
    """Update an existing project."""
    project = await _ensure_project_owned(project_id=project_id, current_user=current_user, db=db)

    update_data = project_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    await db.commit()
    await db.refresh(project)

    return project


@router.patch("/jobs/{job_id}", response_model=ProjectResponse)
async def update_job(
    job_id: int,
    project_data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Project:
    """Job alias endpoint for project update."""
    return await update_project(project_id=job_id, project_data=project_data, current_user=current_user, db=db)


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a project and associated data."""
    project = await _ensure_project_owned(project_id=project_id, current_user=current_user, db=db)
    await db.delete(project)
    await db.commit()


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Job alias endpoint for project deletion."""
    await delete_project(project_id=job_id, current_user=current_user, db=db)


@router.post("/jobs/{job_id}/upload", response_model=UploadResponse)
async def upload_job_files(
    job_id: int,
    files: list[UploadFile] = FastAPIFile(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UploadResponse:
    """Upload one or many files to a job and index them into job-scoped candidates."""
    logger.info(
        "upload_job_files start user_id=%s job_id=%s files_count=%s",
        current_user.id,
        job_id,
        len(files),
    )
    await _ensure_project_owned(project_id=job_id, current_user=current_user, db=db)

    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No files provided")

    batch_id = uuid4().hex[:12]
    base_dir = Path(settings.upload_dir).resolve() / f"job_{job_id}" / batch_id
    os.makedirs(base_dir, exist_ok=True)

    candidate_ids: list[int] = []
    files_created = 0

    async def create_from_bytes(filename: str, payload: bytes, mime_type: str) -> None:
        nonlocal files_created
        safe_name = _safe_filename(filename)
        if not _is_supported(safe_name):
            return

        storage_path = base_dir / safe_name
        storage_path.write_bytes(payload)

        profile = deterministic_extract(payload, safe_name, mime_type)
        warnings_json = profile.get("parsing_warnings_json")
        file_row = File(
            job_id=job_id,
            original_filename=safe_name,
            storage_path=str(storage_path),
            mime_type=mime_type,
            status="indexed",
            warnings_json=warnings_json,
            per_page_text_json={"pages": profile.get("per_page_text_json", [])},
            batch_id=batch_id,
        )
        db.add(file_row)
        await db.flush()

        candidate = Candidate(
            job_id=job_id,
            file_id=file_row.id,
            full_name=profile["full_name"],
            email=profile["email"],
            phone=profile["phone"],
            location=profile["location"],
            years_experience_est=profile["years_experience_est"],
            skills_top_json=profile["skills_top_json"],
            structured_json=profile["structured_json"],
            extracted_contacts_json=profile.get("extracted_contacts_json"),
            extracted_meta_json=profile.get("extracted_meta_json"),
            parsing_warnings_json=warnings_json,
            status="indexed",
        )
        db.add(candidate)
        await db.flush()

        candidate_ids.append(candidate.id)
        files_created += 1

    for upload in files:
        filename = upload.filename or f"upload-{uuid4().hex}.bin"
        blob = await upload.read()
        ext = Path(filename).suffix.lower()

        if ext == ".zip":
            try:
                with zipfile.ZipFile(BytesIO(blob)) as zf:
                    for member in zf.infolist():
                        if member.is_dir():
                            continue
                        member_name = _safe_filename(member.filename)
                        if not _is_supported(member_name):
                            continue
                        member_blob = zf.read(member)
                        mime = (
                            "application/pdf"
                            if member_name.lower().endswith(".pdf")
                            else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        )
                        await create_from_bytes(member_name, member_blob, mime)
            except zipfile.BadZipFile as exc:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid zip file") from exc
        else:
            await create_from_bytes(filename, blob, upload.content_type or "application/octet-stream")

    await db.commit()
    logger.info(
        "upload_job_files done user_id=%s job_id=%s batch_id=%s files_created=%s candidates_created=%s",
        current_user.id,
        job_id,
        batch_id,
        files_created,
        len(candidate_ids),
    )

    return UploadResponse(batch_id=batch_id, files_created=files_created, candidate_ids=candidate_ids)


@router.post("/jobs/{job_id}/uploads", response_model=UploadResponse)
async def upload_job_files_plural(
    job_id: int,
    files: list[UploadFile] = FastAPIFile(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UploadResponse:
    """Compatibility alias for plural uploads route."""
    return await upload_job_files(job_id=job_id, files=files, current_user=current_user, db=db)


@router.post("/projects/{project_id}/upload", response_model=UploadResponse)
async def upload_project_files_legacy(
    project_id: int,
    files: list[UploadFile] = FastAPIFile(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UploadResponse:
    """Legacy compatibility alias: project upload route."""
    return await upload_job_files(job_id=project_id, files=files, current_user=current_user, db=db)


@router.post("/projects/{project_id}/uploads", response_model=UploadResponse)
async def upload_project_files_legacy_plural(
    project_id: int,
    files: list[UploadFile] = FastAPIFile(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UploadResponse:
    """Legacy compatibility alias: plural project uploads route."""
    return await upload_job_files(job_id=project_id, files=files, current_user=current_user, db=db)


@router.get("/jobs/{job_id}/files", response_model=FileListResponse)
async def list_job_files(
    job_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    batch_id: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FileListResponse:
    """List files scoped to one job."""
    await _ensure_project_owned(project_id=job_id, current_user=current_user, db=db)

    filters = [File.job_id == job_id]
    if batch_id:
        filters.append(File.batch_id == batch_id)
    if status_filter:
        filters.append(File.status == status_filter)

    total_result = await db.execute(select(func.count()).select_from(File).where(*filters))
    total = total_result.scalar() or 0

    offset = (page - 1) * page_size
    result = await db.execute(
        select(File)
        .where(*filters)
        .order_by(File.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )

    return FileListResponse(items=list(result.scalars().all()), total=total, page=page, page_size=page_size)


@router.get("/jobs/{job_id}/candidates", response_model=CandidateListResponse)
async def list_job_candidates(
    job_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    batch_id: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    has_warnings: bool | None = Query(None),
    search: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CandidateListResponse:
    """List candidates scoped to one job with file metadata fields for the workspace table."""
    logger.info(
        "list_job_candidates user_id=%s job_id=%s page=%s page_size=%s batch_id=%s status=%s search=%s",
        current_user.id,
        job_id,
        page,
        page_size,
        batch_id,
        status_filter,
        search,
    )
    await _ensure_project_owned(project_id=job_id, current_user=current_user, db=db)

    filters = [Candidate.job_id == job_id]
    if status_filter:
        filters.append(Candidate.status == status_filter)
    if search:
        filters.append(func.lower(Candidate.full_name).contains(search.lower()))

    if batch_id:
        filters.append(File.batch_id == batch_id)
    if has_warnings is True:
        filters.append(File.warnings_json.is_not(None))
    if has_warnings is False:
        filters.append(File.warnings_json.is_(None))

    total_result = await db.execute(
        select(func.count())
        .select_from(Candidate)
        .join(File, File.id == Candidate.file_id)
        .where(*filters)
    )
    total = total_result.scalar() or 0

    offset = (page - 1) * page_size
    result = await db.execute(
        select(Candidate, File)
        .join(File, File.id == Candidate.file_id)
        .where(*filters)
        .order_by(Candidate.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )

    items: list[CandidateSummaryResponse] = []
    for candidate, file_row in result.all():
        if candidate.job_id != job_id or file_row.job_id != job_id:
            logger.error(
                "job scope violation in candidates list job_id=%s candidate_id=%s candidate_job_id=%s file_job_id=%s",
                job_id,
                candidate.id,
                candidate.job_id,
                file_row.job_id,
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Candidate scope mismatch for requested job",
            )

        items.append(
            CandidateSummaryResponse(
                id=candidate.id,
                job_id=candidate.job_id,
                file_id=candidate.file_id,
                full_name=candidate.full_name,
                email=candidate.email,
                phone=candidate.phone,
                location=candidate.location,
                years_experience_est=candidate.years_experience_est,
                skills_top_json=candidate.skills_top_json,
                extracted_contacts_json=candidate.extracted_contacts_json,
                extracted_meta_json=candidate.extracted_meta_json,
                parsing_warnings_json=candidate.parsing_warnings_json,
                status=candidate.status,
                batch_id=file_row.batch_id,
                file_status=file_row.status,
                warnings_json=candidate.parsing_warnings_json or file_row.warnings_json,
                created_at=candidate.created_at,
            )
        )

    logger.info(
        "list_job_candidates done user_id=%s job_id=%s total=%s returned=%s",
        current_user.id,
        job_id,
        total,
        len(items),
    )
    return CandidateListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/jobs/{job_id}/candidates/{candidate_id}", response_model=CandidateDetailResponse)
async def get_job_candidate_details(
    job_id: int,
    candidate_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CandidateDetailResponse:
    """Get one candidate detail payload scoped strictly to the requested job."""
    await _ensure_project_owned(project_id=job_id, current_user=current_user, db=db)

    result = await db.execute(
        select(Candidate, File)
        .join(File, File.id == Candidate.file_id)
        .where(Candidate.id == candidate_id, Candidate.job_id == job_id, File.job_id == job_id)
    )
    row = result.first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

    candidate, file_row = row
    if candidate.job_id != job_id or file_row.job_id != job_id:
        logger.error(
            "job scope violation in candidate details job_id=%s candidate_id=%s candidate_job_id=%s file_job_id=%s",
            job_id,
            candidate.id,
            candidate.job_id,
            file_row.job_id,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Candidate scope mismatch for requested job",
        )

    storage_exists = Path(file_row.storage_path).exists() if file_row.storage_path else False
    return CandidateDetailResponse(
        id=candidate.id,
        job_id=candidate.job_id,
        file_id=candidate.file_id,
        full_name=candidate.full_name,
        email=candidate.email,
        phone=candidate.phone,
        location=candidate.location,
        years_experience_est=candidate.years_experience_est,
        skills_top_json=candidate.skills_top_json,
        structured_json=candidate.structured_json,
        extracted_contacts_json=candidate.extracted_contacts_json,
        extracted_meta_json=candidate.extracted_meta_json,
        parsing_warnings_json=candidate.parsing_warnings_json,
        status=candidate.status,
        batch_id=file_row.batch_id,
        file_status=file_row.status,
        file_name=file_row.original_filename,
        file_mime_type=file_row.mime_type,
        cv_available=storage_exists,
        created_at=candidate.created_at,
    )


@router.get("/jobs/{job_id}/candidates/{candidate_id}/cv")
async def get_job_candidate_cv(
    job_id: int,
    candidate_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FastAPIFileResponse:
    """Stream original candidate CV file scoped by job and user ownership."""
    await _ensure_project_owned(project_id=job_id, current_user=current_user, db=db)

    result = await db.execute(
        select(Candidate, File)
        .join(File, File.id == Candidate.file_id)
        .where(Candidate.id == candidate_id, Candidate.job_id == job_id, File.job_id == job_id)
    )
    row = result.first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")

    candidate, file_row = row
    if candidate.job_id != job_id or file_row.job_id != job_id:
        logger.error(
            "job scope violation in candidate cv fetch job_id=%s candidate_id=%s candidate_job_id=%s file_job_id=%s",
            job_id,
            candidate.id,
            candidate.job_id,
            file_row.job_id,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Candidate scope mismatch for requested job",
        )

    cv_path = Path(file_row.storage_path)
    if not cv_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate CV not found")

    media_type = file_row.mime_type or mimetypes.guess_type(file_row.original_filename)[0] or "application/octet-stream"
    return FastAPIFileResponse(
        path=cv_path,
        media_type=media_type,
        filename=file_row.original_filename,
        headers={"Content-Disposition": f'inline; filename="{file_row.original_filename}"'},
    )


@router.post("/jobs/{job_id}/criteria", response_model=SaveCriteriaResponse)
async def save_job_criteria(
    job_id: int,
    payload: SaveCriteriaRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SaveCriteriaResponse:
    """Save one active criteria JSON for the job."""
    project = await _ensure_project_owned(project_id=job_id, current_user=current_user, db=db)

    role_result = await db.execute(select(Role).where(Role.project_id == job_id))
    role = role_result.scalar_one_or_none()
    role_title = payload.criteria_json.get("role_title") or project.name

    if role is None:
        role = Role(project_id=job_id, role_title=role_title, criteria_json=payload.criteria_json)
        db.add(role)
    else:
        role.role_title = role_title
        role.criteria_json = payload.criteria_json

    await db.commit()
    await db.refresh(role)

    return SaveCriteriaResponse(
        role_id=role.id,
        project_id=role.project_id,
        role_title=role.role_title,
        criteria_json=role.criteria_json,
        updated_at=role.updated_at,
    )


@router.post("/jobs/{job_id}/runs", response_model=RunCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_job_run(
    job_id: int,
    payload: RunCreateRequest | None = Body(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RunCreateResponse:
    """Create a shortlist run scoped strictly to job candidates and store pool snapshot."""
    logger.info("create_job_run start user_id=%s job_id=%s", current_user.id, job_id)
    await _ensure_project_owned(project_id=job_id, current_user=current_user, db=db)

    role_result = await db.execute(select(Role).where(Role.project_id == job_id))
    role = role_result.scalar_one_or_none()
    criteria_json = role.criteria_json if role else {}
    criteria_version = role.updated_at.isoformat() if role else "none"

    query = (
        select(Candidate, File)
        .join(File, File.id == Candidate.file_id)
        .where(Candidate.job_id == job_id, File.job_id == job_id)
    )

    selected_candidate_ids = payload.candidate_ids if payload and payload.candidate_ids else None
    selected_batch_ids = payload.batch_ids if payload and payload.batch_ids else None

    if selected_candidate_ids:
        query = query.where(Candidate.id.in_(selected_candidate_ids))
    if selected_batch_ids:
        query = query.where(File.batch_id.in_(selected_batch_ids))

    rows = list((await db.execute(query.order_by(Candidate.id.asc()))).all())

    for candidate, file_row in rows:
        if candidate.job_id != job_id or file_row.job_id != job_id:
            logger.error(
                "job scope violation while creating run job_id=%s candidate_id=%s candidate_job_id=%s file_job_id=%s",
                job_id,
                candidate.id,
                candidate.job_id,
                file_row.job_id,
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Candidate scope mismatch for requested job",
            )

    included_candidate_ids = [candidate.id for candidate, _ in rows]
    included_batch_ids = sorted({file_row.batch_id for _, file_row in rows})

    run = ShortlistRun(
        job_id=job_id,
        criteria_snapshot={"criteria": criteria_json, "criteria_version": criteria_version},
        scoring_config_version="v1",
        candidate_pool_snapshot={
            "included_candidate_ids": included_candidate_ids,
            "included_batch_ids": included_batch_ids,
            "total_count": len(included_candidate_ids),
            "filters_applied": {
                "candidate_ids": selected_candidate_ids,
                "batch_ids": selected_batch_ids,
            },
        },
        status="completed",
    )
    db.add(run)
    await db.flush()

    for candidate, _ in rows:
        structured = candidate.structured_json or {}
        scoring_input = {
            "skills": structured.get("skills", []),
            "frameworks": structured.get("frameworks", []),
            "tools": structured.get("tools", []),
            "location_city": candidate.location,
            "location_country": candidate.location,
            "years_experience": candidate.years_experience_est or 0,
            "keywords": structured.get("keywords", []),
            "embedding_similarity": 0.7,
            "languages": structured.get("languages", []),
        }
        score_result = compute_score(criteria_json, scoring_input)

        decision = "undecided"
        total_score = float(score_result.get("score", 0.0))
        if score_result.get("rejected"):
            decision = "rejected"
            total_score = 0.0
        elif total_score >= 70:
            decision = "shortlisted"

        db.add(
            Score(
                run_id=run.id,
                candidate_id=candidate.id,
                total_score=round(total_score, 2),
                breakdown_json={
                    "breakdown": score_result.get("breakdown", {}),
                    "reason": score_result.get("reason"),
                    "missing_must_have": score_result.get("missing_must_have", []),
                },
                decision=decision,
            )
        )

    await db.commit()
    await db.refresh(run)
    logger.info(
        "create_job_run done user_id=%s job_id=%s run_id=%s included_candidates=%s batches=%s",
        current_user.id,
        job_id,
        run.id,
        len(included_candidate_ids),
        included_batch_ids,
    )

    return RunCreateResponse(
        id=run.id,
        job_id=run.job_id,
        status=run.status,
        created_at=run.created_at,
        included_candidate_count=len(included_candidate_ids),
    )


@router.get("/jobs/{job_id}/runs", response_model=RunListResponse)
async def list_job_runs(
    job_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RunListResponse:
    """List shortlist runs for one job."""
    await _ensure_project_owned(project_id=job_id, current_user=current_user, db=db)

    total_result = await db.execute(
        select(func.count()).select_from(ShortlistRun).where(ShortlistRun.job_id == job_id)
    )
    total = total_result.scalar() or 0

    offset = (page - 1) * page_size
    result = await db.execute(
        select(ShortlistRun)
        .where(ShortlistRun.job_id == job_id)
        .order_by(ShortlistRun.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )

    return RunListResponse(
        items=[RunListItem.model_validate(item) for item in result.scalars().all()],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/runs/{run_id}/results", response_model=RunResultsResponse)
async def get_run_results(
    run_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RunResultsResponse:
    """Get run results with provenance and strict job/candidate scope checks."""
    logger.info("get_run_results user_id=%s run_id=%s", current_user.id, run_id)
    run_result = await db.execute(
        select(ShortlistRun, Project)
        .join(Project, Project.id == ShortlistRun.job_id)
        .where(ShortlistRun.id == run_id, Project.user_id == current_user.id)
    )
    run_row = run_result.first()
    if run_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")

    run, _project = run_row

    score_rows = list(
        (
            await db.execute(
                select(Score, Candidate)
                .join(Candidate, Candidate.id == Score.candidate_id)
                .where(Score.run_id == run_id)
                .order_by(Score.total_score.desc())
            )
        ).all()
    )

    items: list[RunResultItem] = []
    for score, candidate in score_rows:
        if candidate.job_id != run.job_id:
            logger.error(
                "scope violation in run results run_id=%s run_job_id=%s candidate_id=%s candidate_job_id=%s",
                run_id,
                run.job_id,
                candidate.id,
                candidate.job_id,
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Run contains candidates outside requested job",
            )

        items.append(
            RunResultItem(
                score_id=score.id,
                candidate_id=candidate.id,
                job_id=candidate.job_id,
                run_id=run_id,
                full_name=candidate.full_name,
                email=candidate.email,
                phone=candidate.phone,
                location=candidate.location,
                years_experience_est=candidate.years_experience_est,
                skills_top_json=candidate.skills_top_json,
                total_score=score.total_score,
                breakdown_json=score.breakdown_json,
                decision=score.decision,
            )
        )

    pool_snapshot = run.candidate_pool_snapshot or {}
    criteria_snapshot = run.criteria_snapshot or {}
    provenance = {
        "job_id": run.job_id,
        "run_id": run.id,
        "included_candidate_count": pool_snapshot.get("total_count", len(items)),
        "included_batches": pool_snapshot.get("included_batch_ids", []),
        "criteria_version": criteria_snapshot.get("criteria_version", "none"),
        "scoring_config_version": run.scoring_config_version,
        "created_at": run.created_at.astimezone(UTC).isoformat(),
    }

    return RunResultsResponse(provenance=provenance, items=items)


async def _get_owned_run(run_id: int, current_user: User, db: AsyncSession) -> tuple[ShortlistRun, Project]:
    run_result = await db.execute(
        select(ShortlistRun, Project)
        .join(Project, Project.id == ShortlistRun.job_id)
        .where(ShortlistRun.id == run_id, Project.user_id == current_user.id)
    )
    row = run_result.first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run not found")
    return row


def _build_export_rows(scores_and_candidates: list[tuple[Score, Candidate]]) -> list[dict]:
    rows: list[dict] = []
    for score, candidate in scores_and_candidates:
        rows.append(
            {
                "candidate_id": candidate.id,
                "name": candidate.full_name,
                "email": candidate.email or "",
                "phone": candidate.phone or "",
                "location": candidate.location or "",
                "experience_years": candidate.years_experience_est if candidate.years_experience_est is not None else "",
                "score": score.total_score,
                "decision": score.decision,
            }
        )
    return rows


@router.get("/runs/{run_id}/export/status")
async def get_run_export_status(
    run_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Return export readiness for a run."""
    logger.info("get_run_export_status user_id=%s run_id=%s", current_user.id, run_id)
    run, _project = await _get_owned_run(run_id=run_id, current_user=current_user, db=db)
    if run.status != "completed":
        return {"csv_ready": False, "pdf_ready": False, "reason": "run_not_completed"}
    return {"csv_ready": True, "pdf_ready": True}


@router.get("/runs/{run_id}/export.csv")
async def export_run_csv(
    run_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Export run results as CSV bytes."""
    logger.info("export_run_csv user_id=%s run_id=%s", current_user.id, run_id)
    run, _project = await _get_owned_run(run_id=run_id, current_user=current_user, db=db)
    if run.status != "completed":
        return JSONResponse(status_code=409, content={"error": "run_not_completed"})

    try:
        rows_result = await db.execute(
            select(Score, Candidate)
            .join(Candidate, Candidate.id == Score.candidate_id)
            .where(Score.run_id == run_id)
            .order_by(Score.total_score.desc())
        )
        rows = _build_export_rows(list(rows_result.all()))

        buffer = StringIO()
        buffer.write("candidate_id,name,email,phone,location,experience_years,score,decision\n")
        for row in rows:
            buffer.write(
                f'{row["candidate_id"]},"{str(row["name"]).replace("\"", "\"\"")}","{str(row["email"]).replace("\"", "\"\"")}","{str(row["phone"]).replace("\"", "\"\"")}","{str(row["location"]).replace("\"", "\"\"")}",{row["experience_years"]},{row["score"]},{row["decision"]}\n'
            )

        return Response(
            content=buffer.getvalue(),
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="shortlist_run_{run_id}.csv"',
            },
        )
    except Exception as exc:
        logger.exception("CSV export failed run_id=%s error=%s", run_id, type(exc).__name__)
        return JSONResponse(
            status_code=500,
            content={"error": "export_failed", "message": "Unable to export CSV"},
        )


@router.get("/runs/{run_id}/report.pdf")
async def export_run_pdf(
    run_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Export run report as PDF bytes."""
    logger.info("export_run_pdf user_id=%s run_id=%s", current_user.id, run_id)
    run, project = await _get_owned_run(run_id=run_id, current_user=current_user, db=db)
    if run.status != "completed":
        return JSONResponse(status_code=409, content={"error": "run_not_completed"})

    try:
        rows_result = await db.execute(
            select(Score, Candidate)
            .join(Candidate, Candidate.id == Score.candidate_id)
            .where(Score.run_id == run_id)
            .order_by(Score.total_score.desc())
        )
        rows = _build_export_rows(list(rows_result.all()))

        stream = BytesIO()
        pdf = canvas.Canvas(stream, pagesize=A4)
        width, height = A4
        y = height - 50

        pdf.setFont("Helvetica-Bold", 14)
        pdf.drawString(40, y, f"CV Shortlister - Run Report #{run_id}")
        y -= 24
        pdf.setFont("Helvetica", 10)
        pdf.drawString(40, y, f"Job: {project.name} (#{project.id})")
        y -= 16
        pdf.drawString(40, y, f"Created: {run.created_at.astimezone(UTC).isoformat()}")
        y -= 16
        pdf.drawString(40, y, f"Scoring config: {run.scoring_config_version}")
        y -= 24

        pdf.setFont("Helvetica-Bold", 11)
        pdf.drawString(40, y, "Top candidates")
        y -= 16
        pdf.setFont("Helvetica", 9)

        criteria_snapshot = run.criteria_snapshot or {}
        criteria_value = str(criteria_snapshot.get("criteria", {}))[:220]
        pdf.drawString(40, y, f"Criteria snapshot: {criteria_value}")
        y -= 16

        for idx, row in enumerate(rows[:20], start=1):
            line = f'{idx}. {row["name"]} | score {row["score"]} | {row["decision"]} | {row["email"]}'
            pdf.drawString(40, y, line[:120])
            y -= 14
            if y < 60:
                pdf.showPage()
                y = height - 50
                pdf.setFont("Helvetica", 9)

        pdf.showPage()
        pdf.save()
        data = stream.getvalue()

        return Response(
            content=data,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="shortlist_report_run_{run_id}.pdf"',
            },
        )
    except Exception as exc:
        logger.exception("PDF export failed run_id=%s error=%s", run_id, type(exc).__name__)
        return JSONResponse(
            status_code=500,
            content={"error": "export_failed", "message": "Unable to export PDF"},
        )


@router.post("/projects/{project_id}/roles", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
async def upsert_project_role(
    project_id: int,
    role_data: RoleCriteriaIntake,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Role:
    """Create or update structured intake criteria for a project."""
    project_result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = project_result.scalar_one_or_none()

    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    existing_result = await db.execute(select(Role).where(Role.project_id == project_id))
    role = existing_result.scalar_one_or_none()

    if role is None:
        role = Role(
            project_id=project_id,
            role_title=role_data.role_title,
            criteria_json=role_data.model_dump(mode="json"),
        )
        db.add(role)
    else:
        role.role_title = role_data.role_title
        role.criteria_json = role_data.model_dump(mode="json")

    await db.commit()
    await db.refresh(role)
    return role


@router.get("/projects/{project_id}/roles", response_model=RoleResponse)
async def get_project_role(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Role:
    """Get structured intake role criteria for a project."""
    project_result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = project_result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    role_result = await db.execute(select(Role).where(Role.project_id == project_id))
    role = role_result.scalar_one_or_none()
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role criteria not found")

    return role


@router.post("/roles/suggest", response_model=RoleSuggestResponse)
async def suggest_role_criteria(
    payload: RoleSuggestRequest,
    current_user: User = Depends(get_current_user),
) -> RoleSuggestResponse:
    """Suggest criteria from JD (stub response for UI integration)."""
    _ = current_user
    return RoleSuggestResponse(suggestion=_suggest_defaults(payload))
