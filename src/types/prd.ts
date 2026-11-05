/**
 * PRD 작성·검토 도우미 핵심 데이터 타입 정의
 */

export type StageId =
  | 'problem_definition'
  | 'users'
  | 'features'
  | 'success_metrics'
  | 'integrated_prd';

export type CheckStatus = 'met' | 'unmet' | 'unknown' | 'not_applicable';

export type ChangeReason = 'new_evidence' | 'requirement_changed' | 'existing_error_found';

export type EvidenceKind = 'user_provided' | 'document_provided' | 'assumption' | 'proposal' | 'unverified';

export type Severity = 'required' | 'optional';

export type Verdict = 'can_proceed' | 'needs_information';

export type DocumentSource = 'user' | 'ai' | 'import' | 'restore';

export interface Criterion {
  id: string;
  stageId: StageId;
  stageName: string;
  text: string;
  required: boolean;
  allowNotApplicable: boolean;
}

export interface CriteriaVersion {
  id: string;
  projectId: string;
  sequence: number;
  criteria: Criterion[];
  reason: string;
  createdAt: string;
}

export interface DocumentVersion {
  id: string;
  projectId: string;
  sequence: number;
  markdown: string;
  source: DocumentSource;
  parentVersionId: string | null;
  createdAt: string;
  changeSummary: string[];
}

export interface CheckItem {
  criterionId: string;
  status: CheckStatus;
  evidenceLocation: string;
  rationale: string;
}

export interface Finding {
  id: string;
  criterionId: string;
  stageId: StageId;
  severity: Severity;
  location: string;
  quote: string | null;
  problem: string;
  impact: string;
  suggestedFix: string;
  blocking: boolean;
  resolution: 'open' | 'fixed';
}

export interface EvidenceItem {
  id: string;
  kind: EvidenceKind;
  text: string;
  sourceRef: string | null;
  blocking: boolean;
  confirmationPlan: string | null;
}

export interface DeferredDecision {
  decision: string;
  reason: string;
  evidenceIds: string[];
}

export interface VerdictChange {
  previousVerdict: string;
  reason: ChangeReason;
  detail: string;
  affectedStages: string[];
}

export interface Review {
  id: string;
  projectId: string;
  documentVersionId: string;
  criteriaVersionId: string;
  summary: string;
  checks: CheckItem[];
  findings: Finding[];
  evidence: EvidenceItem[];
  verdict: Verdict;
  verdictReason: string;
  verdictChange: VerdictChange | null;
  nextActions: string[];
  deferredDecisions: DeferredDecision[];
  createdAt: string;
}

export interface ConversationMessage {
  id: string;
  projectId: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  operationId?: string;
  status: 'sending' | 'sent' | 'error';
  createdAt: string;
  questions?: {
    id: string;
    text: string;
    reason: string;
    blocking: boolean;
  }[];
}

export interface ChangeEvent {
  id: string;
  projectId: string;
  operationId: string;
  beforeVersionId: string | null;
  afterVersionId: string | null;
  type: 'create' | 'review' | 'manual_edit' | 'restore' | 'criteria_change' | 'chat_fix';
  reason: string;
  affectedStages: StageId[];
  createdAt: string;
}

export interface PendingCandidate {
  projectId: string;
  operationId: string;
  baseRevision: number;
  candidateMarkdown: string;
  status: 'pending_review' | 'review_failed';
  failureReason?: string;
  createdAt: string;
}

export interface DraftEdit {
  projectId: string;
  markdown: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
  currentDocumentVersionId: string | null;
  currentCriteriaVersionId: string | null;
  scope: string; // 'all' or specific stage
  activeOperationId: string | null;
  candidateDraft: PendingCandidate | null;
}

export interface BackupData {
  schemaVersion: 1;
  exportedAt: string;
  project: Project;
  documentVersions: DocumentVersion[];
  criteriaVersions: CriteriaVersion[];
  reviews: Review[];
  messages: ConversationMessage[];
  changeEvents: ChangeEvent[];
  draftEdit?: DraftEdit | null;
}

/** Default 5-stage criteria definitions */
export const DEFAULT_CRITERIA: Criterion[] = [
  {
    id: 'crit_prob_1',
    stageId: 'problem_definition',
    stageName: '문제정의',
    text: '누구의 어떤 상황에서 발생하는 구체적인 어려움과 영향이 정의되어 있는가 (관찰 사실과 원인 가설 분리)',
    required: true,
    allowNotApplicable: false,
  },
  {
    id: 'crit_prob_2',
    stageId: 'problem_definition',
    stageName: '문제정의',
    text: '문제 해결의 명확한 범위와 제외 범위(Out of scope)가 지정되어 있는가',
    required: true,
    allowNotApplicable: false,
  },
  {
    id: 'crit_user_1',
    stageId: 'users',
    stageName: '주요 사용자',
    text: '초기 대상 사용자의 역할, 상황, 행동 패턴, 겪는 어려움, 최종 목표가 구체적으로 구분되어 있는가',
    required: true,
    allowNotApplicable: false,
  },
  {
    id: 'crit_feat_1',
    stageId: 'features',
    stageName: '기능·우선순위',
    text: '각 핵심 기능이 해결하려는 문제와 직접 연결되어 있고, 사용자에게 제공하는 결과가 가설 형태로 명시되어 있는가',
    required: true,
    allowNotApplicable: false,
  },
  {
    id: 'crit_feat_2',
    stageId: 'features',
    stageName: '기능·우선순위',
    text: '기능 간 우선순위(MVP/P0, P1, P2)와 실행 의존 조건이 명확한가',
    required: true,
    allowNotApplicable: false,
  },
  {
    id: 'crit_succ_1',
    stageId: 'success_metrics',
    stageName: '성공 기준',
    text: '핵심 성공 지표, 측정 대상, 구체적인 측정 방법(누가·어떻게·언제 측정하는지)이 정의되어 있는가',
    required: true,
    allowNotApplicable: false,
  },
  {
    id: 'crit_succ_2',
    stageId: 'success_metrics',
    stageName: '성공 기준',
    text: '제안 목표치, 품질 조건, 성공/실패 판정 규칙 및 검증 계획이 제시되어 있는가',
    required: true,
    allowNotApplicable: false,
  },
  {
    id: 'crit_integ_1',
    stageId: 'integrated_prd',
    stageName: 'PRD 통합',
    text: '사용자 핵심 흐름(User Flow)과 기능별 수용 기준(Acceptance Criteria), 예외 처리 사항이 구체적인가',
    required: true,
    allowNotApplicable: false,
  },
  {
    id: 'crit_integ_2',
    stageId: 'integrated_prd',
    stageName: 'PRD 통합',
    text: '외부 의존성, 미확인 사항(Unverified), 핵심 위험 요소 및 대응 방안이 식별되어 있는가',
    required: true,
    allowNotApplicable: false,
  },
];

export const STAGES: { id: StageId; name: string; description: string }[] = [
  { id: 'problem_definition', name: '문제정의', description: '누구·상황·어려움·영향·범위' },
  { id: 'users', name: '주요 사용자', description: '역할·상황·행동·어려움·목표' },
  { id: 'features', name: '기능·우선순위', description: '문제 연결·제공결과·우선순위·의존조건' },
  { id: 'success_metrics', name: '성공 기준', description: '지표·측정법·제안목표·품질·검증계획' },
  { id: 'integrated_prd', name: 'PRD 통합', description: '흐름·수용기준·예외·의존성·미확인' },
];
