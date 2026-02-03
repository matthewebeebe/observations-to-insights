// Default prompts for AI suggestions
// These can be customized via the settings page

export interface Prompts {
  harms: string;
  criteria: string;
  strategies: string;
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
