import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Project,
  DocumentVersion,
  CriteriaVersion,
  ConversationMessage,
  Review,
  ChangeEvent,
  StageId,
  Criterion,
  DEFAULT_CRITERIA,
} from './types/prd';
import * as storage from './lib/storage';
import { Header } from './components/Header';
import { ProjectList } from './components/ProjectList';
import { StageNav } from './components/StageNav';
import { ChatPanel } from './components/ChatPanel';
import { DocumentPanel } from './components/DocumentPanel';
import { ReviewPanel } from './components/ReviewPanel';
import { NewProjectModal } from './components/NewProjectModal';
import { CriteriaModal } from './components/CriteriaModal';
import { HistoryModal } from './components/HistoryModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { MessageSquare, FileText, CheckCircle2, AlertTriangle, X } from 'lucide-react';

export default function App() {
  // Global Project List State
  const [projects, setProjects] = useState<Project[]>([]);
  const [reviewsByProjectId, setReviewsByProjectId] = useState<Record<string, Review | undefined>>({});
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  // Active Project Workspace State
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [documentVersions, setDocumentVersions] = useState<DocumentVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<DocumentVersion | null>(null);
  const [criteriaVersions, setCriteriaVersions] = useState<CriteriaVersion[]>([]);
  const [currentCriteriaVersion, setCurrentCriteriaVersion] = useState<CriteriaVersion | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [events, setEvents] = useState<ChangeEvent[]>([]);
  const [draftEditMarkdown, setDraftEditMarkdown] = useState<string | null>(null);

  // Status & Progress State
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('saved');
  const [isReviewing, setIsReviewing] = useState(false);
  const [isAiWorking, setIsAiWorking] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<StageId>('problem_definition');

  // Responsive Tabs (for mobile and tablet)
  const [mobileTab, setMobileTab] = useState<'chat' | 'doc' | 'review'>('doc');
  const [tabletSideTab, setTabletSideTab] = useState<'chat' | 'review'>('review');

  // Modals
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newModalMode, setNewModalMode] = useState<'new' | 'import_prd' | 'import_backup'>('new');
  const [criteriaModalOpen, setCriteriaModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [deleteModalProject, setDeleteModalProject] = useState<Project | null>(null);

  // Latest Review Calculation
  const latestReview = reviews.length > 0 ? reviews[reviews.length - 1] : null;
  const isStaleReview = Boolean(
    latestReview &&
    currentVersion &&
    (latestReview.documentVersionId !== currentVersion.id ||
      (currentCriteriaVersion && latestReview.criteriaVersionId !== currentCriteriaVersion.id))
  );

  // Initial Load Projects
  const refreshProjects = useCallback(async () => {
    try {
      const allProjects = await storage.getAllProjects();
      setProjects(allProjects);

      // Fetch latest review for each project to show on cards
      const reviewMap: Record<string, Review | undefined> = {};
      for (const p of allProjects) {
        const revs = await storage.getReviews(p.id);
        if (revs.length > 0) {
          reviewMap[p.id] = revs[revs.length - 1];
        }
      }
      setReviewsByProjectId(reviewMap);
    } catch (e) {
      console.error('Failed to load projects:', e);
    }
  }, []);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  // Subscribe to Multi-Tab Sync Broadcast Channel
  useEffect(() => {
    const unsubscribe = storage.subscribeToSync((data) => {
      refreshProjects();
      if (currentProjectId && data.projectId === currentProjectId) {
        // If another tab modified the active project, reload state
        loadProjectDetails(currentProjectId);
      }
    });
    return unsubscribe;
  }, [currentProjectId, refreshProjects]);

  // Load Active Project Workspace Details
  const loadProjectDetails = async (projectId: string) => {
    try {
      const proj = await storage.getProjectById(projectId);
      if (!proj) return;

      const [docVers, critVers, msgs, revs, evts, draft] = await Promise.all([
        storage.getDocumentVersions(projectId),
        storage.getCriteriaVersions(projectId),
        storage.getMessages(projectId),
        storage.getReviews(projectId),
        storage.getEvents(projectId),
        storage.getDraftEdit(projectId),
      ]);

      setCurrentProject(proj);
      setDocumentVersions(docVers);
      setCurrentVersion(
        docVers.find((v) => v.id === proj.currentDocumentVersionId) ||
          (docVers.length > 0 ? docVers[docVers.length - 1] : null)
      );
      setCriteriaVersions(critVers);
      setCurrentCriteriaVersion(
        critVers.find((c) => c.id === proj.currentCriteriaVersionId) ||
          (critVers.length > 0 ? critVers[critVers.length - 1] : null)
      );
      setMessages(msgs);
      setReviews(revs);
      setEvents(evts);
      setDraftEditMarkdown(draft ? draft.markdown : null);
    } catch (err) {
      console.error('Failed to load project details:', err);
    }
  };

  const handleSelectProject = (projectId: string) => {
    setCurrentProjectId(projectId);
    loadProjectDetails(projectId);
  };

  const handleBackToList = () => {
    setCurrentProjectId(null);
    setCurrentProject(null);
    refreshProjects();
  };

  // Stage Navigation scroll jump
  const handleSelectStage = (stageId: StageId) => {
    setActiveStage(stageId);
    const element = document.getElementById(`sec-${stageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // 1. Flow: Create New PRD
  const handleCreateNew = async (data: {
    title: string;
    idea: string;
    users?: string;
    constraints?: string;
    evidence?: string;
    scope: string;
  }) => {
    setIsAiWorking(true);
    setSaveStatus('saving');

    try {
      // Step A: Prepare & analyze idea
      const prepareRes = await fetch('/api/prd/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!prepareRes.ok) {
        const errJson = await prepareRes.json();
        throw new Error(errJson.error || '아이디어 분석 실패');
      }

      const prepareData = await prepareRes.json();
      const finalTitle = data.title || prepareData.suggestedTitle || '새 PRD 프로젝트';

      // Step B: Create project record in IndexedDB
      const project = await storage.createProjectRecord({
        title: finalTitle,
        scope: data.scope,
        source: 'ai',
      });

      // Add assistant welcome message
      const initMessage: ConversationMessage = {
        id: `msg_${Date.now()}`,
        projectId: project.id,
        role: 'assistant',
        text: prepareData.assistantMessage,
        createdAt: new Date().toISOString(),
        status: 'sent',
        questions: prepareData.questions,
      };
      await storage.saveMessage(initMessage);

      // Step C: Generate full draft PRD document
      const currentCrit = await storage.getCriteriaVersions(project.id);
      const activeCriteria = currentCrit[0]?.criteria || DEFAULT_CRITERIA;

      const genRes = await fetch('/api/prd/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: finalTitle,
          idea: data.idea,
          users: data.users,
          constraints: data.constraints,
          evidence: data.evidence,
          scope: data.scope,
          criteria: activeCriteria,
        }),
      });

      if (!genRes.ok) {
        const errJson = await genRes.json();
        throw new Error(errJson.error || 'PRD 생성 실패');
      }

      const genData = await genRes.json();
      const generatedMarkdown = genData.documentMarkdown;

      // Save initial document version v1
      const docVerId = `doc_v1_${Date.now()}`;
      const docVersion: DocumentVersion = {
        id: docVerId,
        projectId: project.id,
        sequence: 1,
        markdown: generatedMarkdown,
        source: 'ai',
        parentVersionId: null,
        createdAt: new Date().toISOString(),
        changeSummary: ['아이디어 기반 초안 작성 완료'],
      };
      await storage.saveDocumentVersion(docVersion);

      project.currentDocumentVersionId = docVerId;
      await storage.saveProject(project);

      // Step D: Perform separate pre-submission review
      try {
        const reviewRes = await fetch('/api/prd/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentMarkdown: generatedMarkdown,
            criteria: activeCriteria,
            promptContext: '최초 작성 직후 사전 검토',
            allowDocumentChange: false,
          }),
        });

        if (reviewRes.ok) {
          const reviewData = await reviewRes.json();
          const reviewRecord: Review = {
            id: `rev_${Date.now()}`,
            projectId: project.id,
            documentVersionId: docVerId,
            criteriaVersionId: currentCrit[0]?.id || '',
            summary: reviewData.summary,
            checks: reviewData.checks,
            findings: reviewData.findings,
            evidence: reviewData.evidence,
            verdict: reviewData.verdict,
            verdictReason: reviewData.verdictReason,
            verdictChange: null,
            nextActions: reviewData.nextActions,
            deferredDecisions: reviewData.deferredDecisions,
            createdAt: new Date().toISOString(),
          };
          await storage.saveReview(reviewRecord);
        } else {
          // If review failed, save candidate draft status (A11)
          project.candidateDraft = {
            projectId: project.id,
            operationId: `op_cand_${Date.now()}`,
            baseRevision: project.revision,
            candidateMarkdown: generatedMarkdown,
            status: 'review_failed',
            failureReason: '초안 생성 완료 후 검토 API 호출 실패',
            createdAt: new Date().toISOString(),
          };
          await storage.saveProject(project);
        }
      } catch (revErr) {
        console.warn('Initial review failed, candidate preserved:', revErr);
        project.candidateDraft = {
          projectId: project.id,
          operationId: `op_cand_${Date.now()}`,
          baseRevision: project.revision,
          candidateMarkdown: generatedMarkdown,
          status: 'review_failed',
          failureReason: '초안 생성 완료 후 검토 API 호출 실패',
          createdAt: new Date().toISOString(),
        };
        await storage.saveProject(project);
      }

      setSaveStatus('saved');
      setCurrentProjectId(project.id);
      await loadProjectDetails(project.id);
      refreshProjects();
    } catch (err: any) {
      setAiError(err.message || 'PRD 작성 중 오류가 발생했습니다.');
      setSaveStatus('saved');
    } finally {
      setIsAiWorking(false);
    }
  };

  // 2. Flow: Import Existing PRD
  const handleImportPrd = async (data: {
    title: string;
    markdown: string;
    reviewPurpose?: string;
  }) => {
    setIsAiWorking(true);
    setSaveStatus('saving');

    try {
      // Create project with imported text as v1
      const project = await storage.createProjectRecord({
        title: data.title || '기존 PRD 검토',
        initialMarkdown: data.markdown,
        source: 'import',
      });

      const currentCrit = await storage.getCriteriaVersions(project.id);
      const activeCriteria = currentCrit[0]?.criteria || DEFAULT_CRITERIA;

      // Add intro message
      const welcomeMsg: ConversationMessage = {
        id: `msg_${Date.now()}`,
        projectId: project.id,
        role: 'assistant',
        text: `기존 PRD를 원문 그대로 보존하여 가져왔습니다. 5단계 완료 기준에 따라 사전 검토를 수행합니다. ${
          data.reviewPurpose ? `(검토 목적: ${data.reviewPurpose})` : ''
        }`,
        createdAt: new Date().toISOString(),
        status: 'sent',
      };
      await storage.saveMessage(welcomeMsg);

      // Perform initial review with allowDocumentChange=false (A3, A17)
      const reviewRes = await fetch('/api/prd/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentMarkdown: data.markdown,
          criteria: activeCriteria,
          promptContext: data.reviewPurpose || '기존 문서 최초 검토',
          allowDocumentChange: false,
        }),
      });

      if (reviewRes.ok) {
        const reviewData = await reviewRes.json();
        const reviewRecord: Review = {
          id: `rev_${Date.now()}`,
          projectId: project.id,
          documentVersionId: project.currentDocumentVersionId!,
          criteriaVersionId: currentCrit[0]?.id || '',
          summary: reviewData.summary,
          checks: reviewData.checks,
          findings: reviewData.findings,
          evidence: reviewData.evidence,
          verdict: reviewData.verdict,
          verdictReason: reviewData.verdictReason,
          verdictChange: null,
          nextActions: reviewData.nextActions,
          deferredDecisions: reviewData.deferredDecisions,
          createdAt: new Date().toISOString(),
        };
        await storage.saveReview(reviewRecord);
      }

      setSaveStatus('saved');
      setCurrentProjectId(project.id);
      await loadProjectDetails(project.id);
      refreshProjects();
    } catch (err: any) {
      setAiError(err.message || '기존 문서 검토 초기화 실패');
      setSaveStatus('saved');
    } finally {
      setIsAiWorking(false);
    }
  };

  // 3. Flow: Run Review on Current Version
  const handleRunReview = async () => {
    if (!currentProject || !currentVersion || !currentCriteriaVersion) return;

    setIsReviewing(true);
    setSaveStatus('saving');

    try {
      const res = await fetch('/api/prd/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentMarkdown: currentVersion.markdown,
          criteria: currentCriteriaVersion.criteria,
          previousReview: latestReview,
          promptContext: '사용자 요청에 의한 정밀 재검토',
          allowDocumentChange: false,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || '검토 API 요청 실패');
      }

      const reviewData = await res.json();
      const newReview: Review = {
        id: `rev_${Date.now()}`,
        projectId: currentProject.id,
        documentVersionId: currentVersion.id,
        criteriaVersionId: currentCriteriaVersion.id,
        summary: reviewData.summary,
        checks: reviewData.checks,
        findings: reviewData.findings,
        evidence: reviewData.evidence,
        verdict: reviewData.verdict,
        verdictReason: reviewData.verdictReason,
        verdictChange: reviewData.verdictChange,
        nextActions: reviewData.nextActions,
        deferredDecisions: reviewData.deferredDecisions,
        createdAt: new Date().toISOString(),
      };

      await storage.saveReview(newReview);

      // Clear any candidate draft since review succeeded
      if (currentProject.candidateDraft) {
        currentProject.candidateDraft = null;
        await storage.saveProject(currentProject);
      }

      setSaveStatus('saved');
      await loadProjectDetails(currentProject.id);
      refreshProjects();
    } catch (err: any) {
      setAiError(err.message || '검토 실행 중 오류');
      setSaveStatus('saved');
    } finally {
      setIsReviewing(false);
    }
  };

  // 4. Flow: Send Chat Message / Modify Request
  const handleSendMessage = async (text: string, applyFixes = false) => {
    if (!currentProject || !currentVersion || !currentCriteriaVersion) return;

    setIsAiWorking(true);
    setSaveStatus('saving');

    const userMsg: ConversationMessage = {
      id: `msg_u_${Date.now()}`,
      projectId: currentProject.id,
      role: 'user',
      text: applyFixes ? '필수 보완 사항을 문서에 반영하여 수정해줘' : text,
      createdAt: new Date().toISOString(),
      status: 'sent',
    };
    await storage.saveMessage(userMsg);
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch('/api/prd/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          documentMarkdown: currentVersion.markdown,
          criteria: currentCriteriaVersion.criteria,
          previousReview: latestReview,
          conversationHistory: messages,
          allowDocumentChange: true,
          applyFixes,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || '대화 처리 실패');
      }

      const chatData = await res.json();

      // Assistant message
      const assistantMsg: ConversationMessage = {
        id: `msg_a_${Date.now()}`,
        projectId: currentProject.id,
        role: 'assistant',
        text: chatData.assistantMessage,
        createdAt: new Date().toISOString(),
        status: 'sent',
        questions: chatData.questions,
      };
      await storage.saveMessage(assistantMsg);

      // If document was updated by assistant
      if (chatData.documentMarkdown && chatData.documentMarkdown !== currentVersion.markdown) {
        const nextSeq = currentVersion.sequence + 1;
        const newDocId = `doc_v${nextSeq}_${Date.now()}`;
        const newDoc: DocumentVersion = {
          id: newDocId,
          projectId: currentProject.id,
          sequence: nextSeq,
          markdown: chatData.documentMarkdown,
          source: 'ai',
          parentVersionId: currentVersion.id,
          createdAt: new Date().toISOString(),
          changeSummary: chatData.changeSummary || ['대화 요청을 통한 문서 수정'],
        };
        await storage.saveDocumentVersion(newDoc);

        // Record Change Event
        const evt: ChangeEvent = {
          id: `evt_${Date.now()}`,
          projectId: currentProject.id,
          operationId: `op_chat_${Date.now()}`,
          beforeVersionId: currentVersion.id,
          afterVersionId: newDocId,
          type: 'chat_fix',
          reason: text,
          affectedStages: ['problem_definition', 'users', 'features', 'success_metrics', 'integrated_prd'],
          createdAt: new Date().toISOString(),
        };
        await storage.saveEvent(evt);

        // Update Project record
        currentProject.currentDocumentVersionId = newDocId;
        currentProject.revision += 1;
        currentProject.updatedAt = new Date().toISOString();
        await storage.saveProject(currentProject);

        // If chat returned review for the modified doc, save it
        if (chatData.review) {
          const newReview: Review = {
            id: `rev_${Date.now()}`,
            projectId: currentProject.id,
            documentVersionId: newDocId,
            criteriaVersionId: currentCriteriaVersion.id,
            summary: chatData.review.summary || '수정 후 재검토 결과',
            checks: chatData.review.checks || [],
            findings: chatData.review.findings || [],
            evidence: chatData.review.evidence || [],
            verdict: chatData.review.verdict || 'can_proceed',
            verdictReason: chatData.review.verdictReason || '',
            verdictChange: chatData.review.verdictChange || null,
            nextActions: chatData.review.nextActions || [],
            deferredDecisions: chatData.review.deferredDecisions || [],
            createdAt: new Date().toISOString(),
          };
          await storage.saveReview(newReview);
        }
      }

      setSaveStatus('saved');
      await loadProjectDetails(currentProject.id);
      refreshProjects();
    } catch (err: any) {
      setAiError(err.message || '응답 처리 실패');
      setSaveStatus('saved');
    } finally {
      setIsAiWorking(false);
    }
  };

  // 5. Flow: Direct Edit Document
  const handleSaveDirectEdit = async (markdown: string) => {
    if (!currentProject || !currentVersion) return;

    setSaveStatus('saving');
    try {
      const nextSeq = currentVersion.sequence + 1;
      const newDocId = `doc_v${nextSeq}_${Date.now()}`;
      const newDoc: DocumentVersion = {
        id: newDocId,
        projectId: currentProject.id,
        sequence: nextSeq,
        markdown,
        source: 'user',
        parentVersionId: currentVersion.id,
        createdAt: new Date().toISOString(),
        changeSummary: ['사용자 직접 편집'],
      };
      await storage.saveDocumentVersion(newDoc);

      const evt: ChangeEvent = {
        id: `evt_${Date.now()}`,
        projectId: currentProject.id,
        operationId: `op_edit_${Date.now()}`,
        beforeVersionId: currentVersion.id,
        afterVersionId: newDocId,
        type: 'manual_edit',
        reason: '사용자 직접 문서 편집',
        affectedStages: ['problem_definition', 'users', 'features', 'success_metrics', 'integrated_prd'],
        createdAt: new Date().toISOString(),
      };
      await storage.saveEvent(evt);

      // Clear draft edit in DB
      await storage.clearDraftEdit(currentProject.id);
      setDraftEditMarkdown(null);

      // Update project record
      currentProject.currentDocumentVersionId = newDocId;
      currentProject.revision += 1;
      currentProject.updatedAt = new Date().toISOString();
      await storage.saveProject(currentProject);

      setSaveStatus('saved');
      await loadProjectDetails(currentProject.id);
      refreshProjects();
    } catch (err: any) {
      setSaveStatus('error');
      throw err;
    }
  };

  // 6. Flow: Restore Past Version
  const handleRestoreVersion = async (targetVersion: DocumentVersion) => {
    if (!currentProject || !currentVersion) return;

    setSaveStatus('saving');
    try {
      const nextSeq = documentVersions.length + 1;
      const newDocId = `doc_v${nextSeq}_${Date.now()}`;
      const newDoc: DocumentVersion = {
        id: newDocId,
        projectId: currentProject.id,
        sequence: nextSeq,
        markdown: targetVersion.markdown,
        source: 'restore',
        parentVersionId: targetVersion.id,
        createdAt: new Date().toISOString(),
        changeSummary: [`v${targetVersion.sequence} 버전으로 복원`],
      };
      await storage.saveDocumentVersion(newDoc);

      const evt: ChangeEvent = {
        id: `evt_${Date.now()}`,
        projectId: currentProject.id,
        operationId: `op_restore_${Date.now()}`,
        beforeVersionId: currentVersion.id,
        afterVersionId: newDocId,
        type: 'restore',
        reason: `과거 버전 v${targetVersion.sequence} 복원`,
        affectedStages: ['problem_definition', 'users', 'features', 'success_metrics', 'integrated_prd'],
        createdAt: new Date().toISOString(),
      };
      await storage.saveEvent(evt);

      currentProject.currentDocumentVersionId = newDocId;
      currentProject.revision += 1;
      currentProject.updatedAt = new Date().toISOString();
      await storage.saveProject(currentProject);

      setSaveStatus('saved');
      await loadProjectDetails(currentProject.id);
      refreshProjects();
    } catch (err: any) {
      setSaveStatus('error');
      throw err;
    }
  };

  // 7. Flow: Save New Criteria Version
  const handleSaveNewCriteria = async (criteria: Criterion[], reason: string) => {
    if (!currentProject || !currentCriteriaVersion) return;

    setSaveStatus('saving');
    try {
      const nextSeq = criteriaVersions.length + 1;
      const newCritId = `crit_v${nextSeq}_${Date.now()}`;
      const newCritVersion: CriteriaVersion = {
        id: newCritId,
        projectId: currentProject.id,
        sequence: nextSeq,
        criteria,
        reason,
        createdAt: new Date().toISOString(),
      };
      await storage.saveCriteriaVersion(newCritVersion);

      const evt: ChangeEvent = {
        id: `evt_${Date.now()}`,
        projectId: currentProject.id,
        operationId: `op_crit_${Date.now()}`,
        beforeVersionId: currentVersion?.id || null,
        afterVersionId: currentVersion?.id || null,
        type: 'criteria_change',
        reason,
        affectedStages: ['problem_definition', 'users', 'features', 'success_metrics', 'integrated_prd'],
        createdAt: new Date().toISOString(),
      };
      await storage.saveEvent(evt);

      currentProject.currentCriteriaVersionId = newCritId;
      currentProject.revision += 1;
      currentProject.updatedAt = new Date().toISOString();
      await storage.saveProject(currentProject);

      setSaveStatus('saved');
      await loadProjectDetails(currentProject.id);
      refreshProjects();
    } catch (err: any) {
      setSaveStatus('error');
      throw err;
    }
  };

  // 8. Flow: Exports & Imports
  const handleExportMarkdown = () => {
    if (!currentProject || !currentVersion) return;
    const md = storage.generateExportMarkdown({
      projectTitle: currentProject.title,
      versionSequence: currentVersion.sequence,
      markdown: currentVersion.markdown,
      review: latestReview,
      isStaleReview,
    });

    const safeTitle = currentProject.title.replace(/[/\\?%*:|"<>]/g, '_');
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeTitle}_v${currentVersion.sequence}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = async () => {
    if (!currentProject) return;
    const jsonStr = await storage.exportProjectBackup(currentProject.id);
    const safeTitle = currentProject.title.replace(/[/\\?%*:|"<>]/g, '_');
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeTitle}_backup.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCandidate = () => {
    if (!currentProject?.candidateDraft) return;
    const md = `# [검토 미완료 초안] ${currentProject.title}\n\n${currentProject.candidateDraft.candidateMarkdown}`;
    const safeTitle = currentProject.title.replace(/[/\\?%*:|"<>]/g, '_');
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeTitle}_초안_검토미완료.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = async (jsonText: string) => {
    const imported = await storage.importProjectBackup(jsonText);
    await refreshProjects();
    setCurrentProjectId(imported.id);
    await loadProjectDetails(imported.id);
  };

  // 9. Flow: Rename & Delete Project
  const handleRenameProject = async (projectId: string, newTitle: string) => {
    const proj = await storage.getProjectById(projectId);
    if (!proj) return;
    proj.title = newTitle;
    proj.updatedAt = new Date().toISOString();
    proj.revision += 1;
    await storage.saveProject(proj);
    await refreshProjects();
    if (currentProjectId === projectId) {
      setCurrentProject({ ...proj });
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteModalProject) return;
    await storage.deleteProject(deleteModalProject.id);
    setDeleteModalProject(null);
    if (currentProjectId === deleteModalProject.id) {
      setCurrentProjectId(null);
      setCurrentProject(null);
    }
    await refreshProjects();
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col text-neutral-900 font-sans">
      {/* Top Header */}
      <Header
        currentProject={currentProject}
        currentVersion={currentVersion}
        review={latestReview}
        saveStatus={saveStatus}
        isReviewing={isReviewing}
        onRunReview={handleRunReview}
        onOpenCriteriaModal={() => setCriteriaModalOpen(true)}
        onOpenHistoryModal={() => setHistoryModalOpen(true)}
        onExportMarkdown={handleExportMarkdown}
        onExportJSON={handleExportJSON}
        onExportCandidate={handleExportCandidate}
        onBackToList={handleBackToList}
      />

      {/* AI Error Notification Banner */}
      {aiError && (
        <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 flex items-center justify-between text-xs text-rose-800 transition-all">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{aiError}</span>
          </div>
          <button
            onClick={() => setAiError(null)}
            className="p-1 text-rose-500 hover:text-rose-800 transition-colors"
            title="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main View Area */}
      {!currentProjectId ? (
        // Home: Project List
        <main className="flex-1">
          <ProjectList
            projects={projects}
            reviewsByProjectId={reviewsByProjectId}
            onSelectProject={handleSelectProject}
            onOpenNewModal={(mode) => {
              setNewModalMode(mode);
              setNewModalOpen(true);
            }}
            onRenameProject={handleRenameProject}
            onDeleteProject={(p) => setDeleteModalProject(p)}
          />
        </main>
      ) : (
        // Workspace View
        <div className="flex-1 flex flex-col overflow-hidden h-[calc(100vh-3.5rem)]">
          {/* Stage Breadcrumb Navigation */}
          <StageNav
            currentStage={activeStage}
            review={latestReview}
            isStaleReview={isStaleReview}
            onSelectStage={handleSelectStage}
          />

          {/* Mobile Tab Switcher (< 768px) */}
          <div className="md:hidden flex border-b border-neutral-200 bg-white">
            <button
              onClick={() => setMobileTab('chat')}
              className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 ${
                mobileTab === 'chat'
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-500'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>대화 ({messages.length})</span>
            </button>
            <button
              onClick={() => setMobileTab('doc')}
              className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 ${
                mobileTab === 'doc'
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-500'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PRD 문서</span>
            </button>
            <button
              onClick={() => setMobileTab('review')}
              className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 ${
                mobileTab === 'review'
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-500'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>검토 결과</span>
            </button>
          </div>

          {/* Workspace Columns Container */}
          <div className="flex-1 flex overflow-hidden">
            {/* Desktop (>=1280px): 3 Columns (Left ~28%, Center ~44%, Right ~28%) */}
            <div className="hidden xl:flex w-full h-full">
              {/* Left Column: Chat */}
              <div className="w-[28%] h-full shrink-0">
                <ChatPanel
                  messages={messages}
                  isLoading={isAiWorking}
                  onSendMessage={handleSendMessage}
                  onApplyFixes={() => handleSendMessage('', true)}
                  hasRequiredFindings={Boolean(
                    latestReview?.findings.some((f) => f.severity === 'required')
                  )}
                />
              </div>

              {/* Center Column: Document */}
              <div className="w-[44%] h-full shrink-0">
                <DocumentPanel
                  projectId={currentProject?.id}
                  currentVersion={currentVersion}
                  candidateDraft={currentProject?.candidateDraft || null}
                  draftEditMarkdown={draftEditMarkdown}
                  onSaveDirectEdit={handleSaveDirectEdit}
                  onClearDraftEdit={async () => {
                    if (currentProject) {
                      await storage.clearDraftEdit(currentProject.id);
                      setDraftEditMarkdown(null);
                    }
                  }}
                  onApplyDraftEdit={(recoveredText) => {
                    setDraftEditMarkdown(null);
                  }}
                  onRetryReviewCandidate={handleRunReview}
                  onExportCandidate={handleExportCandidate}
                  isStaleReview={isStaleReview}
                />
              </div>

              {/* Right Column: Review */}
              <div className="w-[28%] h-full shrink-0">
                <ReviewPanel
                  review={latestReview}
                  criteria={currentCriteriaVersion?.criteria || []}
                  isStaleReview={isStaleReview}
                  onApplyFixes={() => handleSendMessage('', true)}
                  onRunReview={handleRunReview}
                  isReviewing={isReviewing}
                />
              </div>
            </div>

            {/* Tablet (768px - 1279px): 2 Columns (Document + Tabs for Chat/Review) */}
            <div className="hidden md:flex xl:hidden w-full h-full">
              <div className="w-[58%] h-full">
                <DocumentPanel
                  projectId={currentProject?.id}
                  currentVersion={currentVersion}
                  candidateDraft={currentProject?.candidateDraft || null}
                  draftEditMarkdown={draftEditMarkdown}
                  onSaveDirectEdit={handleSaveDirectEdit}
                  onClearDraftEdit={async () => {
                    if (currentProject) {
                      await storage.clearDraftEdit(currentProject.id);
                      setDraftEditMarkdown(null);
                    }
                  }}
                  onApplyDraftEdit={(recoveredText) => {
                    setDraftEditMarkdown(null);
                  }}
                  onRetryReviewCandidate={handleRunReview}
                  onExportCandidate={handleExportCandidate}
                  isStaleReview={isStaleReview}
                />
              </div>

              <div className="w-[42%] h-full flex flex-col border-l border-neutral-200 bg-white">
                <div className="flex border-b border-neutral-200">
                  <button
                    onClick={() => setTabletSideTab('review')}
                    className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 ${
                      tabletSideTab === 'review'
                        ? 'border-neutral-900 text-neutral-900'
                        : 'border-transparent text-neutral-500'
                    }`}
                  >
                    검토 결과
                  </button>
                  <button
                    onClick={() => setTabletSideTab('chat')}
                    className={`flex-1 py-2 text-xs font-semibold text-center border-b-2 ${
                      tabletSideTab === 'chat'
                        ? 'border-neutral-900 text-neutral-900'
                        : 'border-transparent text-neutral-500'
                    }`}
                  >
                    대화 ({messages.length})
                  </button>
                </div>

                <div className="flex-1 overflow-hidden">
                  {tabletSideTab === 'review' ? (
                    <ReviewPanel
                      review={latestReview}
                      criteria={currentCriteriaVersion?.criteria || []}
                      isStaleReview={isStaleReview}
                      onApplyFixes={() => handleSendMessage('', true)}
                      onRunReview={handleRunReview}
                      isReviewing={isReviewing}
                    />
                  ) : (
                    <ChatPanel
                      messages={messages}
                      isLoading={isAiWorking}
                      onSendMessage={handleSendMessage}
                      onApplyFixes={() => handleSendMessage('', true)}
                      hasRequiredFindings={Boolean(
                        latestReview?.findings.some((f) => f.severity === 'required')
                      )}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Mobile (< 768px): Single Column Tab View */}
            <div className="md:hidden w-full h-full">
              {mobileTab === 'chat' && (
                <ChatPanel
                  messages={messages}
                  isLoading={isAiWorking}
                  onSendMessage={handleSendMessage}
                  onApplyFixes={() => handleSendMessage('', true)}
                  hasRequiredFindings={Boolean(
                    latestReview?.findings.some((f) => f.severity === 'required')
                  )}
                />
              )}
              {mobileTab === 'doc' && (
                <DocumentPanel
                  projectId={currentProject?.id}
                  currentVersion={currentVersion}
                  candidateDraft={currentProject?.candidateDraft || null}
                  draftEditMarkdown={draftEditMarkdown}
                  onSaveDirectEdit={handleSaveDirectEdit}
                  onClearDraftEdit={async () => {
                    if (currentProject) {
                      await storage.clearDraftEdit(currentProject.id);
                      setDraftEditMarkdown(null);
                    }
                  }}
                  onApplyDraftEdit={(recoveredText) => {
                    setDraftEditMarkdown(null);
                  }}
                  onRetryReviewCandidate={handleRunReview}
                  onExportCandidate={handleExportCandidate}
                  isStaleReview={isStaleReview}
                />
              )}
              {mobileTab === 'review' && (
                <ReviewPanel
                  review={latestReview}
                  criteria={currentCriteriaVersion?.criteria || []}
                  isStaleReview={isStaleReview}
                  onApplyFixes={() => handleSendMessage('', true)}
                  onRunReview={handleRunReview}
                  isReviewing={isReviewing}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={newModalOpen}
        initialMode={newModalMode}
        onCreateNew={handleCreateNew}
        onImportPrd={handleImportPrd}
        onImportBackupFile={handleImportBackup}
        onClose={() => setNewModalOpen(false)}
      />

      {/* Criteria View & Edit Modal */}
      {currentCriteriaVersion && (
        <CriteriaModal
          isOpen={criteriaModalOpen}
          currentCriteria={currentCriteriaVersion.criteria}
          criteriaSequence={currentCriteriaVersion.sequence}
          onSaveNewCriteria={handleSaveNewCriteria}
          onClose={() => setCriteriaModalOpen(false)}
        />
      )}

      {/* History & Restore Modal */}
      <HistoryModal
        isOpen={historyModalOpen}
        versions={documentVersions}
        currentVersionId={currentVersion?.id || null}
        events={events}
        onRestoreVersion={handleRestoreVersion}
        onClose={() => setHistoryModalOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteModalProject)}
        projectTitle={deleteModalProject?.title || ''}
        onConfirm={handleDeleteProject}
        onCancel={() => setDeleteModalProject(null)}
      />
    </div>
  );
}
