from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from accounts.views import (
    ChangePasswordView,
    LoginView,
    LogoutView,
    MeView,
    RefreshView,
    UserViewSet,
)
from core.notifications.api import (
    NotificationPreferenceBulkView,
    NotificationRecipientViewSet,
    NotificationSettingsView,
    NotificationTemplateView,
)
from core.views import (
    AuditLogViewSet,
    DashboardPDFView,
    DashboardView,
    DemoDataView,
    EmailSettingsClearView,
    EmailSettingsView,
    EventExportView,
    FaqItemViewSet,
    LeadExportView,
    NotificationViewSet,
    SiteConfigView,
    SponsorViewSet,
    TimelineView,
)
from crm.views import (
    CardAttachmentViewSet,
    CardChecklistItemViewSet,
    CardCommentViewSet,
    CardNoteViewSet,
    CardViewSet,
    KanbanColumnViewSet,
    LabelViewSet,
    LeadViewSet,
    PublicLeadView,
)
from events.views import (
    EventImageViewSet,
    EventTemplateViewSet,
    EventViewSet,
    PublicEventViewSet,
)

# trailing_slash="" so Next.js proxy (which strips "/") still matches.
router = DefaultRouter(trailing_slash=False)
router.register("events", EventViewSet, basename="event")
router.register("event-images", EventImageViewSet, basename="event-image")
router.register("event-templates", EventTemplateViewSet, basename="event-template")
router.register("leads", LeadViewSet, basename="lead")
router.register("columns", KanbanColumnViewSet, basename="column")
router.register("cards", CardViewSet, basename="card")
router.register("labels", LabelViewSet, basename="label")
router.register("checklist-items", CardChecklistItemViewSet, basename="checklist-item")
router.register("card-notes", CardNoteViewSet, basename="card-note")
router.register("card-comments", CardCommentViewSet, basename="card-comment")
router.register("attachments", CardAttachmentViewSet, basename="attachment")
router.register("users", UserViewSet, basename="user")
router.register("audit-logs", AuditLogViewSet, basename="audit-log")
router.register("notifications", NotificationViewSet, basename="notification")
router.register("sponsors", SponsorViewSet, basename="sponsor")
router.register("faqs", FaqItemViewSet, basename="faq")
router.register(
    "notification-recipients",
    NotificationRecipientViewSet,
    basename="notification-recipient",
)

public_router = DefaultRouter(trailing_slash=False)
public_router.register("events", PublicEventViewSet, basename="public-event")

urlpatterns = [
    path("django-admin/", admin.site.urls),
    # Auth (com e sem barra — proxy do Next às vezes manda uma ou outra)
    path("api/auth/login", LoginView.as_view()),
    path("api/auth/login/", LoginView.as_view()),
    path("api/auth/logout", LogoutView.as_view()),
    path("api/auth/logout/", LogoutView.as_view()),
    path("api/auth/refresh", RefreshView.as_view()),
    path("api/auth/refresh/", RefreshView.as_view()),
    path("api/auth/me", MeView.as_view()),
    path("api/auth/me/", MeView.as_view()),
    path("api/auth/change-password", ChangePasswordView.as_view()),
    path("api/auth/change-password/", ChangePasswordView.as_view()),
    # Dashboard / reports
    path("api/dashboard", DashboardView.as_view()),
    path("api/dashboard/", DashboardView.as_view()),
    path("api/dashboard/timeline", TimelineView.as_view()),
    path("api/dashboard/timeline/", TimelineView.as_view()),
    path("api/dashboard/export-pdf", DashboardPDFView.as_view()),
    path("api/dashboard/export-pdf/", DashboardPDFView.as_view()),
    path("api/dashboard/demo", DemoDataView.as_view()),
    path("api/dashboard/demo/", DemoDataView.as_view()),
    path("api/exports/leads", LeadExportView.as_view()),
    path("api/exports/events", EventExportView.as_view()),
    # Site config (GET público, PUT admin)
    path("api/site-config", SiteConfigView.as_view()),
    path("api/site-config/", SiteConfigView.as_view()),
    path("api/email-settings", EmailSettingsView.as_view()),
    path("api/email-settings/", EmailSettingsView.as_view()),
    path("api/email-settings/clear", EmailSettingsClearView.as_view()),
    path("api/email-settings/clear/", EmailSettingsClearView.as_view()),
    path("api/notification-settings", NotificationSettingsView.as_view()),
    path("api/notification-settings/", NotificationSettingsView.as_view()),
    path("api/notification-settings/preferences", NotificationPreferenceBulkView.as_view()),
    path("api/notification-settings/preferences/", NotificationPreferenceBulkView.as_view()),
    path("api/notification-settings/templates", NotificationTemplateView.as_view()),
    path("api/notification-settings/templates/", NotificationTemplateView.as_view()),
    # Public
    path("api/public/leads", PublicLeadView.as_view({"post": "create"})),
    path("api/public/leads/", PublicLeadView.as_view({"post": "create"})),
    path("api/public/", include(public_router.urls)),
    # Admin API
    path("api/", include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
