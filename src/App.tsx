import { useCallback, useEffect, useState } from 'react';
import {
  fetchSurveys,
  toggleSurveyLock,
  type SurveyListItem,
} from './api/client';
import { CreateSurveyPage } from './components/create/CreateSurveyPage';
import { DirectFeedbackPage } from './components/feedback/DirectFeedbackPage';
import { OverviewPage } from './components/home/OverviewPage';
import { SiteFooter } from './components/layout/SiteFooter';
import { SiteHeader, type AppView } from './components/layout/SiteHeader';
import { ReportPage } from './components/report/ReportPage';
import { TakeSurveyPage } from './components/take/TakeSurveyPage';
import type { Survey } from './types/survey';

function getInitialRoute(): { view: AppView; surveyId: string | null } {
  if (typeof window === 'undefined') {
    return { view: 'overview', surveyId: null };
  }
  const params = new URLSearchParams(window.location.search);
  const rawView = params.get('view');
  const id = params.get('id');
  const validViews: AppView[] = ['overview', 'create', 'take', 'report', 'feedback'];
  const view = validViews.includes(rawView as AppView) ? (rawView as AppView) : 'overview';
  return { view, surveyId: id };
}

export default function App() {
  const initial = getInitialRoute();
  const [activeView, setActiveView] = useState<AppView>(initial.view);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(initial.surveyId);
  const [surveys, setSurveys] = useState<SurveyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const loadSurveys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchSurveys();
      setSurveys(list);
    } catch (err) {
      setError((err as Error).message || 'Không thể tải danh sách khảo sát.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSurveys();
  }, [loadSurveys]);

  const syncUrl = (view: AppView, surveyId: string | null) => {
    const params = new URLSearchParams();
    if (view !== 'overview') {
      params.set('view', view);
    }
    if (surveyId && (view === 'take' || view === 'report')) {
      params.set('id', surveyId);
    }
    const qs = params.toString();
    const nextUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState({}, '', nextUrl);
  };

  const navigate = (view: AppView, surveyId: string | null = selectedSurveyId) => {
    setActiveView(view);
    setSelectedSurveyId(surveyId);
    syncUrl(view, surveyId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenTake = (surveyId: string) => {
    navigate('take', surveyId);
  };

  const handleOpenReport = (surveyId: string) => {
    navigate('report', surveyId);
  };

  const handleSurveyCreated = async (created: Survey) => {
    await loadSurveys();
    setBannerMessage(`Đã phát hành phiếu khảo sát "${created.title}" (${created.code}).`);
    navigate('overview', created.id);
    window.setTimeout(() => setBannerMessage(null), 6000);
  };

  const handleToggleLock = async (surveyId: string) => {
    await toggleSurveyLock(surveyId);
    await loadSurveys();
  };

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      <SiteHeader
        activeView={activeView}
        onNavigate={(v) => navigate(v, selectedSurveyId)}
      />

      {bannerMessage && (
        <div
          role="status"
          className="border-b border-[var(--color-status-active)] bg-[var(--color-surface)] px-4 py-3 text-sm font-medium text-[var(--color-status-active)] sm:px-6"
        >
          <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
            <span>{bannerMessage}</span>
            <button
              type="button"
              onClick={() => setBannerMessage(null)}
              className="text-xs font-semibold uppercase tracking-wider underline cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      <main className="flex-1">
        <div key={activeView} className="view-enter">
            {activeView === 'overview' && (
              <OverviewPage
                surveys={surveys}
                loading={loading}
                error={error}
                onNavigate={(v) => navigate(v)}
                onOpenTake={handleOpenTake}
                onOpenReport={handleOpenReport}
                onToggleLock={handleToggleLock}
                onRetry={loadSurveys}
              />
            )}

            {activeView === 'create' && (
              <CreateSurveyPage
                onCreated={handleSurveyCreated}
                onCancel={() => navigate('overview')}
              />
            )}

            {activeView === 'take' && (
              <TakeSurveyPage
                surveys={surveys}
                selectedSurveyId={selectedSurveyId}
                onSelectSurvey={(id) => navigate('take', id)}
                onSubmitted={loadSurveys}
                onOpenReport={handleOpenReport}
              />
            )}

            {activeView === 'report' && (
              <ReportPage
                surveys={surveys}
                selectedSurveyId={selectedSurveyId}
                onSelectSurvey={(id) => navigate('report', id)}
              />
            )}

            {activeView === 'feedback' && <DirectFeedbackPage />}
        </div>
      </main>

      <SiteFooter onNavigate={(v) => navigate(v)} />
    </div>
  );
}
