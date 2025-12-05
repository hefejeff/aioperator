import React from 'react';
import { useTranslation } from '../i18n';
import type { RfpAnalysis } from '../types';

interface RfpAnalysisViewProps {
  analysis: RfpAnalysis;
}

const RfpAnalysisView: React.FC<RfpAnalysisViewProps> = ({ analysis }) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white border border-wm-neutral/30 rounded-xl p-6 shadow-sm">
      <h2 className="text-xl font-bold text-wm-blue mb-6">{t('research.rfpAnalysis')}</h2>
      
      <div className="space-y-6">
        {/* Project Structure */}
        <div>
          <h3 className="text-wm-blue font-bold mb-2">{t('research.rfpProjectStructure')}</h3>
          <div className="bg-wm-neutral/10 p-4 rounded-lg border border-wm-neutral/30">
            <pre className="text-wm-blue/70 whitespace-pre-wrap font-mono text-sm">
              {analysis.projectStructure}
            </pre>
          </div>
        </div>

        {/* Summary */}
        <div>
          <h3 className="text-wm-blue font-bold mb-2">{t('research.rfpSummary')}</h3>
          <p className="text-wm-blue/70">{analysis.summary}</p>
        </div>

        {/* Detailed Analysis */}
        <div>
          <h3 className="text-wm-blue font-bold mb-2">{t('research.rfpDetailedAnalysis')}</h3>
          <div className="bg-wm-neutral/10 p-4 rounded-lg border border-wm-neutral/30">
            <pre className="text-wm-blue/70 whitespace-pre-wrap font-mono text-sm">
              {analysis.detailedAnalysis}
            </pre>
          </div>
        </div>

        {/* Requirements */}
        <div>
          <h3 className="text-wm-blue font-bold mb-2">{t('research.rfpRequirements')}</h3>
          <div className="bg-wm-neutral/10 p-4 rounded-lg border border-wm-neutral/30">
            <pre className="text-wm-blue/70 whitespace-pre-wrap font-mono text-sm">
              {analysis.requirements}
            </pre>
          </div>
        </div>

        {/* Timeline & Budget */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-wm-blue font-bold mb-2">{t('research.rfpTimeline')}</h3>
            <div className="bg-wm-neutral/10 p-4 rounded-lg border border-wm-neutral/30">
              <p className="text-wm-blue/70">{analysis.timeline}</p>
            </div>
          </div>
          <div>
            <h3 className="text-wm-blue font-bold mb-2">{t('research.rfpBudget')}</h3>
            <div className="bg-wm-neutral/10 p-4 rounded-lg border border-wm-neutral/30">
              <p className="text-wm-blue/70">{analysis.budget}</p>
            </div>
          </div>
        </div>

        {/* Stakeholders & Success Criteria */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-wm-blue font-bold mb-2">{t('research.rfpStakeholders')}</h3>
            <div className="bg-wm-neutral/10 p-4 rounded-lg border border-wm-neutral/30">
              <p className="text-wm-blue/70">{analysis.stakeholders}</p>
            </div>
          </div>
          <div>
            <h3 className="text-wm-blue font-bold mb-2">{t('research.rfpSuccessCriteria')}</h3>
            <div className="bg-wm-neutral/10 p-4 rounded-lg border border-wm-neutral/30">
              <p className="text-wm-blue/70">{analysis.successCriteria}</p>
            </div>
          </div>
        </div>

        {/* Risks & Constraints */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-wm-blue font-bold mb-2">{t('research.rfpRisks')}</h3>
            <div className="bg-wm-neutral/10 p-4 rounded-lg border border-wm-neutral/30">
              <p className="text-wm-blue/70">{analysis.risks}</p>
            </div>
          </div>
          <div>
            <h3 className="text-wm-blue font-bold mb-2">{t('research.rfpConstraints')}</h3>
            <div className="bg-wm-neutral/10 p-4 rounded-lg border border-wm-neutral/30">
              <p className="text-wm-blue/70">{analysis.constraints}</p>
            </div>
          </div>
        </div>

        {/* AI Analysis */}
        <div>
          <h3 className="text-wm-blue font-bold mb-2">{t('research.rfpAiAnalysis')}</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-wm-blue/80 font-bold mb-2">{t('research.rfpAiRecommendations')}</h4>
              <div className="bg-wm-neutral/10 p-4 rounded-lg border border-wm-neutral/30">
                <p className="text-wm-blue/70">{analysis.aiRecommendations}</p>
              </div>
            </div>
            <div>
              <h4 className="text-wm-blue/80 font-bold mb-2">{t('research.rfpAiCapabilities')}</h4>
              <div className="bg-wm-neutral/10 p-4 rounded-lg border border-wm-neutral/30">
                <p className="text-wm-blue/70">{analysis.aiCapabilities}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Clarification Needed */}
        {analysis.clarificationNeeded && (
          <div className="border-t border-wm-neutral pt-6">
            <h3 className="text-wm-blue font-bold mb-2">{t('research.rfpClarificationNeeded')}</h3>
            <div className="bg-wm-yellow/20 border-l-4 border-wm-yellow p-4 rounded-r-lg">
              <pre className="text-wm-blue/80 whitespace-pre-wrap font-mono text-sm">
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