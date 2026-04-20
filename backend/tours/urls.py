from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VisitViewSet, ObservationViewSet, ActionItemViewSet, AttachmentViewSet, ParticipantViewSet


router = DefaultRouter()
router.register(r"visits", VisitViewSet, basename="visit")
router.register(r"observations", ObservationViewSet, basename="observation")
router.register(r"actions", ActionItemViewSet, basename="action")
router.register(r"attachments", AttachmentViewSet, basename="attachment")
router.register(r"participants", ParticipantViewSet, basename="participant")

from .views import VisitStatsView, ActionStatsView

urlpatterns = [
    path("visits/stats/", VisitStatsView.as_view(), name="visit-stats"),
    path("actions/stats/", ActionStatsView.as_view(), name="action-stats"),
    path("", include(router.urls)),
]
