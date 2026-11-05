import React, { useState, useRef } from 'react';
import { X, Sparkles, FileText, Upload, AlertCircle } from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  initialMode?: 'new' | 'import_prd' | 'import_backup';
  onCreateNew: (data: {
    title: string;
    idea: string;
    users?: string;
    constraints?: string;
    evidence?: string;
    scope: string;
  }) => Promise<void>;
  onImportPrd: (data: {
    title: string;
    markdown: string;
    reviewPurpose?: string;
  }) => Promise<void>;
  onImportBackupFile: (jsonText: string) => Promise<void>;
  onClose: () => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  initialMode = 'new',
  onCreateNew,
  onImportPrd,
  onImportBackupFile,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'new' | 'import_prd' | 'import_backup'>(initialMode);

  // New PRD state
  const [newTitle, setNewTitle] = useState('');
  const [idea, setIdea] = useState('');
  const [users, setUsers] = useState('');
  const [constraints, setConstraints] = useState('');
  const [evidence, setEvidence] = useState('');
  const [scope, setScope] = useState('all');

  // Existing PRD state
  const [importTitle, setImportTitle] = useState('');
  const [importContent, setImportContent] = useState('');
  const [reviewPurpose, setReviewPurpose] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Backup state
  const [backupFileName, setBackupFileName] = useState('');
  const [backupFileContent, setBackupFileContent] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const prdFileInputRef = useRef<HTMLInputElement>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handler for uploading PRD file (.md, .txt)
  const handlePrdFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      setErrorMessage('파일 크기는 최대 1MB까지만 지원됩니다.');
      return;
    }

    const validExtensions = ['.md', '.txt'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setErrorMessage('파일은 .md 또는 .txt 형식이어야 합니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text.length > 30000) {
        setErrorMessage('문서 길이가 30,000자를 초과합니다. 30,000자 이내로 정리해 주세요.');
        return;
      }
      setImportContent(text);
      setUploadedFileName(file.name);
      if (!importTitle) {
        setImportTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
      setErrorMessage('');
    };
    reader.onerror = () => {
      setErrorMessage('파일을 읽는 중 UTF-8 인코딩 오류가 발생했습니다.');
    };
    reader.readAsText(file, 'utf-8');
  };

  // Handler for uploading JSON backup
  const handleBackupFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('백업 파일 크기는 최대 5MB까지 지원됩니다.');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.json')) {
      setErrorMessage('백업 파일은 .json 형식이어야 합니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setBackupFileContent(text);
      setBackupFileName(file.name);
      setErrorMessage('');
    };
    reader.onerror = () => {
      setErrorMessage('백업 파일을 읽는 중 오류가 발생했습니다.');
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleSubmitNew = async () => {
    setErrorMessage('');
    if (!idea.trim()) {
      setErrorMessage('아이디어 또는 해결할 문제를 입력해주세요.');
      return;
    }

    const totalLen = (newTitle + idea + users + constraints + evidence).length;
    if (totalLen > 12000) {
      setErrorMessage('입력 내용의 총합은 최대 12,000자까지 허용됩니다.');
      return;
    }

    setIsLoading(true);
    try {
      await onCreateNew({
        title: newTitle.trim(),
        idea: idea.trim(),
        users: users.trim(),
        constraints: constraints.trim(),
        evidence: evidence.trim(),
        scope,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'PRD 생성 요청 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitImportPrd = async () => {
    setErrorMessage('');
    if (!importContent.trim()) {
      setErrorMessage('검토할 PRD 내용을 입력하거나 파일을 업로드해주세요.');
      return;
    }

    if (importContent.length > 30000) {
      setErrorMessage('PRD 원문은 최대 30,000자까지 허용됩니다.');
      return;
    }

    setIsLoading(true);
    try {
      await onImportPrd({
        title: importTitle.trim() || '기존 PRD 검토',
        markdown: importContent.trim(),
        reviewPurpose: reviewPurpose.trim(),
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || '기존 PRD 검토 초기화 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitBackup = async () => {
    setErrorMessage('');
    if (!backupFileContent) {
      setErrorMessage('가져올 JSON 백업 파일을 선택해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      await onImportBackupFile(backupFileContent);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || '백업 복원 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-neutral-900">프로젝트 시작</h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-neutral-200 bg-neutral-50 px-6">
          <button
            onClick={() => {
              setActiveTab('new');
              setErrorMessage('');
            }}
            className={`flex items-center gap-1.5 py-3 px-4 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'new'
                ? 'border-neutral-900 text-neutral-900 bg-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>새 PRD 작성</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('import_prd');
              setErrorMessage('');
            }}
            className={`flex items-center gap-1.5 py-3 px-4 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'import_prd'
                ? 'border-neutral-900 text-neutral-900 bg-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>기존 PRD 검토</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('import_backup');
              setErrorMessage('');
            }}
            className={`flex items-center gap-1.5 py-3 px-4 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'import_backup'
                ? 'border-neutral-900 text-neutral-900 bg-white'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>백업 가져오기</span>
          </button>
        </div>

        {/* Body Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'new' && (
            <>
              <div>
                <label className="block text-xs font-medium text-neutral-800 mb-1">
                  프로젝트명 <span className="text-neutral-400 font-normal">(선택사항 - 미입력 시 자동 제안)</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="예: 배달 라이더 맞춤형 세무 자동 환급 서비스"
                  className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-neutral-800">
                    아이디어 및 해결할 문제 <span className="text-rose-600">* (필수)</span>
                  </label>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    {idea.length.toLocaleString()} / 12,000자
                  </span>
                </div>
                <textarea
                  rows={5}
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder="어떤 사용자가 어떤 상황에서 어떤 어려움을 겪고 있으며, 이를 해결하기 위해 어떤 서비스를 구상하고 계신가요?"
                  className="w-full text-xs p-3 border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-neutral-900 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-800 mb-1">
                    대상 사용자 <span className="text-neutral-400 font-normal">(선택)</span>
                  </label>
                  <input
                    type="text"
                    value={users}
                    onChange={(e) => setUsers(e.target.value)}
                    placeholder="예: 20-30대 프리랜서 및 긱워커"
                    className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-800 mb-1">
                    제약 조건 <span className="text-neutral-400 font-normal">(선택)</span>
                  </label>
                  <input
                    type="text"
                    value={constraints}
                    onChange={(e) => setConstraints(e.target.value)}
                    placeholder="예: 홈택스 스크래핑 불가, 모바일 웹 우선"
                    className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-800 mb-1">
                  확인된 근거 / 사전 데이터 <span className="text-neutral-400 font-normal">(선택)</span>
                </label>
                <textarea
                  rows={2}
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  placeholder="예: 50명 사전 설문 결과 74%가 종합소득세 신고 시 과다 수수료 부담 호소"
                  className="w-full text-xs p-2.5 border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-800 mb-1">
                  작성 범위
                </label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-lg bg-white"
                >
                  <option value="all">전체 PRD (문제정의부터 통합 PRD까지 통합 작성 - 권장)</option>
                  <option value="problem_definition">문제정의 단계만 우선 작성</option>
                  <option value="users">주요 사용자 분석까지 작성</option>
                  <option value="features">기능 및 우선순위까지 작성</option>
                </select>
              </div>
            </>
          )}

          {activeTab === 'import_prd' && (
            <>
              <div>
                <label className="block text-xs font-medium text-neutral-800 mb-1">
                  프로젝트명 <span className="text-neutral-400 font-normal">(선택)</span>
                </label>
                <input
                  type="text"
                  value={importTitle}
                  onChange={(e) => setImportTitle(e.target.value)}
                  placeholder="예: 결제 정산 시스템 개선 PRD 검토"
                  className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-neutral-800">
                    PRD 본문 (Markdown 또는 텍스트) <span className="text-rose-600">* (필수)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={prdFileInputRef}
                      onChange={handlePrdFileUpload}
                      accept=".md,.txt"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => prdFileInputRef.current?.click()}
                      className="text-xs text-neutral-600 hover:text-neutral-900 underline flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" />
                      <span>파일 업로드 (.md, .txt)</span>
                    </button>
                    <span className="text-[11px] text-neutral-400 font-mono">
                      {importContent.length.toLocaleString()} / 30,000자
                    </span>
                  </div>
                </div>

                {uploadedFileName && (
                  <div className="text-[11px] text-neutral-500 mb-1.5 flex items-center gap-1">
                    <span>업로드된 파일:</span>
                    <strong className="text-neutral-800">{uploadedFileName}</strong>
                  </div>
                )}

                <textarea
                  rows={9}
                  value={importContent}
                  onChange={(e) => setImportContent(e.target.value)}
                  placeholder="기존 PRD 문서를 여기에 붙여넣으세요. 원문은 최초 버전(v1)으로 안전하게 보존되며, 수정 없이 사전 검토가 먼저 진행됩니다."
                  className="w-full text-xs p-3 font-mono border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-neutral-900 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-800 mb-1">
                  검토 목적 / 중점 확인 사항 <span className="text-neutral-400 font-normal">(선택)</span>
                </label>
                <input
                  type="text"
                  value={reviewPurpose}
                  onChange={(e) => setReviewPurpose(e.target.value)}
                  placeholder="예: 측정 지표의 누락 여부와 MVP 범위의 적절성 위주 검토"
                  className="w-full text-xs px-3 py-2 border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-neutral-900"
                />
              </div>
            </>
          )}

          {activeTab === 'import_backup' && (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 text-xs text-neutral-600 space-y-2">
                <p className="font-semibold text-neutral-800">JSON 백업 복원 안내</p>
                <p>
                  이전에 내보낸 JSON 백업 파일을 선택하여 프로젝트를 복원할 수 있습니다.
                  기존 프로젝트를 덮어쓰지 않고 새로운 독립 프로젝트로 안전하게 등록됩니다.
                </p>
              </div>

              <div className="border-2 border-dashed border-neutral-300 rounded-xl p-8 text-center space-y-3">
                <Upload className="w-8 h-8 mx-auto text-neutral-400" />
                <div className="text-xs text-neutral-600">
                  {backupFileName ? (
                    <div>
                      선택된 파일: <strong className="text-neutral-900">{backupFileName}</strong>
                    </div>
                  ) : (
                    <div>백업 파일 (.json)을 선택하세요</div>
                  )}
                </div>

                <input
                  type="file"
                  ref={backupFileInputRef}
                  onChange={handleBackupFileUpload}
                  accept=".json"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => backupFileInputRef.current?.click()}
                  className="px-4 py-2 text-xs font-medium text-neutral-800 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-100 transition-colors"
                >
                  백업 파일 선택
                </button>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-neutral-50 border-t border-neutral-200">
          <div className="text-[11px] text-neutral-400">
            {activeTab === 'new' && '제공 정보와 명시된 가정을 바탕으로 초안 생성 및 사전 검토 수행'}
            {activeTab === 'import_prd' && '원문 보존 후 5단계 기준 정밀 검토'}
            {activeTab === 'import_backup' && 'schemaVersion=1 호환성 및 관계 검증'}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-100 transition-colors"
            >
              취소
            </button>

            {activeTab === 'new' && (
              <button
                onClick={handleSubmitNew}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors disabled:bg-neutral-400"
              >
                {isLoading ? '작성 및 검토 중...' : 'PRD 작성 시작'}
              </button>
            )}

            {activeTab === 'import_prd' && (
              <button
                onClick={handleSubmitImportPrd}
                disabled={isLoading}
                className="px-4 py-2 text-xs font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors disabled:bg-neutral-400"
              >
                {isLoading ? '검토 준비 중...' : '가져와서 검토 시작'}
              </button>
            )}

            {activeTab === 'import_backup' && (
              <button
                onClick={handleSubmitBackup}
                disabled={isLoading || !backupFileContent}
                className="px-4 py-2 text-xs font-medium text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors disabled:bg-neutral-400"
              >
                {isLoading ? '복원 중...' : '프로젝트 복원'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
