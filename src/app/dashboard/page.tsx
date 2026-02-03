'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getProjects, createProject } from '@/lib/firestore';
import { db } from '@/lib/firebase';
import type { Project } from '@/lib/types';

function DashboardContent() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);

  // Load projects on mount
  useEffect(() => {
    let isMounted = true;

    async function loadProjects() {
      if (!db) {
        setLoading(false);
        return;
      }

      // Set a timeout to prevent infinite loading
      const timeout = setTimeout(() => {
        if (isMounted) {
          console.log('Firestore timeout - showing empty state');
          setLoading(false);
        }
      }, 8000);

      try {
        const loadedProjects = await getProjects('dev-user');
        if (isMounted) {
          setProjects(loadedProjects);
        }
      } catch (error) {
        console.error('Error loading projects:', error);
      } finally {
        clearTimeout(timeout);
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProjects();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || creating) return;

    setCreating(true);

    try {
      if (db) {
        // Create in Firestore
        const projectId = await createProject('dev-user', newProjectName.trim());
        // Navigate to the new project
        router.push(`/project/${projectId}`);
      } else {
        // Local fallback
        const newProject: Project = {
          id: crypto.randomUUID(),
          userId: 'dev-user',
          name: newProjectName.trim(),
          tags: [],
          archived: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setProjects([newProject, ...projects]);
        setNewProjectName('');
        setShowNewProject(false);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container max-w-screen-xl mx-auto px-4 py-8">
          <div className="animate-pulse text-muted-foreground">Loading projects...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-screen-xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
            <p className="text-muted-foreground mt-1">
              Your research synthesis projects
            </p>
          </div>
          <Button onClick={() => setShowNewProject(true)}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            New Project
          </Button>
        </div>

        {/* New Project Input */}
        {showNewProject && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Input
                  placeholder="Project name..."
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateProject();
                    if (e.key === 'Escape') setShowNewProject(false);
                  }}
                  autoFocus
                  className="flex-1"
                  disabled={creating}
                />
                <Button onClick={handleCreateProject} disabled={creating}>
                  {creating ? 'Creating...' : 'Create'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowNewProject(false);
                    setNewProjectName('');
                  }}
                  disabled={creating}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Project Grid */}
        {projects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                No projects yet. Create your first one!
              </p>
              <Button onClick={() => setShowNewProject(true)}>
                Create Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Link key={project.id} href={`/project/${project.id}`}>
                <Card className="hover:border-foreground/20 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <CardDescription>
                      {project.archived && <span className="text-orange-500">Archived</span>}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      Updated {project.updatedAt.toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
