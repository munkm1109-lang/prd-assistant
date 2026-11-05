import React, { useState } from 'react';
import { X, History, RotateCcw, FileText, CheckCircle2 } from 'lucide-react';
import { DocumentVersion, ChangeEvent } from '../types/prd';

interface HistoryModalProps {
  isOpen: boolean;
  versions: DocumentVersion[];
  currentVersionId: string | null;
  events: ChangeEvent[];
  onRestoreVersion: (version: DocumentVersion) => Promise<void>;
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  versions,
  currentVersionId,
  events,
  onRestoreVersion,
  onClose,
}) => {
  const [selectedVersionId, setSelectedVersionId] = useState<string>(
    currentVersionId || (versions.length > 0 ? versions[versions.length - 1].id : '')
  );
  const [isRestoring, setIsRestoring] = useState(false);

  if (!isOpen) return null;

  const selectedVersion = versions.find((v) => v.id === selectedVersionId) || versions[versions.length - 1];
  const isCurrent = selectedVersion?.id === currentVersionId;

  // Filter events related to versions
  const relatedEvents = events.filter((e) => e.afterVersionId === selectedVersion?.id);

  const handleRestore = async () => {
    if (!selectedVersion) return;
    setIsRestoring(true);
    try {
      await onRestoreVersion(selectedVersion);
      onClose();
    } catch (err: any) {
      alert(`복원 실패: ${err.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'user': return '직접 편집';
      case 'ai': return 'AI 생성·수정';
      case 'import': return '기존 문서 가져옴';
      case 'restore': return '이전 버전 복원';
      default: return source;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-xl border border-neutral-200 overflow-hidden flex flex-col h-[85vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-neutral-700" />
            <div>
              <h2 className="text-base font-semibold text-neutral-900">문서 버전 및 변경 이력</h2>
              <p className="text-xs text-neutral-500">
                과거 버전을 확인하고 필요한 경우 이전 상태로 복원할 수 있습니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Split */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Version list */}
          <div className="w-72 border-r border-neutral-200 bg-neutral-50 overflow-y-auto p-4 space-y-2">
            <div className="text-xs font-semibold text-neutral-500 px-2 pb-1 uppercase tracking-wider">
              문서 버전 목록 ({versions.length})
            </div>
            {versions.slice().reverse().map((ver) => {
              const isSelected = ver.id === selectedVersionId;
              const isCurrentVer = ver.id === currentVersionId;
              return (
                <button
                  key={ver.id}
                  onClick={() => setSelectedVersionId(ver.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-white border-neutral-400 shadow-xs'
                      : 'bg-white/60 border-neutral-200 hover:bg-white text-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-neutral-900">
                      v{ver.sequence} ({getSourceLabel(ver.source)})
                    </span>
                    {isCurrentVer && (
                      <span className="text-[10px] bg-neutral-900 text-white px-1.5 py-0.5 rounded-xs font-medium">
                        현재
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-1 font-mono">
                    {new Date(ver.createdAt).toLocaleString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  {ver.changeSummary && ver.changeSummary.length > 0 && (
                    <div className="text-xs text-neutral-600 mt-1.5 line-clamp-2">
                      {ver.changeSummary.join(', ')}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Selected version content & details */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {selectedVersion ? (
              <>
                <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/50">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-neutral-900">
                        버전 v{selectedVersion.sequence}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-neutral-200 text-neutral-700 rounded-sm">
                        {getSourceLabel(selectedVersion.source)}
                      </span>
                      {isCurrent && (
                        <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 현재 적용 중인 버전
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      작성 시각: {new Date(selectedVersion.createdAt).toLocaleString('ko-KR')} · 글자 수: {selectedVersion.markdown.length.toLocaleString()}자
                    </div>
                  </div>

                  {!isCurrent && (
                    <button
                      onClick={handleRestore}
                      disabled={isRestoring}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors disabled:bg-neutral-400"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>이 버전으로 복원</span>
                    </button>
                  )}
                </div>

                {/* Change details / events */}
                {relatedEvents.length > 0 && (
                  <div className="px-6 py-2.5 bg-amber-50/60 border-b border-amber-100 text-xs text-amber-900 flex items-center gap-2">
                    <span className="font-semibold">변경 사유:</span>
                    <span>{relatedEvents.map((e) => e.reason).join(' | ')}</span>
                  </div>
                )}

                {/* Markdown content preview */}
                <div className="flex-1 overflow-y-auto p-6 font-mono text-xs leading-relaxed text-neutral-800 whitespace-pre-wrap bg-neutral-50/30">
                  {selectedVersion.markdown}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-neutral-400 text-xs">
                선택된 버전이 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-neutral-50 border-t border-neutral-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
