import React, { createContext, useContext, useMemo, useState } from 'react';

export type Lang = 'English' | 'Spanish';

const resources: Record<string, Record<string, string>> = {
  English: {
    'app.title': 'AI Operator Hub',
    'nav.home': 'Home',
    'nav.training': 'Training',
    'nav.history': 'History',
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
  },
  Spanish: {
    'app.title': 'Centro de Operadores AI',
    'nav.home': 'Inicio',
    'nav.training': 'Entrenamiento',
    'nav.history': 'Historial',
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
