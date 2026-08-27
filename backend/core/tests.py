from unittest.mock import patch

from django.test import TestCase, override_settings

from core.models import (
    NotificationDispatchLog,
    NotificationPreference,
    NotificationRecipient,
)
from core.notifications.events import CRM_LEAD_CREATED, all_specs
from core.notifications.service import emit, subscribe_recipient


class NotificationEmailTests(TestCase):
    def setUp(self):
        self.primary = NotificationRecipient.objects.create(
            email="vitorkaviski@gmail.com",
            is_primary=True,
            is_active=True,
        )

    @override_settings(FRONTEND_ORIGIN="https://aragao.kaviskicorporation.com.br")
    @patch("core.notifications.mail.smtp_ready", return_value=True)
    @patch("core.notifications.mail.send_email", return_value="<mid>")
    def test_lead_aviso_vai_ao_principal_mesmo_com_matriz_obsoleta(
        self, send_email, _smtp
    ):
        NotificationPreference.objects.filter(event_type=CRM_LEAD_CREATED).update(
            email_recipient_ids=[99999],
            send_email=True,
        )
        with self.captureOnCommitCallbacks(execute=True):
            emit(
                CRM_LEAD_CREATED,
                payload={
                    "leadName": "Maria Teste",
                    "sender": "maria@teste.com",
                    "eventName": "Shows — Corporativo",
                    "recipient": "maria@teste.com",
                },
                link="/admin/crm?card=12",
            )
        send_email.assert_called_once()
        kwargs = send_email.call_args.kwargs
        self.assertEqual(kwargs["to"], "vitorkaviski@gmail.com")
        self.assertIn("Maria Teste", kwargs["body_text"])
        self.assertIn(
            "https://aragao.kaviskicorporation.com.br/admin/crm?card=12",
            kwargs["body_text"],
        )
        log = NotificationDispatchLog.objects.get(event_type=CRM_LEAD_CREATED)
        self.assertEqual(log.email_to, ["vitorkaviski@gmail.com"])
        self.assertTrue(log.email_sent)

    @patch("core.notifications.mail.smtp_ready", return_value=True)
    @patch("core.notifications.mail.send_email", return_value="<mid>")
    def test_matriz_vazia_cai_no_principal(self, send_email, _smtp):
        NotificationPreference.objects.filter(event_type=CRM_LEAD_CREATED).update(
            email_recipient_ids=[],
            send_email=False,
        )
        with self.captureOnCommitCallbacks(execute=True):
            emit(CRM_LEAD_CREATED, payload={"leadName": "João"}, link="/admin/crm")
        send_email.assert_called_once()
        self.assertEqual(send_email.call_args.kwargs["to"], "vitorkaviski@gmail.com")

    def test_subscribe_associa_a_todos_os_eventos(self):
        extra = NotificationRecipient.objects.create(
            email="equipe@teste.com",
            is_primary=False,
            is_active=True,
        )
        subscribe_recipient(extra.pk)
        prefs = NotificationPreference.objects.all()
        self.assertGreaterEqual(prefs.count(), len(all_specs()))
        for pref in prefs:
            self.assertIn(extra.pk, pref.email_recipient_ids)
            self.assertTrue(pref.send_email)

    def test_todos_os_templates_tem_link_de_acesso(self):
        for spec in all_specs():
            self.assertIn("link", spec.placeholders)
            self.assertIn("{{link}}", spec.default_body)
            self.assertTrue(spec.send_email)
