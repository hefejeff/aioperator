import { ref, remove } from 'firebase/database';
import { db } from './firebaseInit';

export const deleteCompanyResearchTable = async (): Promise<void> => {
  try {
    const researchRef = ref(db, 'companyResearch');
    await remove(researchRef);
    console.log('Successfully deleted companyResearch table');
  } catch (error) {
    console.error('Failed to delete companyResearch table:', error);
    throw error;
  }
};