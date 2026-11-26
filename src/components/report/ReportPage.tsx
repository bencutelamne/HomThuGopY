import { Download, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchSurveyReport, type SurveyListItem } from '../../api/client';
import {
  formatVietnamDateTime,
  generateSurveyCsv,
  getQuestionTypeLabel,
  getStatusLabel,
} from '../../lib/surveyLogic';
import type { Survey, SurveyReport, SurveyStatus } from '../../types/survey';

interface ReportPageProps {
  surveys: SurveyListItem[];
  selectedSurveyId: string | null;
  onSelectSurvey: (id: string) => void;
}

export function ReportPage({
  surveys,
  selectedSurveyId,
  onSelectSurvey,
}: ReportPageProps) {
  const activeId = selectedSurveyId ?? surveys[0]?.id ?? null;

  const [unitFilter, setUnitFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    survey: Survey;
    computedStatus: SurveyStatus;
    report: SurveyReport;
    availableReportUnits: string[];
  } | null>(null);

  useEffect(() => {
    setUnitFilter('');
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchSurveyReport(activeId, unitFilter || undefined)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message || 'Không thể tải báo cáo.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeId, unitFilter]);

  const handleDownloadCsv = () => {
    if (!data) return;
    const csv = generateSurveyCsv(data.survey, data.report);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bao-cao-${data.survey.code.toLowerCase()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!activeId) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6">
        <p className="text-base font-medium">Chưa có dữ liệu khảo sát để thống kê.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-5 lg:px-6 lg:py-12">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Tự động tổng hợp &amp; phân tích dữ liệu
          </p>
          <h1 className="font-display mt-1 text-3xl font-extrabold uppercase tracking-tight text-[var(--color-text)] sm:text-5xl">
            BÁO CÁO KẾT QUẢ KHẢO SÁT
          </h1>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={!data}
            onClick={handleDownloadCsv}
            className="btn-editorial-primary inline-flex min-h-[42px] items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider whitespace-nowrap disabled:opacity-45 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Xuất CSV</span>
          </button>
          <button
            type="button"
            disabled={!data}
            onClick={() => window.print()}
            className="btn-editorial-outline inline-flex min-h-[42px] items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider whitespace-nowrap disabled:opacity-45 cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>In báo cáo</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="no-print mt-6 grid grid-cols-1 gap-4 border-b border-[var(--color-border-soft)] pb-6 md:grid-cols-12">
        <div className="md:col-span-8">
          <label
            htmlFor="report-survey-select"
            className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]"
          >
            Cuộc khảo sát
          </label>
          <select
            id="report-survey-select"
            value={activeId}
            onChange={(e) => onSelectSurvey(e.target.value)}
            className="mt-1.5 min-h-[42px] w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-text)]"
          >
            {surveys.map((s) => (
              <option key={s.id} value={s.id}>
                [{s.code}] {s.title} ({s.responseCount} phiếu)
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-4">
          <label
            htmlFor="report-unit-filter"
            className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]"
          >
            Lọc theo đơn vị
          </label>
          <select
            id="report-unit-filter"
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="mt-1.5 min-h-[42px] w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)]"
          >
            <option value="">Tất cả đơn vị</option>
            {(data?.availableReportUnits ?? []).map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4 py-10" aria-busy="true">
          <div className="h-24 animate-pulse border border-[var(--color-border-soft)] bg-[var(--color-surface)]" />
          <div className="h-48 animate-pulse border border-[var(--color-border-soft)] bg-[var(--color-surface)]" />
        </div>
      ) : error ? (
        <div className="my-8 border border-[var(--color-status-closed)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-status-closed)]">
          {error}
        </div>
      ) : data ? (
        <div className="mt-8 space-y-10">
          {/* Summary Header + KPI Strip */}
          <div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-text-muted)]">
              <span className="font-mono-tabular font-semibold text-[var(--color-text)]">
                {data.survey.code}
              </span>
              <span aria-hidden="true">·</span>
              <span>{getStatusLabel(data.computedStatus)}</span>
              <span aria-hidden="true">·</span>
              <span>
                {data.survey.isAnonymous ? 'Ẩn danh tuyệt đối' : 'Có định danh'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">
                Cập nhật lúc {formatVietnamDateTime(data.report.generatedAt)}
              </span>
            </div>
            <h2 className="mt-2 text-2xl font-bold text-[var(--color-text)]">
              {data.survey.title}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{data.survey.purpose}</p>

            <div className="mt-6 grid grid-cols-2 border border-[var(--color-border)] bg-[var(--color-surface)] sm:grid-cols-4">
              <div className="border-r border-b border-[var(--color-border-soft)] p-4 sm:border-b-0">
                <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                  Tổng số phiếu
                </p>
                <p className="font-display mt-1 text-4xl font-bold tabular-nums">
                  {data.report.totalResponses}
                </p>
              </div>
              <div className="border-b border-[var(--color-border-soft)] p-4 sm:border-r sm:border-b-0">
                <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                  Phiếu ẩn danh
                </p>
                <p className="font-display mt-1 text-4xl font-bold tabular-nums">
                  {data.report.anonymousCount}
                </p>
              </div>
              <div className="border-r border-[var(--color-border-soft)] p-4">
                <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                  Đơn vị tham gia
                </p>
                <p className="font-display mt-1 text-4xl font-bold tabular-nums">
                  {
                    data.report.unitBreakdown.filter(
                      (u) => u.unit !== 'Không phân định đơn vị',
                    ).length
                  }
                </p>
              </div>
              <div className="p-4">
                <p className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                  Số câu hỏi
                </p>
                <p className="font-display mt-1 text-4xl font-bold tabular-nums">
                  {data.report.questionReports.length}
                </p>
              </div>
            </div>
          </div>

          {/* Question-by-question breakdown */}
          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Thống kê chi tiết từng câu hỏi
            </h3>

            {data.report.questionReports.map((qr) => (
              <section
                key={qr.questionId}
                className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--color-border-soft)] pb-3">
                  <h4 className="text-base font-bold text-[var(--color-text)]">
                    <span className="font-mono-tabular mr-1.5">Câu {qr.order}:</span>
                    {qr.prompt}
                  </h4>
                  <span className="font-mono-tabular text-xs text-[var(--color-text-muted)]">
                    {getQuestionTypeLabel(qr.type)} · {qr.totalAnswered} lượt trả lời
                  </span>
                </div>

                {qr.type === 'open_text' ? (
                  <div className="mt-4">
                    {qr.textResponses.length === 0 ? (
                      <p className="text-sm text-[var(--color-text-muted)]">
                        Chưa có ý kiến đóng góp bằng văn bản cho câu hỏi này.
                      </p>
                    ) : (
                      <ul className="divide-y divide-[var(--color-border-soft)] border border-[var(--color-border-soft)] bg-[var(--color-bg)]">
                        {qr.textResponses.map((tr) => (
                          <li key={tr.receiptCode} className="p-4">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                              <span className="font-mono-tabular font-semibold text-[var(--color-text)]">
                                {tr.receiptCode}
                              </span>
                              {tr.unit && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span>{tr.unit}</span>
                                </>
                              )}
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-tabular">
                                {formatVietnamDateTime(tr.submittedAt)}
                              </span>
                            </div>
                            <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text)]">
                              {tr.text}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 space-y-3.5">
                    {qr.optionStats.map((os) => (
                      <div key={os.option}>
                        <div className="flex items-baseline justify-between gap-4 text-sm">
                          <span className="font-medium text-[var(--color-text)]">{os.option}</span>
                          <span className="font-mono-tabular shrink-0 text-xs font-semibold text-[var(--color-text)]">
                            {os.count} phiếu ({os.percentage}%)
                          </span>
                        </div>
                        <div className="mt-1.5 h-2.5 w-full bg-[var(--color-bg)] border border-[var(--color-border-soft)]">
                          <div
                            className="h-full bg-[var(--color-inverse-bg)] transition-all duration-300"
                            style={{ width: `${Math.min(100, os.percentage)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>

          {/* Unit distribution table */}
          <section className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              Phân bổ số lượng phiếu theo đơn vị
            </h3>
            {data.report.unitBreakdown.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--color-text-muted)]">Chưa có dữ liệu đơn vị.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
                      <th className="py-2.5 pr-4 font-semibold">Đơn vị</th>
                      <th className="py-2.5 px-4 text-right font-semibold">Số phiếu</th>
                      <th className="py-2.5 pl-4 text-right font-semibold">Tỷ lệ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-soft)]">
                    {data.report.unitBreakdown.map((row) => (
                      <tr key={row.unit}>
                        <td className="py-3 pr-4 font-medium text-[var(--color-text)]">{row.unit}</td>
                        <td className="font-mono-tabular py-3 px-4 text-right">{row.count}</td>
                        <td className="font-mono-tabular py-3 pl-4 text-right">
                          {row.percentage}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
