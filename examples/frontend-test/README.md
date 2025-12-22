# Frontend Test Page

This folder contains a small static test page that demonstrates how to:

- Login and receive a JWT token and a HttpOnly cookie from the backend
- Make cookie-based requests with `fetch(..., { credentials: 'include' })`
- Make header-based requests using `Authorization: Bearer <token>`
- Subscribe to Server-Sent Events (SSE) at `/api/events/stream`

Files
- `index.html` — interactive UI to run the tests

How to use

1. Set the API base URL at the top of the test page (default: `http://localhost:5000`).
2. Open the `index.html` in a browser. For full functionality (cookies + CORS) you should serve the page from a local static server so that the browser treats it like an origin (e.g. `http://localhost:8000`).

Start a simple static server in the repo root (recommended):

```bash
# Using Python
cd examples/frontend-test
python3 -m http.server 8000
# or using npx http-server (install if needed)
# npx http-server -p 8000
```

Then open `http://localhost:8000` and use the UI.

Notes and tips
- Cookie-based flows require the server to set a cookie and for your frontend to send credentials: `fetch(..., { credentials: 'include' })` or `axios(..., { withCredentials: true })`.
- If you use the Authorization header approach, copy the token from the login response into the Token box and use header-based buttons.
- SSE (`EventSource`) may not send cookies in some browsers when connecting cross-origin. If you rely on SSE and cookies, consider a short-lived token passed in the SSE URL query string, or a WebSocket fallback.

Example quick commands

- Login and save cookie via curl:

```bash
curl -c cookiejar.txt -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser+local@example.com","password":"Password123"}' -o /tmp/login.json
```

- Use token from `/tmp/login.json` for header-based requests

```bash
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/login.json'))['data']['token'])")
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/users/me
```

If you want, I can add a tiny React version of this test page as well.
