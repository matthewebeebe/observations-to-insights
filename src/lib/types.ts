// Core data types for Observations to Insights

export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  tags: string[];
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Observation {
  id: string;
  projectId: string;
  content: string;
  clusterId?: string;
  createdAt: Date;
}

export interface Cluster {
  id: string;
  projectId: string;
  name: string;
}

export interface Harm {
  id: string;
  projectId: string;
  observationIds: string[];
  content: string;
  createdAt: Date;
}

export interface Criterion {
  id: string;
  projectId?: string;
  harmId: string;
  content: string;
}

export type StrategyType = 'confront' | 'avoid' | 'minimize';

export interface Strategy {
  id: string;
  projectId?: string;
  criterionId: string;
  content: string;
  strategyType?: StrategyType;
}

// UI state types
export interface WorkflowStep {
  id: 'overview' | 'observations' | 'harms' | 'criteria' | 'strategies';
  label: string;
  description: string;
}

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Bird\'s eye view of your synthesis',
  },
  {
    id: 'observations',
    label: 'Observations',
    description: 'Capture what you saw or heard',
  },
  {
    id: 'harms',
    label: 'Harms',
    description: 'What value is being compromised?',
  },
  {
    id: 'criteria',
    label: 'Criteria',
    description: 'What must the solution do?',
  },
  {
    id: 'strategies',
    label: 'Strategies',
    description: 'How might we solve this?',
  },
];
