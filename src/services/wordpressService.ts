/**
 * WordPress REST API Service
 * Creates pages in WordPress using the Divi theme with structured content
 */

const WP_BASE_URL = import.meta.env.VITE_WP_BASE_URL || '';
const WP_USERNAME = import.meta.env.VITE_WP_USERNAME || '';
const WP_APP_PASSWORD = import.meta.env.VITE_WP_APP_PASSWORD || '';
const WP_DEFAULT_AUTHOR_ID = import.meta.env.VITE_WP_DEFAULT_AUTHOR_ID || '1';

// Extended solution interface that includes PRD and value proposition data
interface SolutionDetails {
  title: string;
  description: string;          // Workflow explanation
  impactScore: number;          // Evaluation score
  keyBenefit: string;           // Scenario goal (value proposition)
  prdSummary?: string;          // Extracted from PRD markdown
  prdKeyFeatures?: string[];    // Key features from PRD
  valueProposition?: string;    // Pitch/elevator pitch content
  // Full content for tabs
  problemStatement?: string;    // Scenario description / problem being solved
  prdMarkdown?: string;         // Full PRD markdown content
  pitchMarkdown?: string;       // Full pitch/value proposition markdown
}

interface DiviPageContent {
  // Company basics
  companyName: string;
  industry: string;
  description: string;
  marketPosition: string;
  
  // Company research details
  challenges: string[];
  opportunities?: string[];
  products?: string[];
  competitors?: string[];
  
  // AI relevance from research
  aiRelevance?: {
    current: string;
    potential: string;
    recommendations: string[];
  };
  
  // Scenario solutions with PRD/value prop details
  solutions: SolutionDetails[];
}

interface WordPressPageResponse {
  id: number;
  link: string;
  title: { rendered: string };
  status: string;
}

/**
 * West Monroe Brand-Aligned Divi Components
 * 
 * Brand Colors (from BRANDING.md):
 * - Grounded Blue: #000033 (Primary text, logos, key graphic elements)
 * - White: #FFFFFF (Backgrounds, negative space, reverse text)
 * - Highlight Yellow: #F2E800 (Strictly for highlight graphic to spotlight impactful words)
 * - Accent Blue: #0045FF (Emphasize primary subheads, key phrases, text)
 * - Accent Pink: #F500A0 (Emphasize select primary subheads, stats, numbered lists)
 * - Support Neutral: #CBD2DA (Organizing content, backgrounds for charts or call-outs)
 * 
 * Typography:
 * - Primary Font: Arial (Bold for headlines, Regular for body)
 * - Voice: Clear, Human, Direct, Helpful, Confident
 */

// West Monroe Brand Colors
const BRAND_COLORS = {
  groundedBlue: '#000033',
  white: '#FFFFFF',
  highlightYellow: '#F2E800',
  accentBlue: '#0045FF',
  accentPink: '#F500A0',
  supportNeutral: '#CBD2DA',
};

// Default image URL
const DEFAULT_IMAGE_URL = "https://jeffw75.sg-host.com/wp-content/uploads/2025/12/adobestock_391342632-scaled.jpeg";
const DEFAULT_IMAGE_TITLE = "team of businessmen talking and looking at documents while walking along the office corridor";

// ============================================
// Module Components (West Monroe Brand Styling)
// Typography: Arial | Colors: Grounded Blue #000033, Accent Blue #0045FF
// ============================================

// Heading H1 - Bold headline in Grounded Blue
function createHeadingH1(title: string): string {
  return `[et_pb_heading title="${title}" _builder_version="4.27.4" _module_preset="default" title_font="Arial|700|||||||" title_text_color="${BRAND_COLORS.groundedBlue}" title_font_size="48px" title_line_height="1.2em" title_font_size_tablet="36px" title_font_size_phone="28px" title_font_size_last_edited="on|phone" global_colors_info="{}"][/et_pb_heading]`;
}

// Heading H2 with West Monroe highlight effect (Highlight Yellow #F2E800)
function createHeadingH2Highlight(title: string): string {
  return `[et_pb_heading title="${title}" module_class="wm-highlight" _builder_version="4.27.4" _module_preset="default" title_level="h2" title_font="Arial|700|||||||" title_text_color="${BRAND_COLORS.groundedBlue}" title_font_size="36px" use_background_color_gradient="on" background_color_gradient_direction="90deg" background_color_gradient_stops="${BRAND_COLORS.highlightYellow} 0%|rgba(242,232,0,0.3) 100%" custom_css_free_form=".selector {||  display: inline-block;||background: linear-gradient(||  to right,||  ${BRAND_COLORS.highlightYellow} 0%,||  ${BRAND_COLORS.highlightYellow} 75%,||  transparent 75%,||  transparent 100%||);||background-size: 100% 50%;||background-position: 0 70%;||background-repeat: no-repeat;||padding: 0 .2em;||}" global_colors_info="{}"][/et_pb_heading]`;
}

// Section Heading H2 - Arial Bold, Grounded Blue, centered
function createSectionHeadingH2(title: string): string {
  return `[et_pb_heading title="${title}" _builder_version="4.27.4" _module_preset="default" title_level="h2" title_font="Arial|700|||||||" title_text_align="center" title_text_color="${BRAND_COLORS.groundedBlue}" title_font_size="42px" title_line_height="1.2em" custom_margin="||20px||false|false" title_font_size_tablet="32px" title_font_size_phone="24px" title_font_size_last_edited="on|phone" global_colors_info="{}"][/et_pb_heading]`;
}

// Subhead H3 - Arial Bold, Accent Blue for emphasis
function createHeadingH3(title: string): string {
  return `[et_pb_heading title="${title}" _builder_version="4.27.4" _module_preset="default" title_level="h3" title_font="Arial|700|||||||" title_text_color="${BRAND_COLORS.accentBlue}" title_font_size="28px" title_line_height="1.3em" custom_margin="||15px||false|false" title_font_size_tablet="24px" title_font_size_phone="20px" title_font_size_last_edited="on|phone" global_colors_info="{}"][/et_pb_heading]`;
}

// Small H5 Heading - Arial Bold, Grounded Blue
function createHeadingH5(title: string): string {
  return `[et_pb_heading title="${title}" _builder_version="4.27.4" _module_preset="default" title_level="h5" title_font="Arial|700|||||||" title_text_color="${BRAND_COLORS.groundedBlue}" title_font_size="18px" title_line_height="1.4em" custom_margin="||10px||false|false" title_font_size_tablet="16px" title_font_size_phone="14px" title_font_size_last_edited="on|phone" global_colors_info="{}"][/et_pb_heading]`;
}

// Image Module
function createImage(src: string = DEFAULT_IMAGE_URL, titleText: string = DEFAULT_IMAGE_TITLE): string {
  return `[et_pb_image src="${src}" title_text="${titleText}" _builder_version="4.27.4" _module_preset="default" transform_origin="100%|100%" global_colors_info="{}"][/et_pb_image]`;
}

// Text Module - Arial Regular, Grounded Blue text
function createTextModule(content: string): string {
  return `[et_pb_text _builder_version="4.27.4" _module_preset="default" text_font="Arial||||||||" text_text_color="${BRAND_COLORS.groundedBlue}" text_font_size="16px" text_line_height="1.75em" link_text_color="${BRAND_COLORS.accentBlue}" global_colors_info="{}"]${content}[/et_pb_text]`;
}

// Simple Text Module (minimal styling)
function createSimpleText(content: string): string {
  return `[et_pb_text _builder_version="4.27.4" _module_preset="default" text_font="Arial||||||||" text_text_color="${BRAND_COLORS.groundedBlue}" global_colors_info="{}"]${content}[/et_pb_text]`;
}

// Divider Module
function createDivider(): string {
  return `[et_pb_divider show_divider="on" divider_color="${BRAND_COLORS.supportNeutral}" _builder_version="4.27.4" _module_preset="default" height="2px" custom_margin="20px||20px||true|false" global_colors_info="{}"][/et_pb_divider]`;
}

// Circle Counter - Accent Pink for stats emphasis
function createCircleCounter(title: string, number: number): string {
  return `[et_pb_circle_counter title="${title}" number="${number}" _builder_version="4.27.4" _module_preset="default" title_font="Arial|700|||||||" title_text_color="${BRAND_COLORS.groundedBlue}" number_font="Arial|700|||||||" number_text_color="${BRAND_COLORS.accentPink}" circle_color="${BRAND_COLORS.accentPink}" circle_color_alpha="0.2" global_colors_info="{}"][/et_pb_circle_counter]`;
}

// Button Module - Accent Blue background, white text, clean modern style
function createButton(text: string, url: string = "#"): string {
  return `[et_pb_button button_text="${text}" button_url="${url}" _builder_version="4.27.4" _module_preset="default" custom_button="on" button_text_size="16px" button_text_color="${BRAND_COLORS.white}" button_bg_color="${BRAND_COLORS.accentBlue}" button_border_width="0px" button_border_radius="4px" button_font="Arial|700|||||||" custom_padding="14px|28px|14px|28px|true|true" global_colors_info="{}"][/et_pb_button]`;
}

// ============================================
// Row Components
// ============================================

// Basic Row with 1_2,1_2 columns - Based on template ID 67 (Basic Layout 2 Row 1)
function createTwoColumnRow(leftContent: string, rightContent: string): string {
  return `[et_pb_row column_structure="1_2,1_2" _builder_version="4.27.4" _module_preset="default" global_colors_info="{}"][et_pb_column type="1_2" _builder_version="4.27.4" _module_preset="default" global_colors_info="{}"]${leftContent}[/et_pb_column][et_pb_column type="1_2" _builder_version="4.27.4" _module_preset="default" global_colors_info="{}"]${rightContent}[/et_pb_column][/et_pb_row]`;
}

// Full-width row with single column
function createFullWidthRow(content: string): string {
  return `[et_pb_row _builder_version="4.18.0" _module_preset="5138c454-be54-4233-bd3b-f8e6a8747976" global_colors_info="{}"][et_pb_column type="4_4" _builder_version="4.18.0" _module_preset="73121f80-a3ef-4484-8763-c3f18e3c56d2" global_colors_info="{}"]${content}[/et_pb_column][/et_pb_row]`;
}

// Four-column row - Based on template ID 71 section (Scenarios row)
function createFourColumnRow(col1: string, col2: string, col3: string, col4: string): string {
  return `[et_pb_row column_structure="1_4,1_4,1_4,1_4" _builder_version="4.27.4" _module_preset="default" global_colors_info="{}"][et_pb_column type="1_4" _builder_version="4.27.4" _module_preset="default" global_colors_info="{}"]${col1}[/et_pb_column][et_pb_column type="1_4" _builder_version="4.27.4" _module_preset="default" global_colors_info="{}"]${col2}[/et_pb_column][et_pb_column type="1_4" _builder_version="4.27.4" _module_preset="default" global_colors_info="{}"]${col3}[/et_pb_column][et_pb_column type="1_4" _builder_version="4.27.4" _module_preset="default" global_colors_info="{}"]${col4}[/et_pb_column][/et_pb_row]`;
}

// ============================================
// Section Components (West Monroe Brand Styling)
// ============================================

// Default Section wrapper - White background
function createSection(content: string, bgColor: string = ""): string {
  const bgAttr = bgColor ? ` background_color="${bgColor}"` : ` background_color="${BRAND_COLORS.white}"`;
  return `[et_pb_section fb_built="1" _builder_version="4.27.4" _module_preset="default"${bgAttr} global_colors_info="{}"]${content}[/et_pb_section]`;
}

// Accent Section - Support Neutral background for call-outs and organizing content
function createTimelineSection(content: string): string {
  return `[et_pb_section fb_built="1" admin_label="Accent Section" _builder_version="4.27.4" _module_preset="default" background_color="${BRAND_COLORS.supportNeutral}" global_colors_info="{}"]${content}[/et_pb_section]`;
}

// Dark Section - Grounded Blue background with white text
function createDarkSection(content: string): string {
  return `[et_pb_section fb_built="1" admin_label="Dark Section" _builder_version="4.27.4" _module_preset="default" background_color="${BRAND_COLORS.groundedBlue}" global_colors_info="{}"]${content}[/et_pb_section]`;
}

// Features Section
function createFeaturesSection(content: string): string {
  return `[et_pb_section fb_built="1" admin_label="Features" _builder_version="4.27.4" _module_preset="default" background_color="${BRAND_COLORS.white}" global_colors_info="{}"]${content}[/et_pb_section]`;
}

// ============================================
// Composite Components
// ============================================

// Hero Section - Based on Basic Layout 2 Section 1 (ID 65)
function createHeroSection(titleH1: string, titleH2: string, imageSrc: string = DEFAULT_IMAGE_URL): string {
  const leftContent = createHeadingH1(titleH1) + createHeadingH2Highlight(titleH2);
  const rightContent = createImage(imageSrc);
  return createSection(createTwoColumnRow(leftContent, rightContent));
}

// Scenario Card (for 4-column layouts) - Based on Section 3 pattern
function createScenarioCard(title: string, description: string, score: number): string {
  return createSimpleText(`<h3>${title}</h3>`) + 
         createSimpleText(`<p>${description}</p>`) + 
         createCircleCounter("Impact Score", score);
}

// Feature Card with Image - Based on Section 6 pattern (ID 80)
function createFeatureCard(title: string, subtitle: string, description: string, buttonText: string, imageSrc: string = DEFAULT_IMAGE_URL): string {
  const imageContent = createImage(imageSrc);
  const textContent = createHeadingH5(title) + 
                      createSectionHeadingH2(subtitle) + 
                      createTextModule(`<p>${description}</p>`) + 
                      createButton(buttonText);
  return createTwoColumnRow(imageContent, textContent);
}

// ============================================
// Tabbed Scenario Row Component
// Based on Scenario Row template with tabs for each scenario
// Tabs: Problem Statement, Proposed Workflow Design, Project Requirements Doc, Value Proposition
// ============================================

/**
 * Convert markdown to basic HTML for Divi content
 * Handles headers, paragraphs, lists, bold, italic
 */
function markdownToHtml(markdown: string): string {
  if (!markdown) return '<p>Content not available.</p>';
  
  let html = markdown
    // Escape HTML entities first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers (must come before other processing)
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    // Bold and italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Unordered lists
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Line breaks and paragraphs
    .replace(/\n\n+/g, '</p><p>')
    .replace(/\n/g, '<br/>');
  
  // Wrap consecutive <li> elements in <ul>
  html = html.replace(/(<li>.*?<\/li>)(?:<br\/>)?/g, '$1');
  html = html.replace(/(<li>[\s\S]*?<\/li>)+/g, '<ul>$&</ul>');
  
  // Wrap in paragraph if not already
  if (!html.startsWith('<h') && !html.startsWith('<ul') && !html.startsWith('<p>')) {
    html = '<p>' + html + '</p>';
  }
  
  return html;
}

/**
 * Create a single tab for the scenario tabs module
 * Uses West Monroe brand styling
 */
function createTab(title: string, content: string): string {
  return `[et_pb_tab title="${title}" _builder_version="4.27.4" _module_preset="default" body_font="Arial||||||||" body_text_color="${BRAND_COLORS.groundedBlue}" body_font_size="16px" body_line_height="1.6em" theme_builder_area="post_content"]${content}[/et_pb_tab]`;
}

/**
 * Create the tabs module with all four scenario tabs
 * Uses West Monroe brand styling - Accent Blue active tab
 */
function createScenarioTabs(
  problemStatement: string,
  workflowDesign: string,
  prdContent: string,
  valueProposition: string
): string {
  const tabs = [
    createTab("Problem Statement", problemStatement),
    createTab("Proposed Workflow Design", workflowDesign),
    createTab("Project Requirements Doc", prdContent),
    createTab("Value Proposition", valueProposition)
  ].join('');
  
  return `[et_pb_tabs _builder_version="4.27.4" _module_preset="default" tab_font="Arial|700|||||||" tab_text_color="${BRAND_COLORS.groundedBlue}" active_tab_background_color="${BRAND_COLORS.accentBlue}" active_tab_text_color="${BRAND_COLORS.white}" inactive_tab_background_color="${BRAND_COLORS.supportNeutral}" tab_font_size="14px" theme_builder_area="post_content"]${tabs}[/et_pb_tabs]`;
}

/**
 * Create a scenario row with heading and tabbed content
 * Based on Scenario Row template (ID 187)
 * Uses West Monroe brand styling - Arial Bold, Accent Blue for scenario titles
 */
function createScenarioRowWithTabs(
  scenarioTitle: string,
  problemStatement: string,
  workflowDesign: string,
  prdContent: string,
  valueProposition: string
): string {
  const heading = `[et_pb_heading title="${scenarioTitle}" _builder_version="4.27.4" _module_preset="default" title_level="h3" title_font="Arial|700|||||||" title_text_color="${BRAND_COLORS.accentBlue}" title_font_size="28px" custom_margin="||15px||false|false" theme_builder_area="post_content"][/et_pb_heading]`;
  const tabs = createScenarioTabs(problemStatement, workflowDesign, prdContent, valueProposition);
  
  return `[et_pb_row _builder_version="4.27.4" _module_preset="default" custom_padding="40px||40px||true|false" theme_builder_area="post_content"][et_pb_column _builder_version="4.27.4" _module_preset="default" type="4_4" theme_builder_area="post_content"]${heading}${tabs}[/et_pb_column][/et_pb_row]`;
}

/**
 * Create the full scenarios section with tabbed rows for each solution
 * Uses West Monroe brand styling - white background for clean presentation
 */
function createScenariosSectionWithTabs(solutions: SolutionDetails[]): string {
  if (!solutions || solutions.length === 0) return '';
  
  const rows = solutions.map((solution, index) => {
    // Problem Statement - use problemStatement or fall back to description
    const problemContent = markdownToHtml(
      solution.problemStatement || 
      solution.keyBenefit || 
      `This scenario addresses key challenges and opportunities for automation.`
    );
    
    // Proposed Workflow Design - use the workflow explanation
    const workflowContent = markdownToHtml(
      solution.description || 
      'Workflow design details are being developed.'
    );
    
    // Project Requirements Doc - use full PRD markdown or summary
    const prdContent = markdownToHtml(
      solution.prdMarkdown || 
      (solution.prdSummary ? `<p><strong>Summary:</strong> ${solution.prdSummary}</p>` + 
        (solution.prdKeyFeatures?.length ? `<p><strong>Key Features:</strong></p><ul>${solution.prdKeyFeatures.map(f => `<li>${f}</li>`).join('')}</ul>` : '') 
        : 'Project requirements documentation is being developed.')
    );
    
    // Value Proposition - use full pitch markdown or extracted value prop
    const valueContent = markdownToHtml(
      solution.pitchMarkdown || 
      solution.valueProposition || 
      solution.keyBenefit ||
      'Value proposition details are being developed.'
    );
    
    return createScenarioRowWithTabs(
      `Scenario ${index + 1}: ${solution.title}`,
      problemContent,
      workflowContent,
      prdContent,
      valueContent
    );
  }).join('');
  
  // Section with white background and proper padding
  return `[et_pb_section fb_built="1" admin_label="AI Scenarios" _builder_version="4.27.4" _module_preset="default" background_color="${BRAND_COLORS.white}" custom_padding="60px||60px||true|false" theme_builder_area="post_content"]${rows}[/et_pb_section]`;
}

/**
 * Generate Divi Builder shortcode content for a company landing page
 * Dynamically selects components based on available content
 * Uses Basic Layout 2 structure from wp_templates/basic_Layout.json
 * 
 * Includes:
 * - Company research (description, industry, market position, products, competitors)
 * - AI opportunities (current usage, potential, recommendations)
 * - Selected scenarios with PRD details and value propositions
 */
function generateDiviContent(content: DiviPageContent): string {
  const { 
    companyName, 
    industry, 
    description, 
    marketPosition, 
    challenges, 
    opportunities,
    products,
    competitors,
    aiRelevance,
    solutions 
  } = content;
  
  const sections: string[] = [];

  // ============================================
  // Section 1: Hero Section (Always included)
  // Based on ID 65 - Two column layout with headline + image
  // ============================================
  const heroSection = createHeroSection(
    `AI Solutions for ${companyName}`,
    `Transforming ${industry} with Intelligent Automation`
  );
  sections.push(heroSection);

  // ============================================
  // Section 2: Company Overview
  // Include description and market position from research
  // ============================================
  if (description || marketPosition) {
    const overviewParts: string[] = [];
    if (description) {
      overviewParts.push(`<p style="text-align: center;">${description}</p>`);
    }
    if (marketPosition) {
      overviewParts.push(`<p style="text-align: center;"><strong>Market Position:</strong> ${marketPosition}</p>`);
    }
    const overviewContent = createFullWidthRow(
      createSectionHeadingH2("About " + companyName) +
      createTextModule(overviewParts.join(''))
    );
    sections.push(createTimelineSection(overviewContent));
  }

  // ============================================
  // Section 3: Products & Services
  // Only include if products array has items
  // ============================================
  if (products && products.length > 0) {
    const productsList = products.slice(0, 6).map(p => `<li>${p}</li>`).join('');
    const productsContent = createFullWidthRow(
      createSectionHeadingH2("Products & Services") +
      createTextModule(`<ul style="text-align: left; max-width: 800px; margin: 0 auto;">${productsList}</ul>`)
    );
    sections.push(createSection(productsContent));
  }

  // ============================================
  // Section 4: Industry Challenges
  // Only include if challenges array has items
  // ============================================
  if (challenges && challenges.length > 0) {
    const numChallenges = Math.min(challenges.length, 4);
    
    if (numChallenges <= 2) {
      const challengeCards = challenges.slice(0, 2).map((challenge, idx) => 
        createScenarioCard(`Challenge ${idx + 1}`, challenge, 75 - (idx * 10))
      );
      const challengesContent = createFullWidthRow(createSectionHeadingH2("Key Industry Challenges")) +
        (numChallenges === 1 ? createFullWidthRow(challengeCards[0]) : createTwoColumnRow(challengeCards[0], challengeCards[1]));
      sections.push(createSection(challengesContent));
    } else {
      const scenarioCards = challenges.slice(0, 4).map((challenge, index) => 
        createScenarioCard(`Challenge ${index + 1}`, challenge, 75 - (index * 10))
      );
      while (scenarioCards.length < 4) scenarioCards.push('');
      const challengesContent = createFullWidthRow(createSectionHeadingH2("Key Industry Challenges")) +
        createFourColumnRow(scenarioCards[0], scenarioCards[1], scenarioCards[2], scenarioCards[3]);
      sections.push(createSection(challengesContent));
    }
  }

  // ============================================
  // Section 5: Growth Opportunities
  // Only include if opportunities array has items
  // ============================================
  if (opportunities && opportunities.length > 0) {
    const opportunitiesList = opportunities.slice(0, 4).map(o => `<li style="margin-bottom: 8px;">${o}</li>`).join('');
    const opportunitiesContent = createFullWidthRow(
      createSectionHeadingH2("Growth Opportunities") +
      createTextModule(`<ul style="text-align: left; max-width: 800px; margin: 0 auto; list-style-type: disc;">${opportunitiesList}</ul>`)
    );
    sections.push(createTimelineSection(opportunitiesContent));
  }

  // ============================================
  // Section 6: Competitive Landscape
  // Only include if competitors array has items
  // ============================================
  if (competitors && competitors.length > 0) {
    const competitorsList = competitors.slice(0, 5).map(c => `<span style="display: inline-block; background: ${BRAND_COLORS.supportNeutral}; color: ${BRAND_COLORS.groundedBlue}; padding: 8px 16px; margin: 4px; border-radius: 20px; font-family: Arial, sans-serif;">${c}</span>`).join(' ');
    const competitorsContent = createFullWidthRow(
      createSectionHeadingH2("Competitive Landscape") +
      createTextModule(`<div style="text-align: center;">${competitorsList}</div>`)
    );
    sections.push(createSection(competitorsContent));
  }

  // ============================================
  // Section 7: AI Readiness & Potential
  // Only include if aiRelevance data exists
  // ============================================
  if (aiRelevance && (aiRelevance.current || aiRelevance.potential || aiRelevance.recommendations?.length)) {
    const aiParts: string[] = [];
    
    if (aiRelevance.current) {
      aiParts.push(`<p><strong>Current AI Usage:</strong> ${aiRelevance.current}</p>`);
    }
    if (aiRelevance.potential) {
      aiParts.push(`<p><strong>AI Potential:</strong> ${aiRelevance.potential}</p>`);
    }
    if (aiRelevance.recommendations && aiRelevance.recommendations.length > 0) {
      const recsList = aiRelevance.recommendations.slice(0, 3).map(r => `<li>${r}</li>`).join('');
      aiParts.push(`<p><strong>Recommendations:</strong></p><ul>${recsList}</ul>`);
    }
    
    const aiContent = createFullWidthRow(
      createSectionHeadingH2("AI Readiness Assessment") +
      createTextModule(`<div style="text-align: left; max-width: 800px; margin: 0 auto;">${aiParts.join('')}</div>`)
    );
    sections.push(createTimelineSection(aiContent));
  }

  // ============================================
  // Section 8: Proposed Solutions with Tabbed Content
  // Uses the new Scenario Row template with tabs for each solution
  // Tabs: Problem Statement, Proposed Workflow Design, Project Requirements Doc, Value Proposition
  // ============================================
  if (solutions && solutions.length > 0) {
    // Add section header
    const solutionsHeader = createSection(createFullWidthRow(
      createSectionHeadingH2("Proposed AI Solutions") +
      createTextModule(`<p style="text-align: center;">Tailored automation solutions for ${companyName}'s unique needs. Click on each tab to explore the details.</p>`)
    ));
    sections.push(solutionsHeader);
    
    // Add tabbed scenario section with full content for each solution
    const scenariosSection = createScenariosSectionWithTabs(solutions);
    sections.push(scenariosSection);
  }

  // ============================================
  // Section 9: Impact Metrics
  // Only include if solutions have impact scores
  // ============================================
  const solutionsWithScores = solutions?.filter(s => s.impactScore && s.impactScore > 0) || [];
  if (solutionsWithScores.length > 0) {
    const numMetrics = Math.min(solutionsWithScores.length, 4);
    const metricsHeader = createFullWidthRow(createSectionHeadingH2("Expected Business Impact"));
    
    if (numMetrics === 1) {
      const metric = createCircleCounter(solutionsWithScores[0].title, solutionsWithScores[0].impactScore);
      sections.push(createTimelineSection(metricsHeader + createFullWidthRow(metric)));
    } else if (numMetrics === 2) {
      const metric1 = createCircleCounter(solutionsWithScores[0].title, solutionsWithScores[0].impactScore);
      const metric2 = createCircleCounter(solutionsWithScores[1].title, solutionsWithScores[1].impactScore);
      sections.push(createTimelineSection(metricsHeader + createTwoColumnRow(metric1, metric2)));
    } else {
      const metrics = solutionsWithScores.slice(0, 4).map(s => 
        createCircleCounter(s.title, s.impactScore)
      );
      while (metrics.length < 4) metrics.push('');
      sections.push(createTimelineSection(metricsHeader + createFourColumnRow(metrics[0], metrics[1], metrics[2], metrics[3])));
    }
  }

  // ============================================
  // Section 10: CTA Section (Always included)
  // ============================================
  const ctaContent = createFullWidthRow(
    createSectionHeadingH2("Ready to Transform?") +
    createTextModule(`<p style="text-align: center;">Contact us to learn more about how we can help ${companyName} achieve digital transformation goals.</p>`) +
    `<div style="text-align: center;">${createButton("Get Started", "#contact")}</div>`
  );
  sections.push(createTimelineSection(ctaContent));

  return sections.join('');
}

/**
 * Check if WordPress configuration is valid
 */
export function isWordPressConfigured(): boolean {
  return Boolean(WP_BASE_URL && WP_USERNAME && WP_APP_PASSWORD);
}

/**
 * Create a new WordPress page using the REST API
 */
export async function createWordPressPage(
  title: string,
  content: DiviPageContent,
  status: 'draft' | 'publish' = 'draft'
): Promise<WordPressPageResponse> {
  if (!isWordPressConfigured()) {
    throw new Error('WordPress is not configured. Please set VITE_WP_BASE_URL, VITE_WP_USERNAME, and VITE_WP_APP_PASSWORD in your environment variables.');
  }

  const diviContent = generateDiviContent(content);
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  // Create the base64 encoded auth header
  const authString = `${WP_USERNAME}:${WP_APP_PASSWORD}`;
  const authHeader = `Basic ${btoa(authString)}`;

  const response = await fetch(`${WP_BASE_URL}/wp-json/wp/v2/pages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
    },
    body: JSON.stringify({
      title,
      content: diviContent,
      status,
      slug,
      author: parseInt(WP_DEFAULT_AUTHOR_ID, 10),
      // Tell WordPress to use Divi Builder
      meta: {
        _et_pb_use_builder: 'on',
        _et_pb_page_layout: 'et_no_sidebar',
        _et_pb_side_nav: 'off',
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(`Failed to create WordPress page: ${errorMessage}`);
  }

  return response.json();
}

/**
 * Update an existing WordPress page
 */
export async function updateWordPressPage(
  pageId: number,
  title: string,
  content: DiviPageContent,
  status?: 'draft' | 'publish'
): Promise<WordPressPageResponse> {
  if (!isWordPressConfigured()) {
    throw new Error('WordPress is not configured.');
  }

  const diviContent = generateDiviContent(content);

  const authString = `${WP_USERNAME}:${WP_APP_PASSWORD}`;
  const authHeader = `Basic ${btoa(authString)}`;

  const body: Record<string, unknown> = {
    title,
    content: diviContent,
  };

  if (status) {
    body.status = status;
  }

  const response = await fetch(`${WP_BASE_URL}/wp-json/wp/v2/pages/${pageId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(`Failed to update WordPress page: ${errorMessage}`);
  }

  return response.json();
}

/**
 * Get a WordPress page by ID
 */
export async function getWordPressPage(pageId: number): Promise<WordPressPageResponse> {
  if (!isWordPressConfigured()) {
    throw new Error('WordPress is not configured.');
  }

  const authString = `${WP_USERNAME}:${WP_APP_PASSWORD}`;
  const authHeader = `Basic ${btoa(authString)}`;

  const response = await fetch(`${WP_BASE_URL}/wp-json/wp/v2/pages/${pageId}`, {
    headers: {
      'Authorization': authHeader,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch WordPress page: ${response.statusText}`);
  }

  return response.json();
}
