# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key.
   Also configure `VITE_API_BASE_URL` with the base URL of your deployed Cloud Functions (e.g., `https://us-central1-your-project.cloudfunctions.net`).
3. Run the app:
   `npm run dev`
