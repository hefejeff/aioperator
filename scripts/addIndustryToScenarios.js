// Script to add industry field to existing scenarios in Firebase
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '../serviceAccountKey.json'), 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://willow-agent-training-default-rtdb.firebaseio.com'
});

const db = admin.database();

// Mapping of domains/processes to industries
const domainIndustryMap = {
  'Customer Support': ['Technology', 'Retail'],
  'Sales': ['Technology', 'Professional Services'],
  'Marketing': ['Technology', 'Retail'],
  'Finance': ['Finance', 'Professional Services'],
  'HR': ['Professional Services', 'Technology'],
  'Operations': ['Manufacturing', 'Retail'],
  'IT': ['Technology', 'Professional Services'],
  'Healthcare': ['Healthcare'],
  'Legal': ['Professional Services', 'Finance'],
  'Manufacturing': ['Manufacturing'],
  'Logistics': ['Transportation', 'Retail'],
  'Product': ['Technology', 'Manufacturing'],
  'Engineering': ['Technology', 'Manufacturing'],
  'Customer Service': ['Technology', 'Retail']
};

// Process/sub-domain specific mappings
const processIndustryMap = {
  'Lead Qualification': ['Technology', 'Professional Services'],
  'Customer Handoff': ['Technology', 'Professional Services'],
  'Quote Generation': ['Finance', 'Professional Services'],
  'Contract Generation': ['Professional Services', 'Finance'],
  'Expense Processing': ['Finance', 'Professional Services'],
  'Invoice Processing': ['Finance', 'Retail'],
  'Candidate Screening': ['Professional Services', 'Technology'],
  'Onboarding': ['Professional Services', 'Technology'],
  'Inventory Management': ['Manufacturing', 'Retail'],
  'Supply Chain': ['Manufacturing', 'Retail'],
  'Quality Control': ['Manufacturing', 'Healthcare'],
  'Patient Records': ['Healthcare'],
  'Medical Billing': ['Healthcare', 'Finance'],
  'Legal Review': ['Professional Services', 'Finance'],
  'Compliance': ['Finance', 'Healthcare'],
  'Content Creation': ['Media & Entertainment', 'Technology'],
  'Content Approval': ['Media & Entertainment', 'Technology']
};

async function updateScenarios() {
  try {
    console.log('Fetching all scenarios...');
    const scenariosRef = db.ref('scenarios');
    const snapshot = await scenariosRef.once('value');
    
    if (!snapshot.exists()) {
      console.log('No scenarios found in database.');
      return;
    }

    const scenarios = snapshot.val();
    const updates = {};
    let updateCount = 0;

    for (const [scenarioId, scenario] of Object.entries(scenarios)) {
      // Skip if already has industry
      if (scenario.industry) {
        console.log(`Scenario ${scenarioId} already has industry: ${scenario.industry}`);
        continue;
      }

      let industries = [];
      
      // Try to determine industry from process first
      if (scenario.process && processIndustryMap[scenario.process]) {
        industries = processIndustryMap[scenario.process];
      }
      // Fall back to domain
      else if (scenario.domain && domainIndustryMap[scenario.domain]) {
        industries = domainIndustryMap[scenario.domain];
      }

      if (industries.length > 0) {
        // Use the first industry from the list
        updates[`scenarios/${scenarioId}/industry`] = industries[0];
        updateCount++;
        console.log(`Will update scenario ${scenarioId} (${scenario.title}) - Domain: ${scenario.domain}, Process: ${scenario.process} -> Industry: ${industries[0]}`);
      } else {
        console.log(`Could not determine industry for scenario ${scenarioId} (${scenario.title}) - Domain: ${scenario.domain}, Process: ${scenario.process}`);
      }
    }

    if (updateCount > 0) {
      console.log(`\nUpdating ${updateCount} scenarios...`);
      await db.ref().update(updates);
      console.log('Successfully updated all scenarios with industry fields!');
    } else {
      console.log('No scenarios needed updating.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error updating scenarios:', error);
    process.exit(1);
  }
}

updateScenarios();
