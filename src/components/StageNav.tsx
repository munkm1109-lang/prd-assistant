import React from 'react';
import { CheckCircle2, AlertTriangle, MinusCircle } from 'lucide-react';
import { StageId, STAGES, Review } from '../types/prd';

interface StageNavProps {
  currentStage?: StageId;
  review: Review | null;
  isStaleReview?: boolean;
  onSelectStage: (stageId: StageId) => void;
}

export const StageNav: React.FC<StageNavProps> = ({
  currentStage,
  review,
  isStaleReview,
  onSelectStage,
}) => {
  // Determine each stage's status from checks
  const getStageStatus = (stageId: StageId) => {
    if (!review || isStaleReview) return 'unreviewed';

    const checksForStage = review.checks.filter((chk) => {
      // Map criterion id or prefix to stage
      if (stageId === 'problem_definition' && chk.criterionId.includes('prob')) return true;
      if (stageId === 'users' && chk.criterionId.includes('user')) return true;
      if (stageId === 'features' && chk.criterionId.includes('feat')) return true;
      if (stageId === 'success_metrics' && chk.criterionId.includes('succ')) return true;
      if (stageId === 'integrated_prd' && chk.criterionId.includes('integ')) return true;
      return false;
    });

    if (checksForStage.length === 0) return 'unreviewed';

    const hasUnmet = checksForStage.some((c) => c.status === 'unmet' || c.status === 'unknown');
    if (hasUnmet) return 'needs_work';

    return 'passed';
  };

  return (
    <div className="bg-white border-b border-neutral-200 px-6 py-2.5 flex items-center justify-between overflow-x-auto">
      <div className="flex items-center gap-1 text-xs min-w-max">
        <span className="text-neutral-400 font-medium mr-2">단계 탐색:</span>
        {STAGES.map((stage, idx) => {
          const status = getStageStatus(stage.id);
          const isSelected = currentStage === stage.id;

          return (
            <React.Fragment key={stage.id}>
              {idx > 0 && <span className="text-neutral-300 mx-1">→</span>}
              <button
                onClick={() => onSelectStage(stage.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
                title={stage.description}
              >
                {status === 'passed' && (
                  <CheckCircle2
                    className={`w-3 h-3 ${isSelected ? 'text-emerald-400' : 'text-emerald-600'}`}
                  />
                )}
                {status === 'needs_work' && (
                  <AlertTriangle
                    className={`w-3 h-3 ${isSelected ? 'text-amber-400' : 'text-amber-600'}`}
                  />
                )}
                {status === 'unreviewed' && (
                  <MinusCircle
                    className={`w-3 h-3 ${isSelected ? 'text-neutral-300' : 'text-neutral-400'}`}
                  />
                )}
                <span>{stage.name}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      <div className="text-[11px] text-neutral-400 hidden lg:block">
        단계 클릭 시 해당 문서 절로 스크롤 이동
      </div>
    </div>
  );
};
