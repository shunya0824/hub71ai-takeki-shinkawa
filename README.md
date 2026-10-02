# DiveAbuDhabi

An Abu Dhabi relocation planning app built with Next.js App Router and TypeScript. The English interface supports three routes: employment, starting a business, and moving as an individual or family. Plans support employer sponsorship, self-sponsorship, and undecided sponsorship.

## Getting started

Requires Node.js 20.9 or later.

```sh
npm install
npm run dev
```

Open the [local app](http://127.0.0.1:3000), choose a route, add yourself and any family members, complete the consultation, and create your plan. You can defer questions and answer them later.

## Passport OCR

Tesseract.js and machine-readable zone (MRZ) parsing run in the browser. No API key is required, and photos are not sent to external APIs. The OCR engine and English recognition model are served by the app itself.

Select a photo, scan it, review the name, nationality, date of birth, and expiry date, then confirm. Results populate editable fields so you can correct errors or fill in missing values. Nationality is read from the MRZ and the photo's Nationality field, then selected in a country dropdown. You can choose another country if needed. Passport numbers are neither requested nor stored. Photos are discarded after scanning.

Tilted, reflective, or blurry photos may produce partial results. MRZ dates are checked against their check digits; values that fail validation are left for manual correction. Uploaded passport photos are not included in Git or automated test fixtures.

`npm install`, `npm run dev`, and `npm run build` prepare the OCR runtime files in `public/ocr/`. Model sources and licensing are documented in [public/ocr/README.md](public/ocr/README.md).

## AI guide

Set your key in `.env.local` and restart the development server. This file is excluded from Git.

```dotenv
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
```

The OpenAI Responses API uses structured outputs for consultations, plan descriptions, answers, and interpreting requested changes. Without a key, rule-based consultations and plan generation still work, along with answers from knowledge notes retrieved through the app's API. Failed API requests can be retried from the interface.

The key is used only on the server. Requests set `store: false` and exclude passport photos and numbers. Relevant knowledge notes are retrieved from `knowledge/sources.json` and `knowledge/Abu-Dhabi-Relocation-Agent-Knowledge-ja.md`. The Markdown body is in English; see its `information_as_of` date. It is a project-provided reference, not a guarantee of current rules or fees. The AI guide always replies in English. Source references are retained internally while the interface presents concise answers.

## Implemented features

- Plans for all three routes and sponsorship options, including founders moving with family and children who need schools
- Adding, editing, and removing people; browser-based passport OCR with editable results
- Consultations that ask for missing information, allow deferred answers, and support saving and resuming
- A vertical timeline with expandable documents, owners, and costs
- A guide on the same page for knowledge questions and changes to delays, arrival dates, budgets, housing, and schools
- Change previews and application, preserved completion status and task IDs, and rejection of stale proposals
- Plan updates after changes to people or routes
- Housing and utility allocations based on the monthly budget, separate moving and monthly costs, and target payment dates. Totals, breakdowns, task details, and guide answers use single amounts without ranges or counts of unpriced items
- An orange theme, a wordmark, large typography, and mobile layouts

Planning amounts use the midpoint of existing ranges, rounded to the nearest AED. Totals sum the displayed item amounts. Unpriced items are omitted from cost fields and breakdowns, including in saved plans. Housing and utility amounts are allocations from the entered budget rather than market quotes or official fees. Dates are preparation targets.

Voice, sharing, cross-device sync, production deployment, and more detailed eligibility and fee data are planned for later. Testing the live OpenAI integration requires a valid API key.

## Storage and deletion

Confirmed member details, profiles, conversations, plans, progress, and change history are stored in the same browser's localStorage. Photos and passport numbers are not stored. To reset, open settings in the top-right corner and select **Start a new move**.

## Validation

```sh
npm run typecheck
npm run test
npm run build
```

Unit tests cover all routes, delay propagation, completion status, arrival changes, family, school and budget updates, version conflicts, cost categories, passport number exclusion, knowledge retrieval, fictional MRZ parsing, and reading nationality independently of the issuing country.

Run API smoke tests while the development server is running:

```sh
npm run test:api
```

## Project structure

- `components/`: onboarding, timeline, and guide
- `lib/browser-ocr.ts`, `lib/passport.ts`: browser OCR and MRZ parsing
- `lib/planner.ts`: plan generation, dependencies, replanning, and preference changes
- `lib/guide.ts`, `lib/knowledge.ts`: change intent and knowledge retrieval
- `lib/ai.ts`: server-only OpenAI integration
- `lib/schema.ts`, `lib/storage.ts`: data contracts and browser storage
- `knowledge/sources.json`: notes with sources and verification dates

Anonymous APIs enforce input size limits and rate limits within a single process. Production deployment will require access controls, shared-storage rate limits, verification of eligibility and fee data, and data retention and deletion procedures.
