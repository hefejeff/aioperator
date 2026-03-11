import React, { useState } from 'react';
import { DOMAIN_COLORS } from '../constants';
import brainIcon from '../assets/brain_icon.png';
import LoginView from './LoginView';
import type { Platform } from '../types';
import { useTranslation } from '../i18n';

interface PublicLandingProps {}

const PublicLanding: React.FC<PublicLandingProps> = () => {
  const [problem, setProblem] = useState('');
  const [platform, setPlatform] = useState<Platform>('MS365');
  const [domainChoice, setDomainChoice] = useState<string>(''); // '' = auto, otherwise a known domain or 'NEW'
  const [customDomain, setCustomDomain] = useState<string>('');
  const [industry, setIndustry] = useState('');
  const [process, setProcess] = useState('');
  const [isCustomProcess, setIsCustomProcess] = useState(false);
  const [customProcess, setCustomProcess] = useState('');
  const [workflowTitle, setWorkflowTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [valueDrivers, setValueDrivers] = useState('');
  const [painPoints, setPainPoints] = useState('');
  const [aiExample, setAiExample] = useState('');
  const [generating, setGenerating] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const { t } = useTranslation();
  const [previewOpen, setPreviewOpen] = useState(false);

  const domainProcessMap: Record<string, string[]> = {
    Sales: ['Lead Qualification', 'Proposal Generation', 'Contract Review'],
    HR: ['Resume Screening', 'Onboarding Automation', 'Performance Review'],
    Finance: ['Invoice Processing', 'Expense Approval', 'Financial Reporting'],
    Operations: ['Workflow Optimization', 'Resource Allocation'],
    Logistics: ['Shipment Tracking', 'Inventory Management'],
    Healthcare: ['Patient Intake', 'Appointment Scheduling'],
    Manufacturing: ['Quality Control', 'Production Planning'],
    Legal: ['Document Review', 'Contract Analysis'],
    Procurement: ['Purchase Order Processing', 'Vendor Management'],
    Marketing: ['Campaign Analytics', 'Content Generation'],
    IT: ['Ticket Routing', 'System Monitoring'],
    'Customer Support': ['Email Triage', 'Knowledge Base Search']
  };

  const resolvedDomain = domainChoice === 'NEW' ? customDomain.trim() : domainChoice;
  const availableProcesses = resolvedDomain ? domainProcessMap[resolvedDomain] || [] : [];

  const startDesign = () => {
    if (!problem.trim()) {
  alert(t('landing.alert.enterProblem'));
      return;
    }
    if (domainChoice === 'NEW' && !customDomain.trim()) {
      alert(t('landing.alert.enterCustomDomain'));
      return;
    }
    try {
      localStorage.setItem(
        'aiop.pendingWorkflowRequest',
        JSON.stringify({
          title: workflowTitle.trim(),
          problem: problem.trim(),
          goal: goal.trim(),
          domain: resolvedDomain || undefined,
          industry: industry || undefined,
          process: (isCustomProcess ? customProcess.trim() : process) || undefined,
          valueDrivers: valueDrivers.trim() || undefined,
          painPoints: painPoints.trim() || undefined,
          platform,
          ts: Date.now()
        })
      );
    } catch {}
    // For guests, show an example preview and route to sign-in
    setPreviewOpen(true);
  };

  const generateExample = async () => {
    const chosen = resolvedDomain;
    if (!chosen) return;
    setGenerating(true);
    setAiExample('');
    try {
      const mod = await import('../services/geminiService');
      const prompt = `Provide a concise (<=110 words) real-world business problem in the ${chosen} domain that would benefit from AI workflow automation. Focus only on the pain and current inefficiencies; do not propose a solution. Start directly with the problem (no heading).`;
      const text = await mod.generateText(prompt, null, { temperature: 0.5 });
      setAiExample(text.trim());
    } catch (e) {
      console.error('Failed to generate example', e);
      setAiExample('Could not generate an example right now. Please try again later.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-100 text-wm-blue">
      {/* What's Your Problem?? */}
      <section className="bg-gray-100 px-4 sm:px-6 md:px-8 pt-8 sm:pt-10 md:pt-12 pb-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center">
            <div className="w-fit mx-auto">
              <img
                src={brainIcon}
                alt="Site brain icon"
                className="h-24 w-24 object-contain drop-shadow-xl transition-transform duration-300"
              />
            </div>
            <h1 className="mt-3 text-4xl sm:text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-wm-accent via-wm-blue to-wm-yellow">{t('landing.problem.title')}</h1>
            <p className="mt-3 text-wm-blue/70 max-w-3xl mx-auto">{t('landing.problem.subtitle')}</p>
          </div>

          <div className="mt-6 bg-white border border-wm-neutral/30 rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 space-y-4">
            {/* Domain selection first */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-wm-blue font-semibold">{t('landing.domain.label')}</label>
                <button
                  type="button"
                  onClick={generateExample}
                  disabled={generating || (!domainChoice && customDomain.trim() === '')}
                  className="text-sm px-3 py-1.5 rounded-md bg-wm-accent hover:bg-wm-accent/90 disabled:opacity-40 text-white font-medium tracking-wide"
                >
                  {generating ? t('loading') : t('aiExample.button')}
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <select
                    value={domainChoice}
                    onChange={(e)=> {
                      setDomainChoice(e.target.value);
                      setAiExample('');
                      setProcess('');
                      setIsCustomProcess(false);
                      setCustomProcess('');
                    }}
                    className="bg-white border border-wm-neutral/30 text-wm-blue rounded px-3 py-2 w-full"
                    aria-label="Select domain"
                  >
                    <option value="">{t('landing.domain.auto')}</option>
                    {Object.keys(DOMAIN_COLORS).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                    <option value="NEW">{t('landing.domain.createNew')}</option>
                  </select>
                </div>
                {domainChoice === 'NEW' && (
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(e)=> { setCustomDomain(e.target.value); setAiExample(''); }}
                    placeholder={t('landing.domain.customPlaceholder')}
                    className="bg-white border border-wm-neutral/30 text-wm-blue rounded px-3 py-2 w-full"
                    aria-label="Enter custom domain"
                  />
                )}
                {aiExample && (
                  <div className="mt-2 bg-wm-neutral/10 border border-wm-neutral/30 rounded-lg p-3">
                    <div className="text-sm font-semibold uppercase tracking-wide text-wm-blue/70 mb-1">{t('aiExample.exampleProblem')}</div>
                    <p className="text-wm-blue text-sm leading-relaxed whitespace-pre-wrap">{aiExample}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={()=> setProblem(prev => prev || aiExample)}
                        className="text-[10px] px-2 py-1 rounded bg-wm-accent hover:bg-wm-accent/90 text-white uppercase tracking-wide"
                      >{t('aiExample.useProblem')}</button>
                      <button
                        type="button"
                        onClick={()=> setAiExample('')}
                        className="text-[10px] px-2 py-1 rounded bg-white border border-wm-neutral/30 hover:bg-wm-neutral/10 text-wm-blue uppercase tracking-wide"
                      >{t('aiExample.clear')}</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Industry */}
            <div>
              <label className="block text-wm-blue font-semibold mb-2">Industry (Optional)</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="bg-white border border-wm-neutral/30 text-wm-blue rounded px-3 py-2 w-full"
              >
                <option value="">Select an industry (optional)</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Finance">Finance</option>
                <option value="Retail">Retail</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Technology">Technology</option>
                <option value="Education">Education</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Hospitality">Hospitality</option>
                <option value="Transportation">Transportation</option>
                <option value="Energy">Energy</option>
                <option value="Telecommunications">Telecommunications</option>
                <option value="Media & Entertainment">Media & Entertainment</option>
                <option value="Government">Government</option>
                <option value="Non-Profit">Non-Profit</option>
                <option value="Professional Services">Professional Services</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Sub-domain */}
            {resolvedDomain && availableProcesses.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-wm-blue font-semibold">Sub-domain</label>
                  {!isCustomProcess && (
                    <button
                      type="button"
                      onClick={() => setIsCustomProcess(true)}
                      className="text-sm text-wm-accent hover:text-wm-accent/80 font-semibold"
                    >
                      + Add custom sub-domain
                    </button>
                  )}
                </div>

                {isCustomProcess ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customProcess}
                      onChange={(e) => setCustomProcess(e.target.value)}
                      placeholder="Enter custom sub-domain name"
                      className="flex-1 bg-white border border-wm-neutral/30 rounded px-3 py-2 text-wm-blue"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomProcess(false);
                        setCustomProcess('');
                      }}
                      className="px-3 py-2 text-sm border border-wm-neutral/30 rounded text-wm-blue hover:bg-wm-neutral/10"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <select
                    value={process}
                    onChange={(e) => setProcess(e.target.value)}
                    className="bg-white border border-wm-neutral/30 text-wm-blue rounded px-3 py-2 w-full"
                  >
                    <option value="">Select a sub-domain (optional)</option>
                    {availableProcesses.map((proc) => (
                      <option key={proc} value={proc}>{proc}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Workflow title */}
            <div>
              <label htmlFor="workflowTitle" className="block text-wm-blue font-semibold mb-2">{t('form.title')}</label>
              <input
                id="workflowTitle"
                type="text"
                value={workflowTitle}
                onChange={(e) => setWorkflowTitle(e.target.value)}
                placeholder={t('form.titlePlaceholder')}
                className="w-full bg-white border border-wm-neutral/30 rounded-xl px-4 py-3 text-wm-blue placeholder-wm-blue/40 focus:ring-2 focus:ring-wm-accent/40 focus:outline-none"
              />
            </div>

            {/* Problem field */}
            <div>
              <label htmlFor="problem" className="block text-wm-blue font-semibold mb-2">Current Process</label>
              <textarea
                id="problem"
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="Describe the current process"
                className="w-full min-h-[140px] bg-white border border-wm-neutral/30 rounded-xl p-4 text-wm-blue placeholder-wm-blue/40 focus:ring-2 focus:ring-wm-accent/40 focus:outline-none"
              />
            </div>

            {/* Desired outcome */}
            <div>
              <label htmlFor="goal" className="block text-wm-blue font-semibold mb-2">Desired Outcome</label>
              <textarea
                id="goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="What is the desired outcome?"
                className="w-full min-h-[120px] bg-white border border-wm-neutral/30 rounded-xl p-4 text-wm-blue placeholder-wm-blue/40 focus:ring-2 focus:ring-wm-accent/40 focus:outline-none"
              />
            </div>

            {/* Value Drivers */}
            <div>
              <label htmlFor="valueDrivers" className="block text-wm-blue font-semibold mb-2">Value Drivers <span className="text-wm-blue/50 font-normal">(Optional)</span></label>
              <textarea
                id="valueDrivers"
                value={valueDrivers}
                onChange={(e) => setValueDrivers(e.target.value)}
                placeholder="What business value will this deliver?"
                className="w-full min-h-[100px] bg-white border border-wm-neutral/30 rounded-xl p-4 text-wm-blue placeholder-wm-blue/40 focus:ring-2 focus:ring-wm-accent/40 focus:outline-none"
              />
            </div>

            {/* Pain Points */}
            <div>
              <label htmlFor="painPoints" className="block text-wm-blue font-semibold mb-2">Pain Points <span className="text-wm-blue/50 font-normal">(Optional)</span></label>
              <textarea
                id="painPoints"
                value={painPoints}
                onChange={(e) => setPainPoints(e.target.value)}
                placeholder="What problems does this solve?"
                className="w-full min-h-[100px] bg-white border border-wm-neutral/30 rounded-xl p-4 text-wm-blue placeholder-wm-blue/40 focus:ring-2 focus:ring-wm-accent/40 focus:outline-none"
              />
            </div>

            {/* Target platform */}
            <div>
              <label className="block text-wm-blue font-semibold mb-2">{t('landing.platform.label')}</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                className="bg-white border border-wm-neutral/30 text-wm-blue rounded px-3 py-2 w-full"
                aria-label="Select target platform"
              >
                <option value="MS365">{t('platform.ms365')}</option>
                <option value="GOOGLE">{t('platform.google')}</option>
                <option value="CUSTOM">{t('platform.custom')}</option>
                <option value="CUSTOM_PROMPT">{t('platform.customPrompt')}</option>
                <option value="ASSISTANT">{t('platform.assistant')}</option>
                <option value="COMBINATION">{t('platform.combination')}</option>
              </select>
            </div>
            <div>
              <button
                onClick={startDesign}
                disabled={!workflowTitle.trim() || !problem.trim() || !goal.trim()}
                className="w-full inline-flex items-center justify-center px-5 py-3 rounded-xl bg-wm-accent text-white font-semibold hover:bg-wm-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('landing.cta.design')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="px-4 sm:px-6 md:px-8 py-8 md:py-10 bg-white/70 border-y border-wm-neutral/20">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: t('landing.highlights.1.title'), desc: t('landing.highlights.1.desc') },
            { title: t('landing.highlights.2.title'), desc: t('landing.highlights.2.desc') },
            { title: t('landing.highlights.3.title'), desc: t('landing.highlights.3.desc') },
          ].map((f, i) => (
            <div key={i} className="bg-white border border-wm-neutral/30 rounded-xl p-5 shadow-sm">
              <h3 className="text-wm-blue font-semibold text-lg">{f.title}</h3>
              <p className="text-wm-blue/70 mt-2 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-4 sm:px-6 md:px-8 py-10 md:py-12">
        <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-bold text-wm-blue text-center">{t('landing.how.title')}</h2>
          <ol className="mt-6 space-y-4">
            <li className="bg-white border border-wm-neutral/30 rounded-xl p-4 shadow-sm">
        <p className="text-wm-blue font-semibold">{t('landing.how.step1.title')}</p>
        <p className="text-wm-blue/70 text-sm mt-1">{t('landing.how.step1.desc')}</p>
            </li>
            <li className="bg-white border border-wm-neutral/30 rounded-xl p-4 shadow-sm">
        <p className="text-wm-blue font-semibold">{t('landing.how.step2.title')}</p>
        <p className="text-wm-blue/70 text-sm mt-1">{t('landing.how.step2.desc')}</p>
            </li>
            <li className="bg-white border border-wm-neutral/30 rounded-xl p-4 shadow-sm">
        <p className="text-wm-blue font-semibold">{t('landing.how.step3.title')}</p>
        <p className="text-wm-blue/70 text-sm mt-1">{t('landing.how.step3.desc')}</p>
            </li>
          </ol>
          <div className="text-center mt-8">
            <button
              onClick={() => { setAuthOpen(true); }}
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-wm-accent text-white font-semibold hover:bg-wm-accent/90 transition-colors"
            >
        {t('auth.signIn')}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 sm:px-6 md:px-8 py-6 border-t border-wm-neutral/20 text-center text-wm-blue/60 text-sm">
        <p>© {new Date().getFullYear()} AI Builder Pro</p>
      </footer>

      {/* Auth modal for guests */}
  {authOpen && (
        <div className="fixed inset-0 bg-wm-blue/70 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setAuthOpen(false)}>
          <div className="bg-white border border-wm-neutral/30 rounded-xl max-w-lg w-full p-4 md:p-6 shadow-xl" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
      <h3 className="text-wm-blue font-semibold">{t('auth.signInToContinue')}</h3>
              <button onClick={() => setAuthOpen(false)} className="p-2 rounded-md text-wm-blue/60 hover:text-wm-blue hover:bg-wm-neutral/20" aria-label="Close">×</button>
            </div>
            <LoginView mode="login" />
          </div>
        </div>
      )}

      {/* Example preview modal for guests */}
      {previewOpen && (
        <div className="fixed inset-0 bg-wm-blue/70 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setPreviewOpen(false)}>
          <div className="bg-white border border-wm-neutral/30 rounded-xl max-w-2xl w-full p-4 md:p-6 shadow-xl" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-wm-blue font-semibold">{t('landing.preview.title')}</h3>
              <button onClick={() => setPreviewOpen(false)} className="p-2 rounded-md text-wm-blue/60 hover:text-wm-blue hover:bg-wm-neutral/20" aria-label="Close">×</button>
            </div>
            <p className="text-wm-blue/70 text-sm mb-4">{t('landing.preview.subtitle')}</p>
            <div className="bg-wm-neutral/10 border border-wm-neutral/30 rounded-lg p-4 mb-4">
                <p className="text-wm-blue font-semibold">{t('landing.preview.exampleTitle')}</p>
              <ul className="list-disc list-inside text-wm-blue/70 text-sm mt-2 space-y-1">
                <li>{t('landing.preview.step1')}</li>
                <li>{t('landing.preview.step2')}</li>
                <li>{t('landing.preview.step3')}</li>
                <li>{t('landing.preview.step4')}</li>
              </ul>
                <p className="text-wm-blue/60 text-sm mt-3">{t('landing.preview.platformNote', { platform: platform === 'MS365' ? t('platform.ms365') : platform === 'GOOGLE' ? t('platform.google') : t('platform.custom') })}</p>
            </div>
              <div className="bg-wm-neutral/5 border border-wm-neutral/30 rounded-lg p-4 mb-4">
                <p className="text-wm-blue/70 text-sm uppercase tracking-wide">{t('landing.preview.yourProblem')}</p>
                <p className="text-wm-blue mt-1">{problem}</p>
                <p className="text-wm-blue/70 text-sm mt-3">
                  <span className="font-semibold text-wm-accent">{t('landing.preview.sketchTitle')}:</span>
                  <span className="ml-2">
                    {t('landing.preview.sketchTemplate', {
                      problem,
                      platform: platform === 'MS365' ? t('platform.ms365') : platform === 'GOOGLE' ? t('platform.google') : t('platform.custom'),
                      domainSuffix: (domainChoice === 'NEW' ? customDomain.trim() : domainChoice)
                        ? t('landing.preview.sketchDomainSuffix', { domain: (domainChoice === 'NEW' ? customDomain.trim() : domainChoice)! })
                        : ''
                    })}
                  </span>
                </p>
              </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <button
                  onClick={() => { setPreviewOpen(false); setAuthOpen(true); }}
                className="px-4 py-2 rounded-lg bg-wm-accent text-white hover:bg-wm-accent/90"
              >
                {t('landing.preview.signin')}
              </button>
              <button
                onClick={() => setPreviewOpen(false)}
                className="px-4 py-2 rounded-lg text-wm-blue/70 hover:text-wm-blue"
              >
                {t('landing.preview.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicLanding;
