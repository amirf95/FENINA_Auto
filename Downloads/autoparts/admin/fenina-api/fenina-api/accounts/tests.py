from django.test import TestCase


class RootApiTests(TestCase):
    def test_root_endpoint_returns_ok_response(self):
        response = self.client.get("/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")
