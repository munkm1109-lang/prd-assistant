import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  Edit3,
  Eye,
  Save,
  X,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Download,
  CheckCircle,
} from 'lucide-react';
import { marked } from 'marked';
import * as storage from '../lib/storage';
import { DocumentVersion, PendingCandidate } from '../types/prd';

interface DocumentPanelProps {
  projectId?: string;
  currentVersion: DocumentVersion | null;
  candidateDraft: PendingCandidate | null;
  draftEditMarkdown: string | null;
  onSaveDirectEdit: (markdown: string) => Promise<void>;
  onClearDraftEdit: () => Promise<void>;
  onApplyDraftEdit: (markdown: string) => void;
  onRetryReviewCandidate?: () => Promise<void>;
  onExportCandidate?: () => void;
  isStaleReview?: boolean;
}

export const DocumentPanel: React.FC<DocumentPanelProps> = ({
  projectId,
  currentVersion,
  candidateDraft,
  draftEditMarkdown,
  onSaveDirectEdit,
  onClearDraftEdit,
  onApplyDraftEdit,
  onRetryReviewCandidate,
  onExportCandidate,
  isStaleReview,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [viewingCandidate, setViewingCandidate] = useState(false);

  // Synchronize edit text when current version changes or editing starts
  useEffect(() => {
    if (currentVersion && !isEditing) {
      setEditText(currentVersion.markdown);
    }
  }, [currentVersion, isEditing]);

  // 1-second debounce auto-save for draft edits (PRD Section 8)
  useEffect(() => {
    if (!isEditing || !projectId || !editText) return;
    const timer = setTimeout(() => {
      storage.saveDraftEdit(projectId, editText).catch((err) => {
        console.warn('임시 편집본 디바운스 저장 실패:', err);
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [editText, isEditing, projectId]);

  // Convert markdown to sanitized HTML with section anchors
  const renderedHtml = useMemo(() => {
    const rawMarkdown = viewingCandidate && candidateDraft
      ? candidateDraft.candidateMarkdown
      : currentVersion?.markdown || '';

    if (!rawMarkdown) return '<p class="text-neutral-400">문서 내용이 없습니다.</p>';

    // Configure marked
    marked.setOptions({
      gfm: true,
      breaks: true,
    });

    let html = marked.parse(rawMarkdown) as string;

    // Highlight assumptions: `[가정: ...]` or `> [가정] ...`
    html = html.replace(
      /\[가정:\s*([^\]]+)\]/g,
      '<span class="assumption-tag">가정</span><span class="text-amber-900 bg-amber-50 px-1 rounded">$1</span>'
    );

    // Add anchors to section headers for stage navigation
    html = html.replace(/<h[1-3]>(.*?)문제정의(.*?)<\/h[1-3]>/i, '<div id="sec-problem_definition"></div><h3>$1문제정의$2</h3>');
    html = html.replace(/<h[1-3]>(.*?)주요 사용자(.*?)<\/h[1-3]>/i, '<div id="sec-users"></div><h3>$1주요 사용자$2</h3>');
    html = html.replace(/<h[1-3]>(.*?)핵심 기능(.*?)<\/h[1-3]>/i, '<div id="sec-features"></div><h3>$1핵심 기능 및 우선순위$2</h3>');
    html = html.replace(/<h[1-3]>(.*?)성공 기준(.*?)<\/h[1-3]>/i, '<div id="sec-success_metrics"></div><h3>$1성공 기준 및 검증 계획$2</h3>');
    html = html.replace(/<h[1-3]>(.*?)PRD 통합(.*?)<\/h[1-3]>/i, '<div id="sec-integrated_prd"></div><h3>$1PRD 통합$2</h3>');

    return html;
  }, [currentVersion?.markdown, viewingCandidate, candidateDraft]);

  const handleStartEdit = () => {
    setEditText(currentVersion?.markdown || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditText(currentVersion?.markdown || '');
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) {
      alert('문서 내용을 비워둘 수 없습니다.');
      return;
    }
    if (editText.length > 30000) {
      alert('문서는 최대 30,000자까지 입력 가능합니다.');
      return;
    }

    setIsSaving(true);
    try {
      await onSaveDirectEdit(editText.trim());
      setIsEditing(false);
    } catch (err: any) {
      alert(`저장 실패: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top Bar inside Document Panel */}
      <div className="px-6 py-2.5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-neutral-600" />
          <span className="text-xs font-semibold text-neutral-800">
            {viewingCandidate ? '검토 미완료 초안' : `PRD 문서 v${currentVersion?.sequence || 1}`}
          </span>
          <span className="text-[11px] text-neutral-400 font-mono">
            ({(isEditing ? editText.length : (currentVersion?.markdown.length || 0)).toLocaleString()}자)
          </span>

          {isStaleReview && !isEditing && (
            <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-sm border border-amber-200">
              수정 후 재검토 필요
            </span>
          )}
        </div>

        {/* View / Edit Mode Switch */}
        <div className="flex items-center gap-1.5">
          {candidateDraft && (
            <button
              onClick={() => setViewingCandidate((prev) => !prev)}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                viewingCandidate
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {viewingCandidate ? '공식 버전 보기' : '초안 후보 보기'}
            </button>
          )}

          {!isEditing ? (
            <button
              onClick={handleStartEdit}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-medium text-neutral-700 hover:bg-neutral-100 border border-neutral-200 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-neutral-500" />
              <span>직접 편집</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-medium text-neutral-600 hover:bg-neutral-100 border border-neutral-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>취소</span>
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex items-center gap-1 text-xs px-3 py-1 rounded-md font-semibold text-white bg-neutral-900 hover:bg-neutral-800 transition-colors disabled:bg-neutral-400"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? '저장 중...' : '저장 (새 버전)'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Draft Recovery Banner if uncommitted draft exists */}
      {draftEditMarkdown && !isEditing && (
        <div className="px-6 py-2 bg-blue-50 border-b border-blue-200 text-xs text-blue-900 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>이전에 저장되지 않은 임시 편집본이 남아 있습니다.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (draftEditMarkdown) {
                  setEditText(draftEditMarkdown);
                  setIsEditing(true);
                  onApplyDraftEdit(draftEditMarkdown);
                }
              }}
              className="text-xs text-blue-700 underline font-semibold hover:text-blue-900"
            >
              임시본 복구하여 편집
            </button>
            <span className="text-blue-300">·</span>
            <button
              onClick={onClearDraftEdit}
              className="text-xs text-neutral-500 hover:text-neutral-700"
            >
              버리기
            </button>
          </div>
        </div>
      )}

      {/* Candidate Draft Banner (Section 9 & A11) */}
      {candidateDraft && (
        <div className="px-6 py-2.5 bg-amber-50/80 border-b border-amber-200 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-semibold">검토 미완료 초안: </span>
              <span>
                문서 생성은 완료되었으나 사전 검토가 아직 수행되지 않았습니다.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onExportCandidate && (
              <button
                onClick={onExportCandidate}
                className="text-xs text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 px-2 py-1 rounded-md font-medium"
              >
                초안 다운로드
              </button>
            )}
            {onRetryReviewCandidate && (
              <button
                onClick={onRetryReviewCandidate}
                className="text-xs text-white bg-amber-700 hover:bg-amber-800 px-2.5 py-1 rounded-md font-medium"
              >
                검토만 재시도
              </button>
            )}
          </div>
        </div>
      )}

      {/* Editor or Markdown Preview */}
      <div className="flex-1 overflow-y-auto p-8 pr-10">
        {isEditing ? (
          <div className="space-y-3 h-full flex flex-col">
            <div className="text-[11px] text-neutral-500">
              * 문서를 직접 편집하고 저장하면 새로운 버전이 생성되며, 이전 검토는 '재검토 필요'로 변경됩니다.
            </div>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="PRD 문서를 편집하세요 (Markdown 문법 지원)..."
              className="w-full flex-1 min-h-[500px] p-4 text-xs font-mono border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-neutral-900 leading-relaxed resize-none"
            />
            <div className="text-right text-[11px] text-neutral-400 font-mono">
              {editText.length.toLocaleString()} / 30,000자
            </div>
          </div>
        ) : (
          <article
            className="prd-content max-w-3xl mx-auto"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        )}
      </div>
    </div>
  );
};
