import React from 'react';
import { useTranslation } from '../i18n';
import type { RfpAnalysis } from '../types';

interface RfpAnalysisViewProps {
  analysis: RfpAnalysis;
}

const RfpAnalysisView: React.FC<RfpAnalysisViewProps> = ({ analysis }) => {
  const { t } = useTranslation();

  const renderTextBlocks = (text?: string) => {
    if (!text) {
      return <p className="text-wm-blue/60 text-sm">No data provided.</p>;
    }

    const lines = text
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    if (lines.length <= 1) {
      return <p className="text-wm-blue/80 leading-relaxed">{text}</p>;
    }

    return (
      <ul className="list-disc pl-5 space-y-1 text-wm-blue/80">
        {lines.map((line, idx) => (
          <li key={idx}>{line.replace(/^[-•\d.\s]+/, '')}</li>
        ))}
      </ul>
    );
  };

  const renderPreformatted = (text?: string) => (
    <div className="bg-wm-neutral/10 p-4 rounded-lg border border-wm-neutral/30">
      <pre className="text-wm-blue/80 whitespace-pre-wrap font-mono text-sm leading-relaxed">
        {text || 'No data provided.'}
      </pre>
    </div>
  );

  return (
    <div className="bg-white border border-wm-neutral/30 rounded-xl p-6 shadow-sm">
      <h2 className="text-xl font-bold text-wm-blue mb-6">{t('research.rfpAnalysis')}</h2>
      
      <div className="space-y-6">
        {/* Project Structure */}
        <div className="space-y-2">
          <h3 className="text-wm-blue font-bold">{t('research.rfpProjectStructure')}</h3>
          {renderPreformatted(analysis.projectStructure)}
        </div>

        {/* Summary */}
        <div className="space-y-2">
          <h3 className="text-wm-blue font-bold">{t('research.rfpSummary')}</h3>
          {renderTextBlocks(analysis.summary)}
        </div>

        {/* Detailed Analysis */}
        <div className="space-y-2">
          <h3 className="text-wm-blue font-bold">{t('research.rfpDetailedAnalysis')}</h3>
          {renderPreformatted(analysis.detailedAnalysis)}
        </div>

        {/* Requirements */}
        <div className="space-y-2">
          <h3 className="text-wm-blue font-bold">{t('research.rfpRequirements')}</h3>
          {renderPreformatted(analysis.requirements)}
        </div>

        {/* Timeline & Budget */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="text-wm-blue font-bold">{t('research.rfpTimeline')}</h3>
            <div className="bg-wm-neutral/10 p-4 rounded-lg border border-wm-neutral/30">
              {renderTextBlocks(analysis.timeline)}
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-wm-blue font-bold">{t('research.rfpBudget')}</h3>
            <div className="bg-wm-neutral/10 p-4 rounded-lg border border-wm-neutral/30">
              {renderTextBlocks(analysis.budget)}
            </div>
          </div>
        </div>

        {/* Stakeholders & Success Criteria */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="text-wm-blue font-bold">{t('research.rfpStakeholders')}</h3>
            <div className="bg-wm-neutral/10 p-4 rounded-lg border border-wm-neutral/30">
              {renderTextBlocks(analysis.stakeholders)}
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-wm-blue font-bold">{t('research.rfpSuccessCriteria')}</h3>
            <div className="bg-wm-neutral/10 p-4 rounded-lg border border-wm-neutral/30">
              {renderTextBlocks(analysis.successCriteria)}
            </div>
          </div>
        </div>

        {/* Risks & Constraints */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="text-wm-blue font-bold">{t('research.rfpRisks')}</h3>
            <div className="bg-wm-neutral/10 p-4 rounded-lg border border-wm-neutral/30">
              {renderTextBlocks(analysis.risks)}
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-wm-blue font-bold">{t('research.rfpConstraints')}</h3>
            <div className="bg-wm-neutral/10 p-4 rounded-lg border border-wm-neutral/30">
              {renderTextBlocks(analysis.constraints)}
            </div>
          </div>
        </div>

        {/* AI Analysis */}
        <div className="space-y-3">
          <h3 className="text-wm-blue font-bold">{t('research.rfpAiAnalysis')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-wm-blue/80 font-bold">{t('research.rfpAiRecommendations')}</h4>
              <div className="bg-wm-neutral/10 p-4 rounded-lg border border-wm-neutral/30">
                {renderTextBlocks(analysis.aiRecommendations)}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-wm-blue/80 font-bold">{t('research.rfpAiCapabilities')}</h4>
              <div className="bg-wm-neutral/10 p-4 rounded-lg border border-wm-neutral/30">
                {renderTextBlocks(analysis.aiCapabilities)}
              </div>
            </div>
          </div>
        </div>

        {/* Clarification Needed */}
        {analysis.clarificationNeeded && (
          <div className="border-t border-wm-neutral pt-6 space-y-2">
            <h3 className="text-wm-blue font-bold">{t('research.rfpClarificationNeeded')}</h3>
            <div className="bg-wm-yellow/20 border-l-4 border-wm-yellow p-4 rounded-r-lg">
              {renderTextBlocks(analysis.clarificationNeeded)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RfpAnalysisView;