# Legal Metrology Label Verifier

A prototype packaged-label compliance checker built as a single Next.js app for local use and Vercel deployment.

The app accepts a label image, sends it to Gemini for OCR and field extraction, runs a built-in Legal Metrology rule engine, and returns a report that shows:

- extracted label fields
- rules followed
- rules not followed
- warnings and manual-review items
- raw OCR text for inspection

## What This Version Does

- Uses one Next.js app at the repository root
- Uses a server-side Gemini API call for OCR and field extraction
- Runs the compliance rule engine in JavaScript
- Returns a plain compliance report with rule-by-rule results
- Skips Firebase, login, stored history, and dashboards for prototype simplicity

## Project Structure

```text
app/
  api/check-compliance/route.js   Server-side scan endpoint
  globals.css                     Global styles
  layout.jsx                      App shell
  page.jsx                        Main upload page

components/
  label-scanner.jsx               Upload and scan UI
  report-view.jsx                 Compliance result UI

data/
  legal-metrology-rules.json      Data-driven ruleset

lib/
  compliance.js                   End-to-end scan flow
  gemini.js                       Gemini OCR and field extraction
  rule-engine.js                  Rule evaluation
  unit-normalize.js               Unit normalization
```

## Requirements

- Node.js 18+ recommended
- A valid Gemini API key

## Environment Variables

Create a local `.env.local` file in the repository root:

```bash
GEMINI_API_KEY=your_actual_gemini_key
GEMINI_MODEL=gemini-1.5-flash
```

Optional:

```bash
GEMINI_API_KEYS=key_one,key_two
```

Use the fallback list only if you control and are allowed to use each key.

## Run Locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Production Build Check

Run:

```bash
npm run build
```

This was verified successfully in the local workspace on August 31, 2026.

## Deploy To Vercel

### Dashboard Flow

1. Push this repository to GitHub.
2. Open [Vercel](https://vercel.com/new).
3. Import the repository.
4. Let Vercel detect `Next.js`.
5. Set the root directory to the repository root if prompted.
6. Add environment variables:
   - `GEMINI_API_KEY`
   - optional `GEMINI_MODEL`
   - optional `GEMINI_API_KEYS`
7. Click Deploy.

### CLI Flow

```bash
npm i -g vercel
vercel
vercel --prod
```

## How The App Works

1. The user uploads a product label image.
2. The app sends that image to `/api/check-compliance`.
3. The API route sends the image to Gemini.
4. Gemini returns extracted declarations and raw OCR text.
5. The rule engine checks the extracted data against the rules JSON.
6. The UI renders the final compliance report.

## Current Prototype Boundaries

- No authentication
- No stored scan history
- No Firebase
- No Python service
- No Tesseract
- No PDF export

This keeps the prototype focused on the core demonstration flow: label image to compliance result.

## Likely Next Improvements

- Tweak rule engine behavior for edge cases
- Improve Gemini prompt quality for dense labels
- Add better error states for quota and malformed images
- Add deployment domain and branding polish

## Notes

- `GEMINI_API_KEY` is server-side only and should not be exposed as a public browser variable.
- `.env.local` should stay uncommitted.
