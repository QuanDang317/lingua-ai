from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.dashboard import DashboardOverviewResponse
from app.services.dashboard_service import get_dashboard_overview

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/overview", response_model=DashboardOverviewResponse)
async def dashboard_overview_endpoint(
    lang: str | None = Query(default=None, pattern="^(en|zh)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardOverviewResponse:
    """Return complete real-time Dashboard data for the active or requested language."""
    return await get_dashboard_overview(db=db, user=current_user, lang_override=lang)
