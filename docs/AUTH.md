# Authentication troubleshooting & guidance 🔐

This file explains common causes of "No token provided" when creating/publishing blogs and steps to fix it.

## 1) Cookie vs Authorization header

- The server sets an HttpOnly cookie named `token` on login. HttpOnly cookies are not accessible to JS and are sent automatically by the browser **only when cookies are sent with the request**.
- If your frontend performs cross-origin requests (e.g. front at `http://localhost:3000`, API at `http://localhost:5000`), the browser will only send cookies if all of the following are true:
  - The server's CORS config permits the origin and `credentials: true` (server has this enabled by default).
  - The frontend sets `fetch(..., { credentials: 'include' })` or `axios.defaults.withCredentials = true`.
  - The cookie's SameSite/Secure attributes allow it to be sent in that context.

## 2) SameSite cookie pitfalls (common cause)

- By default in our code we set `sameSite: 'lax'` for the `token` cookie. Lax allows cookies on top-level GET navigations but will NOT send cookies on **cross-site POST requests** from SPA pages. That means a SPA doing a POST to `/api/blogs/create` may not include the cookie.
- To support cross-site POST requests, you typically need `SameSite=None; Secure`. Note: browsers require `Secure` when `SameSite=None`. This means in production you must use HTTPS for cross-site cookie auth.

### If your frontend is hosted at https://chronicle-flowgeg.vercel.app

- Set `FRONTEND_URL` (or `CORS_ORIGIN`) in your API `.env` to `https://chronicle-flowgeg.vercel.app` so the server's CORS config allows requests from that origin.
- In production set `NODE_ENV=production` (already required) and ensure cookies use `SameSite=None` and `Secure` so cross-site cookies can be sent. You can override via an env var:
   - `COOKIE_SAMESITE=None` (optional override)

Example `.env` additions:

```
FRONTEND_URL=https://chronicle-flowgeg.vercel.app
CORS_ORIGIN=https://chronicle-flowgeg.vercel.app
COOKIE_SAMESITE=None
NODE_ENV=production
```

Important notes:
- Vercel serves over HTTPS, so `Secure` cookies will work there. Browsers require `Secure` when `SameSite=None`.
- For local development you may prefer to use the token returned in the login response and set `Authorization: Bearer <token>` to avoid SameSite/HTTPS constraints.

Workarounds:
- Use Authorization header instead of cookie: after login we now return the token in the login response body (convenience) so the frontend can set `Authorization: Bearer <token>` on subsequent requests.
- For local dev, set up a proxy so frontend and backend share origin (e.g., Vite/webpack proxy to `http://localhost:5000`) and cookies will be same-site.

## 3) Quick checks to debug "No token provided"

1. Inspect the response to `POST /api/users/login` in browser DevTools:
   - Is the response `Set-Cookie: token=...` present?
   - If yes, check cookie attributes (SameSite, Secure, Domain).
2. Inspect the request to `POST /api/blogs/create` (or other protected route):
   - Is `Cookie: token=...` present in the request headers? If not, cookie was not sent.
3. If cookie isn't sent and you want a quick fix, use the token in response body and set an `Authorization: Bearer <token>` header for requests.

## 4) Code pointers
- Login sets cookie in `controllers/userController.js`.
- Auth middleware looks for cookie `req.cookies.token` or `Authorization` header bearer token in `middlewares/auth.js`.
- We've added a `/api/users/me` endpoint (protected) to confirm that cookie/header auth works: GET `/api/users/me`.

## 5) Recommended action steps
- Easiest local development approach: after login, read `data.token` from login response and set Authorization header on API requests.
- Production: prefer secure cookies with `SameSite=None; Secure` and ensure API and frontend are configured to use HTTPS and `credentials: include`.

### Example snippets for https://chronicle-flowgeg.vercel.app

- Using cookies (preferred for safety when properly configured):

   Fetch example (send cookies):

   ```js
   fetch('https://your-api.example.com/api/blogs/create', {
      method: 'POST',
      credentials: 'include', // must include cookies
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'My Post', content: '...' }),
   });
   ```

   Axios example (send cookies):

   ```js
   axios.post('https://your-api.example.com/api/blogs/create', postData, { withCredentials: true });
   ```

- Using Authorization header (works anywhere and avoids SameSite issues):

   ```js
   // After login save token from response.data.token
   axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
   axios.post('https://your-api.example.com/api/blogs/create', postData);
   ```

---
If you'd like, I can add an example fetch/axios snippet for your frontend or add a Vite proxy configuration example to this repository. ✅
