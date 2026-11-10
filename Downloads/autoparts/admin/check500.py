import urllib.request, re, sys

TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzgxOTgxMjA4LCJpYXQiOjE3ODE5NTI0MDgsImp0aSI6ImQyMzc5OWVmMWFlNjQ2YWM4ZjE1OGNiN2U5ZDlkYmI1IiwidXNlcl9pZCI6IjEiLCJyb2xlIjoib3duZXIiLCJuYW1lIjoiQW1pciBGZW5pbmEifQ.18AC1lKW5QWxFsO5fDPZPzq73_KAumViXG26xqjbmDw"

for url in ["/api/invoices/", "/api/clients/", "/api/dashboard/"]:
    req = urllib.request.Request(f"http://localhost:8000{url}")
    req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("Accept", "text/html")
    try:
        resp = urllib.request.urlopen(req)
        print(f"[200] {url}")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"[{e.code}] {url} — len={len(body)}")
        # Extract exception info
        for pat in [
            r'Exception Type.*?<td[^>]*>(.*?)</td>',
            r'Exception Value.*?<td[^>]*>(.*?)</td>',
        ]:
            m = re.search(pat, body, re.DOTALL)
            if m:
                text = re.sub(r'<[^>]+>', '', m.group(1)).strip()
                print(f"  {text}")
        # Find traceback
        start = body.find("Traceback")
        if start >= 0:
            print(body[start:start+2500])
    except Exception as e:
        print(f"[CONN ERR] {url}: {e}")
