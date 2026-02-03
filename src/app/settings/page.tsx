'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { getPrompts, savePrompts, resetPrompts, defaultPrompts, type Prompts } from '@/lib/prompts';

function SettingsContent() {
  const [prompts, setPrompts] = useState<Prompts>(defaultPrompts);
  const [activeTab, setActiveTab] = useState<'harms' | 'criteria' | 'strategies'>('harms');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPrompts(getPrompts());
  }, []);

  const handleSave = () => {
    savePrompts(prompts);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    if (confirm('Reset all prompts to defaults? This cannot be undone.')) {
      resetPrompts();
      setPrompts(defaultPrompts);
    }
  };

  const handlePromptChange = (key: keyof Prompts, value: string) => {
    setPrompts(prev => ({ ...prev, [key]: value }));
  };

  const tabs = [
    { key: 'harms' as const, label: 'Harms', description: 'Prompt for suggesting potential harms from observations' },
    { key: 'criteria' as const, label: 'Criteria', description: 'Prompt for suggesting design criteria from harms' },
    { key: 'strategies' as const, label: 'Strategies', description: 'Prompt for suggesting strategies from criteria' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container max-w-screen-lg mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Prompt Settings</h1>
          <p className="text-muted-foreground mt-1">
            Customize the AI prompts used to generate suggestions
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>AI Prompts</CardTitle>
                <CardDescription>
                  Edit the prompts below. Use {'{{observations}}'}, {'{{harm}}'}, {'{{criterion}}'} as placeholders.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset}>
                  Reset to Defaults
                </Button>
                <Button onClick={handleSave}>
                  {saved ? 'Saved!' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    activeTab === tab.key
                      ? 'border-foreground text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Active Tab Content */}
            {tabs.map(tab => (
              <div key={tab.key} className={activeTab === tab.key ? 'block' : 'hidden'}>
                <p className="text-sm text-muted-foreground mb-3">{tab.description}</p>
                <Textarea
                  value={prompts[tab.key]}
                  onChange={(e) => handlePromptChange(tab.key, e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                  placeholder={`Enter the ${tab.label.toLowerCase()} prompt...`}
                />
              </div>
            ))}

            {/* Placeholder Reference */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Available Placeholders</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li><code className="bg-muted px-1 rounded">{'{{observations}}'}</code> - The selected observation(s) text</li>
                <li><code className="bg-muted px-1 rounded">{'{{harm}}'}</code> - The current harm being addressed</li>
                <li><code className="bg-muted px-1 rounded">{'{{criterion}}'}</code> - The current criterion being addressed</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
