# Observations to Insights

A design thinking tool that guides students through a synthesis process: **Observation → Harm → Criterion → Strategy (HMW)**

## Current Status

### Completed Features
- **Dashboard**: View and create projects
- **Project Workflow**: 5-step process (Overview, Observations, Harms, Criteria, Strategies)
- **Firestore Persistence**: All data saves to cloud
- **Claude AI Suggestions**: Real AI-powered suggestions for harms, criteria, and strategies
- **Customizable Prompts**: Settings page (gear icon) to tweak AI prompts

### Known Issues / In Progress
- **Auth bypassed**: Using `'dev-user'` placeholder - real Google Auth is configured but bypassed
- **Safari issues**: Use Chrome for best experience (Firestore has connection issues in Safari)

## Tech Stack
- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, Shadcn/ui
- **Backend**: Firebase Firestore
- **AI**: Claude API (Anthropic)
- **Auth**: Firebase Auth with Google OAuth (currently bypassed)

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

## Project Structure

```
src/
├── app/
│   ├── api/suggestions/    # Claude API endpoint
│   ├── dashboard/          # Project list
│   ├── project/[id]/       # Project workflow
│   └── settings/           # Prompt customization
├── components/
│   ├── auth/               # Login, ProtectedRoute
│   ├── layout/             # Header
│   └── ui/                 # Shadcn components
└── lib/
    ├── auth-context.tsx    # Firebase Auth context
    ├── firebase.ts         # Firebase initialization
    ├── firestore.ts        # CRUD operations
    ├── prompts.ts          # AI prompt templates
    └── types.ts            # TypeScript types
```

## Data Model

- **Project**: Contains observations, linked to user
- **Observation**: Raw research notes
- **Harm**: Problems identified from observations
- **Criterion**: Design criteria derived from harms
- **Strategy**: HMW (How Might We) solutions for criteria

## Next Steps (TODO)
1. Enable real user authentication
2. Add project sharing/collaboration
3. Export functionality (PDF, etc.)
4. Better error handling and loading states
5. Mobile responsive improvements

## Ideas to Explore
- **Single-view editing**: Collapse the separate tabs (Observations, Harms, Criteria, Strategies) into one unified tree view where the overview *is* the editor. Each node in the synthesis tree would be interactive — click to expand an inline input with suggestions. The sidebar tabs would become scroll-to anchors or filters rather than separate pages. Advantage: users always see the full context of where they are in the synthesis. The focus-to-show-suggestions pattern already manages density. Would essentially be a collapsible tree editor.
