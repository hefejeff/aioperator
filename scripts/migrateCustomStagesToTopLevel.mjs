import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = new Set(process.argv.slice(2));
const isDryRun = args.has('--dry-run');
const overwrite = args.has('--overwrite');

function getDatabaseUrl() {
  return (
    process.env.FIREBASE_DATABASE_URL
    || process.env.VITE_FIREBASE_DATABASE_URL
    || process.env.DATABASE_URL
    || ''
  );
}

function getServiceAccountFromEnvOrFile() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  const explicitPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (explicitPath && existsSync(explicitPath)) {
    return JSON.parse(readFileSync(explicitPath, 'utf8'));
  }

  const defaultPath = join(__dirname, '../serviceAccountKey.json');
  if (existsSync(defaultPath)) {
    return JSON.parse(readFileSync(defaultPath, 'utf8'));
  }

  return null;
}

function sanitizeStage(stage) {
  const sanitized = {
    id: stage?.id ?? '',
    title: stage?.title ?? '',
    createdAt: Number.isFinite(stage?.createdAt) ? stage.createdAt : Date.now(),
    updatedAt: Number.isFinite(stage?.updatedAt) ? stage.updatedAt : Date.now(),
    selectedDocumentIds: Array.isArray(stage?.selectedDocumentIds) ? stage.selectedDocumentIds.filter(Boolean) : [],
    selectedTranscriptIds: Array.isArray(stage?.selectedTranscriptIds) ? stage.selectedTranscriptIds.filter(Boolean) : []
  };

  if (typeof stage?.description !== 'undefined') {
    sanitized.description = stage.description;
  }

  if (typeof stage?.phase !== 'undefined') {
    sanitized.phase = stage.phase;
  }

  if (typeof stage?.aiModelId !== 'undefined') {
    sanitized.aiModelId = stage.aiModelId;
  }

  if (typeof stage?.prompt !== 'undefined') {
    sanitized.prompt = stage.prompt;
  }

  if (Array.isArray(stage?.promptVersions)) {
    sanitized.promptVersions = stage.promptVersions
      .filter((entry) => entry && typeof entry.prompt === 'string')
      .map((entry, index) => ({
        version: Number.isFinite(entry.version) ? entry.version : index + 1,
        prompt: entry.prompt,
        updatedAt: Number.isFinite(entry.updatedAt) ? entry.updatedAt : Date.now(),
        ...(entry.updatedBy ? { updatedBy: entry.updatedBy } : {})
      }));
  }

  if (Array.isArray(stage?.steps)) {
    sanitized.steps = stage.steps
      .filter((child) => child && typeof child.id === 'string' && typeof child.title === 'string')
      .map((child, index) => ({
        id: child.id || `child-step-${index + 1}`,
        title: child.title,
        ...(typeof child.description !== 'undefined' ? { description: child.description } : {}),
        ...(typeof child.prompt !== 'undefined' ? { prompt: child.prompt } : {}),
        createdAt: Number.isFinite(child.createdAt) ? child.createdAt : Date.now(),
        updatedAt: Number.isFinite(child.updatedAt) ? child.updatedAt : Date.now()
      }));
  }

  if (typeof stage?.outputType !== 'undefined') {
    sanitized.outputType = stage.outputType;
  }

  if (typeof stage?.excelTableTemplate !== 'undefined') {
    sanitized.excelTableTemplate = stage.excelTableTemplate;
  }

  if (stage?.excelTemplate) {
    sanitized.excelTemplate = {
      fileName: stage.excelTemplate.fileName,
      dataUrl: stage.excelTemplate.dataUrl,
      uploadedAt: Number.isFinite(stage.excelTemplate.uploadedAt) ? stage.excelTemplate.uploadedAt : Date.now()
    };
  }

  if (stage?.presentationTemplate) {
    sanitized.presentationTemplate = {
      fileName: stage.presentationTemplate.fileName,
      dataUrl: stage.presentationTemplate.dataUrl,
      uploadedAt: Number.isFinite(stage.presentationTemplate.uploadedAt) ? stage.presentationTemplate.uploadedAt : Date.now()
    };
  }

  return sanitized;
}

function normalizeStages(stages = []) {
  return stages
    .filter(Boolean)
    .map(sanitizeStage);
}

function collectStageRefs(customStepIds = [], stageMap = {}) {
  return customStepIds
    .filter((id) => typeof id === 'string' && id.length > 0)
    .filter((id) => Boolean(stageMap[id]));
}

async function initAdmin() {
  const databaseURL = getDatabaseUrl();
  const serviceAccount = getServiceAccountFromEnvOrFile();

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL
    });
    return;
  }

  // Fall back to application default credentials if available.
  admin.initializeApp({ databaseURL });
}

async function migrate() {
  await initAdmin();
  const db = admin.database();

  console.log('Reading companies...');
  const companiesSnap = await db.ref('companies').once('value');
  if (!companiesSnap.exists()) {
    console.log('No companies found. Nothing to migrate.');
    return;
  }

  const companies = companiesSnap.val() || {};
  const rootUpdates = {};

  let companiesTouched = 0;
  let journeysUpdated = 0;
  let stagesMigrated = 0;
  let legacyNodesCleared = 0;

  for (const [companyId, company] of Object.entries(companies)) {
    const ownerUserId = company?.createdBy;
    if (!ownerUserId) {
      continue;
    }

    const journeys = company?.journeys || {};
    const legacyCurrentJourney = company?.journey || {};

    const existingTopLevelSnap = await db.ref(`customStages/${ownerUserId}/${companyId}`).once('value');
    const existingTopLevelRaw = existingTopLevelSnap.exists() ? existingTopLevelSnap.val() : {};

    const existingStageLibrary = {};
    const legacyTopLevelByJourney = {};
    for (const [key, value] of Object.entries(existingTopLevelRaw || {})) {
      if (Array.isArray(value)) {
        legacyTopLevelByJourney[key] = normalizeStages(value);
        continue;
      }
      if (value && typeof value === 'object' && (value.title || value.createdAt)) {
        const normalized = sanitizeStage({ ...value, id: value.id || key });
        existingStageLibrary[normalized.id] = normalized;
      }
    }

    let companyTouched = false;
    const stageLibrary = { ...existingStageLibrary };

    // Migrate each explicit journey record.
    for (const [journeyId, journey] of Object.entries(journeys)) {
      const legacyStages = Array.isArray(journey?.customSteps) ? journey.customSteps : [];
      const legacyTopLevelStages = Array.isArray(legacyTopLevelByJourney?.[journeyId])
        ? legacyTopLevelByJourney[journeyId]
        : [];

      const mergedStages = [...legacyTopLevelStages, ...normalizeStages(legacyStages)];
      for (const stage of mergedStages) {
        if (!stage.id) continue;
        if (!stageLibrary[stage.id] || overwrite) {
          stageLibrary[stage.id] = stage;
          stagesMigrated += 1;
        }
      }

      const existingRefs = Array.isArray(journey?.customStepIds) ? journey.customStepIds : [];
      const mergedRefSet = new Set([
        ...existingRefs.filter((id) => typeof id === 'string' && id.length > 0),
        ...mergedStages.map((stage) => stage.id).filter(Boolean)
      ]);
      const resolvedRefs = collectStageRefs(Array.from(mergedRefSet), stageLibrary);
      const resolvedAuthorRefs = resolvedRefs.map((stageId) => ({ id: stageId, authorId: ownerUserId }));

      if (resolvedRefs.length > 0 || Array.isArray(journey?.customStepIds)) {
        rootUpdates[`companies/${companyId}/journeys/${journeyId}/customStepIds`] = resolvedRefs;
        rootUpdates[`companies/${companyId}/journeys/${journeyId}/customStepRefs`] = resolvedAuthorRefs;
        journeysUpdated += 1;
        companyTouched = true;
      }

      if (Array.isArray(journey?.customSteps)) {
        rootUpdates[`companies/${companyId}/journeys/${journeyId}/customSteps`] = null;
        legacyNodesCleared += 1;
        companyTouched = true;
      }

      if (Array.isArray(legacyTopLevelByJourney?.[journeyId])) {
        rootUpdates[`customStages/${ownerUserId}/${companyId}/${journeyId}`] = null;
        legacyNodesCleared += 1;
        companyTouched = true;
      }
    }

    // Handle legacy current journey fallback (company.journey).
    const currentJourneyId = company?.currentJourneyId;
    const legacyCurrentStages = Array.isArray(legacyCurrentJourney?.customSteps)
      ? legacyCurrentJourney.customSteps
      : [];

    if (legacyCurrentStages.length > 0 && currentJourneyId) {
      const normalized = normalizeStages(legacyCurrentStages);
      for (const stage of normalized) {
        if (!stage.id) continue;
        if (!stageLibrary[stage.id] || overwrite) {
          stageLibrary[stage.id] = stage;
          stagesMigrated += 1;
        }
      }

      const existingRefs = Array.isArray(journeys?.[currentJourneyId]?.customStepIds)
        ? journeys[currentJourneyId].customStepIds
        : [];
      const mergedRefSet = new Set([
        ...existingRefs.filter((id) => typeof id === 'string' && id.length > 0),
        ...normalized.map((stage) => stage.id).filter(Boolean)
      ]);
      const resolvedRefs = collectStageRefs(Array.from(mergedRefSet), stageLibrary);
      rootUpdates[`companies/${companyId}/journeys/${currentJourneyId}/customStepIds`] = resolvedRefs;
      rootUpdates[`companies/${companyId}/journeys/${currentJourneyId}/customStepRefs`] = resolvedRefs.map((stageId) => ({
        id: stageId,
        authorId: ownerUserId
      }));
      journeysUpdated += 1;
      rootUpdates[`companies/${companyId}/journey/customSteps`] = null;
      rootUpdates[`companies/${companyId}/journey/customStepIds`] = resolvedRefs;
      rootUpdates[`companies/${companyId}/journey/customStepRefs`] = resolvedRefs.map((stageId) => ({
        id: stageId,
        authorId: ownerUserId
      }));
      legacyNodesCleared += 1;
      companyTouched = true;
    }

    Object.entries(stageLibrary).forEach(([stageId, stage]) => {
      rootUpdates[`customStages/${ownerUserId}/${companyId}/${stageId}`] = {
        ...stage,
        authorId: stage.authorId || ownerUserId
      };
    });

    if (companyTouched) {
      companiesTouched += 1;
    }
  }

  const totalOps = Object.keys(rootUpdates).length;
  console.log(`Prepared ${totalOps} updates across ${companiesTouched} companies.`);
  console.log(`Journeys updated: ${journeysUpdated}; stages migrated: ${stagesMigrated}; legacy nodes cleared: ${legacyNodesCleared}.`);

  if (totalOps === 0) {
    console.log('Nothing to migrate.');
    return;
  }

  if (isDryRun) {
    console.log('Dry run enabled; no writes were performed.');
    return;
  }

  await db.ref().update(rootUpdates);
  console.log('✅ Migration complete. Custom stages are now author-scoped company-level records referenced by journey customStepIds.');
}

migrate().catch((error) => {
  console.error('Migration failed:', error?.message || error);
  process.exit(1);
});
