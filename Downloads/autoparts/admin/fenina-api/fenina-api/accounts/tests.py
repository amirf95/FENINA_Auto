from django.test import TestCase


class RootApiTests(TestCase):
    def test_root_endpoint_returns_json_for_api_clients(self):
        response = self.client.get("/", HTTP_ACCEPT="application/json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_root_endpoint_returns_html_for_browser_requests(self):
        response = self.client.get("/", HTTP_ACCEPT="text/html")

        self.assertEqual(response.status_code, 200)
        self.assertIn("text/html", response["Content-Type"])
        self.assertContains(response, "<html")
        self.assertContains(response, "Fenina API")
