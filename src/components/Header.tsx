import React, { useState, useRef, useEffect } from 'react';
import {
  FileText,
  ChevronDown,
  Download,
  RotateCcw,
  Check,
  AlertCircle,
  History,
  SlidersHorizontal,
  Play,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { Project, DocumentVersion, Review } from '../types/prd';

interface HeaderProps {
  currentProject: Project | null;
  currentVersion: DocumentVersion | null;
  review: Review | null;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  isReviewing: boolean;
  onRunReview: () => void;
  onOpenCriteriaModal: () => void;
  onOpenHistoryModal: () => void;
  onExportMarkdown: () => void;
  onExportJSON: () => void;
  onExportCandidate?: () => void;
  onBackToList: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentProject,
  currentVersion,
  review,
  saveStatus,
  isReviewing,
  onRunReview,
  onOpenCriteriaModal,
  onOpenHistoryModal,
  onExportMarkdown,
  onExportJSON,
  onExportCandidate,
  onBackToList,
}) => {
  const [exportOpen, setExportOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
        {/* Zone 1: Brand & Project Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBackToList}
            className="flex items-center gap-1.5 text-xs font-semibold text-neutral-900 hover:text-neutral-600 transition-colors shrink-0"
          >
            {currentProject ? (
              <span className="flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">목록</span>
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
                  P
                </span>
                <span>PRD 작성·검토 도우미</span>
              </div>
            )}
          </button>

          {currentProject && (
            <>
              <span className="text-neutral-300">/</span>
              <div className="flex items-center gap-2 truncate">
                <h1 className="text-xs sm:text-sm font-semibold text-neutral-900 truncate">
                  {currentProject.title}
                </h1>
                {currentVersion && (
                  <span className="text-[11px] text-neutral-500 font-mono shrink-0">
                    v{currentVersion.sequence}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Zone 2: Auto-save status indicator */}
        <div className="hidden md:flex items-center gap-2 text-xs text-neutral-400 font-mono shrink-0">
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1 text-neutral-500">
              <span className="w-2 h-2 rounded-full bg-neutral-400 animate-pulse" />
              <span>저장 중...</span>
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-emerald-600">
              <Check className="w-3 h-3" />
              <span>저장됨</span>
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1 text-rose-600">
              <AlertCircle className="w-3 h-3" />
              <span>저장 실패</span>
            </span>
          )}
        </div>

        {/* Zone 3: Actions */}
        {currentProject && (
          <div className="flex items-center gap-2 shrink-0">
            {/* Criteria button */}
            <button
              onClick={onOpenCriteriaModal}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
              title="완료 기준 보기 및 수정"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-500" />
              <span className="hidden sm:inline">기준 보기</span>
            </button>

            {/* History button */}
            <button
              onClick={onOpenHistoryModal}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
              title="문서 버전 및 변경 이력"
            >
              <History className="w-3.5 h-3.5 text-neutral-500" />
              <span className="hidden sm:inline">이력</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setExportOpen((prev) => !prev)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-neutral-500" />
                <span>내보내기</span>
                <ChevronDown className="w-3 h-3 text-neutral-400" />
              </button>

              {exportOpen && (
                <div className="absolute right-0 mt-1 w-52 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-50 text-xs">
                  <button
                    onClick={() => {
                      onExportMarkdown();
                      setExportOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-neutral-700 hover:bg-neutral-50 flex items-center justify-between"
                  >
                    <span>Markdown 문서 (.md)</span>
                    <span className="text-[10px] text-neutral-400">메타데이터 포함</span>
                  </button>

                  <button
                    onClick={() => {
                      onExportJSON();
                      setExportOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-neutral-700 hover:bg-neutral-50 flex items-center justify-between border-t border-neutral-100"
                  >
                    <span>JSON 프로젝트 백업 (.json)</span>
                    <span className="text-[10px] text-neutral-400">전체 복원용</span>
                  </button>

                  {currentProject.candidateDraft && onExportCandidate && (
                    <button
                      onClick={() => {
                        onExportCandidate();
                        setExportOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-amber-700 hover:bg-amber-50 flex items-center justify-between border-t border-neutral-100"
                    >
                      <span>검토 미완료 초안 내보내기</span>
                      <span className="text-[10px] text-amber-500">임시 후보</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Review Execution Button */}
            <button
              onClick={onRunReview}
              disabled={isReviewing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors shadow-xs disabled:bg-neutral-400"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isReviewing ? '검토 중...' : '검토 실행'}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
