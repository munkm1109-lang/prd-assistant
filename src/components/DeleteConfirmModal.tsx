import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  projectTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  projectTitle,
  onConfirm,
  onCancel,
}) => {
  const [typedTitle, setTypedTitle] = useState('');

  if (!isOpen) return null;

  const isMatched = typedTitle.trim() === projectTitle.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-neutral-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div className="flex items-center gap-2 text-rose-600 font-semibold text-base">
            <AlertTriangle className="w-5 h-5" />
            <span>프로젝트 삭제</span>
          </div>
          <button
            onClick={onCancel}
            className="text-neutral-400 hover:text-neutral-600 transition-colors p-1"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-sm text-neutral-600">
          <p>
            정말로 <strong className="text-neutral-900 font-semibold">"{projectTitle}"</strong> 프로젝트를 삭제하시겠습니까?
          </p>
          <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-100">
            삭제하면 작성된 모든 문서 버전, 검토 이력, 대화 내역이 브라우저에서 영구히 제거되며 복구할 수 없습니다.
          </p>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              확인을 위해 프로젝트 이름을 입력하세요:
            </label>
            <input
              type="text"
              value={typedTitle}
              onChange={(e) => setTypedTitle(e.target.value)}
              placeholder={projectTitle}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 bg-neutral-50 border-t border-neutral-100">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            취소
          </button>
          <button
            disabled={!isMatched}
            onClick={() => {
              if (isMatched) {
                onConfirm();
                setTypedTitle('');
              }
            }}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
              isMatched
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
            }`}
          >
            삭제 확인
          </button>
        </div>
      </div>
    </div>
  );
};
