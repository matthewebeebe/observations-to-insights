# Observations to Insights

A design thinking tool that guides students through a synthesis process: **Observation → Harm → Criterion → Strategy (HMW)**

## Current Status

### Completed Features
- **Dashboard**: View and create projects
- **Project Workflow**: 5-step process (Overview, Observations, Harms, Criteria, Strategies)
- **Firestore Persistence**: All data saves to cloud
- **Claude AI Suggestions**: Real AI-powered suggestions for harms, criteria, and strategies
- **Customizable Prompts**: Settings page (gear icon) to tweak AI prompts
- **Focus-based Suggestions**: AI suggestions only appear when the user focuses a specific input field (one at a time, not all at once). Suggestions are lazy-loaded on first focus.
- **Overview Navigation**: The overview tree has subtle "+ add harm", "+ add criterion", "+ add strategy" links that navigate to the correct tab and auto-focus the relevant input field
- **HMW Strategy Prompts**: Strategies are framed as abstract "How Might We" brainstorming questions (not specific solutions). They offer different angles/lenses to spark divergent thinking when a team runs out of steam.
- **Google Authentication**: Real Google OAuth sign-in via Firebase Auth. Each user's data is isolated by their UID.
- **Firestore Security Rules**: Per-user data isolation — users can only access their own projects and linked observations/harms/criteria/strategies (rules verify parent project ownership)
- **Deployed to Vercel**: Live at production URL, auto-deploys from GitHub `main` branch

### Deployment
- **Live URL**: Hosted on Vercel (auto-deploys from `main` branch)
- **GitHub**: https://github.com/matthewebeebe/observations-to-insights
- **Firebase Project**: `observations-to-insights`
- **Vercel domain** is added to Firebase Auth authorized domains
- **Push workflow**: Using GitHub Personal Access Token (HTTPS, not SSH). The PAT is embedded in the git remote URL. To push changes: `git add -A && git commit -m "message" && git push` — Vercel auto-deploys from `main`.
- **If PAT expires**: Generate a new one at github.com → Settings → Developer settings → Personal access tokens → Fine-grained tokens (scope: `repo`). Then run: `git remote set-url origin https://NEW_TOKEN@github.com/matthewebeebe/observations-to-insights.git`
- **PAT expiration**: Token expiration is a security safety net — if a token leaks, it auto-invalidates after the expiration date. 90 days is a good balance for personal projects. If it expires, `git push` will fail and you just generate a new one.

### Known Issues
- **Safari issues**: Use Chrome for best experience (Firestore has connection issues in Safari)
- **No inline editing**: Can't click existing items in the overview to edit them — only add new ones
- **Custom prompts in localStorage**: Users who customized prompts via Settings won't see updated default prompts (stored in localStorage overrides defaults)

### Notes for Future Sessions
- The `firestore.rules` file was cleaned up (had been contaminated with git commands and a token from a previous session). The old token was deleted on GitHub.
- The README update and `firestore.rules` cleanup are local-only changes that need to be included in the next `git push`.
- The `.env.local` file is gitignored. The same 7 environment variables are configured in Vercel's project settings (6 Firebase + 1 Anthropic API key).
- Firebase Console setup is complete: Google auth provider enabled, Vercel domain added to authorized domains, Firestore security rules published.

## Tech Stack
- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, Shadcn/ui
- **Backend**: Firebase Firestore
- **AI**: Claude API (Anthropic) — model: claude-sonnet-4-20250514
- **Auth**: Firebase Auth with Google OAuth
- **Hosting**: Vercel (with 7 environment variables configured)

## Getting Started

### Prerequisites
- Node.js 18+
- Firebase project with Firestore enabled
- Anthropic API key

### Environment Variables
Create `.env.local`:
```
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Claude API
ANTHROPIC_API_KEY=sk-ant-api...
```

### Run Development Server
```bash
npm install
npm run dev
```

Open **Chrome** (not Safari) at http://localhost:3000/dashboard

### Deploying
- Push to `main` branch on GitHub — Vercel auto-deploys
- Firestore security rules are in `firestore.rules` — paste into Firebase Console → Firestore → Rules → Publish
- If you change the Vercel domain, add it to Firebase Console → Authentication → Settings → Authorized domains

## Project Structure

```
src/
├── app/
│   ├── api/suggestions/    # Claude API endpoint
│   ├── dashboard/          # Project list
│   ├── project/[id]/       # Project workflow (1315 lines - main page)
│   └── settings/           # Prompt customization
├── components/
│   ├── auth/               # ProtectedRoute (Google sign-in gate)
│   ├── layout/             # Header
│   └── ui/                 # Shadcn components
└── lib/
    ├── auth-context.tsx    # Firebase Auth context (Google OAuth)
    ├── firebase.ts         # Firebase initialization
    ├── firestore.ts        # CRUD operations (all accept userId param)
    ├── prompts.ts          # AI prompt templates (harms, criteria, strategies)
    └── types.ts            # TypeScript types
```

## Key Implementation Patterns

### Focus-based Suggestions
- `focusedInputId` state tracks which input is active
- `handleHarmInputFocus`, `handleCriterionInputFocus`, `handleStrategyInputFocus` are `useCallback` handlers triggered on input focus
- Each fetches suggestions lazily (only on first focus, cached after)
- `onBlur` uses 200ms `setTimeout` to allow clicking suggestions before hiding them
- Suggestions section wrapped in `{focusedInputId === id && (...)}`

### Overview Navigation
- `pendingFocusId` ref stores target input ID
- `navigateToInput(step, inputId)` sets the ref and switches tab via `setActiveStep`
- `useEffect` watching `activeStep` fires after render, queries DOM for `[data-input-id="..."]`, calls `.focus()` and `.scrollIntoView()`
- 150ms delay allows tab content to render before focusing

### Authentication
- `ProtectedRoute` wraps all pages — shows Google sign-in if not authenticated
- `useAuth()` provides `user`, `loading`, `isConfigured`, `signInWithGoogle`
- All Firestore queries filter by `user.uid`
- Security rules enforce server-side access control

## Data Model

- **Project**: Contains observations, linked to user via `userId`
- **Observation**: Raw research notes, linked to project via `projectId`
- **Harm**: Problems identified from observations, linked via `projectId` + `observationIds`
- **Criterion**: Design criteria derived from harms, linked via `projectId` + `harmId`
- **Strategy**: HMW brainstorming questions for criteria, linked via `projectId` + `criterionId`

## Git History
- `12199ed` — **Safe rollback point**: Working MVP before auth changes (focus suggestions, overview nav, HMW prompts)
- `5ab3c19` — Enable Google Auth and add Firestore security rules

## Next Steps (TODO)
1. Add project sharing/collaboration
2. Export functionality (PDF, etc.)
3. Better error handling and loading states
4. Mobile responsive improvements
5. Inline editing of existing items from overview
6. Delete/edit existing observations, harms, criteria, strategies

## Ideas to Explore
- **Single-view editing**: Collapse the separate tabs (Observations, Harms, Criteria, Strategies) into one unified tree view where the overview *is* the editor. Each node in the synthesis tree would be interactive — click to expand an inline input with suggestions. The sidebar tabs would become scroll-to anchors or filters rather than separate pages. Advantage: users always see the full context of where they are in the synthesis. The focus-to-show-suggestions pattern already manages density. Would essentially be a collapsible tree editor.
