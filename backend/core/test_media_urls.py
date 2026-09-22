from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import RequestFactory, TestCase, override_settings
from PIL import Image
from io import BytesIO

from core.media_urls import absolute_media_url, public_base_url
from core.models import SiteConfig, Sponsor
from core.serializers import SiteConfigSerializer, SponsorSerializer
from events.models import Event, EventImage
from events.serializers import EventSerializer, PublicEventSerializer


def _png(name="x.png"):
    buf = BytesIO()
    Image.new("RGB", (8, 8), color=(20, 20, 20)).save(buf, format="PNG")
    return SimpleUploadedFile(name, buf.getvalue(), content_type="image/png")


@override_settings(
    PUBLIC_BASE_URL="https://orafaelaragao.com.br",
    FRONTEND_ORIGIN="https://orafaelaragao.com.br",
)
class PublicMediaUrlTests(TestCase):
    def setUp(self):
        self.rf = RequestFactory()

    def _ctx(self, host="backend:8000"):
        request = self.rf.get("/api/site-config", HTTP_HOST=host)
        return {"request": request}

    def test_public_base_ignores_docker_host(self):
        request = self.rf.get("/", HTTP_HOST="backend:8000")
        self.assertEqual(
            public_base_url(request),
            "https://orafaelaragao.com.br",
        )

    def test_absolute_media_rewrites_internal_host(self):
        request = self.rf.get("/", HTTP_HOST="backend:8000")
        url = absolute_media_url(
            request, "https://backend:8000/media/site/hero.png"
        )
        self.assertEqual(
            url,
            "https://orafaelaragao.com.br/media/site/hero.png",
        )

    def test_site_config_images_use_public_origin(self):
        cfg, _ = SiteConfig.objects.get_or_create(pk=1)
        cfg.hero_image = _png("hero.png")
        cfg.about_image = _png("about.png")
        cfg.contact_bg_image = _png("contact.png")
        cfg.og_image = _png("og.png")
        cfg.save()

        data = SiteConfigSerializer(cfg, context=self._ctx()).data
        for key in (
            "hero_image",
            "hero_image_display",
            "about_image",
            "about_image_display",
            "contact_bg_image",
            "contact_bg_image_display",
            "og_image",
            "og_image_display",
        ):
            value = data.get(key) or ""
            self.assertTrue(value, msg=f"{key} vazio")
            self.assertNotIn("backend", value)
            self.assertTrue(
                value.startswith(
                    "https://orafaelaragao.com.br/media/"
                ),
                msg=f"{key}={value}",
            )

    def test_sponsor_and_event_images_use_public_origin(self):
        sponsor = Sponsor.objects.create(
            name="Logo", image=_png("logo.png"), order=0, is_active=True
        )
        event = Event.objects.create(
            name="Show",
            date="2026-12-01",
            city="Curitiba",
            state="PR",
            venue="Teatro",
            banner=_png("banner.png"),
            card_bg_image=_png("card.png"),
            status=Event.Status.PUBLICADO,
        )
        EventImage.objects.create(
            event=event, image=_png("gal.png"), order=0
        )

        sponsor_data = SponsorSerializer(sponsor, context=self._ctx()).data
        event_data = EventSerializer(event, context=self._ctx()).data
        public_data = PublicEventSerializer(event, context=self._ctx()).data

        for value in (
            sponsor_data["image"],
            sponsor_data["image_display"],
            event_data["banner"],
            event_data["banner_display"],
            event_data["card_bg_image"],
            event_data["card_bg_image_display"],
            public_data["banner_display"],
            public_data["card_bg_image_display"],
            public_data["gallery"][0]["image"],
            public_data["gallery"][0]["image_display"],
        ):
            self.assertTrue(value)
            self.assertNotIn("backend", value)
            self.assertTrue(
                value.startswith(
                    "https://orafaelaragao.com.br/media/"
                ),
                msg=value,
            )
