# F.A.R.M.E.R. Frontend

Futuristic Agriculture & Resource Management Ecosystem Router frontend application built using **React**, **Vite**, **TypeScript**, and **Tailwind CSS v4**.

## Local Setup

### 1. Install Dependencies
Navigate to the frontend directory and install the packages:
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root of the `frontend/` directory (already gitignored via `.gitignore`'s `*.local` rule):
```env
VITE_API_BASE_URL=http://localhost:3001
```
*(Ensure the port matches the backend service port, which defaults to `3001`)*

### 3. Run Development Server
Start the local Vite dev server:
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Security Audit Notes (CIA Triad Alignment)

This frontend is designed as a secure gateway for smallholder farmers. The following security guidelines are implemented:

### 1. Confidentiality (Data & Reasoning Separation)
- **No Embedded Credentials**: No API keys, passwords, or LLM credentials are included in the frontend source code or static assets. All external service communication (Gemini, Groq, MongoDB) is managed by the backend.
- **Production Logging Protection**: Request and response payloads are kept out of production console logs. Console logging is gated behind `import.meta.env.DEV` guards in `App.tsx`.
- **Reasoning Obfuscation**: The step-by-step agent routing trace (`trace` array) is collapsed by default inside `TraceList.tsx` to maintain screen confidentiality for the farmer.

### 2. Integrity (Payload Validation & Injection Defense)
- **Client-Side Restrictions**: The crop image upload accepts only `image/jpeg` and `image/png` (validated by file-system type headers) and rejects files exceeding `8MB` in `UploadCard.tsx`.
- **Strict Typing**: Strict TypeScript interfaces are declared in `types.ts` matching the backend model structures, avoiding the use of `any` types.
- **Injection Mitigation**: All backend-returned AI answers are rendered via safe React text interpolation (`{answer}`) instead of `dangerouslySetInnerHTML` to prevent cross-site scripting (XSS).
- **Static Execution**: No dynamic evaluations (`eval()`, `new Function()`, or dynamic script injection) are present in the frontend.

### 3. Availability (Graceful Degradation & Timeout Defense)
- **Request Timeout**: All server calls in `lib/api.ts` use an `AbortController` configured to abort the request after 20 seconds, preventing long-running requests from locking the user interface.
- **Submit Throttling**: The "Ask F.A.R.M.E.R." button is disabled while requests are in flight or when both inputs (text and image file) are empty, avoiding duplicate submissions.
- **Graceful Health Checks**: System routing status badges degrade gracefully. MongoDB logging failures do not block query submission, allowing the farmer to request diagnoses and routing advice under all system states.
