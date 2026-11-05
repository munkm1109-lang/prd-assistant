import React, { useState } from 'react';
import { X, CheckSquare, Plus, Trash2, HelpCircle } from 'lucide-react';
import { Criterion, StageId, STAGES } from '../types/prd';

interface CriteriaModalProps {
  isOpen: boolean;
  currentCriteria: Criterion[];
  criteriaSequence: number;
  onSaveNewCriteria: (criteria: Criterion[], reason: string) => Promise<void>;
  onClose: () => void;
}

export const CriteriaModal: React.FC<CriteriaModalProps> = ({
  isOpen,
  currentCriteria,
  criteriaSequence,
  onSaveNewCriteria,
  onClose,
}) => {
  const [selectedStage, setSelectedStage] = useState<StageId>('problem_definition');
  const [editingCriteria, setEditingCriteria] = useState<Criterion[]>(() =>
    JSON.parse(JSON.stringify(currentCriteria))
  );
  const [changeReason, setChangeReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const stageCriteria = editingCriteria.filter((c) => c.stageId === selectedStage);

  const handleUpdateCriterion = (id: string, updates: Partial<Criterion>) => {
    setEditingCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const handleAddCriterion = () => {
    const stageInfo = STAGES.find((s) => s.id === selectedStage);
    const newCrit: Criterion = {
      id: `crit_${selectedStage.substring(0, 4)}_${Date.now()}`,
      stageId: selectedStage,
      stageName: stageInfo?.name || '기준',
      text: '',
      required: true,
      allowNotApplicable: false,
    };
    setEditingCriteria((prev) => [...prev, newCrit]);
  };

  const handleDeleteCriterion = (id: string) => {
    setEditingCriteria((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSave = async () => {
    setErrorMsg('');
    // Validation
    const emptyCrit = editingCriteria.find((c) => !c.text.trim());
    if (emptyCrit) {
      setErrorMsg('모든 기준의 내용을 입력해야 합니다. 비어 있는 기준을 삭제하거나 내용을 채워주세요.');
      return;
    }

    if (!changeReason.trim()) {
      setErrorMsg('기준을 수정하려면 변경 이유를 반드시 입력해야 합니다.');
      return;
    }

    setIsSaving(true);
    try {
      await onSaveNewCriteria(editingCriteria, changeReason.trim());
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || '기준 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-neutral-900">PRD 완료 기준 관리</h2>
              <span className="text-xs text-neutral-500 font-mono">v{criteriaSequence}</span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              5단계 완료 기준을 확인하고 프로젝트 요구사항에 맞게 맞춤 조정할 수 있습니다.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stage Selector Tabs */}
        <div className="flex border-b border-neutral-200 bg-neutral-50 px-6 overflow-x-auto">
          {STAGES.map((stage) => {
            const count = editingCriteria.filter((c) => c.stageId === stage.id).length;
            const isSelected = selectedStage === stage.id;
            return (
              <button
                key={stage.id}
                onClick={() => setSelectedStage(stage.id)}
                className={`flex items-center gap-1.5 py-3 px-4 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'border-neutral-900 text-neutral-900 bg-white'
                    : 'border-transparent text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <span>{stage.name}</span>
                <span className="text-[10px] text-neutral-400 font-mono">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
            <div>
              <h3 className="text-sm font-medium text-neutral-800">
                {STAGES.find((s) => s.id === selectedStage)?.name} 단계 완료 기준
              </h3>
              <p className="text-xs text-neutral-500">
                {STAGES.find((s) => s.id === selectedStage)?.description}
              </p>
            </div>
            <button
              onClick={handleAddCriterion}
              className="flex items-center gap-1 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>기준 추가</span>
            </button>
          </div>

          {stageCriteria.length === 0 ? (
            <div className="text-center py-8 text-neutral-400 text-xs">
              이 단계에 등록된 기준이 없습니다. 기준 추가 버튼을 눌러보세요.
            </div>
          ) : (
            <div className="space-y-3">
              {stageCriteria.map((crit, idx) => (
                <div
                  key={crit.id}
                  className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-200/80 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-mono text-neutral-400 pt-1">
                      #{idx + 1}
                    </span>
                    <textarea
                      rows={2}
                      value={crit.text}
                      onChange={(e) => handleUpdateCriterion(crit.id, { text: e.target.value })}
                      placeholder="기준 내용을 입력하세요"
                      className="flex-1 text-xs p-2 bg-white border border-neutral-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-neutral-400"
                    />
                    <button
                      onClick={() => handleDeleteCriterion(crit.id)}
                      className="text-neutral-400 hover:text-rose-600 transition-colors p-1"
                      title="기준 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-neutral-600 pl-6">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={crit.required}
                        onChange={(e) =>
                          handleUpdateCriterion(crit.id, { required: e.target.checked })
                        }
                        className="rounded-xs text-neutral-900 border-neutral-300 focus:ring-neutral-500"
                      />
                      <span>필수 기준</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={crit.allowNotApplicable}
                        onChange={(e) =>
                          handleUpdateCriterion(crit.id, {
                            allowNotApplicable: e.target.checked,
                          })
                        }
                        className="rounded-xs text-neutral-900 border-neutral-300 focus:ring-neutral-500"
                      />
                      <span>'해당 없음(N/A)' 허용</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Change Reason Requirement (Section 5) */}
          <div className="pt-4 border-t border-neutral-200">
            <label className="block text-xs font-medium text-neutral-800 mb-1">
              기준 변경 이유 <span className="text-rose-600">* (필수)</span>
            </label>
            <p className="text-[11px] text-neutral-500 mb-2">
              기준 변경 시 새 기준 버전(v{criteriaSequence + 1})이 생성되며, 이전 검토는 '재검토 필요' 상태로 갱신됩니다.
            </p>
            <input
              type="text"
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="예: B2B 엔터프라이즈 환경에 맞게 보안 및 권한 기준 강화"
              className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-neutral-400"
            />
          </div>

          {errorMsg && (
            <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-neutral-50 border-t border-neutral-200">
          <div className="text-[11px] text-neutral-500 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>총 {editingCriteria.length}개 기준 관리 중</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors disabled:bg-neutral-400"
            >
              {isSaving ? '저장 중...' : '새 기준 버전 저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
