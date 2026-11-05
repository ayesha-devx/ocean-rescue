"""
Master API v1 Router.
"""

from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.health import router as health_router
from app.api.v1.reports import router as reports_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.detections import (
    router as detections_router,
    get_model_info,
    predict_image_endpoint,
)
from app.api.v1.environmental import router as environmental_router
from app.api.v1.forecasts import router as forecasts_router
from app.api.v1.missions import router as missions_router
from app.api.v1.risk import router as risk_router
from app.api.v1.routes import router as routes_router, gis_router

api_v1_router = APIRouter()

api_v1_router.include_router(auth_router)
api_v1_router.include_router(health_router)
api_v1_router.include_router(reports_router)
api_v1_router.include_router(dashboard_router)
api_v1_router.include_router(detections_router)
api_v1_router.include_router(environmental_router)
api_v1_router.include_router(forecasts_router)
api_v1_router.include_router(missions_router)
api_v1_router.include_router(routes_router)
api_v1_router.include_router(gis_router)
api_v1_router.include_router(risk_router)

# Direct v1 aliases matching frontend service endpoints
api_v1_router.add_api_route("/model-info", get_model_info, methods=["GET"], tags=["AI Detections"])
api_v1_router.add_api_route("/predict", predict_image_endpoint, methods=["POST"], tags=["AI Detections"])
