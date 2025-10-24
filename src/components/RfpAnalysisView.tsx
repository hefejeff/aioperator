import React from 'react';
import { useTranslation } from '../i18n';
import type { RfpAnalysis } from '../types';

interface RfpAnalysisViewProps {
  analysis: RfpAnalysis;
}

const RfpAnalysisView: React.FC<RfpAnalysisViewProps> = ({ analysis }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
      <h2 className="text-xl font-semibold text-white mb-6">{t('research.rfpAnalysis')}</h2>
      
      <div className="space-y-6">
        {/* Project Structure */}
        <div>
          <h3 className="text-white font-medium mb-2">{t('research.rfpProjectStructure')}</h3>
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
            <pre className="text-slate-300 whitespace-pre-wrap font-mono text-sm">
              {analysis.projectStructure}
            </pre>
          </div>
        </div>

        {/* Summary */}
        <div>
          <h3 className="text-white font-medium mb-2">{t('research.rfpSummary')}</h3>
          <p className="text-slate-300">{analysis.summary}</p>
        </div>

        {/* Detailed Analysis */}
        <div>
          <h3 className="text-white font-medium mb-2">{t('research.rfpDetailedAnalysis')}</h3>
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
            <pre className="text-slate-300 whitespace-pre-wrap font-mono text-sm">
              {analysis.detailedAnalysis}
            </pre>
          </div>
        </div>

        {/* Requirements */}
        <div>
          <h3 className="text-white font-medium mb-2">{t('research.rfpRequirements')}</h3>
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
            <pre className="text-slate-300 whitespace-pre-wrap font-mono text-sm">
              {analysis.requirements}
            </pre>
          </div>
        </div>

        {/* Timeline & Budget */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-white font-medium mb-2">{t('research.rfpTimeline')}</h3>
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
              <p className="text-slate-300">{analysis.timeline}</p>
            </div>
          </div>
          <div>
            <h3 className="text-white font-medium mb-2">{t('research.rfpBudget')}</h3>
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
              <p className="text-slate-300">{analysis.budget}</p>
            </div>
          </div>
        </div>

        {/* Stakeholders & Success Criteria */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-white font-medium mb-2">{t('research.rfpStakeholders')}</h3>
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
              <p className="text-slate-300">{analysis.stakeholders}</p>
            </div>
          </div>
          <div>
            <h3 className="text-white font-medium mb-2">{t('research.rfpSuccessCriteria')}</h3>
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
              <p className="text-slate-300">{analysis.successCriteria}</p>
            </div>
          </div>
        </div>

        {/* Risks & Constraints */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-white font-medium mb-2">{t('research.rfpRisks')}</h3>
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
              <p className="text-slate-300">{analysis.risks}</p>
            </div>
          </div>
          <div>
            <h3 className="text-white font-medium mb-2">{t('research.rfpConstraints')}</h3>
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
              <p className="text-slate-300">{analysis.constraints}</p>
            </div>
          </div>
        </div>

        {/* AI Analysis */}
        <div>
          <h3 className="text-white font-medium mb-2">{t('research.rfpAiAnalysis')}</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-slate-300 font-medium mb-2">{t('research.rfpAiRecommendations')}</h4>
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <p className="text-slate-300">{analysis.aiRecommendations}</p>
              </div>
            </div>
            <div>
              <h4 className="text-slate-300 font-medium mb-2">{t('research.rfpAiCapabilities')}</h4>
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <p className="text-slate-300">{analysis.aiCapabilities}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Clarification Needed */}
        {analysis.clarificationNeeded && (
          <div className="border-t border-slate-700 pt-6">
            <h3 className="text-white font-medium mb-2">{t('research.rfpClarificationNeeded')}</h3>
            <div className="bg-yellow-900/30 border-l-4 border-yellow-500 p-4 rounded-r-lg">
              <pre className="text-yellow-200 whitespace-pre-wrap font-mono text-sm">
                {analysis.clarificationNeeded}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RfpAnalysisView;