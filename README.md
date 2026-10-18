# Practical 13: AI API Integration into a Web Application

**Course**: Advanced Web Development Frameworks (ITUE301)  
**Department**: CSE - CSPIT, CHARUSAT  
**Semester**: 5th  

---

## 📌 Objective
To securely integrate a third-party Generative AI API (OpenAI / Gemini) into a full-stack Task Management application from a Node/Express backend, implement **graceful degradation** when the external dependency fails, enforce **server-side rate limiting**, and practice **Responsible AI governance**.

---

## 🏗️ Architecture & Security Flow Diagram

```text
React / Web Frontend
       │
       ▼ (User clicks "Generate with AI" - sends only the task title)
Express Backend POST /api/ai/generate-description
       │
       ├── Rate Limiter Check (Max 5 req/min per client)
       ├── API Key safely stored in backend .env (NEVER exposed to frontend!)
       │
       ▼
Third-Party AI Service (OpenAI / Gemini)
       │
   ┌───┴───────────────────────────────────────────┐
   ▼                                               ▼
[SUCCESS (200)]                             [FAILURE / TIMEOUT / INVALID KEY]
Parse response & extract description         Catch error in try/catch block
   │                                               │
   │                                               ▼ (Graceful Degradation)
   │                                        Generate template suggestion
   │                                        without crashing application
   └───────────────────────┬───────────────────────┘
                           │
                           ▼
Send clean JSON to Frontend: { description, priority, fallback: boolean }
                           │
                           ▼
Frontend UI renders editable suggestion in textarea with Responsible AI Disclaimer!
```

---

## 💡 Key Features Implemented

1. **Secure Server-Side API Key Storage**:
   - `GEMINI_API_KEY` (primary provider) and `OPENAI_API_KEY` (optional secondary provider) are loaded exclusively inside [routes/aiRoutes.js](file:///d:/REACT-AWDF/prac13/routes/aiRoutes.js) via `process.env`.
   - The keys are **never** embedded in client bundles or transmitted over browser network requests.

2. **Graceful Degradation on API Failure (Steps 3 & 6)**:
   - If the AI API returns `401 Unauthorized` (invalid/expired key), `429 Too Many Requests` (quota exhausted), or times out, the `try/catch` block prevents the server from crashing.
   - Generates an intelligent template suggestion and returns HTTP `200` with `fallback: true`.
   - The user can still proceed with their task management workflow unimpeded.

3. **Editable Suggestion ("Human in the Loop" - Step 5)**:
   - The returned text is populated into an editable textarea. The student has complete control to modify, accept, or reject the AI-generated text.

4. **Supplementary Problem 1: Frontend Loading State**:
   - Shows an animated spinner and disables the generate button while the network request is in flight.

5. **Supplementary Problem 2: Server-Side Rate Limiter**:
   - Implemented in [middleware/rateLimiter.js](file:///d:/REACT-AWDF/prac13/middleware/rateLimiter.js) (sliding window of 60 seconds, max 5 requests per IP) to prevent accidental quota exhaustion or denial-of-service.

6. **Supplementary Problem 3: Responsible AI Disclaimer**:
   - Displays a clear visual banner:  
     `⚠️ AI Disclaimer: The description below is an AI-generated suggestion. Please review and edit before saving.`

---

## 🧠 Key Viva Questions & Responsible AI Analysis

### Q1: Why must the AI API key be called from the backend rather than directly from the React frontend?
> **Answer**:  
> Any code running in the browser (HTML, JavaScript, React components, Network tab) is completely public and accessible to anyone via Chrome DevTools (`F12`). If an API key is stored in frontend code, malicious users can extract it in seconds and drain the owner's billing quota or perform unauthorized API operations.  
> Keeping the key in the backend (`.env`) ensures it never leaves the server's secure execution environment. The client only interacts with our authorized Express endpoints.

### Q2: What does 'graceful degradation' mean in this context, and why does it matter for a feature that depends on a third-party service outside your control?
> **Answer**:  
> **Graceful degradation** is an architectural pattern where an application continues to function in a limited or fallback capacity when an external component fails, rather than completely crashing or freezing the UI.  
> Third-party AI services are subject to outages, latency spikes, rate limits, and billing quotas. Without graceful degradation (e.g. try/catch fallback), an OpenAI outage would completely break the task creation workflow for all users. With graceful degradation, the app seamlessly provides template suggestions and allows manual task entry.

### Q3: What are the privacy and governance implications of sending task data to an external AI API, and what kind of data should never be sent this way?
> **Answer**:  
> When sending data to commercial AI APIs, prompts may be logged, monitored, or processed on external cloud infrastructure.  
> **Data that should NEVER be sent to third-party AI APIs**:
> 1. **Personally Identifiable Information (PII)**: Social Security numbers, phone numbers, home addresses, government IDs.
> 2. **Authentication Secrets**: Passwords, API tokens, cryptographic private keys, session cookies.
> 3. **Proprietary & Protected Data**: Protected Health Information (PHI/HIPAA), confidential client financial data, unreleased intellectual property.

---

## 🚀 Steps to Run

Follow these commands in your terminal to set up, run, and test Practical 13:

### 1. Ensure MongoDB Daemon is Running
```bash
mongod
```
* MongoDB connection string defaults to `mongodb://127.0.0.1:27017/taskdb`

### 2. Configure Environment Variables (Required for Live Gemini API)
Create or verify `.env` in `prac13/`:
```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash

# Optional secondary provider (used only if GEMINI_API_KEY is unset)
OPENAI_API_KEY=your_openai_api_key_here

AI_TIMEOUT_MS=15000
```
*(If no API key is provided, the backend automatically uses its realistic intelligent heuristic mock engine with 0 downtime!)*

### 3. Navigate to Practical Directory
```bash
cd prac13
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Start the Application Server
```bash
npm start
```
* Server starts on: `http://localhost:5000`
* Console confirms:
  ```text
  MongoDB connected successfully
  Server running at http://localhost:5000
  AI Service initialized with timeout: 8000ms
  ```

### 6. Access Interactive Task Management UI
* Open `http://localhost:5000` in your web browser.

---

## 📸 Step-by-Step Guide for Each Lab Report Screenshot

Follow these exact steps to generate and capture all required screenshots for your Practical 13 lab submission report:

---

### Screenshot 1: Server Startup & AI Route Initialization
* **Objective / Lab Step**: Demonstrate that the Express server initializes with backend API security, rate limiting, and route mounting.
* **Exact Steps to Perform**:
  1. Open terminal in `prac13`:
     ```powershell
     cd d:\REACT-AWDF\prac13
     npm start
     ```
* **What to Capture**:
  - Terminal window showing:
    ```text
    ✓ Practical 13 Backend running on port 5000
    ✓ AI Route mounted at /api/ai
    ✓ Rate limiting enabled (5 req/min)
    ```

---

### Screenshot 2: Successful AI Suggestion Generation in Browser (Happy Path)
* **Objective / Lab Step**: Demonstrate that the user can request an AI description for a task title and review the editable suggestion.
* **Exact Steps to Perform**:
  1. Open your web browser at:
     ```text
     http://localhost:5000
     ```
  2. In the **Task Title** input field, type:
     ```text
     Implement CI/CD pipeline in GitHub
     ```
  3. Click the purple button: **`✨ Generate with AI`**.
  4. Wait ~1 second for the AI engine to generate the text.
* **What to Capture**:
  - Full browser window showing:
    - The populated **Task Description** textarea with editable suggested text.
    - The **Priority** automatically set (e.g. `High` or `Medium`).
    - The yellow **⚠️ AI Disclaimer** banner (*"The description below is an AI-generated suggestion. Please review and edit before saving."*).

---

### Screenshot 3: API Request in Postman / Thunder Client (HTTP 200 OK)
* **Objective / Lab Step**: Demonstrate backend API integration and JSON schema response with AI metadata flags.
* **Exact Steps to Perform**:
  1. In VS Code, open the **Thunder Client** extension (or open **Postman**).
  2. Set the HTTP Method to: **`POST`**
  3. Enter the URL:
     ```text
     http://localhost:5000/api/ai/suggest
     ```
     *(or `http://localhost:5000/api/ai/generate-description`)*
  4. Under the **Headers** tab, ensure `Content-Type: application/json` is set.
  5. Under the **Body** tab &rarr; select **raw** &rarr; select **JSON**, and paste:
     ```json
     {
       "title": "Database indexing"
     }
     ```
  6. Click the blue **Send** button.
* **What to Capture**:
  - Postman / Thunder Client screen showing:
    - **Status: 200 OK**
    - Response JSON body:
      ```json
      {
        "success": true,
        "fallback": false,
        "isAiGenerated": true,
        "source": "intelligent-heuristic-engine",
        "message": "AI suggestion generated successfully.",
        "description": "Design efficient indexes and optimize execution plans for \"Database indexing\" to enhance query throughput and prevent table scans.",
        "priority": "high",
        "days": 1
      }
      ```

---

### Screenshot 4: Graceful Degradation on API Failure (Step 6 Proof)
* **Objective / Lab Step**: Step 6 from syllabus — Intentionally simulate a third-party AI failure (401 Unauthorized / timeout) and prove the system degrades gracefully with template suggestions without crashing.
* **Exact Steps to Perform**:
  1. In the browser UI at `http://localhost:5000`:
  2. Enter any task title, e.g.:
     ```text
     Refactor user authentication service
     ```
  3. Check the checkbox:
     `☑ Simulate AI API Failure (Tests Graceful Degradation)`
  4. Click the purple button: **`✨ Generate with AI`**.
* **What to Capture**:
  - Browser window displaying:
    - The toast notification:
      `AI API offline or failed. Graceful degradation served a template suggestion.`
    - The fallback disclaimer badge:
      `Mode: Graceful Degradation (Third-party AI API failed...)`
    - The fallback description safely populated in the textarea without server crashes.

---

### Screenshot 5: Task Persisted with AI-Assisted Metadata Badge
* **Objective / Lab Step**: Demonstrate Human-in-the-Loop completion — the user accepts or modifies the suggestion and creates the task with AI metadata.
* **Exact Steps to Perform**:
  1. In the browser UI at `http://localhost:5000`:
  2. After generating a description, click the blue **Create Task** button.
  3. The task is saved and added to the Task List on the right side.
* **What to Capture**:
  - The **📋 Task List** card showing the newly added task with its distinct purple **`✨ AI-Assisted`** badge next to the title.

---

### Screenshot 6: Responsible AI Architecture Documentation
* **Objective / Lab Step**: Document security posture, privacy rules, and responsible AI guardrails.
* **Exact Steps to Perform**:
  1. In the browser UI or in VS Code, view the **Security & Responsible AI Architecture** section.
* **What to Capture**:
  - The card highlighting:
    - **Server-Side Secret**: API keys stored in `.env` exclusively on backend.
    - **Graceful Degradation**: Try/catch error protection against third-party outages.
    - **Rate Limiting**: Sliding window of max 5 requests per minute per IP.
    - **Human in the Loop**: AI outputs presented as editable suggestions with clear disclaimers.


