import { ref, get, push, set, update, remove, query, orderByChild, equalTo } from 'firebase/database';
import { db } from './firebaseInit';
import type { Company, CompanyResearch, Meeting } from '../types';

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

    const company = {
      id: companyId,
      name: companyData.name,
      createdBy: companyData.createdBy,
      createdAt: companyData.createdAt,
      lastUpdated: companyData.lastUpdated,
      selectedScenarios: companyData.selectedScenarios || [],
      selectedDomains: companyData.selectedDomains || [],
      research: companyData.research || null
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
      throw new Error('Not authorized to delete this company');
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
  documents: Array<{ id: string; title: string; type: string; context: string; fullText: string; uploadedAt: number }>
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

export const getDocuments = async (companyId: string): Promise<Array<{ id: string; title: string; type: string; context: string; fullText: string; uploadedAt: number }>> => {
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