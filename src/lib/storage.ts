import {
  Project,
  DocumentVersion,
  CriteriaVersion,
  ConversationMessage,
  Review,
  ChangeEvent,
  DraftEdit,
  BackupData,
  DEFAULT_CRITERIA,
  Verdict,
} from '../types/prd';

const DB_NAME = 'prd_assistant_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('projects')) {
        const store = db.createObjectStore('projects', { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt');
      }

      if (!db.objectStoreNames.contains('document_versions')) {
        const store = db.createObjectStore('document_versions', { keyPath: 'id' });
        store.createIndex('projectId', 'projectId');
        store.createIndex('sequence', 'sequence');
      }

      if (!db.objectStoreNames.contains('criteria_versions')) {
        const store = db.createObjectStore('criteria_versions', { keyPath: 'id' });
        store.createIndex('projectId', 'projectId');
        store.createIndex('sequence', 'sequence');
      }

      if (!db.objectStoreNames.contains('messages')) {
        const store = db.createObjectStore('messages', { keyPath: 'id' });
        store.createIndex('projectId', 'projectId');
        store.createIndex('createdAt', 'createdAt');
      }

      if (!db.objectStoreNames.contains('reviews')) {
        const store = db.createObjectStore('reviews', { keyPath: 'id' });
        store.createIndex('projectId', 'projectId');
        store.createIndex('documentVersionId', 'documentVersionId');
      }

      if (!db.objectStoreNames.contains('events')) {
        const store = db.createObjectStore('events', { keyPath: 'id' });
        store.createIndex('projectId', 'projectId');
        store.createIndex('createdAt', 'createdAt');
      }

      if (!db.objectStoreNames.contains('draft_edits')) {
        db.createObjectStore('draft_edits', { keyPath: 'projectId' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
}

// Multi-tab channel
const syncChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('prd_sync_channel')
  : null;

export function broadcastProjectUpdate(projectId: string, revision: number) {
  if (syncChannel) {
    syncChannel.postMessage({ type: 'PROJECT_UPDATED', projectId, revision });
  }
}

export function subscribeToSync(callback: (msg: { type: string; projectId: string; revision: number }) => void) {
  if (!syncChannel) return () => {};
  const handler = (e: MessageEvent) => callback(e.data);
  syncChannel.addEventListener('message', handler);
  return () => syncChannel.removeEventListener('message', handler);
}

// Project Operations
export async function getAllProjects(): Promise<Project[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readonly');
    const store = tx.objectStore('projects');
    const request = store.getAll();
    request.onsuccess = () => {
      const projects = (request.result as Project[]) || [];
      projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      resolve(projects);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getProjectById(id: string): Promise<Project | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readonly');
    const store = tx.objectStore('projects');
    const request = store.get(id);
    request.onsuccess = () => resolve((request.result as Project) || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveProject(project: Project): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('projects', 'readwrite');
    const store = tx.objectStore('projects');
    const request = store.put(project);
    request.onsuccess = () => {
      broadcastProjectUpdate(project.id, project.revision);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteProject(projectId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      ['projects', 'document_versions', 'criteria_versions', 'messages', 'reviews', 'events', 'draft_edits'],
      'readwrite'
    );

    tx.objectStore('projects').delete(projectId);
    tx.objectStore('draft_edits').delete(projectId);

    // Delete associated records
    const storesToDelete = ['document_versions', 'criteria_versions', 'messages', 'reviews', 'events'] as const;
    storesToDelete.forEach((sName) => {
      const store = tx.objectStore(sName);
      const index = store.index('projectId');
      const req = index.openKeyCursor(IDBKeyRange.only(projectId));
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        }
      };
    });

    tx.oncomplete = () => {
      broadcastProjectUpdate(projectId, -1);
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

// Document Versions
export async function getDocumentVersions(projectId: string): Promise<DocumentVersion[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('document_versions', 'readonly');
    const index = tx.objectStore('document_versions').index('projectId');
    const request = index.getAll(projectId);
    request.onsuccess = () => {
      const versions = (request.result as DocumentVersion[]) || [];
      versions.sort((a, b) => a.sequence - b.sequence);
      resolve(versions);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveDocumentVersion(version: DocumentVersion): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('document_versions', 'readwrite');
    const request = tx.objectStore('document_versions').put(version);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Criteria Versions
export async function getCriteriaVersions(projectId: string): Promise<CriteriaVersion[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('criteria_versions', 'readonly');
    const index = tx.objectStore('criteria_versions').index('projectId');
    const request = index.getAll(projectId);
    request.onsuccess = () => {
      const versions = (request.result as CriteriaVersion[]) || [];
      versions.sort((a, b) => a.sequence - b.sequence);
      resolve(versions);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveCriteriaVersion(version: CriteriaVersion): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('criteria_versions', 'readwrite');
    const request = tx.objectStore('criteria_versions').put(version);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Messages
export async function getMessages(projectId: string): Promise<ConversationMessage[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('messages', 'readonly');
    const index = tx.objectStore('messages').index('projectId');
    const request = index.getAll(projectId);
    request.onsuccess = () => {
      const msgs = (request.result as ConversationMessage[]) || [];
      msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      resolve(msgs);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveMessage(message: ConversationMessage): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('messages', 'readwrite');
    const request = tx.objectStore('messages').put(message);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Reviews
export async function getReviews(projectId: string): Promise<Review[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('reviews', 'readonly');
    const index = tx.objectStore('reviews').index('projectId');
    const request = index.getAll(projectId);
    request.onsuccess = () => {
      const reviews = (request.result as Review[]) || [];
      reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      resolve(reviews);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveReview(review: Review): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('reviews', 'readwrite');
    const request = tx.objectStore('reviews').put(review);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Change Events
export async function getEvents(projectId: string): Promise<ChangeEvent[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('events', 'readonly');
    const index = tx.objectStore('events').index('projectId');
    const request = index.getAll(projectId);
    request.onsuccess = () => {
      const events = (request.result as ChangeEvent[]) || [];
      events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      resolve(events);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveEvent(event: ChangeEvent): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('events', 'readwrite');
    const request = tx.objectStore('events').put(event);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Draft Edits (Debounced 1s in editor)
export async function getDraftEdit(projectId: string): Promise<DraftEdit | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('draft_edits', 'readonly');
    const request = tx.objectStore('draft_edits').get(projectId);
    request.onsuccess = () => resolve((request.result as DraftEdit) || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDraftEdit(projectId: string, markdown: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('draft_edits', 'readwrite');
    const item: DraftEdit = { projectId, markdown, updatedAt: new Date().toISOString() };
    const request = tx.objectStore('draft_edits').put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearDraftEdit(projectId: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('draft_edits', 'readwrite');
    const request = tx.objectStore('draft_edits').delete(projectId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Project Initialization Helper
export async function createProjectRecord(params: {
  id?: string;
  title: string;
  initialMarkdown?: string;
  source?: 'user' | 'ai' | 'import';
  scope?: string;
}): Promise<Project> {
  const projectId = params.id || `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  // Create initial criteria version
  const critVersionId = `crit_v1_${Date.now()}`;
  const criteriaVersion: CriteriaVersion = {
    id: critVersionId,
    projectId,
    sequence: 1,
    criteria: DEFAULT_CRITERIA,
    reason: '초기 프로젝트 기본 기준 설정',
    createdAt: now,
  };
  await saveCriteriaVersion(criteriaVersion);

  let docVersionId: string | null = null;
  if (params.initialMarkdown) {
    docVersionId = `doc_v1_${Date.now()}`;
    const docVersion: DocumentVersion = {
      id: docVersionId,
      projectId,
      sequence: 1,
      markdown: params.initialMarkdown,
      source: params.source || 'user',
      parentVersionId: null,
      createdAt: now,
      changeSummary: ['초기 문서 생성'],
    };
    await saveDocumentVersion(docVersion);

    const initEvent: ChangeEvent = {
      id: `evt_${Date.now()}`,
      projectId,
      operationId: `op_init_${Date.now()}`,
      beforeVersionId: null,
      afterVersionId: docVersionId,
      type: 'create',
      reason: params.source === 'import' ? '기존 PRD 가져오기' : '새 PRD 생성',
      affectedStages: ['problem_definition', 'users', 'features', 'success_metrics', 'integrated_prd'],
      createdAt: now,
    };
    await saveEvent(initEvent);
  }

  const project: Project = {
    id: projectId,
    title: params.title.trim() || '새 PRD 프로젝트',
    createdAt: now,
    updatedAt: now,
    revision: 1,
    currentDocumentVersionId: docVersionId,
    currentCriteriaVersionId: critVersionId,
    scope: params.scope || 'all',
    activeOperationId: null,
    candidateDraft: null,
  };

  await saveProject(project);
  return project;
}

// Export to JSON Backup
export async function exportProjectBackup(projectId: string): Promise<string> {
  const project = await getProjectById(projectId);
  if (!project) throw new Error('프로젝트를 찾을 수 없습니다.');

  const [documentVersions, criteriaVersions, reviews, messages, changeEvents, draftEdit] = await Promise.all([
    getDocumentVersions(projectId),
    getCriteriaVersions(projectId),
    getReviews(projectId),
    getMessages(projectId),
    getEvents(projectId),
    getDraftEdit(projectId),
  ]);

  const backup: BackupData = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    project,
    documentVersions,
    criteriaVersions,
    reviews,
    messages,
    changeEvents,
    draftEdit,
  };

  return JSON.stringify(backup, null, 2);
}

// Import from JSON Backup
export async function importProjectBackup(jsonString: string): Promise<Project> {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    throw new Error('유효한 JSON 파일이 아닙니다.');
  }

  if (parsed.schemaVersion !== 1 || !parsed.project || !parsed.documentVersions) {
    throw new Error('지원하지 않거나 손상된 백업 파일 형식입니다. (schemaVersion=1 필요)');
  }

  // Create new unique IDs to avoid clobbering existing projects
  const oldProjectId = parsed.project.id;
  const newProjectId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const docIdMap = new Map<string, string>();
  const critIdMap = new Map<string, string>();

  // Map criteria versions
  const newCriteriaVersions: CriteriaVersion[] = (parsed.criteriaVersions || []).map((cv: CriteriaVersion) => {
    const newId = `crit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    critIdMap.set(cv.id, newId);
    return {
      ...cv,
      id: newId,
      projectId: newProjectId,
    };
  });

  // Map document versions
  const newDocumentVersions: DocumentVersion[] = (parsed.documentVersions || []).map((dv: DocumentVersion) => {
    const newId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    docIdMap.set(dv.id, newId);
    return {
      ...dv,
      id: newId,
      projectId: newProjectId,
      parentVersionId: dv.parentVersionId ? docIdMap.get(dv.parentVersionId) || null : null,
    };
  });

  // Map reviews
  const newReviews: Review[] = (parsed.reviews || []).map((rv: Review) => {
    const newId = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    return {
      ...rv,
      id: newId,
      projectId: newProjectId,
      documentVersionId: docIdMap.get(rv.documentVersionId) || rv.documentVersionId,
      criteriaVersionId: critIdMap.get(rv.criteriaVersionId) || rv.criteriaVersionId,
    };
  });

  // Map messages
  const newMessages: ConversationMessage[] = (parsed.messages || []).map((msg: ConversationMessage) => {
    return {
      ...msg,
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      projectId: newProjectId,
    };
  });

  // Map events
  const newEvents: ChangeEvent[] = (parsed.changeEvents || []).map((evt: ChangeEvent) => {
    return {
      ...evt,
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      projectId: newProjectId,
      beforeVersionId: evt.beforeVersionId ? docIdMap.get(evt.beforeVersionId) || null : null,
      afterVersionId: evt.afterVersionId ? docIdMap.get(evt.afterVersionId) || null : null,
    };
  });

  const newProject: Project = {
    ...parsed.project,
    id: newProjectId,
    title: `${parsed.project.title} (가져옴)`,
    createdAt: now,
    updatedAt: now,
    revision: 1,
    currentDocumentVersionId: parsed.project.currentDocumentVersionId
      ? docIdMap.get(parsed.project.currentDocumentVersionId) || null
      : null,
    currentCriteriaVersionId: parsed.project.currentCriteriaVersionId
      ? critIdMap.get(parsed.project.currentCriteriaVersionId) || null
      : null,
    candidateDraft: null,
    activeOperationId: null,
  };

  // Save all in transactions
  await saveProject(newProject);
  for (const cv of newCriteriaVersions) await saveCriteriaVersion(cv);
  for (const dv of newDocumentVersions) await saveDocumentVersion(dv);
  for (const rv of newReviews) await saveReview(rv);
  for (const msg of newMessages) await saveMessage(msg);
  for (const evt of newEvents) await saveEvent(evt);

  return newProject;
}

// Export to Markdown with Metadata
export function generateExportMarkdown(params: {
  projectTitle: string;
  versionSequence: number;
  markdown: string;
  review: Review | null;
  isStaleReview?: boolean;
}): string {
  const lines: string[] = [];
  lines.push(`# ${params.projectTitle}`);
  lines.push('');
  lines.push(`- **문서 버전**: v${params.versionSequence}`);
  lines.push(`- **내보낸 일시**: ${new Date().toLocaleString('ko-KR')}`);

  if (params.review && !params.isStaleReview) {
    const verdictText = params.review.verdict === 'can_proceed' ? '진행 가능' : '필수 정보 보완 필요';
    lines.push(`- **최신 검토 상태**: ${verdictText}`);
    lines.push(`- **판정 근거**: ${params.review.verdictReason}`);

    const assumptions = params.review.evidence.filter((e) => e.kind === 'assumption');
    const unverified = params.review.evidence.filter((e) => e.kind === 'unverified');

    if (assumptions.length > 0) {
      lines.push(`- **식별된 가설/가정 (${assumptions.length}건)**:`);
      assumptions.forEach((a) => lines.push(`  - ${a.text}`));
    }

    if (unverified.length > 0) {
      lines.push(`- **미확인 사항 (${unverified.length}건)**:`);
      unverified.forEach((u) => lines.push(`  - ${u.text}${u.confirmationPlan ? ` (확인 계획: ${u.confirmationPlan})` : ''}`));
    }
  } else if (params.isStaleReview) {
    lines.push(`- **검토 상태**: 재검토 필요 (문서 직접 편집 또는 기준 변경 후 미검토 상태)`);
  } else {
    lines.push(`- **검토 상태**: 미검토`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(params.markdown);

  return lines.join('\n');
}
