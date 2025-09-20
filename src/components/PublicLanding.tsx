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
  const [aiExample, setAiExample] = useState('');
  const [generating, setGenerating] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const { t } = useTranslation();
  const [previewOpen, setPreviewOpen] = useState(false);

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
      const resolvedDomain = domainChoice === 'NEW' ? customDomain.trim() : (domainChoice || undefined);
      localStorage.setItem(
        'aiop.pendingWorkflowRequest',
        JSON.stringify({ problem: problem.trim(), platform, domain: resolvedDomain, ts: Date.now() })
      );
    } catch {}
    // For guests, show an example preview and encourage signup
    setPreviewOpen(true);
  };

  const generateExample = async () => {
    const chosen = domainChoice === 'NEW' ? customDomain.trim() : domainChoice;
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
    <div className="min-h-[calc(100vh-4rem)] bg-slate-900">
      {/* What's Your Problem?? */}
      <section className="px-4 sm:px-6 md:px-8 pt-12 sm:pt-16 md:pt-20 pb-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center">
            <div className="w-fit mx-auto">
              <img
                src={brainIcon}
                alt="Site brain icon"
                className="h-24 w-24 object-contain drop-shadow-xl transition-transform duration-300"
              />
            </div>
            <h1 className="mt-3 text-4xl sm:text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-400 to-emerald-400">{t('landing.problem.title')}</h1>
            <p className="mt-3 text-slate-300 max-w-3xl mx-auto">{t('landing.problem.subtitle')}</p>
          </div>

          <div className="mt-8 bg-slate-900/70 border border-slate-700 rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 space-y-6">
            {/* Domain selection first */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-slate-200 font-semibold">{t('landing.domain.label')}</label>
                <button
                  type="button"
                  onClick={generateExample}
                  disabled={generating || (!domainChoice && customDomain.trim() === '')}
                  className="text-xs px-3 py-1.5 rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-medium tracking-wide"
                >
                  {generating ? t('loading') : t('aiExample.button')}
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <select
                    value={domainChoice}
                    onChange={(e)=> { setDomainChoice(e.target.value); setAiExample(''); }}
                    className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-3 py-2 w-full"
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
                    className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-3 py-2 w-full"
                    aria-label="Enter custom domain"
                  />
                )}
                {aiExample && (
                  <div className="mt-2 bg-slate-950/60 border border-slate-700 rounded-lg p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-300 mb-1">{t('aiExample.exampleProblem')}</div>
                    <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{aiExample}</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={()=> setProblem(prev => prev || aiExample)}
                        className="text-[10px] px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white uppercase tracking-wide"
                      >{t('aiExample.useProblem')}</button>
                      <button
                        type="button"
                        onClick={()=> setAiExample('')}
                        className="text-[10px] px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 uppercase tracking-wide"
                      >{t('aiExample.clear')}</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Problem field */}
            <div>
              <label htmlFor="problem" className="block text-slate-200 font-semibold mb-2">{t('landing.problem.label')}</label>
              <textarea
                id="problem"
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder={t('landing.problem.placeholder')}
                className="w-full min-h-[140px] bg-slate-950/70 border border-slate-700 rounded-xl p-4 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
            {/* Target platform */}
            <div>
              <label className="block text-slate-200 font-semibold mb-2">{t('landing.platform.label')}</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-3 py-2 w-full"
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
                disabled={!problem.trim()}
                className="w-full inline-flex items-center justify-center px-5 py-3 rounded-xl bg-sky-600 text-white font-semibold hover:bg-sky-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('landing.cta.design')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="px-4 sm:px-6 md:px-8 py-12 md:py-16 bg-slate-900/60 border-t border-slate-800">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: t('landing.highlights.1.title'), desc: t('landing.highlights.1.desc') },
            { title: t('landing.highlights.2.title'), desc: t('landing.highlights.2.desc') },
            { title: t('landing.highlights.3.title'), desc: t('landing.highlights.3.desc') },
          ].map((f, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <h3 className="text-white font-semibold text-lg">{f.title}</h3>
              <p className="text-slate-300 mt-2 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-4 sm:px-6 md:px-8 py-16 md:py-20">
        <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-bold text-white text-center">{t('landing.how.title')}</h2>
          <ol className="mt-6 space-y-4">
            <li className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <p className="text-white font-semibold">{t('landing.how.step1.title')}</p>
        <p className="text-slate-300 text-sm mt-1">{t('landing.how.step1.desc')}</p>
            </li>
            <li className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <p className="text-white font-semibold">{t('landing.how.step2.title')}</p>
        <p className="text-slate-300 text-sm mt-1">{t('landing.how.step2.desc')}</p>
            </li>
            <li className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <p className="text-white font-semibold">{t('landing.how.step3.title')}</p>
        <p className="text-slate-300 text-sm mt-1">{t('landing.how.step3.desc')}</p>
            </li>
          </ol>
          <div className="text-center mt-8">
            <button
              onClick={() => { setAuthMode('signup'); setAuthOpen(true); }}
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition-colors"
            >
        {t('landing.cta.createFirst')}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 sm:px-6 md:px-8 py-10 border-t border-slate-800 text-center text-slate-500 text-sm">
        <p>© {new Date().getFullYear()} AI Operator Training Hub</p>
      </footer>

      {/* Auth modal for guests */}
  {authOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setAuthOpen(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-4 md:p-6" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
      <h3 className="text-white font-semibold">{t('auth.signInToContinue')}</h3>
              <button onClick={() => setAuthOpen(false)} className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/50" aria-label="Close">×</button>
            </div>
            <LoginView mode={authMode} />
          </div>
        </div>
      )}

      {/* Example preview modal for guests */}
      {previewOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setPreviewOpen(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full p-4 md:p-6" onClick={(e)=>e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">{t('landing.preview.title')}</h3>
              <button onClick={() => setPreviewOpen(false)} className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/50" aria-label="Close">×</button>
            </div>
            <p className="text-slate-300 text-sm mb-4">{t('landing.preview.subtitle')}</p>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-4">
                <p className="text-white font-semibold">{t('landing.preview.exampleTitle')}</p>
              <ul className="list-disc list-inside text-slate-300 text-sm mt-2 space-y-1">
                <li>{t('landing.preview.step1')}</li>
                <li>{t('landing.preview.step2')}</li>
                <li>{t('landing.preview.step3')}</li>
                <li>{t('landing.preview.step4')}</li>
              </ul>
                <p className="text-slate-400 text-xs mt-3">{t('landing.preview.platformNote', { platform: platform === 'MS365' ? t('platform.ms365') : platform === 'GOOGLE' ? t('platform.google') : t('platform.custom') })}</p>
            </div>
              <div className="bg-slate-800/40 border border-slate-700 rounded-lg p-4 mb-4">
                <p className="text-slate-300 text-xs uppercase tracking-wide">{t('landing.preview.yourProblem')}</p>
                <p className="text-white mt-1">{problem}</p>
                <p className="text-slate-300 text-sm mt-3">
                  <span className="font-semibold text-sky-300">{t('landing.preview.sketchTitle')}:</span>
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
                onClick={() => { setPreviewOpen(false); setAuthMode('signup'); setAuthOpen(true); }}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500"
              >
                {t('landing.preview.signup')}
              </button>
              <button
                onClick={() => { setPreviewOpen(false); setAuthMode('login'); setAuthOpen(true); }}
                className="px-4 py-2 rounded-lg bg-slate-800 text-white border border-slate-700 hover:bg-slate-700"
              >
                {t('landing.preview.signin')}
              </button>
              <button
                onClick={() => setPreviewOpen(false)}
                className="px-4 py-2 rounded-lg text-slate-300 hover:text-white"
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
