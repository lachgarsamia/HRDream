"""Projects and role intake API routes."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.project import Project
from app.models.role import Role
from app.models.user import User
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

router = APIRouter(tags=["Projects"])


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
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
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


@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Project:
    """Create a new project."""
    project = Project(
        user_id=current_user.id,
        name=project_data.name,
        description=project_data.description,
    )

    db.add(project)
    await db.commit()
    await db.refresh(project)

    return project


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Project:
    """Get a specific project by ID scoped to current user."""
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    return project


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Project:
    """Update an existing project."""
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    update_data = project_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    await db.commit()
    await db.refresh(project)

    return project


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a project and associated data."""
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    await db.delete(project)
    await db.commit()


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
