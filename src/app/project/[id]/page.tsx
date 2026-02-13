'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import type { Observation, Harm, Criterion, Strategy } from '@/lib/types';
import { db } from '@/lib/firebase';
import {
  getProject,
  updateProject,
  getObservations,
  createObservation,
  updateObservation,
  updateObservationOrder,
  deleteObservation,
  getHarms,
  createHarm,
  deleteHarm,
  updateHarm,
  getCriteria,
  createCriterion,
  updateCriterion,
  deleteCriterion,
  getStrategies,
  createStrategy,
  updateStrategy,
  deleteStrategy,
} from '@/lib/firestore';
import { getPrompts } from '@/lib/prompts';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Types for AI suggestions
interface HarmSuggestion {
  id: string;
  content: string;
  selected: boolean;
}

interface CriterionSuggestion {
  id: string;
  content: string;
  selected: boolean;
}

interface StrategySuggestion {
  id: string;
  content: string;
  type: 'confront' | 'avoid' | 'minimize';
  selected: boolean;
}

// Detail panel item type
interface DetailItem {
  type: 'observation' | 'harm' | 'criterion';
  id: string;
}

// API call to generate suggestions
async function fetchSuggestions(
  type: 'harms' | 'criteria' | 'strategies' | 'observationCoaching' | 'insightTitle',
  context: { observations?: string; observation?: string; harm?: string; criterion?: string }
): Promise<string[]> {
  const prompts = getPrompts();
  const prompt = prompts[type];

  const response = await fetch('/api/suggestions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, prompt, context }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate suggestions');
  }

  const data = await response.json();
  return data.suggestions;
}

// X icon component
function XIcon({ size = 16 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}

// Expand icon component
function ExpandIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" />
    </svg>
  );
}

// Back arrow icon
function BackIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

// Plus icon
function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" /><path d="M12 5v14" />
    </svg>
  );
}

// Duplicate/copy icon
function DuplicateIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

// Settings gear icon
function SettingsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

// Column header with colored left border
const columnColors = {
  blue: { border: 'border-l-blue-400', text: 'text-blue-900' },
  orange: { border: 'border-l-orange-400', text: 'text-orange-900' },
  green: { border: 'border-l-green-400', text: 'text-green-900' },
  purple: { border: 'border-l-purple-400', text: 'text-purple-900' },
};

function ColumnHeader({ label, color }: { label: string; color: 'blue' | 'orange' | 'green' | 'purple' }) {
  return (
    <div className={`border-l-4 ${columnColors[color].border} pl-3 py-1`}>
      <h3 className={`text-sm font-medium ${columnColors[color].text}`}>{label}</h3>
    </div>
  );
}

// Content block with colored background, optional delete, and click-to-edit
function ContentBlock({ content, color, onDelete, onSave, suffix }: {
  content: string;
  color: 'blue' | 'orange' | 'green' | 'purple';
  onDelete?: () => void;
  onSave?: (content: string) => void;
  suffix?: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(content);

  useEffect(() => { setValue(content); }, [content]);

  const bgColors = {
    blue: 'bg-blue-50 border-blue-100',
    orange: 'bg-orange-50 border-orange-100',
    green: 'bg-green-50 border-green-100',
    purple: 'bg-purple-50 border-purple-100',
  };
  const deleteColors = {
    blue: 'text-blue-400 hover:text-blue-600',
    orange: 'text-orange-400 hover:text-orange-600',
    green: 'text-green-400 hover:text-green-600',
    purple: 'text-purple-400 hover:text-purple-600',
  };

  const commitEdit = () => {
    setEditing(false);
    const trimmed = value.trim();
    if (trimmed && trimmed !== content && onSave) {
      onSave(trimmed);
    } else {
      setValue(content);
    }
  };

  const editGlow = {
    blue: 'shadow-[inset_0_0_8px_rgba(59,130,246,0.25)]',
    orange: 'shadow-[inset_0_0_8px_rgba(249,115,22,0.25)]',
    green: 'shadow-[inset_0_0_8px_rgba(34,197,94,0.25)]',
    purple: 'shadow-[inset_0_0_8px_rgba(168,85,247,0.25)]',
  };

  if (editing) {
    return (
      <div className={`px-3 py-2 rounded-md border ${bgColors[color]} ${editGlow[color]} transition-shadow`}>
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(); }
            if (e.key === 'Escape') { setEditing(false); setValue(content); }
          }}
          autoFocus
          className={`text-sm ${columnColors[color].text} field-sizing-content min-h-[2rem] resize-none bg-transparent border-0 p-0 focus-visible:ring-0 shadow-none`}
        />
      </div>
    );
  }

  return (
    <div className={`px-3 py-2 rounded-md border ${bgColors[color]} group/block`}>
      <div className="flex items-start justify-between gap-2">
        <p
          className={`text-sm ${columnColors[color].text} ${onSave ? 'cursor-text' : ''}`}
          onClick={onSave ? () => setEditing(true) : undefined}
        >
          {content}
          {suffix}
        </p>
        {onDelete && (
          <button
            onClick={onDelete}
            className={`opacity-0 group-hover/block:opacity-100 transition-opacity ${deleteColors[color]} shrink-0`}
          >
            <XIcon size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

// Coaching/suggestion wrapper
function CoachingArea({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-amber-50/60 rounded-md px-3 py-2 text-sm">
      {children}
    </div>
  );
}

function ProjectContent() {
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState('Untitled Project');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteLoading, setPasteLoading] = useState(false);
  const [newObservation, setNewObservation] = useState('');

  // Core data
  const [observations, setObservations] = useState<Observation[]>([]);
  const [harms, setHarms] = useState<Harm[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);

  // Detail panel state
  const [detailItem, setDetailItem] = useState<DetailItem | null>(null);

  // Observation coaching state
  const [coachingText, setCoachingText] = useState<string | null>(null);
  const [loadingCoaching, setLoadingCoaching] = useState(false);
  const coachingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load project data on mount
  useEffect(() => {
    async function loadProjectData() {
      if (!db || !projectId) {
        setLoading(false);
        return;
      }

      try {
        const [project, obs, hrms, crits, strats] = await Promise.all([
          getProject(projectId),
          getObservations(projectId),
          getHarms(projectId),
          getCriteria(projectId),
          getStrategies(projectId),
        ]);

        if (project) {
          setProjectName(project.name);
          setIsArchived(project.archived);
        }
        setObservations(obs);
        setHarms(hrms);
        setCriteria(crits);
        setStrategies(strats);
      } catch (error) {
        console.error('Error loading project:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProjectData();
  }, [projectId]);

  // AI suggestions state (keyed by parent ID)
  const [harmSuggestions, setHarmSuggestions] = useState<Record<string, HarmSuggestion[]>>({});
  const [criterionSuggestions, setCriterionSuggestions] = useState<Record<string, CriterionSuggestion[]>>({});
  const [strategySuggestions, setStrategySuggestions] = useState<Record<string, StrategySuggestion[]>>({});

  // Loading states for suggestions
  const [loadingHarmSuggestions, setLoadingHarmSuggestions] = useState<Record<string, boolean>>({});
  const [loadingCriterionSuggestions, setLoadingCriterionSuggestions] = useState<Record<string, boolean>>({});
  const [loadingStrategySuggestions, setLoadingStrategySuggestions] = useState<Record<string, boolean>>({});

  // Error message state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const showError = useCallback((msg: string, error?: unknown) => {
    const detail = error instanceof Error ? error.message : '';
    setErrorMessage(detail ? `${msg} (${detail})` : msg);
    setTimeout(() => setErrorMessage(null), 8000);
  }, []);

  // Custom input state
  const [customHarmInputs, setCustomHarmInputs] = useState<Record<string, string>>({});
  const [customCriterionInputs, setCustomCriterionInputs] = useState<Record<string, string>>({});
  const [customStrategyInputs, setCustomStrategyInputs] = useState<Record<string, string>>({});

  // (focusedInputId removed — 4-column layout shows all suggestion panels simultaneously)

  // Inline add state: tracks which card has an inline input open and what type
  // e.g. { parentId: 'obs-123', type: 'harm' } or { parentId: 'harm-456', type: 'criterion' }
  const [inlineAdd, setInlineAdd] = useState<{ parentId: string; type: 'harm' | 'criterion' | 'strategy' } | null>(null);

  // Observation coaching — debounced AI feedback
  const coachingAbortRef = useRef<AbortController | null>(null);

  const cancelCoaching = useCallback(() => {
    if (coachingTimerRef.current) {
      clearTimeout(coachingTimerRef.current);
      coachingTimerRef.current = null;
    }
    if (coachingAbortRef.current) {
      coachingAbortRef.current.abort();
      coachingAbortRef.current = null;
    }
    setCoachingText(null);
    setLoadingCoaching(false);
  }, []);

  const handleObservationChange = useCallback((text: string) => {
    setNewObservation(text);
    setCoachingText(null);

    if (coachingTimerRef.current) {
      clearTimeout(coachingTimerRef.current);
    }
    if (coachingAbortRef.current) {
      coachingAbortRef.current.abort();
    }

    if (!text.trim() || text.trim().length < 10) {
      setLoadingCoaching(false);
      return;
    }

    coachingTimerRef.current = setTimeout(async () => {
      const abortController = new AbortController();
      coachingAbortRef.current = abortController;
      setLoadingCoaching(true);
      try {
        const results = await fetchSuggestions('observationCoaching', { observation: text.trim() });
        if (abortController.signal.aborted) return;
        const coaching = results[0] || '';
        if (coaching && coaching !== 'GOOD') {
          setCoachingText(coaching);
        } else {
          setCoachingText(null);
        }
      } catch (error) {
        if (abortController.signal.aborted) return;
        console.error('Error fetching coaching:', error);
      } finally {
        if (!abortController.signal.aborted) {
          setLoadingCoaching(false);
        }
      }
    }, 2000);
  }, []);

  // Cleanup coaching timer
  useEffect(() => {
    return () => {
      if (coachingTimerRef.current) clearTimeout(coachingTimerRef.current);
    };
  }, []);

  // Fetch harm suggestions on focus (lazy loading)
  const handleHarmInputFocus = useCallback(async (obsId: string) => {
    if (!harmSuggestions[obsId] && !loadingHarmSuggestions[obsId]) {
      const obs = observations.find(o => o.id === obsId);
      if (!obs) return;
      setLoadingHarmSuggestions(prev => ({ ...prev, [obsId]: true }));
      try {
        const suggestions = await fetchSuggestions('harms', { observations: obs.content });
        setHarmSuggestions(prev => ({
          ...prev,
          [obsId]: suggestions.map(content => ({
            id: crypto.randomUUID(),
            content,
            selected: false,
          })),
        }));
      } catch (error) {
        console.error('Error fetching harm suggestions:', error);
        setHarmSuggestions(prev => ({ ...prev, [obsId]: [] }));
      } finally {
        setLoadingHarmSuggestions(prev => ({ ...prev, [obsId]: false }));
      }
    }
  }, [harmSuggestions, loadingHarmSuggestions, observations]);

  // Fetch criterion suggestions on focus
  const handleCriterionInputFocus = useCallback(async (harmId: string) => {
    if (!criterionSuggestions[harmId] && !loadingCriterionSuggestions[harmId]) {
      const harm = harms.find(h => h.id === harmId);
      if (!harm) return;
      setLoadingCriterionSuggestions(prev => ({ ...prev, [harmId]: true }));
      try {
        const obsContent = observations
          .filter(o => harm.observationIds.includes(o.id))
          .map(o => o.content)
          .join('\n');
        const suggestions = await fetchSuggestions('criteria', {
          harm: harm.content,
          observations: obsContent,
        });
        setCriterionSuggestions(prev => ({
          ...prev,
          [harmId]: suggestions.map(content => ({
            id: crypto.randomUUID(),
            content,
            selected: false,
          })),
        }));
      } catch (error) {
        console.error('Error fetching criterion suggestions:', error);
        setCriterionSuggestions(prev => ({ ...prev, [harmId]: [] }));
      } finally {
        setLoadingCriterionSuggestions(prev => ({ ...prev, [harmId]: false }));
      }
    }
  }, [criterionSuggestions, loadingCriterionSuggestions, harms, observations]);

  // Fetch strategy suggestions on focus
  const handleStrategyInputFocus = useCallback(async (criterionId: string) => {
    if (!strategySuggestions[criterionId] && !loadingStrategySuggestions[criterionId]) {
      const crit = criteria.find(c => c.id === criterionId);
      if (!crit) return;
      setLoadingStrategySuggestions(prev => ({ ...prev, [criterionId]: true }));
      try {
        const harm = harms.find(h => h.id === crit.harmId);
        const suggestions = await fetchSuggestions('strategies', {
          criterion: crit.content,
          harm: harm?.content || '',
        });
        setStrategySuggestions(prev => ({
          ...prev,
          [criterionId]: suggestions.map(content => ({
            id: crypto.randomUUID(),
            content,
            type: 'confront' as const,
            selected: false,
          })),
        }));
      } catch (error) {
        console.error('Error fetching strategy suggestions:', error);
        setStrategySuggestions(prev => ({ ...prev, [criterionId]: [] }));
      } finally {
        setLoadingStrategySuggestions(prev => ({ ...prev, [criterionId]: false }));
      }
    }
  }, [strategySuggestions, loadingStrategySuggestions, criteria, harms]);

  // Auto-load harm suggestions when detail panel opens
  useEffect(() => {
    if (detailItem) {
      handleHarmInputFocus(detailItem.id);
    }
  }, [detailItem, handleHarmInputFocus]);

  // ============ CRUD OPERATIONS ============

  const handleAddObservation = async (): Promise<string | null> => {
    if (!newObservation.trim()) return null;
    const content = newObservation.trim();
    setNewObservation('');
    cancelCoaching();

    if (db) {
      try {
        const id = await createObservation(projectId, content);
        const observation: Observation = {
          id,
          projectId,
          content,
          createdAt: new Date(),
        };
        setObservations([...observations, observation]);
        return id;
      } catch (error) {
        console.error('Error creating observation:', error);
        showError('Failed to save observation', error);
        setNewObservation(content);
        return null;
      }
    } else {
      const id = crypto.randomUUID();
      const observation: Observation = {
        id,
        projectId,
        content,
        createdAt: new Date(),
      };
      setObservations([...observations, observation]);
      return id;
    }
  };

  // Branch: duplicate an observation's content into a new card, inserted after the source
  const handleAddObservationFromBranch = async (sourceObsId: string, content: string): Promise<string | null> => {
    const idx = observations.findIndex(o => o.id === sourceObsId);
    // Calculate an order value between source and next (or source + 1 if last)
    const sourceOrder = observations[idx]?.order ?? idx;
    const nextOrder = idx + 1 < observations.length
      ? (observations[idx + 1].order ?? idx + 1)
      : sourceOrder + 1;
    const branchOrder = (sourceOrder + nextOrder) / 2;

    const insertAfter = (obs: Observation) => {
      const next = [...observations];
      next.splice(idx + 1, 0, obs);
      setObservations(next);
    };

    if (db) {
      try {
        const id = await createObservation(projectId, content, undefined, branchOrder);
        const observation: Observation = {
          id,
          projectId,
          content,
          order: branchOrder,
          createdAt: new Date(),
        };
        insertAfter(observation);
        return id;
      } catch (error) {
        console.error('Error branching observation:', error);
        showError('Failed to branch observation', error);
        return null;
      }
    } else {
      const id = crypto.randomUUID();
      const observation: Observation = {
        id,
        projectId,
        content,
        order: branchOrder,
        createdAt: new Date(),
      };
      insertAfter(observation);
      return id;
    }
  };

  const handleDeleteObservation = async (obsId: string) => {
    if (db) {
      try {
        await deleteObservation(obsId);
      } catch (error) {
        console.error('Error deleting observation:', error);
        return;
      }
    }
    setObservations(observations.filter(o => o.id !== obsId));
  };

  const handleDeleteHarm = async (harmId: string) => {
    if (db) {
      try {
        await deleteHarm(harmId);
      } catch (error) {
        console.error('Error deleting harm:', error);
        return;
      }
    }
    setHarms(harms.filter(h => h.id !== harmId));
  };

  const handleDeleteCriterion = async (criterionId: string) => {
    if (db) {
      try {
        await deleteCriterion(criterionId);
      } catch (error) {
        console.error('Error deleting criterion:', error);
        return;
      }
    }
    setCriteria(criteria.filter(c => c.id !== criterionId));
  };

  const handleDeleteStrategy = async (strategyId: string) => {
    if (db) {
      try {
        await deleteStrategy(strategyId);
      } catch (error) {
        console.error('Error deleting strategy:', error);
        return;
      }
    }
    setStrategies(strategies.filter(s => s.id !== strategyId));
  };

  const toggleHarmSuggestion = async (obsId: string, suggestionId: string) => {
    const suggestions = harmSuggestions[obsId];
    const suggestion = suggestions?.find(s => s.id === suggestionId);
    if (!suggestion) return;

    if (suggestion.selected) {
      const harmToRemove = harms.find(h => h.content === suggestion.content && h.observationIds.includes(obsId));
      if (harmToRemove && db) {
        try { await deleteHarm(harmToRemove.id); } catch (error) { console.error('Error deleting harm:', error); }
      }
      setHarms(harms.filter(h => !(h.content === suggestion.content && h.observationIds.includes(obsId))));
      setHarmSuggestions(prev => ({
        ...prev,
        [obsId]: prev[obsId].map(s => s.id === suggestionId ? { ...s, selected: false } : s)
      }));
    } else {
      if (db) {
        try {
          const id = await createHarm(projectId, [obsId], suggestion.content);
          setHarms([...harms, { id, projectId, observationIds: [obsId], content: suggestion.content, createdAt: new Date() }]);
        } catch (error) { console.error('Error creating harm:', error); return; }
      } else {
        setHarms([...harms, { id: crypto.randomUUID(), projectId, observationIds: [obsId], content: suggestion.content, createdAt: new Date() }]);
      }
      setHarmSuggestions(prev => ({
        ...prev,
        [obsId]: prev[obsId].map(s => s.id === suggestionId ? { ...s, selected: true } : s)
      }));
    }
  };

  const addCustomHarm = async (obsId: string): Promise<string | null> => {
    const content = customHarmInputs[obsId]?.trim();
    if (!content) return null;
    setCustomHarmInputs(prev => ({ ...prev, [obsId]: '' }));

    if (db) {
      try {
        const id = await createHarm(projectId, [obsId], content);
        setHarms([...harms, { id, projectId, observationIds: [obsId], content, createdAt: new Date() }]);
        return id;
      } catch (error) {
        console.error('Error creating harm:', error);
        showError('Failed to save harm', error);
        setCustomHarmInputs(prev => ({ ...prev, [obsId]: content }));
        return null;
      }
    } else {
      const id = crypto.randomUUID();
      setHarms([...harms, { id, projectId, observationIds: [obsId], content, createdAt: new Date() }]);
      return id;
    }
  };

  const generateMoreHarmSuggestions = async (obsId: string) => {
    const obs = observations.find(o => o.id === obsId);
    if (!obs || loadingHarmSuggestions[obsId]) return;
    setLoadingHarmSuggestions(prev => ({ ...prev, [obsId]: true }));
    try {
      const suggestions = await fetchSuggestions('harms', { observations: obs.content });
      setHarmSuggestions(prev => ({
        ...prev,
        [obsId]: [...(prev[obsId] || []), ...suggestions.map(content => ({ id: crypto.randomUUID(), content, selected: false }))]
      }));
    } catch (error) { console.error('Error generating more harm suggestions:', error); }
    finally { setLoadingHarmSuggestions(prev => ({ ...prev, [obsId]: false })); }
  };

  const toggleCriterionSuggestion = async (harmId: string, suggestionId: string) => {
    const suggestions = criterionSuggestions[harmId];
    const suggestion = suggestions?.find(s => s.id === suggestionId);
    if (!suggestion) return;

    if (suggestion.selected) {
      const critToRemove = criteria.find(c => c.content === suggestion.content && c.harmId === harmId);
      if (critToRemove && db) {
        try { await deleteCriterion(critToRemove.id); } catch (error) { console.error('Error deleting criterion:', error); }
      }
      setCriteria(criteria.filter(c => !(c.content === suggestion.content && c.harmId === harmId)));
      setCriterionSuggestions(prev => ({
        ...prev,
        [harmId]: prev[harmId].map(s => s.id === suggestionId ? { ...s, selected: false } : s)
      }));
    } else {
      if (db) {
        try {
          const id = await createCriterion(projectId, harmId, suggestion.content);
          setCriteria([...criteria, { id, projectId, harmId, content: suggestion.content }]);
          // Auto-generate title when first criterion is added
          maybeGenerateTitle(harmId, suggestion.content);
        } catch (error) { console.error('Error creating criterion:', error); return; }
      } else {
        setCriteria([...criteria, { id: crypto.randomUUID(), harmId, content: suggestion.content }]);
      }
      setCriterionSuggestions(prev => ({
        ...prev,
        [harmId]: prev[harmId].map(s => s.id === suggestionId ? { ...s, selected: true } : s)
      }));
    }
  };

  const addCustomCriterion = async (harmId: string): Promise<string | null> => {
    const content = customCriterionInputs[harmId]?.trim();
    if (!content) return null;
    setCustomCriterionInputs(prev => ({ ...prev, [harmId]: '' }));

    if (db) {
      try {
        const id = await createCriterion(projectId, harmId, content);
        setCriteria([...criteria, { id, projectId, harmId, content }]);
        maybeGenerateTitle(harmId, content);
        return id;
      } catch (error) {
        console.error('Error creating criterion:', error);
        showError('Failed to save criterion', error);
        setCustomCriterionInputs(prev => ({ ...prev, [harmId]: content }));
        return null;
      }
    } else {
      const id = crypto.randomUUID();
      setCriteria([...criteria, { id, harmId, content }]);
      return id;
    }
  };

  const generateMoreCriterionSuggestions = async (harmId: string) => {
    const harm = harms.find(h => h.id === harmId);
    if (!harm || loadingCriterionSuggestions[harmId]) return;
    setLoadingCriterionSuggestions(prev => ({ ...prev, [harmId]: true }));
    try {
      const obsContent = observations.filter(o => harm.observationIds.includes(o.id)).map(o => o.content).join('\n');
      const suggestions = await fetchSuggestions('criteria', { harm: harm.content, observations: obsContent });
      setCriterionSuggestions(prev => ({
        ...prev,
        [harmId]: [...(prev[harmId] || []), ...suggestions.map(content => ({ id: crypto.randomUUID(), content, selected: false }))]
      }));
    } catch (error) { console.error('Error generating more criterion suggestions:', error); }
    finally { setLoadingCriterionSuggestions(prev => ({ ...prev, [harmId]: false })); }
  };

  const toggleStrategySuggestion = async (criterionId: string, suggestionId: string) => {
    const suggestions = strategySuggestions[criterionId];
    const suggestion = suggestions?.find(s => s.id === suggestionId);
    if (!suggestion) return;

    if (suggestion.selected) {
      const stratToRemove = strategies.find(s => s.content === suggestion.content && s.criterionId === criterionId);
      if (stratToRemove && db) {
        try { await deleteStrategy(stratToRemove.id); } catch (error) { console.error('Error deleting strategy:', error); }
      }
      setStrategies(strategies.filter(s => !(s.content === suggestion.content && s.criterionId === criterionId)));
      setStrategySuggestions(prev => ({
        ...prev,
        [criterionId]: prev[criterionId].map(s => s.id === suggestionId ? { ...s, selected: false } : s)
      }));
    } else {
      if (db) {
        try {
          const id = await createStrategy(projectId, criterionId, suggestion.content, suggestion.type);
          setStrategies([...strategies, { id, projectId, criterionId, content: suggestion.content, strategyType: suggestion.type }]);
        } catch (error) { console.error('Error creating strategy:', error); return; }
      } else {
        setStrategies([...strategies, { id: crypto.randomUUID(), criterionId, content: suggestion.content, strategyType: suggestion.type }]);
      }
      setStrategySuggestions(prev => ({
        ...prev,
        [criterionId]: prev[criterionId].map(s => s.id === suggestionId ? { ...s, selected: true } : s)
      }));
    }
  };

  const addCustomStrategy = async (criterionId: string) => {
    const content = customStrategyInputs[criterionId]?.trim();
    if (!content) return;
    const finalContent = content.startsWith('HMW') ? content : `HMW ${content}`;
    setCustomStrategyInputs(prev => ({ ...prev, [criterionId]: '' }));

    if (db) {
      try {
        const id = await createStrategy(projectId, criterionId, finalContent);
        setStrategies([...strategies, { id, projectId, criterionId, content: finalContent }]);
      } catch (error) {
        console.error('Error creating strategy:', error);
        showError('Failed to save strategy', error);
        setCustomStrategyInputs(prev => ({ ...prev, [criterionId]: content }));
      }
    } else {
      setStrategies([...strategies, { id: crypto.randomUUID(), criterionId, content: finalContent }]);
    }
  };

  const generateMoreStrategySuggestions = async (criterionId: string) => {
    const crit = criteria.find(c => c.id === criterionId);
    if (!crit || loadingStrategySuggestions[criterionId]) return;
    setLoadingStrategySuggestions(prev => ({ ...prev, [criterionId]: true }));
    try {
      const harm = harms.find(h => h.id === crit.harmId);
      const suggestions = await fetchSuggestions('strategies', { criterion: crit.content, harm: harm?.content || '' });
      setStrategySuggestions(prev => ({
        ...prev,
        [criterionId]: [...(prev[criterionId] || []), ...suggestions.map(content => ({ id: crypto.randomUUID(), content, type: 'confront' as const, selected: false }))]
      }));
    } catch (error) { console.error('Error generating more strategy suggestions:', error); }
    finally { setLoadingStrategySuggestions(prev => ({ ...prev, [criterionId]: false })); }
  };

  // ============ TITLE GENERATION ============

  const maybeGenerateTitle = useCallback(async (harmId: string, criterionContent: string) => {
    // Find the observation that owns this harm
    const harm = harms.find(h => h.id === harmId);
    if (!harm) return;
    const obs = observations.find(o => harm.observationIds.includes(o.id));
    if (!obs || obs.title) return; // Already has a title

    try {
      const results = await fetchSuggestions('insightTitle', {
        observation: obs.content,
        harm: harm.content,
        criterion: criterionContent,
      });
      const title = results[0]?.trim();
      if (title) {
        // Update local state
        setObservations(prev => prev.map(o => o.id === obs.id ? { ...o, title } : o));
        // Persist to Firestore
        if (db) {
          updateObservation(obs.id, { title }).catch(e => console.error('Failed to save title:', e));
        }
      }
    } catch (error) {
      console.error('Error generating title:', error);
    }
  }, [harms, observations, projectId]);

  // ============ HELPERS ============

  const getHarmsForObservation = (obsId: string) => harms.filter(h => h.observationIds.includes(obsId));
  const getCriteriaForHarm = (harmId: string) => criteria.filter(c => c.harmId === harmId);
  const getStrategiesForCriterion = (criterionId: string) => strategies.filter(s => s.criterionId === criterionId);
  const getObservationForHarm = (harm: Harm) => observations.find(o => harm.observationIds.includes(o.id));

  const handleSaveProjectName = async () => {
    setIsEditingName(false);
    if (db) {
      try { await updateProject(projectId, { name: projectName }); }
      catch (error) { console.error('Error updating project name:', error); }
    }
  };

  const handleToggleArchive = async () => {
    const newArchived = !isArchived;
    setIsArchived(newArchived);
    if (db) {
      try { await updateProject(projectId, { archived: newArchived }); }
      catch (error) { console.error('Error updating archive status:', error); setIsArchived(!newArchived); }
    }
  };

  const handlePasteObservations = async () => {
    const lines = pasteText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;
    setPasteLoading(true);
    try {
      const newObs: Observation[] = [];
      for (const line of lines) {
        if (db) {
          const id = await createObservation(projectId, line);
          newObs.push({ id, projectId, content: line, createdAt: new Date() });
        } else {
          const id = crypto.randomUUID();
          newObs.push({ id, projectId, content: line, createdAt: new Date() });
        }
      }
      setObservations(prev => [...prev, ...newObs]);
      setPasteText('');
      setPasteModalOpen(false);
    } catch (error) {
      console.error('Error pasting observations:', error);
      showError('Failed to paste observations', error);
    } finally {
      setPasteLoading(false);
    }
  };

  const handleSaveObservationTitle = async (obsId: string, title: string) => {
    setObservations(prev => prev.map(o => o.id === obsId ? { ...o, title } : o));
    if (db) {
      updateObservation(obsId, { title }).catch(e => console.error('Failed to save title:', e));
    }
  };

  const handleSaveObservationContent = async (obsId: string, content: string) => {
    setObservations(prev => prev.map(o => o.id === obsId ? { ...o, content } : o));
    if (db) {
      updateObservation(obsId, { content }).catch(e => console.error('Failed to save observation:', e));
    }
  };

  const handleSaveHarmContent = async (harmId: string, content: string) => {
    setHarms(prev => prev.map(h => h.id === harmId ? { ...h, content } : h));
    if (db) {
      updateHarm(harmId, { content }).catch(e => console.error('Failed to save harm:', e));
    }
  };

  const handleSaveCriterionContent = async (criterionId: string, content: string) => {
    setCriteria(prev => prev.map(c => c.id === criterionId ? { ...c, content } : c));
    if (db) {
      updateCriterion(criterionId, { content }).catch(e => console.error('Failed to save criterion:', e));
    }
  };

  const handleSaveStrategyContent = async (strategyId: string, content: string) => {
    setStrategies(prev => prev.map(s => s.id === strategyId ? { ...s, content } : s));
    if (db) {
      updateStrategy(strategyId, { content }).catch(e => console.error('Failed to save strategy:', e));
    }
  };

  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(label);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleCopyAll = () => {
    let text = `# ${projectName}\n\n`;
    if (observations.length > 0) {
      text += `## Observations\n`;
      observations.forEach((obs, i) => {
        text += `${i + 1}. ${obs.title ? `**${obs.title}**: ` : ''}${obs.content}\n`;
      });
      text += `\n`;
    }
    if (harms.length > 0) {
      text += `## Harms\n`;
      harms.forEach((harm, i) => {
        const obs = getObservationForHarm(harm);
        text += `${i + 1}. ${harm.content}\n`;
        if (obs) text += `   From: "${obs.content.slice(0, 50)}..."\n`;
      });
      text += `\n`;
    }
    if (criteria.length > 0) {
      text += `## Criteria\n`;
      criteria.forEach((crit, i) => { text += `${i + 1}. ${crit.content}\n`; });
      text += `\n`;
    }
    if (strategies.length > 0) {
      text += `## Strategies (How Might We)\n`;
      strategies.forEach((strat, i) => {
        text += `${i + 1}. ${strat.content}${strat.strategyType ? ` (${strat.strategyType})` : ''}\n`;
      });
    }
    copyToClipboard(text, 'Copied all');
  };

  const handleCopyMatrix = () => {
    const rows: string[][] = [['Observation', 'Harm', 'Solution Criteria', 'Strategy']];
    for (const obs of observations) {
      const obsHarms = getHarmsForObservation(obs.id);
      if (obsHarms.length === 0) {
        rows.push([obs.content, '', '', '']);
        continue;
      }
      for (const harm of obsHarms) {
        const harmCriteria = getCriteriaForHarm(harm.id);
        if (harmCriteria.length === 0) {
          rows.push([obs.content, harm.content, '', '']);
          continue;
        }
        for (const crit of harmCriteria) {
          const critStrategies = getStrategiesForCriterion(crit.id);
          if (critStrategies.length === 0) {
            rows.push([obs.content, harm.content, crit.content, '']);
            continue;
          }
          for (const strat of critStrategies) {
            rows.push([obs.content, harm.content, crit.content, strat.content]);
          }
        }
      }
    }

    const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const headerRow = rows[0].map(c => `<th style="border:1px solid #ccc;padding:6px;background:#f5f5f5;font-weight:bold;text-align:left">${escape(c)}</th>`).join('');
    const bodyRows = rows.slice(1).map(row =>
      '<tr>' + row.map(c => `<td style="border:1px solid #ccc;padding:6px;vertical-align:top">${escape(c)}</td>`).join('') + '</tr>'
    ).join('');
    const html = `<table style="border-collapse:collapse"><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table>`;
    const plain = rows.map(row => row.join('\t')).join('\n');

    navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' }),
      })
    ]);
    setCopyFeedback('Copied matrix');
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleCopyType = (type: 'observations' | 'harms' | 'criteria' | 'strategies') => {
    let items: string[] = [];
    switch (type) {
      case 'observations':
        items = observations.map(o => o.title ? `${o.title}: ${o.content}` : o.content);
        break;
      case 'harms':
        items = harms.map(h => h.content);
        break;
      case 'criteria':
        items = criteria.map(c => c.content);
        break;
      case 'strategies':
        items = strategies.map(s => s.content);
        break;
    }
    copyToClipboard(items.join('\n'), `Copied ${type}`);
  };

  // ============ DRAG AND DROP ============

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = observations.findIndex(o => o.id === active.id);
    const newIndex = observations.findIndex(o => o.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(observations, oldIndex, newIndex);
    setObservations(reordered);

    // Persist new order to Firestore (fire-and-forget)
    if (db) {
      const updates = reordered.map((obs, i) => ({ id: obs.id, order: i }));
      updateObservationOrder(updates).catch(e =>
        console.error('Failed to persist observation order:', e)
      );
    }
  };

  // ============ RENDER ============

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header projectName="Loading..." />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-pulse text-muted-foreground">Loading project...</div>
        </div>
      </div>
    );
  }

  // Look up the observation for the detail panel
  const detailObs = detailItem ? observations.find(o => o.id === detailItem.id) : null;

  return (
    <div className="min-h-screen bg-background">
      <Header projectName={projectName} />

      <main className="max-w-screen-xl mx-auto p-6">
        {/* Error Banner */}
        {errorMessage && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-700 ml-4 shrink-0">
              <XIcon />
            </button>
          </div>
        )}

        {detailItem && detailObs ? (
          /* ============ DETAIL PANEL — 4-COLUMN CHAIN VIEW ============ */
          <div className="w-full">
            {/* Back button */}
            <div className="flex items-center gap-3 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDetailItem(null)}
                className="gap-1"
              >
                <BackIcon /> Back to board
              </Button>
            </div>

            {/* Insight title + duplicate */}
            <div className="flex items-center justify-between mb-6">
              <InsightTitle
                title={detailObs.title}
                onSave={(title) => handleSaveObservationTitle(detailObs.id, title)}
                className="text-2xl"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const id = await handleAddObservationFromBranch(detailObs.id, detailObs.content);
                  if (id) {
                    setDetailItem({ type: 'observation', id });
                  }
                }}
                className="gap-1 text-muted-foreground"
              >
                <DuplicateIcon /> Duplicate
              </Button>
            </div>

            {/* 4-column grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">

              {/* Column 1: Observation (blue) */}
              <div className="space-y-3">
                <ColumnHeader label="Observation" color="blue" />
                <ContentBlock content={detailObs.content} color="blue" onSave={(c) => handleSaveObservationContent(detailObs.id, c)} />
                {(coachingText || loadingCoaching) && (
                  <CoachingArea>
                    {loadingCoaching ? (
                      <p className="text-xs text-muted-foreground animate-pulse">Thinking...</p>
                    ) : coachingText ? (
                      <p className="text-xs text-amber-800">{coachingText}</p>
                    ) : null}
                  </CoachingArea>
                )}
              </div>

              {/* Column 2: Harm (orange) — 1:1 with observation */}
              <div className="space-y-3">
                <ColumnHeader label="Harm or Opportunity" color="orange" />
                {(() => {
                  const obsHarm = getHarmsForObservation(detailObs.id)[0];
                  if (obsHarm) {
                    return (
                      <ContentBlock
                        content={obsHarm.content}
                        color="orange"
                        onDelete={() => handleDeleteHarm(obsHarm.id)}
                        onSave={(c) => handleSaveHarmContent(obsHarm.id, c)}
                      />
                    );
                  }
                  return (
                    <>
                      <div className="space-y-1">
                        <div className="px-3 py-2 rounded-md border bg-orange-50 border-orange-100 shadow-[inset_0_0_8px_rgba(249,115,22,0.25)] transition-shadow">
                          <Textarea
                            placeholder="What harm could come from this?"
                            value={customHarmInputs[detailObs.id] || ''}
                            onChange={(e) => setCustomHarmInputs(prev => ({ ...prev, [detailObs.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                addCustomHarm(detailObs.id);
                              } else if (e.key === 'Escape') {
                                setCustomHarmInputs(prev => ({ ...prev, [detailObs.id]: '' }));
                                (e.target as HTMLTextAreaElement).blur();
                              }
                            }}
                            onFocus={() => handleHarmInputFocus(detailObs.id)}
                            autoFocus
                            className="text-sm text-orange-900 field-sizing-content min-h-[2rem] resize-none bg-transparent border-0 p-0 focus-visible:ring-0 shadow-none placeholder:text-orange-300"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Enter to add · Esc to cancel</p>
                      </div>
                      <CoachingArea>
                        <SuggestionPanel
                          suggestions={harmSuggestions[detailObs.id]}
                          loading={loadingHarmSuggestions[detailObs.id]}
                          onToggle={(sid) => toggleHarmSuggestion(detailObs.id, sid)}
                          onGenerateMore={() => generateMoreHarmSuggestions(detailObs.id)}
                        />
                      </CoachingArea>
                    </>
                  );
                })()}
              </div>

              {/* Column 3: Solution Criteria (green) */}
              <div className="space-y-3">
                <ColumnHeader label="Solution Criteria" color="green" />
                {(() => {
                  const harm = getHarmsForObservation(detailObs.id)[0];
                  if (!harm) {
                    return <p className="text-xs text-muted-foreground italic">Add a harm first</p>;
                  }
                  const harmCriteria = getCriteriaForHarm(harm.id);
                  const existingCrit = harmCriteria[0];
                  return (
                    <>
                      {existingCrit ? (
                        <ContentBlock
                          content={existingCrit.content}
                          color="green"
                          onDelete={() => handleDeleteCriterion(existingCrit.id)}
                          onSave={(c) => handleSaveCriterionContent(existingCrit.id, c)}
                        />
                      ) : (
                        <>
                          <div className="space-y-1">
                            <div className="px-3 py-2 rounded-md border bg-green-50 border-green-100 shadow-[inset_0_0_8px_rgba(34,197,94,0.25)] transition-shadow">
                              <Textarea
                                placeholder="The solution should..."
                                value={customCriterionInputs[harm.id] || ''}
                                onChange={(e) => setCustomCriterionInputs(prev => ({ ...prev, [harm.id]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    addCustomCriterion(harm.id);
                                  } else if (e.key === 'Escape') {
                                    setCustomCriterionInputs(prev => ({ ...prev, [harm.id]: '' }));
                                    (e.target as HTMLTextAreaElement).blur();
                                  }
                                }}
                                onFocus={() => handleCriterionInputFocus(harm.id)}
                                className="text-sm text-green-900 field-sizing-content min-h-[2rem] resize-none bg-transparent border-0 p-0 focus-visible:ring-0 shadow-none placeholder:text-green-300"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">Enter to add · Esc to cancel</p>
                          </div>
                          <CoachingArea>
                            <SuggestionPanel
                              suggestions={criterionSuggestions[harm.id]}
                              loading={loadingCriterionSuggestions[harm.id]}
                              onToggle={(sid) => toggleCriterionSuggestion(harm.id, sid)}
                              onGenerateMore={() => generateMoreCriterionSuggestions(harm.id)}
                            />
                          </CoachingArea>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Column 4: Strategies (purple) */}
              <div className="space-y-3">
                <ColumnHeader label="Strategies" color="purple" />
                {(() => {
                  const harm = getHarmsForObservation(detailObs.id)[0];
                  const allCriteria = harm ? getCriteriaForHarm(harm.id) : [];
                  if (allCriteria.length === 0) {
                    return <p className="text-xs text-muted-foreground italic">Add a criterion first</p>;
                  }
                  return allCriteria.map((crit) => {
                    const critStrategies = getStrategiesForCriterion(crit.id);
                    return (
                      <div key={crit.id} className="space-y-2">
                        {allCriteria.length > 1 && (
                          <p className="text-xs text-muted-foreground truncate" title={crit.content}>
                            {crit.content}
                          </p>
                        )}
                        {critStrategies.map((strat) => (
                          <ContentBlock
                            key={strat.id}
                            content={strat.content}
                            color="purple"
                            onDelete={() => handleDeleteStrategy(strat.id)}
                            onSave={(c) => handleSaveStrategyContent(strat.id, c)}
                            suffix={strat.strategyType ? (
                              <span className="text-xs text-purple-400 ml-1">({strat.strategyType})</span>
                            ) : undefined}
                          />
                        ))}
                        <div className="space-y-1">
                          <div className="px-3 py-2 rounded-md border bg-purple-50 border-purple-100 shadow-[inset_0_0_8px_rgba(168,85,247,0.25)] transition-shadow">
                            <Textarea
                              placeholder="How might we...?"
                              value={customStrategyInputs[crit.id] || ''}
                              onChange={(e) => setCustomStrategyInputs(prev => ({ ...prev, [crit.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  addCustomStrategy(crit.id);
                                } else if (e.key === 'Escape') {
                                  setCustomStrategyInputs(prev => ({ ...prev, [crit.id]: '' }));
                                  (e.target as HTMLTextAreaElement).blur();
                                }
                              }}
                              onFocus={() => handleStrategyInputFocus(crit.id)}
                              className="text-sm text-purple-900 field-sizing-content min-h-[2rem] resize-none bg-transparent border-0 p-0 focus-visible:ring-0 shadow-none placeholder:text-purple-300"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">Enter to add · Esc to cancel</p>
                        </div>
                        <CoachingArea>
                          <SuggestionPanel
                            suggestions={strategySuggestions[crit.id]}
                            loading={loadingStrategySuggestions[crit.id]}
                            onToggle={(sid) => toggleStrategySuggestion(crit.id, sid)}
                            onGenerateMore={() => generateMoreStrategySuggestions(crit.id)}
                            showType
                          />
                        </CoachingArea>
                      </div>
                    );
                  });
                })()}
              </div>

            </div>
          </div>
        ) : (
          /* ============ CARD GRID VIEW ============ */
          <>
            {/* Project Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                {isEditingName ? (
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onBlur={handleSaveProjectName}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveProjectName()}
                    className="text-2xl font-semibold h-auto py-1 px-2 w-auto"
                    autoFocus
                  />
                ) : (
                  <h1
                    className="text-2xl font-semibold text-foreground cursor-pointer hover:text-muted-foreground transition-colors"
                    onClick={() => setIsEditingName(true)}
                  >
                    {projectName}
                  </h1>
                )}
                {isArchived && (
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded mt-2 inline-block">Archived</span>
                )}
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {observations.length} obs &middot; {harms.length} harms &middot; {criteria.length} criteria &middot; {strategies.length} strategies
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      {copyFeedback || 'Copy'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleCopyAll}>
                      Copy All
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyMatrix}>
                      Copy as Matrix
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleCopyType('observations')} disabled={observations.length === 0}>
                      Copy Observations
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCopyType('harms')} disabled={harms.length === 0}>
                      Copy Harms
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCopyType('criteria')} disabled={criteria.length === 0}>
                      Copy Criteria
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleCopyType('strategies')} disabled={strategies.length === 0}>
                      Copy Strategies
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                      <SettingsIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setPasteModalOpen(true)}>
                      Paste Observations
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleToggleArchive}>
                      {isArchived ? 'Unarchive' : 'Archive'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Paste Observations Modal */}
            {pasteModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPasteModalOpen(false)}>
                <div className="bg-background rounded-lg border shadow-lg p-6 w-full max-w-lg mx-4 space-y-4" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-semibold">Paste Observations</h3>
                  <p className="text-sm text-muted-foreground">
                    Paste a list of observations, one per line. Each line becomes a new card.
                  </p>
                  <Textarea
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)}
                    placeholder={"Observation one\nObservation two\nObservation three"}
                    className="min-h-[200px]"
                    autoFocus
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {pasteText.split('\n').filter(l => l.trim()).length} observations
                    </span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setPasteModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handlePasteObservations}
                        disabled={pasteLoading || !pasteText.trim()}
                      >
                        {pasteLoading ? 'Adding...' : 'Add All'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Card Grid */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={observations.map(o => o.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
                  {/* Existing insight cards */}
                  {observations.map((obs) => (
                    <SortableCard
                      key={obs.id}
                      obs={obs}
                      obsHarms={getHarmsForObservation(obs.id)}
                      getCriteriaForHarm={getCriteriaForHarm}
                      getStrategiesForCriterion={getStrategiesForCriterion}
                      inlineAdd={inlineAdd}
                      setInlineAdd={setInlineAdd}
                      setDetailItem={setDetailItem}
                      handleSaveObservationTitle={handleSaveObservationTitle}
                      handleSaveObservationContent={handleSaveObservationContent}
                      handleSaveHarmContent={handleSaveHarmContent}
                      handleSaveCriterionContent={handleSaveCriterionContent}
                      handleSaveStrategyContent={handleSaveStrategyContent}
                      handleDeleteHarm={handleDeleteHarm}
                      handleDeleteCriterion={handleDeleteCriterion}
                      handleDeleteStrategy={handleDeleteStrategy}
                      handleAddObservationFromBranch={handleAddObservationFromBranch}
                      customHarmInputs={customHarmInputs}
                      setCustomHarmInputs={setCustomHarmInputs}
                      addCustomHarm={addCustomHarm}
                      customCriterionInputs={customCriterionInputs}
                      setCustomCriterionInputs={setCustomCriterionInputs}
                      addCustomCriterion={addCustomCriterion}
                      customStrategyInputs={customStrategyInputs}
                      setCustomStrategyInputs={setCustomStrategyInputs}
                      addCustomStrategy={addCustomStrategy}
                    />
                  ))}

                  {/* New Insight Card — always present, NOT sortable */}
                  <Card className="border-dashed">
                    <CardContent className="pt-4 pb-4 space-y-3">
                      <p className="text-sm text-muted-foreground font-medium">[add title]</p>

                      <Textarea
                        placeholder="What did you observe?"
                        value={newObservation}
                        onChange={(e) => handleObservationChange(e.target.value)}
                        className="min-h-[80px] resize-none text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newObservation.trim()) {
                              if (e.shiftKey) {
                                // Shift+Enter: save observation and open inline harm input
                                handleAddObservation().then((id) => {
                                  if (id) setInlineAdd({ parentId: id, type: 'harm' });
                                });
                              } else {
                                handleAddObservation();
                              }
                            }
                          }
                        }}
                      />

                      {/* Coaching text */}
                      {loadingCoaching && (
                        <p className="text-xs text-muted-foreground animate-pulse">Thinking...</p>
                      )}
                      {coachingText && !loadingCoaching && (
                        <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-md">
                          {coachingText}
                        </p>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Enter to add &middot; Shift+Enter to add harms
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </SortableContext>
            </DndContext>
          </>
        )}
      </main>
    </div>
  );
}

// ============ SUB-COMPONENTS ============

// Sortable card wrapper — uses dnd-kit's useSortable hook for drag-and-drop
function SortableCard({
  obs,
  obsHarms,
  getCriteriaForHarm,
  getStrategiesForCriterion,
  inlineAdd,
  setInlineAdd,
  setDetailItem,
  handleSaveObservationTitle,
  handleSaveObservationContent,
  handleSaveHarmContent,
  handleSaveCriterionContent,
  handleSaveStrategyContent,
  handleDeleteHarm,
  handleDeleteCriterion,
  handleDeleteStrategy,
  handleAddObservationFromBranch,
  customHarmInputs,
  setCustomHarmInputs,
  addCustomHarm,
  customCriterionInputs,
  setCustomCriterionInputs,
  addCustomCriterion,
  customStrategyInputs,
  setCustomStrategyInputs,
  addCustomStrategy,
}: {
  obs: Observation;
  obsHarms: Harm[];
  getCriteriaForHarm: (harmId: string) => Criterion[];
  getStrategiesForCriterion: (criterionId: string) => Strategy[];
  inlineAdd: { parentId: string; type: 'harm' | 'criterion' | 'strategy' } | null;
  setInlineAdd: (v: { parentId: string; type: 'harm' | 'criterion' | 'strategy' } | null) => void;
  setDetailItem: (v: DetailItem | null) => void;
  handleSaveObservationTitle: (obsId: string, title: string) => void;
  handleSaveObservationContent: (obsId: string, content: string) => void;
  handleSaveHarmContent: (harmId: string, content: string) => void;
  handleSaveCriterionContent: (criterionId: string, content: string) => void;
  handleSaveStrategyContent: (strategyId: string, content: string) => void;
  handleDeleteHarm: (harmId: string) => void;
  handleDeleteCriterion: (criterionId: string) => void;
  handleDeleteStrategy: (strategyId: string) => void;
  handleAddObservationFromBranch: (sourceObsId: string, content: string) => Promise<string | null>;
  customHarmInputs: Record<string, string>;
  setCustomHarmInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  addCustomHarm: (obsId: string) => Promise<string | null>;
  customCriterionInputs: Record<string, string>;
  setCustomCriterionInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  addCustomCriterion: (harmId: string) => Promise<string | null>;
  customStrategyInputs: Record<string, string>;
  setCustomStrategyInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  addCustomStrategy: (criterionId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: obs.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`group/card ${isDragging ? 'shadow-lg' : ''}`}
      data-item-id={obs.id}
    >
      <CardContent className="pt-4 pb-4 space-y-3">
        {/* Title + drag handle + expand */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            {/* Drag handle */}
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0 p-1 touch-none"
              title="Drag to reorder"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
                <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
              </svg>
            </button>
            <InsightTitle
              title={obs.title}
              onSave={(title) => handleSaveObservationTitle(obs.id, title)}
            />
          </div>
          <button
            onClick={() => setDetailItem({ type: 'observation', id: obs.id })}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1"
            title="Expand"
          >
            <ExpandIcon />
          </button>
        </div>

        {/* Observation */}
        <ContentBlock content={obs.content} color="blue" onSave={(c) => handleSaveObservationContent(obs.id, c)} />

        {/* Harms */}
        {obsHarms.map((harm) => {
          const harmCriteria = getCriteriaForHarm(harm.id);
          return (
            <div key={harm.id} className="space-y-2">
              <ContentBlock
                content={harm.content}
                color="orange"
                onDelete={() => handleDeleteHarm(harm.id)}
                onSave={(c) => handleSaveHarmContent(harm.id, c)}
              />

              {/* Inline add criterion */}
              {inlineAdd && inlineAdd.parentId === harm.id && inlineAdd.type === 'criterion' && (
                <div className="space-y-1">
                  <div className="px-3 py-2 rounded-md border bg-green-50 border-green-100 shadow-[inset_0_0_8px_rgba(34,197,94,0.25)] transition-shadow">
                    <Textarea
                      autoFocus
                      placeholder="What design criterion applies?"
                      value={customCriterionInputs[harm.id] || ''}
                      onChange={(e) => setCustomCriterionInputs(prev => ({ ...prev, [harm.id]: e.target.value }))}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          const critId = await addCustomCriterion(harm.id);
                          if (critId) {
                            setInlineAdd({ parentId: critId, type: 'strategy' });
                          }
                        } else if (e.key === 'Escape') {
                          setInlineAdd(null);
                        }
                      }}
                      onBlur={() => {
                        if (!customCriterionInputs[harm.id]?.trim()) setInlineAdd(null);
                      }}
                      className="text-sm text-green-900 field-sizing-content min-h-[2rem] resize-none bg-transparent border-0 p-0 focus-visible:ring-0 shadow-none placeholder:text-green-300"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Enter to add · Esc to cancel</p>
                </div>
              )}

              {/* Criteria under this harm */}
              {harmCriteria.map((crit) => {
                const critStrategies = getStrategiesForCriterion(crit.id);
                return (
                  <div key={crit.id} className="space-y-1">
                    <ContentBlock
                      content={crit.content}
                      color="green"
                      onDelete={() => handleDeleteCriterion(crit.id)}
                      onSave={(c) => handleSaveCriterionContent(crit.id, c)}
                    />

                    {/* Strategies under this criterion */}
                    {critStrategies.map((strat) => (
                      <div key={strat.id}>
                        <ContentBlock
                          content={strat.content}
                          color="purple"
                          onDelete={() => handleDeleteStrategy(strat.id)}
                          onSave={(c) => handleSaveStrategyContent(strat.id, c)}
                          suffix={strat.strategyType ? (
                            <span className="text-xs text-purple-400 ml-1">({strat.strategyType})</span>
                          ) : undefined}
                        />
                      </div>
                    ))}

                    {/* Inline add strategy */}
                    {inlineAdd && inlineAdd.parentId === crit.id && inlineAdd.type === 'strategy' && (
                      <div className="space-y-1">
                        <div className="px-3 py-2 rounded-md border bg-purple-50 border-purple-100 shadow-[inset_0_0_8px_rgba(168,85,247,0.25)] transition-shadow">
                          <Textarea
                            autoFocus
                            placeholder="How might we...?"
                            value={customStrategyInputs[crit.id] || ''}
                            onChange={(e) => setCustomStrategyInputs(prev => ({ ...prev, [crit.id]: e.target.value }))}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                await addCustomStrategy(crit.id);
                                setInlineAdd(null);
                              } else if (e.key === 'Escape') {
                                setInlineAdd(null);
                              }
                            }}
                            onBlur={() => {
                              if (!customStrategyInputs[crit.id]?.trim()) setInlineAdd(null);
                            }}
                            className="text-sm text-purple-900 field-sizing-content min-h-[2rem] resize-none bg-transparent border-0 p-0 focus-visible:ring-0 shadow-none placeholder:text-purple-300"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Enter to add · Esc to cancel</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Inline add input — harm (if no harm yet) */}
        {inlineAdd && inlineAdd.parentId === obs.id && inlineAdd.type === 'harm' && (
          <div className="space-y-1">
            <div className="px-3 py-2 rounded-md border bg-orange-50 border-orange-100 shadow-[inset_0_0_8px_rgba(249,115,22,0.25)] transition-shadow">
              <Textarea
                autoFocus
                placeholder="What harm could come from this?"
                value={customHarmInputs[obs.id] || ''}
                onChange={(e) => setCustomHarmInputs(prev => ({ ...prev, [obs.id]: e.target.value }))}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const harmId = await addCustomHarm(obs.id);
                    if (harmId) {
                      setInlineAdd({ parentId: harmId, type: 'criterion' });
                    }
                  } else if (e.key === 'Escape') {
                    setInlineAdd(null);
                  }
                }}
                onBlur={() => {
                  if (!customHarmInputs[obs.id]?.trim()) setInlineAdd(null);
                }}
                className="text-sm text-orange-900 field-sizing-content min-h-[2rem] resize-none bg-transparent border-0 p-0 focus-visible:ring-0 shadow-none placeholder:text-orange-300"
              />
            </div>
            <p className="text-xs text-muted-foreground">Enter to add · Esc to cancel</p>
          </div>
        )}

        {/* Context-aware add button + duplicate */}
        <div className="flex gap-2">
          {obsHarms.length === 0 ? (
            (() => {
              const isActive = inlineAdd?.parentId === obs.id && inlineAdd?.type === 'harm';
              return (
                <button
                  onClick={() => setInlineAdd(isActive ? null : { parentId: obs.id, type: 'harm' })}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-md border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors text-xs"
                >
                  {isActive ? <span>cancel</span> : <><PlusIcon /> <span>add harm</span></>}
                </button>
              );
            })()
          ) : (
            (() => {
              const harm = obsHarms[0];
              const harmCrit = getCriteriaForHarm(harm.id);
              const addLabel = harmCrit.length === 0 ? 'add criterion' : 'add strategy';
              const isActive = harmCrit.length === 0
                ? (inlineAdd?.parentId === harm.id && inlineAdd?.type === 'criterion')
                : (inlineAdd?.parentId === harmCrit[harmCrit.length - 1]?.id && inlineAdd?.type === 'strategy');
              return (
                <button
                  onClick={() => {
                    if (harmCrit.length === 0) {
                      setInlineAdd(
                        inlineAdd?.parentId === harm.id && inlineAdd?.type === 'criterion'
                          ? null
                          : { parentId: harm.id, type: 'criterion' }
                      );
                    } else {
                      const lastCrit = harmCrit[harmCrit.length - 1];
                      setInlineAdd(
                        inlineAdd?.parentId === lastCrit.id && inlineAdd?.type === 'strategy'
                          ? null
                          : { parentId: lastCrit.id, type: 'strategy' }
                      );
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-md border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors text-xs"
                >
                  {isActive ? <span>cancel</span> : <><PlusIcon /> <span>{addLabel}</span></>}
                </button>
              );
            })()
          )}
          {/* Duplicate card */}
          <button
            onClick={async () => {
              const id = await handleAddObservationFromBranch(obs.id, obs.content);
              if (id) setInlineAdd({ parentId: id, type: 'harm' });
            }}
            className="flex items-center justify-center gap-1 py-2 px-3 rounded-md border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors text-xs"
            title="Duplicate card"
          >
            <DuplicateIcon />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightTitle({ title, onSave, className }: { title?: string; onSave: (title: string) => void; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title || '');
  const sizeClass = className || 'text-sm';

  useEffect(() => { setValue(title || ''); }, [title]);

  if (editing) {
    return (
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => { setEditing(false); if (value.trim()) onSave(value.trim()); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { setEditing(false); if (value.trim()) onSave(value.trim()); }
          if (e.key === 'Escape') { setEditing(false); setValue(title || ''); }
        }}
        placeholder="Add title..."
        autoFocus
        className={`${sizeClass} font-medium h-auto py-0.5 px-1 w-auto`}
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`${sizeClass} font-medium text-left truncate ${title ? 'text-foreground' : 'text-muted-foreground'} hover:text-muted-foreground transition-colors`}
    >
      {title || '[add title]'}
    </button>
  );
}

function SuggestionPanel({
  suggestions,
  loading,
  onToggle,
  onGenerateMore,
  showType,
}: {
  suggestions?: Array<{ id: string; content: string; selected: boolean; type?: string }>;
  loading?: boolean;
  onToggle: (suggestionId: string) => void;
  onGenerateMore: () => void;
  showType?: boolean;
}) {
  const unselected = suggestions?.filter(s => !s.selected) || [];
  const visible = unselected.slice(0, 3);

  return (
    <div className="space-y-2">
      {loading && (
        <p className="text-xs text-muted-foreground animate-pulse">Generating...</p>
      )}
      {visible.map((suggestion) => (
        <div
          key={suggestion.id}
          onClick={() => onToggle(suggestion.id)}
          className="p-2 rounded-md cursor-pointer transition-colors hover:opacity-80 text-sm"
          style={{ backgroundColor: 'rgb(255, 251, 235)' }}
        >
          {suggestion.content}
          {showType && suggestion.type && (
            <span className="text-xs text-muted-foreground ml-1">({suggestion.type})</span>
          )}
        </div>
      ))}
      {!loading && visible.length > 0 && (
        <button
          onClick={onGenerateMore}
          className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          ↻ more suggestions
        </button>
      )}
    </div>
  );
}

export default function ProjectPage() {
  return (
    <ProtectedRoute>
      <ProjectContent />
    </ProtectedRoute>
  );
}
