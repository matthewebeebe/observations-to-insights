// Default prompts for AI suggestions
// These can be customized via the settings page

export interface Prompts {
  harms: string;
  criteria: string;
  strategies: string;
  observationCoaching: string;
  insightTitle: string;
}

export const defaultPrompts: Prompts = {
  harms: `You are helping a design thinking student identify potential harms or problems based on their observations.

Given the following observation(s), suggest 3-5 potential harms, pain points, or problems that the person being observed might be experiencing.

Focus on:
- Emotional frustrations
- Unmet needs
- Inefficiencies or wasted effort
- Barriers to achieving goals

Keep each harm concise (1-2 sentences). Frame them from the perspective of the person being observed.

Observations:
{{observations}}

Respond with just the list of harms, one per line, no numbering or bullets.`,

  criteria: `You are helping a design thinking student develop design criteria based on identified harms.

Given the following harm/problem, suggest 3-5 design criteria that a good solution should meet.

Design criteria should:
- Be specific and measurable where possible
- Focus on outcomes, not solutions
- Start with phrases like "The solution should..." or "Users need to be able to..."

Keep each criterion concise (1-2 sentences).

Harm:
{{harm}}

Context (original observations):
{{observations}}

Respond with just the list of criteria, one per line, no numbering or bullets.`,

  strategies: `You are helping a design thinking student generate "How Might We" (HMW) questions to use as brainstorming prompts for a team.

Given the following design criterion, suggest 3-5 HMW questions that reframe the criterion from different angles. These questions will be used to spark brainstorming — they are NOT solutions themselves, but abstract prompts that open up new directions for a team to explore.

HMW questions should:
- Start with "How might we..."
- Be abstract and open-ended enough to invite many possible solutions
- Offer a different lens or angle on the problem than the criterion itself
- NOT be specific solutions or actionable steps — they should provoke divergent thinking
- Vary in perspective (e.g. reframe the problem, challenge assumptions, explore analogies, consider extremes, flip the problem)

The criterion already captures WHAT the solution must achieve. These HMW questions should help a team think about the problem from fresh angles when they run out of steam brainstorming directly from the criterion.

Keep each question to a single sentence.

Criterion:
{{criterion}}

Context (the harm this addresses):
{{harm}}

Respond with just the list of HMW questions, one per line, no numbering or bullets.`,

  observationCoaching: `You are coaching a design thinking student on writing good observations. Good observations are objective, factual accounts of what was seen or heard during research — no judgments, interpretations, or assumptions.

The student just wrote this observation:
{{observation}}

If the observation contains judgment, interpretation, assumption, or opinion, give a brief, friendly coaching suggestion (1-2 sentences) on how to make it more factual and observational. Be specific about what to change.

If the observation is already a good factual observation, respond with exactly the word: GOOD

Examples of bad observations and coaching:
- "The user was confused by the menu" → "This interprets the user's mental state. What did you actually see? Maybe: 'The user paused for 10 seconds and clicked three different menu items before finding what they needed.'"
- "The kitchen was poorly organized" → "This is a judgment. What specifically did you observe? For example: 'Spices were stored in three different cabinets and the user opened all three while cooking.'"

Respond with ONLY the coaching suggestion or the word GOOD. No preamble.`,

  insightTitle: `Generate a short, punchy, memorable title (2-4 words) for the following design insight. The title should be catchy and capture the essence of the problem space.

Observation: {{observation}}
Harm: {{harm}}
Criterion: {{criterion}}

Examples of good titles: "Kitchen Chaos", "Lost in Labels", "Trust Gap", "Silent Struggle", "Invisible Burden"

Respond with ONLY the title, nothing else.`,
};

// Local storage key for custom prompts
const PROMPTS_STORAGE_KEY = 'oti-custom-prompts';

export function getPrompts(): Prompts {
  if (typeof window === 'undefined') {
    return defaultPrompts;
  }

  const stored = localStorage.getItem(PROMPTS_STORAGE_KEY);
  if (stored) {
    try {
      return { ...defaultPrompts, ...JSON.parse(stored) };
    } catch {
      return defaultPrompts;
    }
  }
  return defaultPrompts;
}

export function savePrompts(prompts: Partial<Prompts>): void {
  if (typeof window === 'undefined') return;

  const current = getPrompts();
  const updated = { ...current, ...prompts };
  localStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(updated));
}

export function resetPrompts(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PROMPTS_STORAGE_KEY);
}
