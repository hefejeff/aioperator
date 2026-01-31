import React from 'react';
import { useTranslation } from '../i18n';
import { Icons } from '../constants';
import type { Company } from '../types';

interface CompaniesSectionProps {
  companies: Company[];
  onStartNewResearch: () => void;
  handleNavigate: (view: 'DASHBOARD' | 'TRAINING' | 'ADMIN' | 'RESEARCH', companyId?: string) => void;
}

const CompaniesSection: React.FC<CompaniesSectionProps> = ({
  companies,
  onStartNewResearch,
  handleNavigate,
}) => {
  const { t } = useTranslation();

  // Handler for clicking a company card
  const handleCompanyClick = (company: Company) => {
    handleNavigate('RESEARCH', company.id);
  };

  return (
    <div>
      <div className="mb-8">
        <div>
          <h2 className="text-3xl font-bold text-wm-blue mb-2">{t('dashboard.yourCompanies')}</h2>
          <p className="text-wm-blue/60">{t('dashboard.companiesDescription')}</p>
        </div>
      </div>

      {companies.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-500">
          {companies.map((company, index) => (
            <div 
              key={company.id}
              className="animate-in slide-in-from-bottom duration-300 p-5 bg-wm-white border border-wm-neutral rounded-xl hover:border-wm-accent/40 hover:shadow-lg transition-all group cursor-pointer"
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => handleCompanyClick(company)}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-bold text-wm-blue group-hover:text-wm-accent transition-colors line-clamp-1">
                  {company.name}
                </h3>
                <span className="text-xs text-wm-blue/50 flex-shrink-0 ml-2">
                  {t('dashboard.scenarios')}: {company.selectedScenarios?.length || 0}
                </span>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-wm-blue/70 line-clamp-2">
                  {company.research?.currentResearch?.description || company.research?.history[0]?.description || t('dashboard.noResearch')}
                </p>
                <div className="text-xs text-wm-blue/50">
                  {t('dashboard.lastUpdated')}: {new Date(company.lastUpdated).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 animate-in fade-in duration-700">
          <div className="relative max-w-md mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-wm-accent/10 via-wm-pink/10 to-wm-accent/10 rounded-3xl blur-2xl animate-pulse"></div>
            
            <div className="relative w-32 h-32 bg-wm-neutral/30 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-wm-neutral group hover:border-wm-accent/30 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-wm-accent/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative text-wm-blue/40 group-hover:text-wm-accent transition-colors duration-300">
                <Icons.Building />
              </div>
            </div>
            
            <div className="relative">
              <h3 className="text-3xl font-bold text-wm-blue mb-4">
                {t('dashboard.startResearchTitle')}
              </h3>
              <p className="text-lg text-wm-blue/60 mb-10 max-w-sm mx-auto leading-relaxed">
                {t('dashboard.startResearchDescription')}
              </p>
              <button
                onClick={onStartNewResearch}
                className="group relative px-10 py-4 bg-wm-accent text-wm-white font-bold rounded-2xl hover:shadow-2xl hover:shadow-wm-accent/25 transition-all duration-300 hover:-translate-y-1"
              >
                <span className="relative flex items-center gap-3">
                  <Icons.Plus />
                  <span className="text-lg">{t('dashboard.startNewResearch')}</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompaniesSection;