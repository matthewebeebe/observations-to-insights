'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { WORKFLOW_STEPS } from '@/lib/types';
import type { Observation, Harm, Criterion, Strategy } from '@/lib/types';
import { db } from '@/lib/firebase';
import {
  getProject,
  updateProject,
  getObservations,
  createObservation,
  deleteObservation,
  getHarms,
  createHarm,
  deleteHarm,
  getCriteria,
  createCriterion,
  deleteCriterion,
  getStrategies,
  createStrategy,
  deleteStrategy,
} from '@/lib/firestore';
import { getPrompts } from '@/lib/prompts';

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

// API call to generate suggestions
async function fetchSuggestions(
  type: 'harms' | 'criteria' | 'strategies',
  context: { observations?: string; harm?: string; criterion?: string }
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

function ProjectContent() {
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState('Untitled Project');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [activeStep, setActiveStep] = useState<'overview' | 'observations' | 'harms' | 'criteria' | 'strategies'>('overview');
  const [newObservation, setNewObservation] = useState('');

  // Core data
  const [observations, setObservations] = useState<Observation[]>([]);
  const [harms, setHarms] = useState<Harm[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);

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

  // Track which input is focused (to show suggestions only for that item)
  const [focusedInputId, setFocusedInputId] = useState<string | null>(null);

  // Fetch harm suggestions on focus (lazy loading instead of eager)
  const handleHarmInputFocus = useCallback(async (obsId: string) => {
    setFocusedInputId(obsId);
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
    setFocusedInputId(harmId);
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
    setFocusedInputId(criterionId);
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

  // Navigate from overview to a specific tab with an input focused
  const pendingFocusId = useRef<string | null>(null);

  const navigateToInput = useCallback((step: 'harms' | 'criteria' | 'strategies', inputId: string) => {
    pendingFocusId.current = inputId;
    setActiveStep(step);
  }, []);

  // After tab switch, focus the target input element
  useEffect(() => {
    if (pendingFocusId.current) {
      const id = pendingFocusId.current;
      pendingFocusId.current = null;
      // Small delay to let the new tab render
      const timer = setTimeout(() => {
        const input = document.querySelector(`[data-input-id="${id}"]`) as HTMLInputElement;
        if (input) {
          input.focus();
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [activeStep]);

  const handleAddObservation = async () => {
    if (!newObservation.trim()) return;
    const content = newObservation.trim();
    setNewObservation('');

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
      } catch (error) {
        console.error('Error creating observation:', error);
        showError('Failed to save observation', error);
        setNewObservation(content); // Restore on error
      }
    } else {
      // Local fallback
      const observation: Observation = {
        id: crypto.randomUUID(),
        projectId,
        content,
        createdAt: new Date(),
      };
      setObservations([...observations, observation]);
    }
  };

  const toggleHarmSuggestion = async (obsId: string, suggestionId: string) => {
    const suggestions = harmSuggestions[obsId];
    const suggestion = suggestions?.find(s => s.id === suggestionId);
    if (!suggestion) return;

    if (suggestion.selected) {
      // Deselect - remove from harms
      const harmToRemove = harms.find(h => h.content === suggestion.content && h.observationIds.includes(obsId));
      if (harmToRemove && db) {
        try {
          await deleteHarm(harmToRemove.id);
        } catch (error) {
          console.error('Error deleting harm:', error);
        }
      }
      setHarms(harms.filter(h => !(h.content === suggestion.content && h.observationIds.includes(obsId))));
      setHarmSuggestions(prev => ({
        ...prev,
        [obsId]: prev[obsId].map(s => s.id === suggestionId ? { ...s, selected: false } : s)
      }));
    } else {
      // Select - add to harms
      if (db) {
        try {
          const id = await createHarm(projectId, [obsId], suggestion.content);
          const newHarm: Harm = {
            id,
            projectId,
            observationIds: [obsId],
            content: suggestion.content,
            createdAt: new Date(),
          };
          setHarms([...harms, newHarm]);
        } catch (error) {
          console.error('Error creating harm:', error);
          return;
        }
      } else {
        const newHarm: Harm = {
          id: crypto.randomUUID(),
          projectId,
          observationIds: [obsId],
          content: suggestion.content,
          createdAt: new Date(),
        };
        setHarms([...harms, newHarm]);
      }
      setHarmSuggestions(prev => ({
        ...prev,
        [obsId]: prev[obsId].map(s => s.id === suggestionId ? { ...s, selected: true } : s)
      }));
    }
  };

  const addCustomHarm = async (obsId: string) => {
    const content = customHarmInputs[obsId]?.trim();
    if (!content) return;
    setCustomHarmInputs(prev => ({ ...prev, [obsId]: '' }));

    if (db) {
      try {
        const id = await createHarm(projectId, [obsId], content);
        const newHarm: Harm = {
          id,
          projectId,
          observationIds: [obsId],
          content,
          createdAt: new Date(),
        };
        setHarms([...harms, newHarm]);
      } catch (error) {
        console.error('Error creating harm:', error);
        showError('Failed to save harm', error);
        setCustomHarmInputs(prev => ({ ...prev, [obsId]: content }));
      }
    } else {
      const newHarm: Harm = {
        id: crypto.randomUUID(),
        projectId,
        observationIds: [obsId],
        content,
        createdAt: new Date(),
      };
      setHarms([...harms, newHarm]);
    }
  };

  const generateMoreHarmSuggestions = async (obsId: string) => {
    const obs = observations.find(o => o.id === obsId);
    if (!obs || loadingHarmSuggestions[obsId]) return;

    setLoadingHarmSuggestions(prev => ({ ...prev, [obsId]: true }));
    try {
      const suggestions = await fetchSuggestions('harms', { observations: obs.content });
      const newSuggestions = suggestions.map(content => ({
        id: crypto.randomUUID(),
        content,
        selected: false,
      }));
      setHarmSuggestions(prev => ({
        ...prev,
        [obsId]: [...(prev[obsId] || []), ...newSuggestions]
      }));
    } catch (error) {
      console.error('Error generating more harm suggestions:', error);
    } finally {
      setLoadingHarmSuggestions(prev => ({ ...prev, [obsId]: false }));
    }
  };

  const toggleCriterionSuggestion = async (harmId: string, suggestionId: string) => {
    const suggestions = criterionSuggestions[harmId];
    const suggestion = suggestions?.find(s => s.id === suggestionId);
    if (!suggestion) return;

    if (suggestion.selected) {
      const critToRemove = criteria.find(c => c.content === suggestion.content && c.harmId === harmId);
      if (critToRemove && db) {
        try {
          await deleteCriterion(critToRemove.id);
        } catch (error) {
          console.error('Error deleting criterion:', error);
        }
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
          const newCriterion: Criterion = {
            id,
            projectId,
            harmId,
            content: suggestion.content,
          };
          setCriteria([...criteria, newCriterion]);
        } catch (error) {
          console.error('Error creating criterion:', error);
          return;
        }
      } else {
        const newCriterion: Criterion = {
          id: crypto.randomUUID(),
          harmId,
          content: suggestion.content,
        };
        setCriteria([...criteria, newCriterion]);
      }
      setCriterionSuggestions(prev => ({
        ...prev,
        [harmId]: prev[harmId].map(s => s.id === suggestionId ? { ...s, selected: true } : s)
      }));
    }
  };

  const addCustomCriterion = async (harmId: string) => {
    const content = customCriterionInputs[harmId]?.trim();
    if (!content) return;
    setCustomCriterionInputs(prev => ({ ...prev, [harmId]: '' }));

    if (db) {
      try {
        const id = await createCriterion(projectId, harmId, content);
        const newCriterion: Criterion = {
          id,
          projectId,
          harmId,
          content,
        };
        setCriteria([...criteria, newCriterion]);
      } catch (error) {
        console.error('Error creating criterion:', error);
        showError('Failed to save criterion', error);
        setCustomCriterionInputs(prev => ({ ...prev, [harmId]: content }));
      }
    } else {
      const newCriterion: Criterion = {
        id: crypto.randomUUID(),
        harmId,
        content,
      };
      setCriteria([...criteria, newCriterion]);
    }
  };

  const generateMoreCriterionSuggestions = async (harmId: string) => {
    const harm = harms.find(h => h.id === harmId);
    if (!harm || loadingCriterionSuggestions[harmId]) return;

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
      const newSuggestions = suggestions.map(content => ({
        id: crypto.randomUUID(),
        content,
        selected: false,
      }));
      setCriterionSuggestions(prev => ({
        ...prev,
        [harmId]: [...(prev[harmId] || []), ...newSuggestions]
      }));
    } catch (error) {
      console.error('Error generating more criterion suggestions:', error);
    } finally {
      setLoadingCriterionSuggestions(prev => ({ ...prev, [harmId]: false }));
    }
  };

  const toggleStrategySuggestion = async (criterionId: string, suggestionId: string) => {
    const suggestions = strategySuggestions[criterionId];
    const suggestion = suggestions?.find(s => s.id === suggestionId);
    if (!suggestion) return;

    if (suggestion.selected) {
      const stratToRemove = strategies.find(s => s.content === suggestion.content && s.criterionId === criterionId);
      if (stratToRemove && db) {
        try {
          await deleteStrategy(stratToRemove.id);
        } catch (error) {
          console.error('Error deleting strategy:', error);
        }
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
          const newStrategy: Strategy = {
            id,
            projectId,
            criterionId,
            content: suggestion.content,
            strategyType: suggestion.type,
          };
          setStrategies([...strategies, newStrategy]);
        } catch (error) {
          console.error('Error creating strategy:', error);
          return;
        }
      } else {
        const newStrategy: Strategy = {
          id: crypto.randomUUID(),
          criterionId,
          content: suggestion.content,
          strategyType: suggestion.type,
        };
        setStrategies([...strategies, newStrategy]);
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
        const newStrategy: Strategy = {
          id,
          projectId,
          criterionId,
          content: finalContent,
        };
        setStrategies([...strategies, newStrategy]);
      } catch (error) {
        console.error('Error creating strategy:', error);
        showError('Failed to save strategy', error);
        setCustomStrategyInputs(prev => ({ ...prev, [criterionId]: content }));
      }
    } else {
      const newStrategy: Strategy = {
        id: crypto.randomUUID(),
        criterionId,
        content: finalContent,
      };
      setStrategies([...strategies, newStrategy]);
    }
  };

  const generateMoreStrategySuggestions = async (criterionId: string) => {
    const crit = criteria.find(c => c.id === criterionId);
    if (!crit || loadingStrategySuggestions[criterionId]) return;

    setLoadingStrategySuggestions(prev => ({ ...prev, [criterionId]: true }));
    try {
      const harm = harms.find(h => h.id === crit.harmId);
      const suggestions = await fetchSuggestions('strategies', {
        criterion: crit.content,
        harm: harm?.content || '',
      });
      const newSuggestions = suggestions.map(content => ({
        id: crypto.randomUUID(),
        content,
        type: 'confront' as const,
        selected: false,
      }));
      setStrategySuggestions(prev => ({
        ...prev,
        [criterionId]: [...(prev[criterionId] || []), ...newSuggestions]
      }));
    } catch (error) {
      console.error('Error generating more strategy suggestions:', error);
    } finally {
      setLoadingStrategySuggestions(prev => ({ ...prev, [criterionId]: false }));
    }
  };

  // Get harms for a specific observation
  const getHarmsForObservation = (obsId: string) => {
    return harms.filter(h => h.observationIds.includes(obsId));
  };

  // Get criteria for a specific harm
  const getCriteriaForHarm = (harmId: string) => {
    return criteria.filter(c => c.harmId === harmId);
  };

  // Get strategies for a specific criterion
  const getStrategiesForCriterion = (criterionId: string) => {
    return strategies.filter(s => s.criterionId === criterionId);
  };

  // Get the observation for a harm
  const getObservationForHarm = (harm: Harm) => {
    return observations.find(o => harm.observationIds.includes(o.id));
  };

  // Get the harm for a criterion
  const getHarmForCriterion = (criterion: Criterion) => {
    return harms.find(h => h.id === criterion.harmId);
  };

  // Save project name
  const handleSaveProjectName = async () => {
    setIsEditingName(false);
    if (db) {
      try {
        await updateProject(projectId, { name: projectName });
      } catch (error) {
        console.error('Error updating project name:', error);
      }
    }
  };

  // Toggle archive
  const handleToggleArchive = async () => {
    const newArchived = !isArchived;
    setIsArchived(newArchived);
    if (db) {
      try {
        await updateProject(projectId, { archived: newArchived });
      } catch (error) {
        console.error('Error updating archive status:', error);
        setIsArchived(!newArchived); // Revert on error
      }
    }
  };

  // Delete observation
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

  // Export functionality
  const handleExport = () => {
    let exportText = `# ${projectName}\n\n`;

    if (observations.length > 0) {
      exportText += `## Observations\n`;
      observations.forEach((obs, i) => {
        exportText += `${i + 1}. ${obs.content}\n`;
      });
      exportText += `\n`;
    }

    if (harms.length > 0) {
      exportText += `## Harms\n`;
      harms.forEach((harm, i) => {
        const obs = getObservationForHarm(harm);
        exportText += `${i + 1}. ${harm.content}\n`;
        if (obs) exportText += `   ← From: "${obs.content.slice(0, 50)}..."\n`;
      });
      exportText += `\n`;
    }

    if (criteria.length > 0) {
      exportText += `## Criteria\n`;
      criteria.forEach((crit, i) => {
        exportText += `${i + 1}. ${crit.content}\n`;
      });
      exportText += `\n`;
    }

    if (strategies.length > 0) {
      exportText += `## Strategies (How Might We)\n`;
      strategies.forEach((strat, i) => {
        exportText += `${i + 1}. ${strat.content}${strat.strategyType ? ` (${strat.strategyType})` : ''}\n`;
      });
    }

    navigator.clipboard.writeText(exportText);
    alert('Copied to clipboard!');
  };

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

  return (
    <div className="min-h-screen bg-background">
      <Header projectName={projectName} />

      <div className="flex">
        {/* Workflow Sidebar */}
        <aside className="w-64 border-r border-border min-h-[calc(100vh-3.5rem)] p-4 hidden md:block">
          <nav className="space-y-1">
            {WORKFLOW_STEPS.map((step) => (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  activeStep === step.id
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                }`}
              >
                <div className="font-medium text-sm">{step.label}</div>
                <div className="text-xs opacity-70">{step.description}</div>
              </button>
            ))}
          </nav>

          {/* Stats */}
          <div className="mt-8 pt-4 border-t border-border">
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Observations</span>
                <span>{observations.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Harms</span>
                <span>{harms.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Criteria</span>
                <span>{criteria.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Strategies</span>
                <span>{strategies.length}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 max-w-4xl">
          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-700 ml-4 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Overview View */}
          {activeStep === 'overview' && (
            <div className="space-y-6">
              {/* Project Header */}
              <div className="flex items-start justify-between">
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
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded mt-2 inline-block">
                      Archived
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" x2="12" y1="15" y2="3" />
                    </svg>
                    Export
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleArchive}
                    className="text-muted-foreground"
                  >
                    {isArchived ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                          <rect width="20" height="5" x="2" y="3" rx="1" />
                          <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
                        </svg>
                        Unarchive
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                          <rect width="20" height="5" x="2" y="3" rx="1" />
                          <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
                          <path d="M10 12h4" />
                        </svg>
                        Archive
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                A bird's eye view of your synthesis — see how observations connect to insights.
              </p>

              {/* Empty state */}
              {observations.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground mb-4">No observations yet. Start by capturing what you observed.</p>
                    <Button variant="outline" onClick={() => setActiveStep('observations')}>
                      Add Observations
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                /* Synthesis Tree */
                <div className="space-y-4">
                  {observations.map((obs) => {
                    const obsHarms = getHarmsForObservation(obs.id);
                    return (
                      <Card key={obs.id}>
                        <CardContent className="py-4">
                          {/* Observation */}
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground mb-1">Observation</p>
                              <p className="text-foreground">{obs.content}</p>
                            </div>
                          </div>

                          {/* Harms */}
                          <div className="ml-5 mt-3 pl-4 border-l-2 border-border space-y-3">
                            {obsHarms.map((harm) => {
                              const harmCriteria = getCriteriaForHarm(harm.id);
                              return (
                                <div key={harm.id}>
                                  <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 shrink-0" />
                                    <div className="flex-1">
                                      <p className="text-xs text-muted-foreground mb-1">Harm</p>
                                      <p className="text-sm text-foreground">{harm.content}</p>
                                    </div>
                                  </div>

                                  {/* Criteria */}
                                  <div className="ml-5 mt-2 pl-4 border-l-2 border-border space-y-2">
                                    {harmCriteria.map((crit) => {
                                      const critStrategies = getStrategiesForCriterion(crit.id);
                                      return (
                                        <div key={crit.id}>
                                          <div className="flex items-start gap-3">
                                            <div className="w-2 h-2 rounded-full bg-green-500 mt-2 shrink-0" />
                                            <div className="flex-1">
                                              <p className="text-xs text-muted-foreground mb-1">Criterion</p>
                                              <p className="text-sm text-foreground">{crit.content}</p>
                                            </div>
                                          </div>

                                          {/* Strategies */}
                                          <div className="ml-5 mt-2 pl-4 border-l-2 border-border space-y-1">
                                            {critStrategies.map((strat) => (
                                              <div key={strat.id} className="flex items-start gap-3">
                                                <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 shrink-0" />
                                                <div className="flex-1">
                                                  <p className="text-xs text-muted-foreground mb-1">
                                                    Strategy {strat.strategyType && <span className="opacity-60">({strat.strategyType})</span>}
                                                  </p>
                                                  <p className="text-sm text-foreground">{strat.content}</p>
                                                </div>
                                              </div>
                                            ))}
                                            <button
                                              onClick={() => navigateToInput('strategies', crit.id)}
                                              className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors pl-5"
                                            >
                                              + add strategy
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                    <button
                                      onClick={() => navigateToInput('criteria', harm.id)}
                                      className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors pl-5"
                                    >
                                      + add criterion
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                            <button
                              onClick={() => navigateToInput('harms', obs.id)}
                              className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors pl-5"
                            >
                              + add harm
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Quick action to continue */}
              {observations.length > 0 && (
                <div className="flex justify-end pt-4">
                  <Button variant="outline" onClick={() => setActiveStep('observations')} className="gap-2">
                    Edit Observations
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Observations View */}
          {activeStep === 'observations' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-foreground">Observations</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Capture objective facts from your research — things you saw or heard.
                </p>
              </div>

              {/* Input Area */}
              <Card>
                <CardContent className="pt-4">
                  <Textarea
                    placeholder="What did you observe?"
                    value={newObservation}
                    onChange={(e) => setNewObservation(e.target.value)}
                    className="min-h-[80px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (newObservation.trim()) {
                          handleAddObservation();
                        }
                      }
                    }}
                  />
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-xs text-muted-foreground">
                      Enter to add, Shift+Enter for new line
                    </span>
                    <Button onClick={handleAddObservation} disabled={!newObservation.trim()} size="sm">
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Observation List */}
              {observations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">No observations yet. Add what you saw or heard during research.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {observations.map((obs) => (
                    <Card key={obs.id} className="group">
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-foreground">{obs.content}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground shrink-0"
                            onClick={() => handleDeleteObservation(obs.id)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                            </svg>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {observations.length > 0 && (
                <div className="flex justify-end pt-4">
                  <Button variant="outline" onClick={() => setActiveStep('harms')} className="gap-2">
                    Continue to Harms
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Harms View */}
          {activeStep === 'harms' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-foreground">Harms</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  For each observation, identify what value is being compromised.
                </p>
              </div>

              {observations.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground mb-4">Add some observations first.</p>
                    <Button variant="outline" onClick={() => setActiveStep('observations')}>
                      Go to Observations
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {observations.map((obs) => (
                    <Card key={obs.id}>
                      <CardContent className="pt-4 space-y-4">
                        {/* Observation context at top */}
                        <div className="px-3 py-2 rounded bg-muted/30">
                          <p className="text-xs text-muted-foreground mb-1">Observation:</p>
                          <p className="text-sm text-muted-foreground">{obs.content}</p>
                        </div>

                        {/* Custom input */}
                        <div>
                          <Input
                            placeholder="What value is being compromised?"
                            value={customHarmInputs[obs.id] || ''}
                            onChange={(e) => setCustomHarmInputs(prev => ({ ...prev, [obs.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && addCustomHarm(obs.id)}
                            onFocus={() => handleHarmInputFocus(obs.id)}
                            onBlur={() => setTimeout(() => setFocusedInputId(prev => prev === obs.id ? null : prev), 200)}
                            data-input-id={obs.id}
                            className="w-full"
                          />
                        </div>

                        {/* Added harms for this observation */}
                        {getHarmsForObservation(obs.id).length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Added:</p>
                            <div className="flex flex-wrap gap-2">
                              {getHarmsForObservation(obs.id).map(harm => (
                                <span key={harm.id} className="text-sm bg-primary/10 text-primary px-3 py-1.5 rounded">
                                  {harm.content}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Suggestions - only shown when this input is focused */}
                        {focusedInputId === obs.id && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Suggestions:</p>
                            {loadingHarmSuggestions[obs.id] && (
                              <p className="text-sm text-muted-foreground animate-pulse">Generating suggestions...</p>
                            )}
                            {harmSuggestions[obs.id]?.filter(s => !s.selected).map((suggestion) => (
                              <div
                                key={suggestion.id}
                                onClick={() => toggleHarmSuggestion(obs.id, suggestion.id)}
                                className="p-3 rounded-lg cursor-pointer transition-colors hover:opacity-80"
                                style={{ backgroundColor: 'rgb(255, 251, 235)' }}
                              >
                                <span className="text-sm">{suggestion.content}</span>
                              </div>
                            ))}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => generateMoreHarmSuggestions(obs.id)}
                              className="text-muted-foreground"
                            >
                              + Generate more suggestions
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {harms.length > 0 && (
                <div className="flex justify-end pt-4">
                  <Button variant="outline" onClick={() => setActiveStep('criteria')} className="gap-2">
                    Continue to Criteria
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Criteria View */}
          {activeStep === 'criteria' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-foreground">Criteria</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Define what the solution must do to address each harm.
                </p>
              </div>

              {harms.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground mb-4">Identify some harms first.</p>
                    <Button variant="outline" onClick={() => setActiveStep('harms')}>
                      Go to Harms
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {harms.map((harm) => (
                    <Card key={harm.id}>
                      <CardContent className="pt-4 space-y-4">
                        {/* Harm context at top */}
                        <div className="px-3 py-2 rounded bg-muted/30">
                          <p className="text-xs text-muted-foreground mb-1">Harm:</p>
                          <p className="text-sm text-muted-foreground">{harm.content}</p>
                        </div>

                        {/* Custom input */}
                        <div>
                          <Input
                            placeholder="The solution should..."
                            value={customCriterionInputs[harm.id] || ''}
                            onChange={(e) => setCustomCriterionInputs(prev => ({ ...prev, [harm.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && addCustomCriterion(harm.id)}
                            onFocus={() => handleCriterionInputFocus(harm.id)}
                            onBlur={() => setTimeout(() => setFocusedInputId(prev => prev === harm.id ? null : prev), 200)}
                            data-input-id={harm.id}
                            className="w-full"
                          />
                        </div>

                        {/* Added criteria for this harm */}
                        {getCriteriaForHarm(harm.id).length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Added:</p>
                            <div className="flex flex-wrap gap-2">
                              {getCriteriaForHarm(harm.id).map(crit => (
                                <span key={crit.id} className="text-sm bg-primary/10 text-primary px-3 py-1.5 rounded">
                                  {crit.content}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Suggestions - only shown when this input is focused */}
                        {focusedInputId === harm.id && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Suggestions:</p>
                            {loadingCriterionSuggestions[harm.id] && (
                              <p className="text-sm text-muted-foreground animate-pulse">Generating suggestions...</p>
                            )}
                            {criterionSuggestions[harm.id]?.filter(s => !s.selected).map((suggestion) => (
                              <div
                                key={suggestion.id}
                                onClick={() => toggleCriterionSuggestion(harm.id, suggestion.id)}
                                className="p-3 rounded-lg cursor-pointer transition-colors hover:opacity-80"
                                style={{ backgroundColor: 'rgb(255, 251, 235)' }}
                              >
                                <span className="text-sm">{suggestion.content}</span>
                              </div>
                            ))}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => generateMoreCriterionSuggestions(harm.id)}
                              className="text-muted-foreground"
                            >
                              + Generate more suggestions
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {criteria.length > 0 && (
                <div className="flex justify-end pt-4">
                  <Button variant="outline" onClick={() => setActiveStep('strategies')} className="gap-2">
                    Continue to Strategies
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Strategies View */}
          {activeStep === 'strategies' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-foreground">Strategies</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Generate "How Might We" statements to explore solution directions.
                </p>
              </div>

              {criteria.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground mb-4">Define some criteria first.</p>
                    <Button variant="outline" onClick={() => setActiveStep('criteria')}>
                      Go to Criteria
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {criteria.map((crit) => (
                    <Card key={crit.id}>
                      <CardContent className="pt-4 space-y-4">
                        {/* Criterion context at top */}
                        <div className="px-3 py-2 rounded bg-muted/30">
                          <p className="text-xs text-muted-foreground mb-1">Criterion:</p>
                          <p className="text-sm text-muted-foreground">{crit.content}</p>
                        </div>

                        {/* Custom input */}
                        <div>
                          <Input
                            placeholder="How might we..."
                            value={customStrategyInputs[crit.id] || ''}
                            onChange={(e) => setCustomStrategyInputs(prev => ({ ...prev, [crit.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && addCustomStrategy(crit.id)}
                            onFocus={() => handleStrategyInputFocus(crit.id)}
                            onBlur={() => setTimeout(() => setFocusedInputId(prev => prev === crit.id ? null : prev), 200)}
                            data-input-id={crit.id}
                            className="w-full"
                          />
                        </div>

                        {/* Added strategies for this criterion */}
                        {getStrategiesForCriterion(crit.id).length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Added:</p>
                            <div className="flex flex-wrap gap-2">
                              {getStrategiesForCriterion(crit.id).map(strat => (
                                <span key={strat.id} className="text-sm bg-primary/10 text-primary px-3 py-1.5 rounded">
                                  {strat.content}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Suggestions - only shown when this input is focused */}
                        {focusedInputId === crit.id && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Suggestions:</p>
                            {loadingStrategySuggestions[crit.id] && (
                              <p className="text-sm text-muted-foreground animate-pulse">Generating suggestions...</p>
                            )}
                            {strategySuggestions[crit.id]?.filter(s => !s.selected).map((suggestion) => (
                              <div
                                key={suggestion.id}
                                onClick={() => toggleStrategySuggestion(crit.id, suggestion.id)}
                                className="p-3 rounded-lg cursor-pointer transition-colors hover:opacity-80"
                                style={{ backgroundColor: 'rgb(255, 251, 235)' }}
                              >
                                <span className="text-sm">{suggestion.content}</span>
                                <span className="text-xs text-muted-foreground ml-2">({suggestion.type})</span>
                              </div>
                            ))}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => generateMoreStrategySuggestions(crit.id)}
                              className="text-muted-foreground"
                            >
                              + Generate more suggestions
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {strategies.length > 0 && (
                <div className="flex justify-end pt-4">
                  <Button variant="outline" onClick={() => setActiveStep('overview')} className="gap-2">
                    View Overview
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </Button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
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
