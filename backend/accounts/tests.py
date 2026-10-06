from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

User = get_user_model()


class LoginTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="comercial1",
            email="Comercial1@Exemplo.com",
            password="SenhaForte123!",
        )

    def test_login_by_username(self):
        res = self.client.post(
            "/api/auth/login/",
            {"username": "comercial1", "password": "SenhaForte123!"},
        )
        self.assertEqual(res.status_code, 200)

    def test_login_by_email_case_insensitive(self):
        res = self.client.post(
            "/api/auth/login/",
            {"username": "comercial1@exemplo.com", "password": "SenhaForte123!"},
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["username"], "comercial1")

    def test_login_by_email_wrong_password(self):
        res = self.client.post(
            "/api/auth/login/",
            {"username": "comercial1@exemplo.com", "password": "errada"},
        )
        self.assertEqual(res.status_code, 401)
