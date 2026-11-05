import React, { useState } from 'react';
import {
  Sparkles,
  FileText,
  Upload,
  Clock,
  ArrowRight,
  MoreVertical,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import { Project, Review } from '../types/prd';

interface ProjectListProps {
  projects: Project[];
  reviewsByProjectId: Record<string, Review | undefined>;
  onSelectProject: (projectId: string) => void;
  onOpenNewModal: (mode: 'new' | 'import_prd' | 'import_backup') => void;
  onRenameProject: (projectId: string, newTitle: string) => Promise<void>;
  onDeleteProject: (project: Project) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  reviewsByProjectId,
  onSelectProject,
  onOpenNewModal,
  onRenameProject,
  onDeleteProject,
}) => {
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleStartRename = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(project.id);
    setEditTitle(project.title);
  };

  const handleSaveRename = async (projectId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (editTitle.trim()) {
      await onRenameProject(projectId, editTitle.trim());
    }
    setEditingProjectId(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      {/* Hero / Intro */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-neutral-200">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            PRD 작성·검토 도우미
          </h1>
          <p className="text-sm text-neutral-600">
            아이디어를 PRD로 정리하고, 중요한 누락과 다음 결정을 확인하세요.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onOpenNewModal('new')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>새 PRD 작성</span>
          </button>

          <button
            onClick={() => onOpenNewModal('import_prd')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>기존 PRD 검토</span>
          </button>

          <button
            onClick={() => onOpenNewModal('import_backup')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-600 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>백업 가져오기</span>
          </button>
        </div>
      </div>

      {/* Storage Information Notice (Section 3.1) */}
      <div className="flex items-start gap-3 p-3.5 bg-neutral-100/70 border border-neutral-200/80 rounded-xl text-xs text-neutral-600">
        <ShieldAlert className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span>작업은 현재 브라우저(IndexedDB)에 저장됩니다. </span>
          <span className="text-neutral-500">
            브라우저 캐시나 데이터를 삭제하면 사라질 수 있으니 중요한 작업은 상단 '내보내기'에서 백업을 내려받으세요.
          </span>
        </div>
      </div>

      {/* Projects Grid or Empty State */}
      {projects.length === 0 ? (
        <div className="border border-dashed border-neutral-300 rounded-2xl p-12 text-center bg-white space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-neutral-900">첫 PRD를 시작해 보세요</h3>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              구체적인 아이디어를 입력하여 전체 PRD 초안을 생성하거나, 이미 작성된 기존 PRD를 가져와 5단계 완료 기준에 맞추어 정밀 검토를 수행할 수 있습니다.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onOpenNewModal('new')}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>새 PRD 작성</span>
            </button>
            <button
              onClick={() => onOpenNewModal('import_prd')}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>기존 PRD 검토</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-medium px-1">
            <span>내 프로젝트 ({projects.length})</span>
            <span>최근 수정순</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((proj) => {
              const review = reviewsByProjectId[proj.id];
              const isStale =
                review &&
                proj.currentDocumentVersionId &&
                review.documentVersionId !== proj.currentDocumentVersionId;

              return (
                <div
                  key={proj.id}
                  onClick={() => onSelectProject(proj.id)}
                  className="group bg-white rounded-xl border border-neutral-200/90 hover:border-neutral-400 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer space-y-4"
                >
                  <div className="space-y-2.5">
                    {/* Header: Title / Rename */}
                    <div className="flex items-start justify-between gap-2">
                      {editingProjectId === proj.id ? (
                        <form
                          onSubmit={(e) => handleSaveRename(proj.id, e)}
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1"
                        >
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={() => setEditingProjectId(null)}
                            autoFocus
                            className="w-full text-sm font-semibold px-2 py-1 border border-neutral-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
                          />
                        </form>
                      ) : (
                        <h2 className="text-sm font-semibold text-neutral-900 group-hover:text-neutral-700 transition-colors line-clamp-1">
                          {proj.title}
                        </h2>
                      )}

                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleStartRename(proj, e)}
                          className="p-1 text-neutral-400 hover:text-neutral-700 transition-colors"
                          title="이름 변경"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteProject(proj)}
                          className="p-1 text-neutral-400 hover:text-rose-600 transition-colors"
                          title="프로젝트 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata: Version & Update Time */}
                    <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                      <span className="font-mono">
                        {proj.currentDocumentVersionId ? '문서 있음' : '문서 없음'}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-neutral-400" />
                        <span>
                          {new Date(proj.updatedAt).toLocaleDateString('ko-KR', {
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Review Status Display */}
                  <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                    <div>
                      {isStale ? (
                        <span className="text-[11px] text-neutral-600 flex items-center gap-1">
                          <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
                          <span>재검토 필요</span>
                        </span>
                      ) : review?.verdict === 'can_proceed' ? (
                        <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>진행 가능</span>
                        </span>
                      ) : review?.verdict === 'needs_information' ? (
                        <span className="text-[11px] text-amber-700 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>보완 필요</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-neutral-400">검토 미수행</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-xs font-medium text-neutral-700 group-hover:text-neutral-900 transition-colors">
                      <span>열기</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
