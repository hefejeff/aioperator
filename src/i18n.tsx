import React, { createContext, useContext, useMemo, useState } from 'react';

export type Lang = 'English' | 'Spanish';

const resources: Record<string, Record<string, string>> = {
  English: {
    // App and Navigation
    'app.title': 'Workflow Process Center',
    'nav.dashboard': 'Dashboard',
    'nav.training': 'Training',
    'nav.history': 'History',
    'nav.research': 'Research',
    'nav.library': 'Library',
    'nav.admin': 'Admin',
    'nav.home': 'Home',
    
    // Training View
    'training.title': 'Training Center',
    'training.subtitle': 'Explore and practice AI workflow automation scenarios',
    'training.filter': 'Filter by Domain',
    'training.createButton': 'Create New Workflow',
    'filter.all': 'All Domains',

    // Domain names
    'domain.Sales': 'Sales',
    'domain.HR': 'Human Resources',
    'domain.Finance': 'Finance',
    'domain.Operations': 'Operations',
    'domain.Logistics': 'Logistics',
    'domain.Healthcare': 'Healthcare',
    'domain.Manufacturing': 'Manufacturing',
    'domain.Legal': 'Legal',
    'domain.Procurement': 'Procurement',
    'domain.Marketing': 'Marketing',
    'domain.IT': 'IT',
    'domain.Customer Support': 'Customer Support',
    
    // Header Actions
    'header.editProfile': 'Edit Profile',
    'header.logout': 'Logout',
    'header.profile': 'Profile',
    'header.help': 'Help',
    
    // Dashboard
    'dashboard.title': 'Your Workflows',
    'dashboard.subtitle': 'Manage and monitor your AI automation pipelines',
    'dashboard.loading': 'Loading dashboard...',
    'dashboard.loadError': 'Failed to load dashboard data',
    'dashboard.filters': 'Filters',
    'dashboard.all': 'All',
    'dashboard.starred': 'Starred',
    'dashboard.yourCompanies': 'Your Companies',
    'dashboard.companiesDescription': 'Research and analyze companies for AI opportunities',
    'dashboard.newResearch': 'New Research',
    'dashboard.startResearchTitle': 'Start Company Research',
    'dashboard.startResearchDescription': 'Research companies and discover AI automation opportunities.',
    'dashboard.startNewResearch': 'Start New Research',
    'dashboard.scenarios': 'Scenarios',
    'dashboard.lastUpdated': 'Last Updated',
    'dashboard.noStarred': 'No Starred Workflows Yet',
    'dashboard.noStarredDesc': 'Star your favorite workflows to keep them organized and easily accessible.',
    'dashboard.noResearch': 'No research available',
    'dashboard.noWorkflows': 'Ready to Build Something Amazing?',
    'dashboard.noWorkflowsDesc': 'Create your first AI workflow and start automating your processes today.',
    'dashboard.createFirst': 'Create Your First Workflow',
    'dashboard.assistant.title': 'AI Workflow Assistant',
    'dashboard.assistant.description': 'Describe your challenge and let our AI help you design the perfect automation workflow.',
    'dashboard.form.domain': 'Domain',
    'dashboard.form.chooseDomain': 'Choose your domain...',
    'dashboard.form.title': 'Workflow Title',
    'dashboard.form.titlePlaceholder': 'Give your workflow a descriptive name',
    'dashboard.form.challenge': 'Your Challenge',
    'dashboard.form.challengePlaceholder': 'Describe the problem you\'re facing in detail...',
    'dashboard.form.goal': 'Success Goal',
    'dashboard.form.goalPlaceholder': 'What would success look like? What do you want to achieve?',
    'dashboard.form.clear': 'Clear Form',
    'dashboard.form.create': 'Create Workflow',
    'dashboard.form.creating': 'Creating...',
    'dashboard.form.generating': 'Generating...',
    
    // Workflow History and Details
    'dashboard.training': 'Training',
    'dashboard.workflowHistory': 'Workflow History',
    'dashboard.workflows': 'Workflows',
    'workflowDetail.untitled': 'Untitled Workflow',
    'dashboard.yesterday': 'Yesterday',
    'dashboard.today': 'Today',
    'dashboard.custom': 'Custom',
    
    // Workflow Detail
    'workflowDetail.problem': 'Problem Statement',
    'workflowDetail.workflow': 'Workflow Design',
    'workflowDetail.prd': 'Product Requirements',
    'workflowDetail.pitch': 'Value Proposition',
    'workflowDetail.evaluation': 'Evaluation',
    'workflowDetail.canvas': 'Canvas',
    'workflowDetail.team': 'Team',
    'workflowDetail.title': 'Title',
    'workflowDetail.problemDescription': 'Problem Description',
    'workflowDetail.target': 'Target Outcome',
    'workflowDetail.businessContext': 'Business Context',
    'workflowDetail.customerSegments': 'Customer Segments',
    'workflowDetail.valueProposition': 'Value Proposition',
    'workflowDetail.keyMetrics': 'Key Metrics',
    
    // Common UI Elements
    'common.close': 'Close',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    
    // Scenario Card
    'scenario.custom': 'Custom',
    'scenario.delete': 'Delete Scenario',
    'scenario.start': 'Start Scenario',
    'scenario.translate': 'Add Translation',
    'scenario.favorite': 'Favorite',
    'scenario.unfavorite': 'Unfavorite',
    'scenario.highScore': 'High Score',
    'scenario.avgScore': 'Avg Score',
    
    // Form Controls
    'form.title': 'Title',
    'form.description': 'Description',
    'form.goal': 'Goal',
    'form.domain': 'Domain',
    'form.optional': 'Optional',
    'form.titlePlaceholder': 'Enter a descriptive title for your workflow',
    'form.descriptionPlaceholder': 'Describe the current situation and challenges',
    'form.goalPlaceholder': 'What should be achieved with this workflow?',
    'form.currentWorkflow': 'Current Workflow',
    'form.uploadImage': 'Upload Image',
    'form.dragToUpload': 'Click or drag to upload',
    'form.imageTypes': 'PNG, JPG up to 5MB',
    'form.removeImage': 'Remove image',
    'form.preview': 'Preview',
    'form.selectDomain': 'Select Domain (optional)',
    'form.language': 'Language',
    'form.workflow.title': 'Create New Workflow',
    'form.workflow.edit': 'Edit Workflow',

    // Form Errors
    'form.error.required': 'All fields are required.',
    'form.error.saveFailed': 'Failed to save workflow. Please try again later.',
    'form.error.aiNonJson': 'AI returned non-JSON response; response placed in Description to edit.',
    'form.error.aiFailed': 'Failed to generate workflow. Check console for details.',
    
    // Research
    'research.title': 'Company Research',
    'research.searchPlaceholder': 'Enter company name...',
    'research.description': 'Search and analyze company information',
    'research.noResults': 'No results found',
    'research.searching': 'Searching...',
    'research.companyInfo': 'Company Information',
    'research.industry': 'Industry',
    'research.products': 'Products',
    'research.challenges': 'Challenges',
    'research.opportunities': 'Opportunities',
    'research.relatedScenarios': 'Related Scenarios',
    'research.marketPosition': 'Market Position',
    'research.competitors': 'Competitors',
    'research.aiUseCases': 'AI Use Cases',
    'research.aiAnalysis': 'AI Analysis',
    'research.currentAI': 'Current AI Implementation',
    'research.potentialAI': 'AI Potential',
    'research.aiRecommendations': 'AI Recommendations',
    'research.relevanceMatch': 'Match',
    'research.newResearch': 'New Research',
    'research.researchList': 'Company Research List',
    'research.clearCompany': 'Clear Research',
    'research.relevantOpportunities': 'Relevant Opportunities',
    'research.selectedScenarios': 'Selected Scenarios',
    'research.noSelectedScenarios': 'No scenarios selected yet',
    'research.addToSelected': 'Add to Selected',
    'research.removeFromSelected': 'Remove from Selected',
    'research.suggestSelected': 'Suggest Selected Scenarios',
    'research.noScenariosYet': 'No related scenarios yet',
    'research.searchCompanyFirst': 'Search for a company to see related scenarios',
    'research.suggested': 'Suggested',
    'research.findOpportunities': 'Find Opportunities',
    'research.suggestOpportunity': 'Suggest Opportunity',
    'research.viewScenario': 'View Scenario',
    'research.findOpportunitiesError': 'Failed to find opportunities',
    'research.companyNotFound': 'Company not found',
    'research.noResearchFound': 'No research found for this company',
    'research.failedToLoadResearch': 'Failed to load research data',
    'common.back': 'Back',

    // AI example generation
    'aiExample.button': 'AI Example',
    'aiExample.exampleProblem': 'Example Problem',
    'aiExample.useDescription': 'Use as Description',
    'aiExample.useTarget': 'Use as Target',
    'aiExample.useProblem': 'Use Example',
    'aiExample.clear': 'Clear',

    // Operator console
    'operator.back': 'Back',
    'operator.design': 'Proposed Flow',
    'operator.explain': 'Explain Your Proposed Workflow',
    'operator.visual': 'Proposed Visual Flow (Optional)',
    'operator.evaluate': 'Evaluate my Flow',
    'operator.feedback': 'Flow Feedback',
    'operator.historyTitle': 'Your History for this Scenario',
    'operator.uploadHint': 'Upload a screenshot of your workflow (e.g. from Miro, Figma).',
    'operator.selectImage': 'Select image',
    'operator.invalidImageAlert': 'Please upload a valid image file (PNG, JPG, etc.).',
    'operator.saveEvalFailed': 'Failed to save your evaluation. Check your connection and try again.',
    'operator.explainHelper': 'Describe your process steps, taking into account any existing flow image. Indicate which tasks are performed by AI and which require human intervention.',
    'operator.yourGoalLabel': 'Your goal:',
    'operator.yourScore': 'Your score',
    'operator.aiFeedback': 'AI Consultant Feedback:',
    'operator.aiAssist': 'AI Assist: explanation draft based on current flow',
    'operator.aiDiagramAssist': 'AI Assist: create diagram',
    'operator.previewTitle': 'Diagram preview',
    'operator.copyMermaid': 'Copy Mermaid',
    'operator.useAsImage': 'Use as image',
    'operator.refreshPreview': 'Refresh preview',
    'operator.noHistoryScenario': 'No history for this scenario yet. Submit a workflow to see your results here!'
  },
  'Spanish': {
    // App and Navigation
    'app.title': 'Centro de Operadores AI',
    'nav.dashboard': 'Tablero',
    'nav.training': 'Entrenamiento',
    'nav.history': 'Historial',
    'nav.research': 'Investigación',
    'nav.library': 'Biblioteca',
    'nav.admin': 'Administrador',
    'nav.home': 'Inicio',

    // Training View
    'training.title': 'Centro de Entrenamiento',
    'training.subtitle': 'Explora y practica escenarios de automatización de flujos de trabajo con IA',
    'training.filter': 'Filtrar por Dominio',
    'training.createButton': 'Crear Nuevo Flujo de Trabajo',
    'filter.all': 'Todos los Dominios',

    // Domain names
    'domain.Sales': 'Ventas',
    'domain.HR': 'Recursos Humanos',
    'domain.Finance': 'Finanzas',
    'domain.Operations': 'Operaciones',
    'domain.Logistics': 'Logística',
    'domain.Healthcare': 'Salud',
    'domain.Manufacturing': 'Manufactura',
    'domain.Legal': 'Legal',
    'domain.Procurement': 'Adquisiciones',
    'domain.Marketing': 'Marketing',
    'domain.IT': 'TI',
    'domain.Customer Support': 'Atención al Cliente',
    
    // Header Actions
    'header.editProfile': 'Editar Perfil',
    'header.logout': 'Cerrar Sesión',
    'header.profile': 'Perfil',
    'header.help': 'Ayuda',
    
    // Common UI Elements
    'common.close': 'Cerrar',
    'common.cancel': 'Cancelar',
    'common.save': 'Guardar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.search': 'Buscar',
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.success': 'Éxito',
    
    // Dashboard
    'dashboard.title': 'Tus Flujos de Trabajo',
    'dashboard.subtitle': 'Administra y monitorea tus pipelines de automatización con IA',
    'dashboard.loading': 'Cargando tablero...',
    'dashboard.loadError': 'Error al cargar datos del tablero',
    'dashboard.filters': 'Filtros',
    'dashboard.all': 'Todos',
    'dashboard.starred': 'Destacados',
    'dashboard.yourCompanies': 'Tus Empresas',
    'dashboard.companiesDescription': 'Investiga y analiza empresas para oportunidades de IA',
    'dashboard.newResearch': 'Nueva Investigación',
    'dashboard.startResearchTitle': 'Comenzar Investigación de Empresa',
    'dashboard.startResearchDescription': 'Investiga empresas y descubre oportunidades de automatización con IA.',
    'dashboard.startNewResearch': 'Comenzar Nueva Investigación',
    'dashboard.scenarios': 'Escenarios',
    'dashboard.lastUpdated': 'Última Actualización',
    'dashboard.noStarred': 'Sin Flujos de Trabajo Destacados',
    'dashboard.noStarredDesc': 'Destaca tus flujos de trabajo favoritos para mantenerlos organizados y fácilmente accesibles.',
    'dashboard.noWorkflows': '¿Listo para Crear Algo Increíble?',
    'dashboard.noWorkflowsDesc': 'Crea tu primer flujo de trabajo con IA y comienza a automatizar tus procesos hoy.',
    'dashboard.createFirst': 'Crea Tu Primer Flujo de Trabajo',
    'dashboard.assistant.title': 'Asistente de Flujo de Trabajo IA',
    'dashboard.assistant.description': 'Describe tu desafío y deja que nuestra IA te ayude a diseñar el flujo de trabajo perfecto.',
    'dashboard.form.domain': 'Dominio',
    'dashboard.form.chooseDomain': 'Elige tu dominio...',
    'dashboard.form.title': 'Título del Flujo de Trabajo',
    'dashboard.form.titlePlaceholder': 'Da un nombre descriptivo a tu flujo de trabajo',
    'dashboard.form.challenge': 'Tu Desafío',
    'dashboard.form.challengePlaceholder': 'Describe el problema que enfrentas en detalle...',
    'dashboard.form.goal': 'Objetivo de Éxito',
    'dashboard.form.goalPlaceholder': '¿Cómo se vería el éxito? ¿Qué quieres lograr?',
    'dashboard.form.clear': 'Limpiar Formulario',
    'dashboard.form.create': 'Crear Flujo de Trabajo',
    'dashboard.form.creating': 'Creando...',
    'dashboard.form.generating': 'Generando...',
    
    // Workflow History and Details
    'dashboard.training': 'Entrenamiento',
    'dashboard.workflowHistory': 'Historial de Flujos de Trabajo',
    'dashboard.workflows': 'Flujos de Trabajo',
    'workflowDetail.untitled': 'Flujo de Trabajo Sin Título',
    'dashboard.yesterday': 'Ayer',
    'dashboard.today': 'Hoy',
    'dashboard.custom': 'Personalizado',
    
    // Workflow Detail
    'workflowDetail.problem': 'Planteamiento del Problema',
    'workflowDetail.workflow': 'Diseño del Flujo de Trabajo',
    'workflowDetail.prd': 'Requerimientos del Producto',
    'workflowDetail.pitch': 'Propuesta de Valor',
    'workflowDetail.evaluation': 'Evaluación',
    'workflowDetail.canvas': 'Lienzo',
    'workflowDetail.team': 'Equipo',
    'workflowDetail.title': 'Título',
    'workflowDetail.problemDescription': 'Descripción del Problema',
    'workflowDetail.target': 'Objetivo Final',
    'workflowDetail.businessContext': 'Contexto Empresarial',
    'workflowDetail.customerSegments': 'Segmentos de Clientes',
    'workflowDetail.valueProposition': 'Propuesta de Valor',
    'workflowDetail.keyMetrics': 'Métricas Clave',
    
    // Scenario Card
    'scenario.custom': 'Personalizado',
    'scenario.delete': 'Eliminar Escenario',
    'scenario.start': 'Comenzar Escenario',
    'scenario.translate': 'Agregar Traducción',
    'scenario.favorite': 'Favorito',
    'scenario.unfavorite': 'Quitar de Favoritos',
    'scenario.highScore': 'Puntuación Máxima',
    'scenario.avgScore': 'Puntuación Promedio',
    
    // Form Controls
    'form.title': 'Título',
    'form.description': 'Descripción',
    'form.goal': 'Objetivo',
    'form.domain': 'Dominio',
    'form.optional': 'Opcional',
    'form.titlePlaceholder': 'Ingresa un título descriptivo para tu flujo de trabajo',
    'form.descriptionPlaceholder': 'Describe la situación actual y los desafíos',
    'form.goalPlaceholder': '¿Qué se debe lograr con este flujo de trabajo?',
    'form.currentWorkflow': 'Flujo de Trabajo Actual',
    'form.uploadImage': 'Subir Imagen',
    'form.dragToUpload': 'Haz clic o arrastra para subir',
    'form.imageTypes': 'PNG, JPG hasta 5MB',
    'form.removeImage': 'Eliminar imagen',
    'form.preview': 'Vista previa',
    'form.selectDomain': 'Seleccionar Dominio (opcional)',
    'form.language': 'Idioma',
    'form.workflow.title': 'Crear Nuevo Flujo de Trabajo',
    'form.workflow.edit': 'Editar Flujo de Trabajo',
    
    // Research 
    'research.title': 'Investigación de Empresas',
    'research.searchPlaceholder': 'Ingrese nombre de la empresa...',
    'research.description': 'Buscar y analizar información de empresas',
    'research.noResults': 'No se encontraron resultados',
    'research.searching': 'Buscando...',
    'research.companyInfo': 'Información de la Empresa',
    'research.industry': 'Industria',
    'research.products': 'Productos',
    'research.challenges': 'Desafíos',
    'research.opportunities': 'Oportunidades', 
    'research.relatedScenarios': 'Escenarios Relacionados',
    'research.marketPosition': 'Posición en el Mercado',
    'research.competitors': 'Competidores',
    'research.aiUseCases': 'Casos de Uso de IA',
    'research.aiAnalysis': 'Análisis de IA',
    'research.currentAI': 'Implementación Actual de IA',
    'research.potentialAI': 'Potencial de IA',
    'research.aiRecommendations': 'Recomendaciones de IA',
    'research.relevanceMatch': 'Coincidencia',
    'research.newResearch': 'Nueva Investigación',
    'research.researchList': 'Lista de Empresas Investigadas',
    'research.clearCompany': 'Limpiar Investigación',
    'research.relevantOpportunities': 'Oportunidades Relevantes',
    'research.selectedScenarios': 'Escenarios Seleccionados',
    'research.noSelectedScenarios': 'Aún no hay escenarios seleccionados',
    'research.addToSelected': 'Agregar a Seleccionados',
    'research.removeFromSelected': 'Quitar de Seleccionados',
    'research.suggestSelected': 'Sugerir Escenarios Seleccionados',
    'research.noScenariosYet': 'Aún no hay escenarios relacionados',
    'research.searchCompanyFirst': 'Busca una empresa para ver escenarios relacionados',
    'research.suggested': 'Sugerido',
    'research.findOpportunities': 'Buscar Oportunidades',
    'research.suggestOpportunity': 'Sugerir Oportunidad',
    'research.viewScenario': 'Ver Escenario',
    'research.findOpportunitiesError': 'Error al buscar oportunidades',
    'research.companyNotFound': 'Empresa no encontrada',
    'research.noResearchFound': 'No se encontró investigación para esta empresa',
    'research.failedToLoadResearch': 'Error al cargar los datos de investigación',
    'common.back': 'Volver',

        // Form Errors
    'form.error.required': 'Todos los campos son obligatorios.',
    'form.error.saveFailed': 'No se pudo guardar el flujo de trabajo. Intenta de nuevo más tarde.',
    'form.error.aiNonJson': 'La IA devolvió una respuesta no JSON; la respuesta se colocó en Descripción para editarla.',
    'form.error.aiFailed': 'No se pudo generar el flujo de trabajo. Revisa la consola para más detalles.',

    // AI example generation
    'aiExample.button': 'Ejemplo IA',
    'aiExample.exampleProblem': 'Problema de Ejemplo',
    'aiExample.useDescription': 'Usar como Descripción',
    'aiExample.useTarget': 'Usar como Objetivo',
    'aiExample.useProblem': 'Usar Ejemplo',
    'aiExample.clear': 'Limpiar',

    // Operator console
    'operator.back': 'Atrás',
    'operator.design': 'Flujo Propuesto',
    'operator.explain': 'Explica Tu Flujo de Trabajo Propuesto',
    'operator.visual': 'Flujo Visual Propuesto (Opcional)',
    'operator.evaluate': 'Evaluar mi Flujo',
    'operator.feedback': 'Comentarios del Flujo',
    'operator.historyTitle': 'Tu Historial para este Escenario',
    'operator.uploadHint': 'Sube una captura de pantalla de tu flujo de trabajo (por ejemplo, desde Miro, Figma).',
    'operator.selectImage': 'Seleccionar imagen',
    'operator.invalidImageAlert': 'Por favor sube un archivo de imagen válido (PNG, JPG, etc.).',
    'operator.saveEvalFailed': 'No se pudo guardar tu evaluación. Revisa tu conexión e inténtalo de nuevo.',
    'operator.explainHelper': 'Describe los pasos de tu proceso, teniendo en cuenta cualquier imagen de flujo existente. Indica qué tareas realiza la IA y cuáles requieren intervención humana.',
    'operator.yourGoalLabel': 'Tu objetivo:',
    'operator.yourScore': 'Tu puntuación',
    'operator.aiFeedback': 'Comentarios del Consultor IA:',
    'operator.aiAssist': 'Asistencia IA: borrador de explicación basado en el flujo actual',
    'operator.aiDiagramAssist': 'Asistencia IA: crear diagrama',
    'operator.previewTitle': 'Vista previa del diagrama',
    'operator.copyMermaid': 'Copiar Mermaid',
    'operator.useAsImage': 'Usar como imagen',
    'operator.refreshPreview': 'Actualizar vista previa',
    'operator.noHistoryScenario': 'No hay historial para este escenario todavía. ¡Envía un flujo de trabajo para ver tus resultados aquí!'
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
        if (detail && detail.preferredLanguage) {
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