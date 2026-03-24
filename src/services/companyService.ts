import { ref, get, push, set, update, remove, query, orderByChild, equalTo } from 'firebase/database';
import { db } from './firebaseInit';
import type { Company, CompanyResearch, Meeting, DocumentAnalysis, RfpAnalysis, UploadedDocument, FunctionalHighLevelMeeting, CustomJourneyStep, CustomStepReference, JourneyCollaborationConfig, JourneyStepSettings } from '../types';

const sanitizeCustomStageForSave = (stage: CustomJourneyStep): CustomJourneyStep => {
  const sanitized: CustomJourneyStep = {
    id: stage.id,
    title: stage.title,
    createdAt: stage.createdAt,
    updatedAt: stage.updatedAt,
    selectedDocumentIds: Array.isArray(stage.selectedDocumentIds) ? [...stage.selectedDocumentIds] : [],
    selectedTranscriptIds: Array.isArray(stage.selectedTranscriptIds) ? [...stage.selectedTranscriptIds] : [],
    selectedSkillIds: Array.isArray(stage.selectedSkillIds) ? [...stage.selectedSkillIds] : []
  };

  if (typeof stage.description !== 'undefined') {
    sanitized.description = stage.description;
  }

  if (typeof stage.phase !== 'undefined') {
    sanitized.phase = stage.phase;
  }

  if (typeof stage.aiModelId !== 'undefined') {
    sanitized.aiModelId = stage.aiModelId;
  }

  if (typeof stage.prompt !== 'undefined') {
    sanitized.prompt = stage.prompt;
  }

  if (Array.isArray(stage.promptVersions)) {
    sanitized.promptVersions = stage.promptVersions
      .filter((entry) => entry && typeof entry.prompt === 'string')
      .map((entry, index) => ({
        version: Number.isFinite(entry.version) ? entry.version : index + 1,
        prompt: entry.prompt,
        updatedAt: Number.isFinite(entry.updatedAt) ? entry.updatedAt : Date.now(),
        ...(entry.updatedBy ? { updatedBy: entry.updatedBy } : {})
      }));
  }

  if (Array.isArray(stage.steps)) {
    sanitized.steps = stage.steps
      .filter((child) => child && typeof child.id === 'string' && typeof child.title === 'string')
      .map((child, index) => ({
        id: child.id || `child-step-${index + 1}`,
        title: child.title,
        ...(typeof child.description !== 'undefined' ? { description: child.description } : {}),
        ...(typeof child.aiModelId !== 'undefined' ? { aiModelId: child.aiModelId } : {}),
        ...(typeof child.prompt !== 'undefined' ? { prompt: child.prompt } : {}),
        ...(typeof child.desiredOutput !== 'undefined' ? { desiredOutput: child.desiredOutput } : {}),
        ...(Array.isArray(child.selectedDocumentIds) ? { selectedDocumentIds: [...child.selectedDocumentIds] } : {}),
        ...(Array.isArray(child.selectedTranscriptIds) ? { selectedTranscriptIds: [...child.selectedTranscriptIds] } : {}),
        ...(Array.isArray(child.selectedSkillIds) ? { selectedSkillIds: [...child.selectedSkillIds] } : {}),
        ...(typeof child.outputType !== 'undefined' ? { outputType: child.outputType } : {}),
        ...(child.excelTemplate
          ? {
              excelTemplate: {
                fileName: child.excelTemplate.fileName,
                dataUrl: child.excelTemplate.dataUrl,
                uploadedAt: child.excelTemplate.uploadedAt,
              }
            }
          : {}),
        ...(child.presentationTemplate
          ? {
              presentationTemplate: {
                fileName: child.presentationTemplate.fileName,
                dataUrl: child.presentationTemplate.dataUrl,
                uploadedAt: child.presentationTemplate.uploadedAt,
              }
            }
          : {}),
        createdAt: Number.isFinite(child.createdAt) ? child.createdAt : Date.now(),
        updatedAt: Number.isFinite(child.updatedAt) ? child.updatedAt : Date.now()
      }));
  }

  if (typeof stage.outputType !== 'undefined') {
    sanitized.outputType = stage.outputType;
  }

  if (typeof stage.excelTableTemplate !== 'undefined') {
    sanitized.excelTableTemplate = stage.excelTableTemplate;
  }

  if (typeof stage.authorId !== 'undefined') {
    sanitized.authorId = stage.authorId;
  }

  if (stage.excelTemplate) {
    sanitized.excelTemplate = {
      fileName: stage.excelTemplate.fileName,
      dataUrl: stage.excelTemplate.dataUrl,
      uploadedAt: stage.excelTemplate.uploadedAt
    };
  }

  if (stage.presentationTemplate) {
    sanitized.presentationTemplate = {
      fileName: stage.presentationTemplate.fileName,
      dataUrl: stage.presentationTemplate.dataUrl,
      uploadedAt: stage.presentationTemplate.uploadedAt
    };
  }

  return sanitized;
};

export const updateCompanyJourneyStatus = async (
  companyId: string,
  userId: string,
  journeyUpdate: {
    companyResearchComplete?: boolean;
    collaborationConfigComplete?: boolean;
    collaborationConfig?: JourneyCollaborationConfig;
    documentsUploaded?: boolean;
    transcriptsUploaded?: boolean;
    kickoffPresentationUrl?: string;
    kickoffSelectedDomains?: string[];
    kickoffSelectedUseCases?: string[];
    kickoffTemplateReference?: UploadedDocument | null;
    deepDiveTemplateReference?: UploadedDocument | null;
    kickoffMeetingNotes?: UploadedDocument[];
    phase2SelectedDomains?: string[];
    phase2SelectedUseCases?: string[];
    functionalHighLevelMeetings?: FunctionalHighLevelMeeting[];
    functionalDeepDiveMeetings?: FunctionalHighLevelMeeting[];
    deepDiveSelectedDomains?: string[];
    deepDiveSelectedUseCases?: string[];
    customSteps?: CustomJourneyStep[];
    customStepRefs?: CustomStepReference[];
    journeyStepSettings?: Partial<JourneyStepSettings>;
    currentStepId?: string;
    stepOrder?: string[];
  },
  journeyId?: string
): Promise<void> => {
  try {
    const currentTime = Date.now();
    const companyRef = ref(db, `companies/${companyId}`);
    const snapshot = await get(companyRef);

    if (!snapshot.exists()) {
      console.error('Company not found:', companyId);
      throw new Error('Company not found');
    }

    const company = snapshot.val() as Company;
    if (company.createdBy !== userId) {
      console.error('Authorization failed for updateCompanyJourneyStatus');
      throw new Error('Not authorized to update this company');
    }

    const resolvedJourneyId = journeyId || company.currentJourneyId || `journey-${currentTime}`;
    const existingJourneys = company.journeys || {};
    const existingJourney = existingJourneys[resolvedJourneyId] || company.journey || {};
    const hasCustomStepsUpdate = Object.prototype.hasOwnProperty.call(journeyUpdate, 'customSteps');
    const sanitizedCustomStages = hasCustomStepsUpdate
      ? (journeyUpdate.customSteps || []).map((stage) => {
          const sanitizedStage = sanitizeCustomStageForSave(stage);
          return {
            ...sanitizedStage,
            authorId: sanitizedStage.authorId || userId
          };
        })
      : null;
    let useLegacyCustomStepsStorage = false;

    if (hasCustomStepsUpdate && sanitizedCustomStages) {
      try {
        const stageWrites = sanitizedCustomStages.reduce((acc, stage) => {
          acc[stage.id] = stage;
          return acc;
        }, {} as Record<string, CustomJourneyStep>);
        await update(ref(db, `customStages/${userId}/${companyId}`), stageWrites);
      } catch (writeError: any) {
        const code = typeof writeError?.code === 'string' ? writeError.code : '';
        const message = typeof writeError?.message === 'string' ? writeError.message : '';
        const isPermissionDenied = code.includes('PERMISSION_DENIED') || message.includes('PERMISSION_DENIED');

        if (!isPermissionDenied) {
          throw writeError;
        }

        console.warn(
          'Top-level customStages write was denied. Falling back to legacy companies/{companyId}/journeys/{journeyId}/customSteps storage until database rules are deployed.'
        );
        useLegacyCustomStepsStorage = true;
      }
    }

    const { customSteps: _legacyCustomSteps, ...existingJourneyWithoutCustomSteps } = existingJourney;
    const { customSteps: _ignoredCustomSteps, customStepRefs: _ignoredCustomStepRefs, ...journeyUpdateWithoutCustomSteps } = journeyUpdate;
    const existingJourneyBase = hasCustomStepsUpdate ? existingJourneyWithoutCustomSteps : existingJourney;
    const journeyUpdateBase = hasCustomStepsUpdate ? journeyUpdateWithoutCustomSteps : journeyUpdate;
    const nextJourneyBase = {
      ...existingJourneyBase,
      ...journeyUpdateBase
    };

    const nextJourney: any = {
      ...nextJourneyBase,
      ...(hasCustomStepsUpdate && useLegacyCustomStepsStorage
        ? {
            customSteps: sanitizedCustomStages || [],
            customStepIds: (sanitizedCustomStages || []).map((stage) => stage.id),
            customStepRefs: (sanitizedCustomStages || []).map((stage) => ({
              id: stage.id,
              authorId: stage.authorId || userId
            }))
          }
        : {}),
      ...(hasCustomStepsUpdate && !useLegacyCustomStepsStorage
        ? {
            customStepIds: (sanitizedCustomStages || []).map((stage) => stage.id),
            customStepRefs: (sanitizedCustomStages || []).map((stage) => ({
              id: stage.id,
              authorId: stage.authorId || userId
            }))
          }
        : {}),
      id: resolvedJourneyId,
      createdAt: existingJourney.createdAt || currentTime,
      updatedAt: currentTime
    };

    await update(companyRef, {
      journey: nextJourney,
      journeys: {
        ...existingJourneys,
        [resolvedJourneyId]: nextJourney
      },
      currentJourneyId: resolvedJourneyId,
      lastUpdated: currentTime
    });
  } catch (error) {
    console.error('Failed to update company journey status:', error);
    throw error;
  }
};

export const deleteCompanyJourney = async (
  companyId: string,
  userId: string,
  journeyId: string
): Promise<{ nextJourneyId: string | null; journeys: Record<string, any> }> => {
  try {
    const companyRef = ref(db, `companies/${companyId}`);
    const snapshot = await get(companyRef);

    if (!snapshot.exists()) {
      throw new Error('Company not found');
    }

    const company = snapshot.val() as Company;
    if (company.createdBy !== userId) {
      throw new Error('Not authorized to update this company');
    }

    const existingJourneys = company.journeys || {};
    if (!existingJourneys[journeyId]) {
      throw new Error('Journey not found');
    }

    const journeyIds = Object.keys(existingJourneys);
    if (journeyIds.length <= 1) {
      throw new Error('At least one journey must remain');
    }

    const nextJourneys = { ...existingJourneys };
    delete nextJourneys[journeyId];

    const sortedRemaining = Object.entries(nextJourneys)
      .sort(([, a]: any, [, b]: any) => (b?.createdAt || 0) - (a?.createdAt || 0))
      .map(([id]) => id);

    const nextCurrentJourneyId = nextJourneys[company.currentJourneyId || '']
      ? (company.currentJourneyId as string)
      : (sortedRemaining[0] || null);

    const nextCurrentJourney = nextCurrentJourneyId ? nextJourneys[nextCurrentJourneyId] : null;

    await update(companyRef, {
      journeys: nextJourneys,
      currentJourneyId: nextCurrentJourneyId,
      journey: nextCurrentJourney,
      lastUpdated: Date.now()
    });

    return {
      nextJourneyId: nextCurrentJourneyId,
      journeys: nextJourneys
    };
  } catch (error) {
    console.error('Failed to delete company journey:', error);
    throw error;
  }
};

// Company Operations
export const saveCompany = async (
  userId: string,
  companyName: string,
  research: CompanyResearch,
  selectedScenarios: string[] = []
): Promise<Company> => {
  try {
    // Ensure research data is properly structured and contains no undefined values
    // First ensure we have valid research data
    if (!research || !research.currentResearch) {
      console.error('Invalid research data:', research);
      throw new Error('Invalid research data structure');
    }

    const currentRfp = research.currentResearch.rfpDocument;

    // Create a safe currentResearch object
    const currentResearch: CompanyResearch['currentResearch'] = {
      description: research.currentResearch.description || '',
      industry: research.currentResearch.industry || '',
      marketPosition: research.currentResearch.marketPosition || '',
      products: Array.isArray(research.currentResearch.products) ? research.currentResearch.products.filter(Boolean) : [],
      competitors: Array.isArray(research.currentResearch.competitors) ? research.currentResearch.competitors.filter(Boolean) : [],
      challenges: Array.isArray(research.currentResearch.challenges) ? research.currentResearch.challenges.filter(Boolean) : [],
      opportunities: Array.isArray(research.currentResearch.opportunities) ? research.currentResearch.opportunities.filter(Boolean) : [],
      useCases: Array.isArray(research.currentResearch.useCases) ? research.currentResearch.useCases.filter(Boolean) : [],
      aiRelevance: {
        current: research.currentResearch.aiRelevance?.current || '',
        potential: research.currentResearch.aiRelevance?.potential || '',
        recommendations: Array.isArray(research.currentResearch.aiRelevance?.recommendations) 
          ? research.currentResearch.aiRelevance.recommendations.filter(Boolean) 
          : []
      },
      // Preserve RFP document and analysis if they exist - conditionally include only if present
      ...(currentRfp && {
        rfpDocument: {
          content: currentRfp.content || '',
          fileName: currentRfp.fileName || '',
          uploadedAt: currentRfp.uploadedAt ?? Date.now(),
          ...(currentRfp.analysis
            ? {
                analysis: {
                  summary: currentRfp.analysis.summary || '',
                  projectStructure: currentRfp.analysis.projectStructure || '',
                  detailedAnalysis: currentRfp.analysis.detailedAnalysis || '',
                  timeline: currentRfp.analysis.timeline || '',
                  budget: currentRfp.analysis.budget || '',
                  requirements: currentRfp.analysis.requirements || '',
                  stakeholders: currentRfp.analysis.stakeholders || '',
                  successCriteria: currentRfp.analysis.successCriteria || '',
                  risks: currentRfp.analysis.risks || '',
                  aiRecommendations: currentRfp.analysis.aiRecommendations || '',
                  aiCapabilities: currentRfp.analysis.aiCapabilities || '',
                  constraints: currentRfp.analysis.constraints || '',
                  clarificationNeeded: currentRfp.analysis.clarificationNeeded || ''
                }
              }
            : {}),
          ...(currentRfp.url ? { url: currentRfp.url } : {}),
          ...(currentRfp.path ? { path: currentRfp.path } : {})
        }
      }),
      timestamp: Date.now() // Add required timestamp
    };

    // Safely process history entries if they exist
    const processedHistory: CompanyResearch['history'] = Array.isArray(research.history)
      ? research.history
          .filter(entry => entry && typeof entry === 'object') // Only process valid objects
          .map(entry => ({
            description: entry.description || '',
            industry: entry.industry || '',
            marketPosition: entry.marketPosition || '',
            products: Array.isArray(entry.products) ? entry.products.filter(Boolean) : [],
            competitors: Array.isArray(entry.competitors) ? entry.competitors.filter(Boolean) : [],
            challenges: Array.isArray(entry.challenges) ? entry.challenges.filter(Boolean) : [],
            opportunities: Array.isArray(entry.opportunities) ? entry.opportunities.filter(Boolean) : [],
            useCases: Array.isArray(entry.useCases) ? entry.useCases.filter(Boolean) : [],
            aiRelevance: {
              current: entry.aiRelevance?.current || '',
              potential: entry.aiRelevance?.potential || '',
              recommendations: Array.isArray(entry.aiRelevance?.recommendations) 
                ? entry.aiRelevance.recommendations.filter(Boolean) 
                : []
            },
            timestamp: entry.timestamp || Date.now()
          }))
      : [];

    const sanitizedResearch: CompanyResearch = {
      name: companyName,
      currentResearch,
      history: processedHistory,
      lastUpdated: research.lastUpdated || Date.now()
    };

    const companiesRef = ref(db, 'companies');
    const timestamp = Date.now();
    
    // Check if company already exists for this user
    const snapshot = await get(companiesRef);
    let existingCompanyId: string | null = null;
    let existingCompanyData: any = null;
    
    if (snapshot.exists()) {
      const companies = snapshot.val();
      // Find company by name and creator
      for (const [id, company] of Object.entries<any>(companies)) {
        if (company.createdBy === userId && company.name.toLowerCase() === companyName.toLowerCase()) {
          existingCompanyId = id;
          existingCompanyData = company;
          break;
        }
      }
    }

    let companyData: Company;
    
    if (existingCompanyId && existingCompanyData) {
      // Update existing company
      companyData = {
        id: existingCompanyId,
        name: companyName,
        createdBy: userId,
        createdAt: existingCompanyData.createdAt, // preserve original creation time
        lastUpdated: timestamp,
        selectedScenarios,
        research: sanitizedResearch
      };
      await update(ref(db, `companies/${existingCompanyId}`), companyData);
    } else {
      // Create new company
      const newCompanyRef = push(companiesRef);
      companyData = {
        id: newCompanyRef.key as string,
        name: companyName,
        createdBy: userId,
        createdAt: timestamp,
        lastUpdated: timestamp,
        selectedScenarios,
        research: sanitizedResearch
      };
      await set(newCompanyRef, companyData);
    }
    return companyData;
  } catch (error) {
    console.error('Failed to save company:', error);
    throw error;
  }
};

export const getCompany = async (companyIdOrName: string, userId?: string): Promise<Company | null> => {
  try {
    console.log('Getting company:', { companyIdOrName, userId });
    // Get all companies
    const companiesRef = ref(db, 'companies');
    const snapshot = await get(companiesRef);
    
    if (!snapshot.exists()) {
      console.log('No companies exist in database');
      return null;
    }

    const companies = snapshot.val();
    console.log('Found companies:', Object.keys(companies).length);
    console.log('Companies data:', companies);
    
    let companyId: string | null = null;
    let companyData: any = null;

    // Normalize the search string
    const normalizedSearch = companyIdOrName.toLowerCase().trim();
    console.log('Normalized search:', normalizedSearch);

    // First try direct ID lookup
    if (companies[companyIdOrName]) {
      console.log('Found company by ID');
      companyId = companyIdOrName;
      companyData = companies[companyIdOrName];
    } 
    // Then try to find by name with a more reliable matching algorithm
    else {
      console.log('Searching by name');
      
      // First pass: Look for exact matches (case-insensitive)
      Object.entries(companies).forEach(([id, data]: [string, any]) => {
        // Check if this is owned by the user if userId is provided
        if (userId && data.createdBy !== userId) {
          return;
        }
        
        const normalizedName = data.name?.toLowerCase().trim() || '';
        if (normalizedName === normalizedSearch) {
          console.log('Found exact match:', data.name);
          companyId = id;
          companyData = data;
          return;
        }
      });
      
      // Second pass: Look for substring matches if no exact match was found
      if (!companyId) {
        Object.entries(companies).forEach(([id, data]: [string, any]) => {
          // Skip if we already found a match
          if (companyId) return;
          
          // Check if this is owned by the user if userId is provided
          if (userId && data.createdBy !== userId) {
            return;
          }
          
          const normalizedName = data.name?.toLowerCase().trim() || '';
          
          // Clean up both names for comparison
          const cleanSearch = normalizedSearch.replace(/[^a-z0-9\s]/g, '');
          const cleanName = normalizedName.replace(/[^a-z0-9\s]/g, '');
          
          if (cleanName.includes(cleanSearch) || cleanSearch.includes(cleanName)) {
            console.log('Found substring match:', data.name);
            companyId = id;
            companyData = data;
          }
        });
      }
    }

    if (!companyId || !companyData) {
      console.log('No company found after searching');
      return null;
    }

    console.log('Found company:', { companyId, companyData });

    const resolvedCurrentJourneyId = companyData.currentJourneyId;
    const ownerUserId = companyData.createdBy || userId;
    const referencedAuthorIds = new Set<string>();

    const maybeCollectAuthorIds = (journeyLike: any) => {
      if (!journeyLike || typeof journeyLike !== 'object') return;
      if (Array.isArray(journeyLike.customStepRefs)) {
        journeyLike.customStepRefs.forEach((refItem: any) => {
          if (refItem && typeof refItem.authorId === 'string' && refItem.authorId.length > 0) {
            referencedAuthorIds.add(refItem.authorId);
          }
        });
      }
      if (Array.isArray(journeyLike.customSteps)) {
        journeyLike.customSteps.forEach((stage: any) => {
          if (stage && typeof stage.authorId === 'string' && stage.authorId.length > 0) {
            referencedAuthorIds.add(stage.authorId);
          }
        });
      }
    };

    maybeCollectAuthorIds(companyData.journey);
    if (companyData.journeys && typeof companyData.journeys === 'object') {
      Object.values(companyData.journeys).forEach((journey) => maybeCollectAuthorIds(journey));
    }
    if (ownerUserId) {
      referencedAuthorIds.add(ownerUserId);
    }

    const legacyCustomStagesSnapshot = await get(ref(db, `customStages/${companyId}`));

    const customStageLibraryByAuthor: Record<string, Record<string, CustomJourneyStep>> = {};
    const legacyCustomStagesByJourney: Record<string, CustomJourneyStep[]> = {};

    const upsertStage = (authorId: string, stageLike: any, fallbackId: string) => {
      const normalized = sanitizeCustomStageForSave({
        ...stageLike,
        id: stageLike?.id || fallbackId,
        title: stageLike?.title || 'Untitled Stage',
        createdAt: typeof stageLike?.createdAt === 'number' ? stageLike.createdAt : Date.now(),
        updatedAt: typeof stageLike?.updatedAt === 'number' ? stageLike.updatedAt : Date.now(),
        authorId: stageLike?.authorId || authorId
      });
      if (!customStageLibraryByAuthor[normalized.authorId || authorId]) {
        customStageLibraryByAuthor[normalized.authorId || authorId] = {};
      }
      customStageLibraryByAuthor[normalized.authorId || authorId][normalized.id] = normalized;
    };

    for (const authorId of referencedAuthorIds) {
      const userScopedSnapshot = await get(ref(db, `customStages/${authorId}/${companyId}`));
      const userScopedStages = userScopedSnapshot.exists() ? userScopedSnapshot.val() : {};
      Object.entries(userScopedStages || {}).forEach(([stageId, stageValue]: [string, any]) => {
        if (stageValue && typeof stageValue === 'object' && !Array.isArray(stageValue)) {
          upsertStage(authorId, stageValue, stageId);
        }
      });
    }

    const rawCustomStages = legacyCustomStagesSnapshot?.exists() ? legacyCustomStagesSnapshot.val() : {};

    Object.entries(rawCustomStages || {}).forEach(([key, value]: [string, any]) => {
      if (Array.isArray(value)) {
        legacyCustomStagesByJourney[key] = value
          .filter(Boolean)
          .map((stage: any, index: number) => sanitizeCustomStageForSave({ ...stage, id: stage?.id || `${key}-legacy-${index}` }));
        return;
      }

      if (value && typeof value === 'object') {
        const hasStageShape = typeof value.title === 'string' || typeof value.createdAt === 'number';
        if (hasStageShape) {
          upsertStage(ownerUserId || userId || 'unknown-author', value, key);
        }
      }
    });

    const resolveJourneyCustomSteps = (journeyId: string, journeyValue: any): CustomJourneyStep[] => {
      const referencedRefs = Array.isArray(journeyValue?.customStepRefs)
        ? journeyValue.customStepRefs.filter((refItem: unknown): refItem is CustomStepReference => {
            return Boolean(
              refItem
              && typeof (refItem as CustomStepReference).id === 'string'
              && (refItem as CustomStepReference).id.length > 0
              && typeof (refItem as CustomStepReference).authorId === 'string'
              && (refItem as CustomStepReference).authorId.length > 0
            );
          })
        : [];

      if (referencedRefs.length > 0) {
        return referencedRefs
          .map((refItem) => customStageLibraryByAuthor[refItem.authorId]?.[refItem.id])
          .filter((stage): stage is CustomJourneyStep => Boolean(stage));
      }

      const referencedIds = Array.isArray(journeyValue?.customStepIds)
        ? journeyValue.customStepIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
        : [];

      if (referencedIds.length > 0) {
        const defaultAuthorId = ownerUserId || userId || '';
        return referencedIds
          .map((id) => customStageLibraryByAuthor[defaultAuthorId]?.[id]
            || Object.values(customStageLibraryByAuthor).find((bucket) => Boolean(bucket[id]))?.[id])
          .filter((stage): stage is CustomJourneyStep => Boolean(stage));
      }

      if (Array.isArray(journeyValue?.customSteps)) {
        return journeyValue.customSteps;
      }

      if (Array.isArray(legacyCustomStagesByJourney[journeyId])) {
        return legacyCustomStagesByJourney[journeyId];
      }

      return [];
    };

    const hydratedJourneys = companyData.journeys
      ? Object.entries(companyData.journeys).reduce((acc, [journeyId, journeyValue]: [string, any]) => {
          const resolvedCustomSteps = resolveJourneyCustomSteps(journeyId, journeyValue);
          acc[journeyId] = {
            ...(journeyValue || {}),
            customSteps: resolvedCustomSteps
          };
          return acc;
        }, {} as Record<string, any>)
      : undefined;

    const activeJourneyId = resolvedCurrentJourneyId
      || (hydratedJourneys ? Object.keys(hydratedJourneys)[0] : undefined);
    const activeJourneyFromMap = activeJourneyId && hydratedJourneys
      ? hydratedJourneys[activeJourneyId]
      : undefined;
    const activeJourneyCustomSteps = activeJourneyId
      ? resolveJourneyCustomSteps(activeJourneyId, companyData.journeys?.[activeJourneyId] || companyData.journey)
      : undefined;

    const hydratedJourney = {
      ...(companyData.journey || activeJourneyFromMap || {}),
      ...(activeJourneyCustomSteps ? { customSteps: activeJourneyCustomSteps } : {})
    };

    const company = {
      id: companyId,
      name: companyData.name,
      createdBy: companyData.createdBy,
      createdAt: companyData.createdAt,
      lastUpdated: companyData.lastUpdated,
      selectedScenarios: companyData.selectedScenarios || [],
      selectedDomains: companyData.selectedDomains || [],
      research: companyData.research || null,
      journey: hydratedJourney,
      journeys: hydratedJourneys,
      currentJourneyId: companyData.currentJourneyId
    } as Company;

    console.log('Returning company:', company);
    return company;
  } catch (error) {
    console.error('Failed to get company:', error);
    throw error;
  }
};

export const getUserCompanies = async (userId: string): Promise<Company[]> => {
  try {
    const companiesRef = ref(db, 'companies');
    const companiesQuery = query(companiesRef, orderByChild('createdBy'), equalTo(userId));
    const snapshot = await get(companiesQuery);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const companies = snapshot.val();
    return Object.entries(companies).map(([id, data]: [string, any]) => ({
      id,
      ...data
    } as Company));
  } catch (error) {
    console.error('Failed to get user companies:', error);
    throw error;
  }
};

export const updateCompanySelectedScenarios = async (
  companyId: string,
  userId: string,
  selectedScenarios: string[]
): Promise<void> => {
  try {
    const currentTime = Date.now();
    
    // Get company to verify ownership
    const companyRef = ref(db, `companies/${companyId}`);
    const snapshot = await get(companyRef);
    
    if (!snapshot.exists()) {
      console.error('Company not found:', companyId);
      throw new Error('Company not found');
    }
    
    const company = snapshot.val();
    console.log('Authorization check:', {
      companyId,
      companyCreatedBy: company.createdBy,
      currentUserId: userId,
      matches: company.createdBy === userId
    });
    
    if (company.createdBy !== userId) {
      console.error('Authorization failed:', {
        expected: userId,
        actual: company.createdBy,
        companyName: company.name
      });
      throw new Error('Not authorized to update this company');
    }

    // Update selected scenarios
    await update(companyRef, {
      selectedScenarios,
      lastUpdated: currentTime
    });
    
    console.log('Successfully updated selected scenarios for company:', companyId);

  } catch (error) {
    console.error('Failed to update company selected scenarios:', error);
    throw error;
  }
};

export const updateCompanySelectedDomains = async (
  companyId: string,
  userId: string,
  selectedDomains: string[]
): Promise<void> => {
  try {
    const currentTime = Date.now();
    
    // Get company to verify ownership
    const companyRef = ref(db, `companies/${companyId}`);
    const snapshot = await get(companyRef);
    
    if (!snapshot.exists()) {
      console.error('Company not found:', companyId);
      throw new Error('Company not found');
    }
    
    const company = snapshot.val();
    
    if (company.createdBy !== userId) {
      console.error('Authorization failed for updateCompanySelectedDomains');
      throw new Error('Not authorized to update this company');
    }

    // Update selected domains
    await update(companyRef, {
      selectedDomains,
      lastUpdated: currentTime
    });
    
    console.log('Successfully updated selected domains for company:', companyId);

  } catch (error) {
    console.error('Failed to update company selected domains:', error);
    throw error;
  }
};

export const updateCompanyPhaseWorkflows = async (
  companyId: string,
  userId: string,
  phase1Workflows: string[],
  phase2Workflows: string[]
): Promise<void> => {
  try {
    const currentTime = Date.now();
    
    // Get company to verify ownership
    const companyRef = ref(db, `companies/${companyId}`);
    const snapshot = await get(companyRef);
    
    if (!snapshot.exists()) {
      console.error('Company not found:', companyId);
      throw new Error('Company not found');
    }
    
    const company = snapshot.val();
    
    if (company.createdBy !== userId) {
      console.error('Authorization failed for updateCompanyPhaseWorkflows');
      throw new Error('Not authorized to update this company');
    }

    // Update phase workflow selections
    await update(companyRef, {
      phase1Workflows,
      phase2Workflows,
      lastUpdated: currentTime
    });
    
    console.log('Successfully updated phase workflows for company:', companyId);

  } catch (error) {
    console.error('Failed to update company phase workflows:', error);
    throw error;
  }
};

export const deleteCompany = async (companyId: string, userId: string): Promise<void> => {
  try {
    // First verify user owns the company
    const companyRef = ref(db, `companies/${companyId}`);
    const snapshot = await get(companyRef);
    
    if (!snapshot.exists()) {
      throw new Error('Company not found');
    }
    
    const company = snapshot.val() as Company;
    if (company.createdBy !== userId) {
      const userRef = ref(db, `users/${userId}`);
      const userSnap = await get(userRef);
      const role = userSnap.exists() ? userSnap.val()?.role : 'USER';
      if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        throw new Error('Not authorized to delete this company');
      }
    }
    
    // Delete the company
    await remove(companyRef);
  } catch (error) {
    console.error('Failed to delete company:', error);
    throw error;
  }
};

// Re-export the company research functions
export {
  saveCompanyResearch,
  getCompanyResearch,
  listCompanyResearch,
  getCompanyResearchHistory,
  getRelatedScenarios
} from './firebaseService';

// Meeting operations
export const saveMeeting = async (
  companyId: string,
  meeting: Omit<Meeting, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>
): Promise<Meeting> => {
  try {
    const meetingsRef = ref(db, `companies/${companyId}/meetings`);
    const newMeetingRef = push(meetingsRef);
    const now = Date.now();

    const meetingData = {
      ...meeting,
      createdAt: now,
      updatedAt: now,
    };

    await set(newMeetingRef, meetingData);

    return {
      id: newMeetingRef.key as string,
      companyId,
      ...meetingData,
    };
  } catch (error) {
    console.error('Failed to save meeting:', error);
    throw error;
  }
};

export const getMeetings = async (companyId: string): Promise<Meeting[]> => {
  try {
    const meetingsRef = ref(db, `companies/${companyId}/meetings`);
    const snapshot = await get(meetingsRef);

    if (!snapshot.exists()) {
      return [];
    }

    const meetings: Meeting[] = [];
    const data = snapshot.val();

    for (const [id, meeting] of Object.entries<any>(data)) {
      meetings.push({
        id,
        companyId,
        ...(meeting as Omit<Meeting, 'id' | 'companyId'>),
      });
    }

    return meetings;
  } catch (error) {
    console.error('Failed to fetch meetings:', error);
    throw error;
  }
};

export const updateMeeting = async (
  companyId: string,
  meetingId: string,
  meeting: Omit<Meeting, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>
): Promise<void> => {
  try {
    const meetingRef = ref(db, `companies/${companyId}/meetings/${meetingId}`);
    await update(meetingRef, {
      ...meeting,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.error('Failed to update meeting:', error);
    throw error;
  }
};

export const deleteMeeting = async (companyId: string, meetingId: string): Promise<void> => {
  try {
    const meetingRef = ref(db, `companies/${companyId}/meetings/${meetingId}`);
    await remove(meetingRef);
  } catch (error) {
    console.error('Failed to delete meeting:', error);
    throw error;
  }
};

// Document Operations - Updated to use correct path
export const saveDocuments = async (
  companyId: string,
  documents: Array<{ id: string; title: string; type: string; context: string; fullText: string; uploadedAt: number; fileName?: string; content?: string; url?: string; path?: string; documentAnalysis?: DocumentAnalysis; analysis?: RfpAnalysis }>
): Promise<void> => {
  try {
    // FIXED: Save to correct path under research/currentResearch
    const documentsRef = ref(db, `companies/${companyId}/research/currentResearch/documents`);
    await set(documentsRef, documents);
    console.log('Documents saved to Firebase:', documents.length);
    
    // Dispatch event to notify dashboard
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('document-uploaded', { detail: { companyId } }));
    }
  } catch (error) {
    console.error('Failed to save documents:', error);
    throw error;
  }
};

export const getDocuments = async (companyId: string): Promise<Array<{ id: string; title: string; type: string; context: string; fullText: string; uploadedAt: number; fileName?: string; content?: string; url?: string; path?: string; documentAnalysis?: DocumentAnalysis; analysis?: RfpAnalysis }>> => {
  try {
    // FIXED: Read from correct path under research/currentResearch
    const documentsRef = ref(db, `companies/${companyId}/research/currentResearch/documents`);
    const snapshot = await get(documentsRef);
    if (snapshot.exists()) {
      const docs = snapshot.val();
      return Array.isArray(docs) ? docs : [];
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    throw error;
  }
};

export const deleteDocument = async (companyId: string, documentId: string): Promise<void> => {
  try {
    // FIXED: Delete from correct path under research/currentResearch
    const documentsRef = ref(db, `companies/${companyId}/research/currentResearch/documents`);
    const snapshot = await get(documentsRef);
    if (snapshot.exists()) {
      const docs = snapshot.val();
      const filtered = Array.isArray(docs) ? docs.filter(d => d.id !== documentId) : [];
      await set(documentsRef, filtered);
      console.log('Document deleted from Firebase:', documentId);
      
      // Dispatch event to notify dashboard
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('document-deleted', { detail: { companyId, documentId } }));
      }
    }
  } catch (error) {
    console.error('Failed to delete document:', error);
    throw error;
  }
};