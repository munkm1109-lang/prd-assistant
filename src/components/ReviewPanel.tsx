import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Clock,
  ShieldCheck,
  AlertCircle,
  FileQuestion,
} from 'lucide-react';
import { Review, Criterion, STAGES } from '../types/prd';

interface ReviewPanelProps {
  review: Review | null;
  criteria: Criterion[];
  isStaleReview?: boolean;
  onApplyFixes?: () => Promise<void>;
  onRunReview?: () => void;
  isReviewing?: boolean;
}

export const ReviewPanel: React.FC<ReviewPanelProps> = ({
  review,
  criteria,
  isStaleReview,
  onApplyFixes,
  onRunReview,
  isReviewing,
}) => {
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [criteriaOpen, setCriteriaOpen] = useState(false);

  if (!review) {
    return (
      <div className="flex flex-col h-full bg-white border-l border-neutral-200 p-6 text-center justify-center items-center space-y-4">
        <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-neutral-800">아직 검토 결과가 없습니다</h3>
          <p className="text-xs text-neutral-500 max-w-xs">
            상단의 '검토 실행' 버튼을 누르면 5개 단계 기준에 맞춰 정밀 사전 검토를 수행합니다.
          </p>
        </div>
        {onRunReview && (
          <button
            onClick={onRunReview}
            disabled={isReviewing}
            className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors disabled:bg-neutral-400"
          >
            {isReviewing ? '검토 진행 중...' : '검토 실행'}
          </button>
        )}
      </div>
    );
  }

  const requiredFindings = review.findings.filter((f) => f.severity === 'required');
  const optionalFindings = review.findings.filter((f) => f.severity === 'optional');
  const canProceed = review.verdict === 'can_proceed';

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'new_evidence': return '새로운 근거 발견';
      case 'requirement_changed': return '요구사항 변경 반영';
      case 'existing_error_found': return '기존 누락/오류 발견으로 정정';
      default: return reason;
    }
  };

  const getKindBadge = (kind: string) => {
    switch (kind) {
      case 'user_provided':
        return <span className="text-[10px] text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded-sm">사용자 제공</span>;
      case 'document_provided':
        return <span className="text-[10px] text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded-sm">문서 내용</span>;
      case 'assumption':
        return <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-sm font-medium">가설/가정</span>;
      case 'proposal':
        return <span className="text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-sm font-medium">제안 목표</span>;
      case 'unverified':
        return <span className="text-[10px] text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-sm font-medium">미확인</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-neutral-200 overflow-y-auto">
      {/* Header */}
      <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
        <span className="text-xs font-semibold text-neutral-800">사전 검토 결과</span>
        <span className="text-[11px] text-neutral-400 font-mono">
          {new Date(review.createdAt).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      <div className="p-5 space-y-6 text-neutral-800">
        {/* Stale Warning if document edited afterwards */}
        {isStaleReview && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold">
              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              <span>이전 버전의 검토 결과입니다</span>
            </div>
            <p className="text-[11px] text-amber-700">
              문서 직접 편집 또는 기준 변경 후 아직 재검토를 실행하지 않았습니다. 최신 판정을 보려면 '검토 실행'을 누르세요.
            </p>
          </div>
        )}

        {/* 1. 진행 판단 (Verdict & Verdict Reason) */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            1. 진행 판단
          </div>

          <div
            className={`p-4 rounded-xl border ${
              isStaleReview
                ? 'bg-neutral-50 border-neutral-200 text-neutral-700'
                : canProceed
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/70 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-center gap-2">
              {isStaleReview ? (
                <RotateCcw className="w-5 h-5 text-neutral-500" />
              ) : canProceed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              )}
              <h4 className="text-sm font-bold">
                {isStaleReview
                  ? '재검토 필요'
                  : canProceed
                  ? '진행 가능'
                  : '필수 정보 보완 필요'}
              </h4>
            </div>

            <p className="text-xs mt-2 leading-relaxed font-normal">
              {review.verdictReason}
            </p>

            {/* Verdict Change Notice */}
            {review.verdictChange && (
              <div className="mt-3 pt-2.5 border-t border-neutral-200/60 text-[11px] space-y-1">
                <div className="font-semibold text-neutral-800 flex items-center gap-1">
                  <span>이전 판단 정정:</span>
                  <span className="font-normal text-neutral-600">
                    {getReasonLabel(review.verdictChange.reason)}
                  </span>
                </div>
                <div className="text-neutral-600">
                  {review.verdictChange.detail}
                </div>
              </div>
            )}
          </div>

          {/* Mandatory disclaimer (Section 3.4) */}
          <p className="text-[11px] text-neutral-400 leading-normal px-1">
            * 현재 작성 목적에 대한 판단이며, 개발 착수나 효과 입증을 보장하지 않습니다.
          </p>
        </div>

        {/* 2. 다음 작업 (Next Actions) */}
        {review.nextActions && review.nextActions.length > 0 && (
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              2. 다음 작업
            </div>
            <ul className="space-y-1.5 text-xs">
              {review.nextActions.map((action, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-neutral-50 p-2.5 rounded-lg border border-neutral-100">
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-500 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 3. 보류할 결정 (Deferred Decisions) */}
        {review.deferredDecisions && review.deferredDecisions.length > 0 && (
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              3. 보류할 결정
            </div>
            <div className="space-y-2 text-xs">
              {review.deferredDecisions.map((def, idx) => (
                <div key={idx} className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-100 space-y-1">
                  <div className="font-semibold text-neutral-800">{def.decision}</div>
                  <div className="text-[11px] text-neutral-500">{def.reason}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. 필수 보완 (Required Findings) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              4. 필수 보완 ({requiredFindings.length})
            </div>
            {requiredFindings.length > 0 && onApplyFixes && (
              <button
                onClick={onApplyFixes}
                className="text-[11px] font-semibold text-amber-800 hover:text-amber-900 underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>필수 보완 자동 반영</span>
              </button>
            )}
          </div>

          {requiredFindings.length === 0 ? (
            <div className="p-3 bg-neutral-50 rounded-lg text-xs text-neutral-500 border border-neutral-100">
              발견된 필수 보완 없음
            </div>
          ) : (
            <div className="space-y-3">
              {requiredFindings.map((finding) => (
                <div
                  key={finding.id}
                  className="p-3 bg-amber-50/50 border border-amber-200/80 rounded-xl space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-950">
                      {finding.problem}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {finding.location}
                    </span>
                  </div>

                  {finding.quote && (
                    <blockquote className="text-[11px] text-neutral-600 bg-white/70 p-2 rounded-md border border-neutral-200/50 italic">
                      "{finding.quote}"
                    </blockquote>
                  )}

                  <div className="text-[11px] text-neutral-700">
                    <span className="font-medium text-amber-900">영향: </span>
                    <span>{finding.impact}</span>
                  </div>

                  <div className="text-[11px] text-neutral-800 bg-white/80 p-2 rounded-md border border-amber-100">
                    <span className="font-semibold text-neutral-900">제안 수정: </span>
                    <span>{finding.suggestedFix}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. 미확인 사항 (Evidence / Assumptions / Unverified) */}
        {review.evidence && review.evidence.length > 0 && (
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              5. 근거 및 미확인 사항 ({review.evidence.length})
            </div>
            <div className="space-y-2">
              {review.evidence.map((ev) => (
                <div
                  key={ev.id}
                  className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-100 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-neutral-800">{ev.text}</span>
                    <div className="shrink-0">{getKindBadge(ev.kind)}</div>
                  </div>
                  {ev.confirmationPlan && (
                    <div className="text-[11px] text-neutral-500">
                      <span className="font-medium text-neutral-600">확인 방법: </span>
                      <span>{ev.confirmationPlan}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. 선택 개선 (Optional Findings - Collapsible) */}
        <div className="border border-neutral-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setOptionalOpen((prev) => !prev)}
            className="w-full flex items-center justify-between p-3.5 bg-neutral-50/70 hover:bg-neutral-100 text-left text-xs font-semibold text-neutral-700 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <span>6. 선택 개선</span>
              <span className="text-[11px] text-neutral-400 font-mono">
                ({optionalFindings.length}건)
              </span>
            </div>
            {optionalOpen ? (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            )}
          </button>

          {optionalOpen && (
            <div className="p-3.5 space-y-2.5 bg-white border-t border-neutral-200 text-xs">
              {optionalFindings.length === 0 ? (
                <div className="text-neutral-400 text-xs">발견된 선택 개선 사항이 없습니다.</div>
              ) : (
                optionalFindings.map((finding) => (
                  <div
                    key={finding.id}
                    className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-100 space-y-1"
                  >
                    <div className="font-medium text-neutral-800">{finding.problem}</div>
                    <div className="text-[11px] text-neutral-500">
                      위치: {finding.location} · {finding.suggestedFix}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 7. 기준별 결과 (Checks by criterion - Collapsible) */}
        <div className="border border-neutral-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setCriteriaOpen((prev) => !prev)}
            className="w-full flex items-center justify-between p-3.5 bg-neutral-50/70 hover:bg-neutral-100 text-left text-xs font-semibold text-neutral-700 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <span>7. 기준별 상세 평가</span>
              <span className="text-[11px] text-neutral-400 font-mono">
                ({review.checks.length}개 기준)
              </span>
            </div>
            {criteriaOpen ? (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            )}
          </button>

          {criteriaOpen && (
            <div className="p-3.5 space-y-3 bg-white border-t border-neutral-200 text-xs">
              {review.checks.map((check) => {
                const criterion = criteria.find((c) => c.id === check.criterionId);
                const isMet = check.status === 'met';
                const isUnmet = check.status === 'unmet';
                const isNA = check.status === 'not_applicable';

                return (
                  <div
                    key={check.criterionId}
                    className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-100 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-neutral-900 line-clamp-1">
                        {criterion?.text || check.criterionId}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-sm shrink-0 ${
                          isMet
                            ? 'bg-emerald-100 text-emerald-800'
                            : isUnmet
                            ? 'bg-amber-100 text-amber-800'
                            : isNA
                            ? 'bg-neutral-200 text-neutral-700'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {isMet ? '충족' : isUnmet ? '미충족' : isNA ? '해당없음' : '판단불가'}
                      </span>
                    </div>

                    <div className="text-[11px] text-neutral-500 leading-normal">
                      {check.rationale}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
