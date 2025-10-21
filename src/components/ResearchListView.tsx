import React, { useEffect, useState } from 'react';
import { getUserCompanies } from '../services/companyService';
import type { Company } from '../types';

interface Props {
  userId: string;
  onSelectCompany: (companyId: string) => void;
  handleNavigate?: (view: 'DASHBOARD' | 'TRAINING' | 'ADMIN' | 'RESEARCH', companyId?: string) => void;
}

const ResearchListView: React.FC<Props> = ({ userId, onSelectCompany, handleNavigate }) => {
  const [companyList, setCompanyList] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const companies = await getUserCompanies(userId);
        // Sort companies by lastUpdated, most recent first
        const sortedCompanies = companies.sort((a, b) => b.lastUpdated - a.lastUpdated);
        setCompanyList(sortedCompanies);
      } catch (error) {
        console.error('Failed to load companies:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCompanies();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (companyList.length === 0) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl text-gray-300 mb-4">No Company Research Yet</h2>
        <p className="text-gray-400">
          Start by researching a company to see their details and AI opportunities.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {companyList.map((company) => (
        <div
          key={company.id}
          className="bg-slate-800 rounded-lg shadow-lg overflow-hidden hover:bg-slate-700 transition-colors cursor-pointer"
          onClick={() => {
            if (handleNavigate) {
              handleNavigate('RESEARCH', company.id);
            } else {
              onSelectCompany(company.id);
            }
          }}
        >
          <div className="p-6">
            <h3 className="text-xl font-semibold text-white mb-2">{company.name}</h3>
            <p className="text-gray-400 text-sm mb-3">
              {company.research?.currentResearch?.industry || 'Industry not specified'}
            </p>
            <p className="text-gray-300 line-clamp-3">
              {company.research?.currentResearch?.description || 'No description available'}
            </p>
            <div className="mt-4 flex justify-between items-center">
              <span className="text-gray-400 text-sm">
                Updated {new Date(company.lastUpdated).toLocaleDateString()}
              </span>
              <span className="text-blue-400 text-sm">
                {company.research?.history?.length || 0} updates
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ResearchListView;