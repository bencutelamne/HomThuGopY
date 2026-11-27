import { useCallback, useEffect, useState } from 'react';
import {
  clearAllFeedback,
  fetchCurrentUser,
  fetchFeedback,
  fetchFeedbackSummary,
  logoutAccount,
  submitFeedback,
  toggleFeedbackStatus,
} from './api/client';
import { AccountDashboardPage } from './components/admin/AccountDashboardPage';
import { LoginPage } from './components/auth/LoginPage';
import { FeedbackBoxPage } from './components/feedback/FeedbackBoxPage';
import { SiteHeader, type AppTab } from './components/layout/SiteHeader';
import type { AuthUser, FeedbackEntry, FeedbackSummary } from './types/survey';

const EMPTY_SUMMARY: FeedbackSummary = {
  total: 0,
  byUnit: {},
};

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('submit');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [feedbackList, setFeedbackList] = useState<FeedbackEntry[]>([]);
  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummary>(EMPTY_SUMMARY);

  const loadSummary = useCallback(async () => {
    try {
      const summary = await fetchFeedbackSummary();
      setFeedbackSummary(summary);
    } catch {
      // Keep current summary if API is unavailable
    }
  }, []);

  const loadAccessibleFeedback = useCallback(async (user: AuthUser | null) => {
    if (user?.role !== 'admin' && user?.role !== 'officer') {
      setFeedbackList([]);
      return;
    }
    try {
      const list = await fetchFeedback();
      setFeedbackList(list);
    } catch {
      setFeedbackList([]);
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([fetchCurrentUser(), fetchFeedbackSummary()])
      .then(async ([user, summary]) => {
        if (!active) return;
        setCurrentUser(user);
        setFeedbackSummary(summary);
        if (user?.role === 'admin' || user?.role === 'officer') {
          try {
            const list = await fetchFeedback();
            if (active) setFeedbackList(list);
          } catch {
            if (active) setFeedbackList([]);
          }
        }
      })
      .catch(() => {
        // Keep defaults if API is unavailable
      });

    return () => {
      active = false;
    };
  }, []);

  const handleLoginSuccess = async (user: AuthUser) => {
    setCurrentUser(user);
    await loadAccessibleFeedback(user);
    setActiveTab('submit');
  };

  const handleLogout = async () => {
    try {
      await logoutAccount();
    } finally {
      setCurrentUser(null);
      setFeedbackList([]);
      if (activeTab === 'list' || activeTab === 'accounts') {
        setActiveTab('submit');
      }
    }
  };

  const handleSubmitFeedback = async (payload: {
    targetUnit: string;
    isAnonymous: boolean;
    senderName?: string;
    content: string;
  }) => {
    const created = await submitFeedback(payload);
    if (currentUser?.role === 'admin' || currentUser?.role === 'officer') {
      setFeedbackList((prev) => [created, ...prev]);
    }
    await loadSummary();
    return created;
  };

  const handleToggleStatus = async (id: string) => {
    const updated = await toggleFeedbackStatus(id);
    setFeedbackList((prev) => prev.map((item) => (item.id === id ? updated : item)));
  };

  const handleClearAllFeedback = async () => {
    await clearAllFeedback();
    setFeedbackList([]);
    await loadSummary();
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      <SiteHeader
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        feedbackCount={feedbackList.length}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="relative flex-1 overflow-hidden">
        {/* Decorative bottom-right patriotic crimson & gold flag wave matching reference 2 */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed bottom-0 right-0 z-0 w-[340px] sm:w-[460px] lg:w-[560px] opacity-90 select-none no-print"
        >
          <svg viewBox="0 0 560 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto block">
            <path
              d="M90 220C215 168 330 85 560 12V220H90Z"
              fill="#B91C1C"
              fillOpacity="0.88"
            />
            <path
              d="M145 220C275 165 385 110 560 72V220H145Z"
              fill="#991B1B"
              fillOpacity="0.92"
            />
            <path
              d="M84 220C212 168 328 84 560 10"
              stroke="#F3C43B"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M175 220C300 172 415 125 560 95"
              stroke="#F3C43B"
              strokeOpacity="0.5"
              strokeWidth="2"
            />
            <polygon
              points="468,78 474.5,97 494.5,97 478.2,108.8 484.4,128 468,116.2 451.6,128 457.8,108.8 441.5,97 461.5,97"
              fill="#F3C43B"
            />
          </svg>
        </div>

        <div key={activeTab} className="view-enter relative z-10">
          {activeTab === 'login' ? (
            <LoginPage
              currentUser={currentUser}
              onLoginSuccess={handleLoginSuccess}
              onLogout={handleLogout}
              onBackHome={() => setActiveTab('submit')}
              onGoList={() => setActiveTab('list')}
              onGoAccounts={() => setActiveTab('accounts')}
            />
          ) : activeTab === 'accounts' ? (
            <AccountDashboardPage
              currentUser={currentUser}
              onSwitchTab={setActiveTab}
              onSelfAccountUpdated={(updated) => setCurrentUser(updated)}
            />
          ) : (
            <FeedbackBoxPage
              activeTab={activeTab}
              currentUser={currentUser}
              feedbackList={feedbackList}
              feedbackSummary={feedbackSummary}
              onSubmitFeedback={handleSubmitFeedback}
              onToggleStatus={handleToggleStatus}
              onClearAllFeedback={handleClearAllFeedback}
              onSwitchTab={setActiveTab}
            />
          )}
        </div>
      </main>
    </div>
  );
}
