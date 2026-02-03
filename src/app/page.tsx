'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { user, isConfigured, signInWithGoogle } = useAuth();
  const router = useRouter();

  const handleGetStarted = async () => {
    if (user) {
      router.push('/dashboard');
    } else if (isConfigured) {
      await signInWithGoogle();
      router.push('/dashboard');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-2xl text-center space-y-6">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground">
            From observations
            <br />
            <span className="text-muted-foreground">to insights</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            A thinking tool that helps you move from raw research observations
            to actionable design insights. Guided by AI, driven by you.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            {user ? (
              <Button size="lg" className="px-8" onClick={() => router.push('/dashboard')}>
                Go to Dashboard
              </Button>
            ) : (
              <Button size="lg" className="px-8" onClick={handleGetStarted}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  className="mr-2"
                >
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </Button>
            )}
          </div>
        </div>

        {/* Process Overview */}
        <div className="mt-20 max-w-3xl w-full">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { step: '1', title: 'Observation', desc: 'What did you see or hear?' },
              { step: '2', title: 'Harm', desc: 'What value is compromised?' },
              { step: '3', title: 'Criterion', desc: 'What must the solution do?' },
              { step: '4', title: 'Strategy', desc: 'How might we solve this?' },
            ].map((item, i) => (
              <div key={item.step} className="relative">
                <div className="p-4 rounded-lg border border-border bg-card">
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Step {item.step}
                  </div>
                  <div className="font-medium text-foreground">{item.title}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {item.desc}
                  </div>
                </div>
                {i < 3 && (
                  <div className="hidden sm:block absolute top-1/2 -right-2 transform -translate-y-1/2 text-muted-foreground/30">
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-4">
        <div className="max-w-screen-2xl mx-auto text-center text-sm text-muted-foreground">
          A design thinking tool for synthesis
        </div>
      </footer>
    </main>
  );
}
