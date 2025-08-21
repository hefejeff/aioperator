import React, { createContext, useContext, useMemo, useState } from 'react';

export type Lang = 'English' | 'Spanish';

const resources: Record<string, Record<string, string>> = {
  English: {
    'app.title': 'AI Operator Hub',
    'nav.home': 'Home',
    'nav.training': 'Training',
    'nav.history': 'History',
  'nav.admin': 'Admin',
    'header.editProfile': 'Edit Profile',
    'header.logout': 'Logout',

    // Create scenario
    'create.title': 'Create a New Scenario',
    'create.domain': 'Domain (optional)',
    'create.language': 'Language',
    'create.titleField': 'Scenario Title',
    'create.description': 'Description',
    'create.goal': 'Your Goal',
    'create.generate': 'Generate with AI',
    'create.orFill': 'or fill manually',
    'create.domainAuto': 'Auto (preferred varied domains)',
    'create.descriptionPlaceholder': "A brief overview of the scenario's context.",
    'create.goalPlaceholder': 'Describe the task the user needs to accomplish. What workflow should they design?',
    'create.errorRequired': 'All fields are required.',
    'create.errorSaveFailed': 'Failed to save scenario. Please try again later.',
    'create.generateErrorNonJson': 'AI returned non-JSON output; response placed into Description for editing.',
    'create.generateErrorFailed': 'Failed to generate scenario. Check console for details or ensure API key is configured.',
    'create.cancel': 'Cancel',
    'create.save': 'Save Scenario',

    // Operator console
    'operator.back': 'Back',
    'operator.design': 'Design Your Workflow',
    'operator.explain': 'Explain Your Workflow',
    'operator.visual': 'Visual Workflow (Optional)',
    'operator.evaluate': 'Evaluate My Workflow',
    'operator.feedback': 'Workflow Feedback',
    'operator.historyTitle': 'Your History for this Scenario',
    'operator.uploadHint': 'Upload a screenshot of your workflow (e.g., from Miro, Figma).',
    'operator.selectImage': 'Select Image',
  'operator.invalidImageAlert': 'Please upload a valid image file (PNG, JPG, etc.).',
  'operator.saveEvalFailed': 'Could not save your evaluation. Please check your connection and try again.',
  'operator.explainHelper': 'Describe the steps in your process. Specify which tasks are handled by AI and which require human intervention.',
    'operator.yourGoalLabel': 'Your Goal:',
    'operator.yourScore': 'Your Score',
    'operator.aiFeedback': 'Feedback from AI Consultant:',
  'operator.aiAssist': 'AI Assist: draft explanation',
  'operator.aiDiagramAssist': 'AI Assist: create diagram',
  'operator.previewTitle': 'Diagram Preview',
  'operator.copyMermaid': 'Copy Mermaid',
  'operator.useAsImage': 'Use as Image',
  'operator.refreshPreview': 'Refresh Preview',
    'operator.noHistoryScenario': 'No history for this scenario yet. Submit a workflow to see your results here!',

    // Sidebar & leaderboard
    'sidebar.yourStats': 'Your Stats',
    'sidebar.average': 'Average score',
    'sidebar.topScores': 'Top scores (9+)',
    'sidebar.recentActivity': 'Recent activity',
    'leaderboard.title': 'Top 5 Operators',
    'leaderboard.empty': 'No Scores Yet',

    // Profile
    'profile.title': 'Edit Profile',
    'profile.displayName': 'Display name',
    'profile.avatar': 'Avatar URL (optional)',
    'profile.language': 'Preferred language',
    'profile.cancel': 'Cancel',
    'profile.save': 'Save',

    // Dashboard
    'dashboard.welcome': 'Welcome Back, {name}!',
    'dashboard.trainingGround': 'Training Ground',
    'dashboard.noScores': 'No scores yet — complete a scenario to build your average.',
    'dashboard.recentActivity': 'Recent Activity',
    'dashboard.noActivity': 'No activity yet',
    'dashboard.noActivityInfo': 'Complete a scenario to see your results here.',

    // Training
    'training.title': 'Training Scenarios',
    'training.subtitle': 'Select a scenario to start practicing, or create your own.',
    'training.createButton': 'Create New Scenario',
    'training.filter': 'Filter:',
    'filter.all': 'All',

    // History
    'history.title': 'Your Evaluation History',
    'history.noHistory': 'No History Found',
    'history.noEntries': 'Complete some training or evaluation scenarios to see your progress here.',
    'history.viewDiagram': 'View Submitted Diagram',
    'history.feedback': 'Feedback:',
    'history.workflowExplanation': 'Your Workflow Explanation:',
    'history.score': 'Score',

    // Scenario card
    'scenario.custom': 'Custom',
    'scenario.deleteConfirm': 'Delete this scenario? This cannot be undone.',
    'scenario.delete': 'Delete scenario',
    'scenario.start': 'Start Scenario',
    'scenario.highScoreLabel': 'High Score',
    'scenario.avgScoreLabel': 'Avg Score',

    // Misc
    'loading': 'Loading...',
    'noRecentActivity': 'No recent activity',

  // Auth
  'auth.signUp': 'Sign up',
  'auth.signIn': 'Sign in',
  'auth.signInToContinue': 'Sign in to continue',
  'auth.createAccount': 'Create your account',
  'auth.welcomeBack': 'Welcome back',

  // Platform labels
  'platform.ms365': 'Microsoft 365',
  'platform.google': 'Google Workspace',
  'platform.custom': 'Custom App',

  // Public landing
  'landing.problem.title': "What’s Your Problem??",
  'landing.problem.subtitle': 'Describe your challenge. We’ll help design an AI-powered workflow and generate a PRD tailored to your platform.',
  'landing.problem.label': 'Your problem',
  'landing.problem.placeholder': 'e.g., Our support team spends hours triaging emails. We need to auto-categorize requests, draft replies, and escalate complex cases.',
  'landing.platform.label': 'Target platform',
  'landing.domain.label': 'Domain',
  'landing.domain.auto': 'Auto (recommended)',
  'landing.domain.createNew': 'Create new domain…',
  'landing.domain.customPlaceholder': 'e.g., Compliance, R&D, Field Ops',
  'landing.cta.design': 'Design my workflow',
  'landing.cta.explore': 'Explore features',
  'landing.alert.enterProblem': 'Tell us your problem to begin.',
  'landing.alert.enterCustomDomain': 'Enter a domain name or choose Auto.',
  'landing.highlights.1.title': 'Draft workflows with AI',
  'landing.highlights.1.desc': 'Turn goals into clear, step-by-step flows with AI assist and Mermaid diagrams.',
  'landing.highlights.2.title': 'Generate PRDs by platform',
  'landing.highlights.2.desc': 'Create product-ready PRDs tailored for Microsoft 365, Google Workspace, or custom stacks.',
  'landing.highlights.3.title': 'Perfect your elevator pitch',
  'landing.highlights.3.desc': 'Auto-generate and refine concise pitches you can save and share.',
  'landing.how.title': 'How it works',
  'landing.how.step1.title': '1. Describe your goal',
  'landing.how.step1.desc': 'Start with a simple objective. Use AI Assist to draft your workflow steps.',
  'landing.how.step2.title': '2. Visualize and iterate',
  'landing.how.step2.desc': 'Render Mermaid diagrams, adjust steps, and refine with suggestions.',
  'landing.how.step3.title': '3. Generate artifacts',
  'landing.how.step3.desc': 'Produce platform-specific PRDs and an elevator pitch. Save them for later.',
  'landing.cta.createFirst': 'Create your first workflow',
  'landing.preview.title': 'See an example workflow',
  'landing.preview.subtitle': 'Here’s a quick example of what your AI-assisted flow might look like. Sign up to generate, edit, and save your own.',
  'landing.preview.exampleTitle': 'Example: Support Ticket Triage',
  'landing.preview.step1': 'Detect incoming email and extract key fields (sender, subject, body).',
  'landing.preview.step2': 'AI categorizes intent and urgency; human reviews edge cases.',
  'landing.preview.step3': 'Draft response with AI; route to queue or escalate to agent.',
  'landing.preview.step4': 'Log resolution and collect feedback for continuous improvement.',
  'landing.preview.platformNote': 'Tailored for {platform}',
  'landing.preview.yourProblem': 'Your problem',
  'landing.preview.sketchTitle': 'One-line sketch',
  'landing.preview.sketchTemplate': 'AI analyzes and routes “{problem}” for {platform}{domainSuffix}, drafts outputs, and escalates edge cases.',
  'landing.preview.sketchDomainSuffix': ' in {domain}',
  'landing.preview.signup': 'Sign up to continue',
  'landing.preview.signin': 'Sign in',
  'landing.preview.close': 'Close',
  },
  Spanish: {
    'app.title': 'Centro de Operadores AI',
    'nav.home': 'Inicio',
    'nav.training': 'Entrenamiento',
    'nav.history': 'Historial',
  'nav.admin': 'Admin',
    'header.editProfile': 'Editar Perfil',
    'header.logout': 'Cerrar sesión',

    // Create scenario
    'create.title': 'Crear un Nuevo Escenario',
    'create.domain': 'Dominio (opcional)',
    'create.language': 'Idioma',
    'create.titleField': 'Título del Escenario',
    'create.description': 'Descripción',
    'create.goal': 'Tu Objetivo',
    'create.generate': 'Generar con IA',
    'create.orFill': 'o completar manualmente',
  'create.domainAuto': 'Automático (preferir dominios variados)',
  'create.descriptionPlaceholder': 'Una breve descripción del contexto del escenario.',
  'create.goalPlaceholder': 'Describe la tarea que el usuario debe lograr. ¿Qué flujo de trabajo deberían diseñar?',
  'create.errorRequired': 'Todos los campos son obligatorios.',
  'create.errorSaveFailed': 'No se pudo guardar el escenario. Intenta de nuevo más tarde.',
  'create.generateErrorNonJson': 'La IA devolvió una respuesta no JSON; la respuesta se colocó en Descripción para editarla.',
  'create.generateErrorFailed': 'No se pudo generar el escenario. Revisa la consola para más detalles o asegúrate de que la clave de API esté configurada.',
    'create.cancel': 'Cancelar',
    'create.save': 'Guardar Escenario',

    // Operator console
    'operator.back': 'Atrás',
    'operator.design': 'Diseña tu Flujo de Trabajo',
    'operator.explain': 'Explica Tu Flujo de Trabajo',
    'operator.visual': 'Flujo Visual (Opcional)',
    'operator.evaluate': 'Evaluar mi Flujo',
    'operator.feedback': 'Comentarios del Flujo',
    'operator.historyTitle': 'Tu Historial para este Escenario',
    'operator.uploadHint': 'Sube una captura de pantalla de tu flujo de trabajo (por ejemplo, desde Miro, Figma).',
    'operator.selectImage': 'Seleccionar imagen',
  'operator.invalidImageAlert': 'Por favor sube un archivo de imagen válido (PNG, JPG, etc.).',
  'operator.saveEvalFailed': 'No se pudo guardar tu evaluación. Revisa tu conexión e inténtalo de nuevo.',
  'operator.explainHelper': 'Describe los pasos de tu proceso. Indica qué tareas realiza la IA y cuáles requieren intervención humana.',
    'operator.yourGoalLabel': 'Tu objetivo:',
    'operator.yourScore': 'Tu puntuación',
    'operator.aiFeedback': 'Comentarios del Consultor IA:',
  'operator.aiAssist': 'Asistencia IA: borrador de explicación',
  'operator.aiDiagramAssist': 'Asistencia IA: crear diagrama',
  'operator.previewTitle': 'Vista previa del diagrama',
  'operator.copyMermaid': 'Copiar Mermaid',
  'operator.useAsImage': 'Usar como imagen',
  'operator.refreshPreview': 'Actualizar vista previa',
    'operator.noHistoryScenario': 'No hay historial para este escenario todavía. ¡Envía un flujo de trabajo para ver tus resultados aquí!',

    // Sidebar & leaderboard
    'sidebar.yourStats': 'Tus Estadísticas',
    'sidebar.average': 'Puntuación media',
    'sidebar.topScores': 'Mejores puntuaciones (9+)',
    'sidebar.recentActivity': 'Actividad reciente',
    'leaderboard.title': 'Top 5 Operadores',
    'leaderboard.empty': 'Aún no hay puntuaciones',

    // Profile
    'profile.title': 'Editar Perfil',
    'profile.displayName': 'Nombre a mostrar',
    'profile.avatar': 'URL del Avatar (opcional)',
    'profile.language': 'Idioma preferido',
    'profile.cancel': 'Cancelar',
    'profile.save': 'Guardar',

    // Dashboard
    'dashboard.welcome': '¡Bienvenido de nuevo, {name}!',
    'dashboard.trainingGround': 'Campo de Entrenamiento',
    'dashboard.noScores': 'Aún no hay puntuaciones — completa un escenario para construir tu promedio.',
    'dashboard.recentActivity': 'Actividad reciente',
    'dashboard.noActivity': 'Sin actividad',
    'dashboard.noActivityInfo': 'Completa un escenario para ver tus resultados aquí.',

    // Training
    'training.title': 'Escenarios de Entrenamiento',
    'training.subtitle': 'Selecciona un escenario para empezar a practicar o crea el tuyo propio.',
    'training.createButton': 'Crear Nuevo Escenario',
    'training.filter': 'Filtrar:',
    'filter.all': 'Todos',

    // History
    'history.title': 'Tu Historial de Evaluaciones',
    'history.noHistory': 'No se encontró historial',
    'history.noEntries': 'Completa algunos escenarios de entrenamiento o evaluación para ver tu progreso aquí.',
    'history.viewDiagram': 'Ver diagrama enviado',
    'history.feedback': 'Comentarios:',
    'history.workflowExplanation': 'Tu explicación del flujo de trabajo:',
    'history.score': 'Puntuación',

    // Scenario card
    'scenario.custom': 'Personalizado',
    'scenario.deleteConfirm': '¿Eliminar este escenario? Esto no se puede deshacer.',
    'scenario.delete': 'Eliminar escenario',
    'scenario.start': 'Iniciar escenario',
    'scenario.highScoreLabel': 'Mejor puntuación',
    'scenario.avgScoreLabel': 'Puntuación media',

    // Misc
    'loading': 'Cargando...',
    'noRecentActivity': 'Sin actividad reciente',

  // Auth
  'auth.signUp': 'Registrarse',
  'auth.signIn': 'Iniciar sesión',
  'auth.signInToContinue': 'Inicia sesión para continuar',
  'auth.createAccount': 'Crea tu cuenta',
  'auth.welcomeBack': 'Bienvenido de nuevo',

  // Platform labels
  'platform.ms365': 'Microsoft 365',
  'platform.google': 'Google Workspace',
  'platform.custom': 'Aplicación personalizada',

  // Public landing
  'landing.problem.title': '¿Cuál es tu problema?',
  'landing.problem.subtitle': 'Describe tu desafío. Te ayudaremos a diseñar un flujo con IA y a generar un PRD adaptado a tu plataforma.',
  'landing.problem.label': 'Tu problema',
  'landing.problem.placeholder': 'p. ej., Nuestro equipo de soporte dedica horas a clasificar correos. Necesitamos categorizar solicitudes, redactar respuestas y escalar casos complejos automáticamente.',
  'landing.platform.label': 'Plataforma objetivo',
  'landing.domain.label': 'Dominio',
  'landing.domain.auto': 'Automático (recomendado)',
  'landing.domain.createNew': 'Crear dominio nuevo…',
  'landing.domain.customPlaceholder': 'p. ej., Cumplimiento, I+D, Operaciones de campo',
  'landing.cta.design': 'Diseñar mi flujo',
  'landing.cta.explore': 'Explorar funciones',
  'landing.alert.enterProblem': 'Cuéntanos tu problema para empezar.',
  'landing.alert.enterCustomDomain': 'Ingresa un nombre de dominio o elige Automático.',
  'landing.highlights.1.title': 'Redacta flujos con IA',
  'landing.highlights.1.desc': 'Convierte metas en pasos claros con asistencia de IA y diagramas Mermaid.',
  'landing.highlights.2.title': 'Genera PRDs por plataforma',
  'landing.highlights.2.desc': 'Crea PRDs listos para producto para Microsoft 365, Google Workspace o pilas personalizadas.',
  'landing.highlights.3.title': 'Perfecciona tu elevator pitch',
  'landing.highlights.3.desc': 'Genera y refina pitches concisos para guardar y compartir.',
  'landing.how.title': 'Cómo funciona',
  'landing.how.step1.title': '1. Describe tu objetivo',
  'landing.how.step1.desc': 'Comienza con un objetivo simple. Usa Asistencia IA para redactar los pasos.',
  'landing.how.step2.title': '2. Visualiza e itera',
  'landing.how.step2.desc': 'Renderiza diagramas Mermaid, ajusta pasos y refina con sugerencias.',
  'landing.how.step3.title': '3. Genera artefactos',
  'landing.how.step3.desc': 'Produce PRDs por plataforma y un elevator pitch. Guárdalos para después.',
  'landing.cta.createFirst': 'Crea tu primer flujo',
  'landing.preview.title': 'Mira un flujo de ejemplo',
  'landing.preview.subtitle': 'Aquí tienes un ejemplo rápido de cómo podría verse tu flujo asistido por IA. Regístrate para generar, editar y guardar el tuyo.',
  'landing.preview.exampleTitle': 'Ejemplo: Clasificación de tickets de soporte',
  'landing.preview.step1': 'Detectar correo entrante y extraer campos clave (remitente, asunto, cuerpo).',
  'landing.preview.step2': 'La IA categoriza intención y urgencia; un humano revisa casos límite.',
  'landing.preview.step3': 'Redactar respuesta con IA; enrutar a la cola o escalar a un agente.',
  'landing.preview.step4': 'Registrar resolución y recopilar feedback para mejora continua.',
  'landing.preview.platformNote': 'Adaptado para {platform}',
  'landing.preview.yourProblem': 'Tu problema',
  'landing.preview.sketchTitle': 'Resumen en una línea',
  'landing.preview.sketchTemplate': 'La IA analiza y enruta “{problem}” para {platform}{domainSuffix}, redacta resultados y escala casos límite.',
  'landing.preview.sketchDomainSuffix': ' en {domain}',
  'landing.preview.signup': 'Registrarse para continuar',
  'landing.preview.signin': 'Iniciar sesión',
  'landing.preview.close': 'Cerrar',
  }
};

type I18nContextShape = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextShape>({
  lang: 'English',
  setLang: () => {},
  t: (k) => k,
});

export const I18nProvider: React.FC<{ initial?: Lang } & { children?: React.ReactNode }> = ({ initial = 'English', children }) => {
  const [lang, setLang] = useState<Lang>(initial);
  // Listen for profile-updated events so the provider can switch language immediately
  React.useEffect(() => {
    const onProfileUpdated = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail as { preferredLanguage?: Lang } | undefined;
        // Debug: log profile-updated events to help diagnose why language changes may not apply
        // eslint-disable-next-line no-console
        console.debug('[I18n] profile-updated event received', detail);
        if (detail && detail.preferredLanguage) {
          // eslint-disable-next-line no-console
          console.debug('[I18n] switching language to', detail.preferredLanguage);
          setLang(detail.preferredLanguage);
        }
      } catch (err) {
        // ignore
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('profile-updated', onProfileUpdated as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('profile-updated', onProfileUpdated as EventListener);
      }
    };
  }, []);
  const t = (key: string, vars?: Record<string, string | number>) => {
    const dict = resources[lang] || resources['English'];
    const raw = dict[key] ?? key;
    if (!vars) return raw;
    return Object.keys(vars).reduce((s, k) => s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(vars[k])), raw);
  };
  const value = useMemo(() => ({ lang, setLang, t }), [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useTranslation = () => useContext(I18nContext);

export default resources;
