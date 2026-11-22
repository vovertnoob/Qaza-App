import { useCallback, useEffect, useState } from 'react';
import { QazaProvider, useQaza } from './context/QazaContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AppShell } from './components/AppShell';
import { HomeDashboard, type NavTab } from './components/HomeDashboard';
import { QazaTrackerView } from './components/QazaTrackerView';
import { ActivityView } from './components/ActivityView';
import { SettingsView } from './components/SettingsView';
import { OnboardingWizard } from './components/OnboardingWizard';
import { AuthModal } from './components/AuthModal';

function tabFromPath(pathname: string): NavTab {
  if (pathname.startsWith('/tracker')) return 'tracker';
  if (pathname.startsWith('/activity')) return 'activity';
  if (pathname.startsWith('/settings')) return 'settings';
  return 'home';
}

function pathFromTab(tab: NavTab): string {
  return tab === 'home' ? '/' : `/${tab}`;
}

function QazaAppContent() {
  const { authLoading, dataLoading, snapshot } = useQaza();
  const [activeTab, setActiveTab] = useState<NavTab>(() =>
    tabFromPath(window.location.pathname)
  );
  const [trackerSection, setTrackerSection] = useState<'tracker' | 'calculator'>('tracker');
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const navigate = useCallback((tab: NavTab) => {
    setActiveTab(tab);
    if (tab !== 'tracker') setTrackerSection('tracker');
    const nextPath = pathFromTab(tab);
    if (window.location.pathname !== nextPath) {
      window.history.pushState({ tab }, '', nextPath);
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const openCalculator = useCallback(() => {
    setTrackerSection('calculator');
    setActiveTab('tracker');
    if (window.location.pathname !== '/tracker') {
      window.history.pushState({ tab: 'tracker' }, '', '/tracker');
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  useEffect(() => {
    const onPop = () => {
      setActiveTab(tabFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] dark:bg-[#0E1311] flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white dark:bg-[#151C19] border border-[#E5E2DC] dark:border-[#242E2A] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <img src="/icon.svg" alt="" className="w-7 h-7 rounded-lg" />
            <span className="font-display font-semibold text-base">QazaFlow</span>
          </div>
          <div className="space-y-2.5 animate-pulse">
            <div className="h-4 bg-[#F1EFE9] dark:bg-[#242E2A] rounded w-2/3" />
            <div className="h-8 bg-[#F1EFE9] dark:bg-[#242E2A] rounded w-1/2" />
            <div className="h-2.5 bg-[#F1EFE9] dark:bg-[#242E2A] rounded w-full" />
          </div>
          <p className="text-xs text-[#5C635E] dark:text-[#9AA59E]">Loading your Qaza ledger...</p>
        </div>
      </div>
    );
  }

  if (!snapshot.profile.onboardingCompleted) {
    return (
      <>
        <OnboardingWizard onOpenAuth={() => setAuthModalOpen(true)} />
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </>
    );
  }

  return (
    <>
      <AppShell
        activeTab={activeTab}
        onNavigate={navigate}
        onOpenAuth={() => setAuthModalOpen(true)}
      >
        {activeTab === 'home' && (
          <HomeDashboard onNavigate={navigate} onOpenCalculator={openCalculator} />
        )}
        {activeTab === 'tracker' && (
          <QazaTrackerView key={trackerSection} initialSection={trackerSection} />
        )}
        {activeTab === 'activity' && <ActivityView />}
        {activeTab === 'settings' && <SettingsView onOpenAuth={() => setAuthModalOpen(true)} />}
      </AppShell>
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QazaProvider>
        <QazaAppContent />
      </QazaProvider>
    </ErrorBoundary>
  );
}
