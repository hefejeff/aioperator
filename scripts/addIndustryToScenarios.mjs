// Script to add industry field to existing scenarios in Firebase
// Uses Firebase client SDK instead of Admin SDK
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, update } from 'firebase/database';
import 'dotenv/config';

// Initialize Firebase using environment variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Mapping of domains to industries
const domainIndustryMap = {
  'Customer Support': ['Technology', 'Retail'],
  'Sales': ['Technology', 'Professional Services'],
  'Marketing': ['Technology', 'Retail'],
  'Finance': ['Finance', 'Professional Services'],
  'Human Resources': ['Professional Services'],
  'Operations': ['Manufacturing', 'Technology'],
  'IT': ['Technology'],
  'Supply Chain': ['Manufacturing', 'Retail'],
  'Legal': ['Professional Services', 'Government'],
  'Procurement': ['Manufacturing', 'Retail'],
  'Product Management': ['Technology'],
  'Research & Development': ['Technology', 'Healthcare'],
  'Quality Assurance': ['Manufacturing', 'Healthcare'],
  'Healthcare': ['Healthcare']
};

// Mapping of processes to industries (more specific than domain)
const processIndustryMap = {
  'Lead Qualification': ['Technology', 'Professional Services'],
  'Customer Onboarding': ['Technology', 'Finance'],
  'Invoice Processing': ['Finance', 'Retail'],
  'Expense Reporting': ['Finance'],
  'Patient Records': ['Healthcare'],
  'Claims Processing': ['Healthcare', 'Finance'],
  'Inventory Management': ['Retail', 'Manufacturing'],
  'Order Fulfillment': ['Retail', 'Manufacturing'],
  'Contract Management': ['Professional Services', 'Government'],
  'Employee Onboarding': ['Professional Services'],
  'Recruitment': ['Professional Services'],
  'Compliance Tracking': ['Finance', 'Healthcare'],
  'Quality Control': ['Manufacturing'],
  'Product Development': ['Technology', 'Manufacturing'],
  'Content Creation': ['Media & Entertainment', 'Technology'],
  'Campaign Management': ['Technology', 'Retail'],
  'Customer Service': ['Technology', 'Retail', 'Hospitality']
};

async function updateScenarios() {
  try {
    console.log('Fetching scenarios from Firebase...');
    
    // Get all scenarios
    const scenariosRef = ref(db, 'scenarios');
    const snapshot = await get(scenariosRef);
    
    if (!snapshot.exists()) {
      console.log('No scenarios found in database.');
      return;
    }

    const scenarios = snapshot.val();
    const updates = {};
    let updateCount = 0;

    console.log(`Found ${Object.keys(scenarios).length} scenarios. Analyzing...`);

    // Iterate through scenarios
    for (const [scenarioId, scenario] of Object.entries(scenarios)) {
      // Skip if industry already exists
      if (scenario.industry) {
        console.log(`Skipping ${scenarioId}: Already has industry "${scenario.industry}"`);
        continue;
      }

      let industryToAdd = null;

      // Try to match by process first (more specific)
      if (scenario.process && processIndustryMap[scenario.process]) {
        industryToAdd = processIndustryMap[scenario.process][0];
        console.log(`Matching ${scenarioId} by process "${scenario.process}" → ${industryToAdd}`);
      }
      // Fall back to domain
      else if (scenario.domain && domainIndustryMap[scenario.domain]) {
        industryToAdd = domainIndustryMap[scenario.domain][0];
        console.log(`Matching ${scenarioId} by domain "${scenario.domain}" → ${industryToAdd}`);
      }
      else {
        console.log(`No match for ${scenarioId}: domain="${scenario.domain}", process="${scenario.process}"`);
      }

      // Add to updates if we found an industry
      if (industryToAdd) {
        updates[`scenarios/${scenarioId}/industry`] = industryToAdd;
        updateCount++;
      }
    }

    // Apply updates
    if (updateCount > 0) {
      console.log(`\nApplying ${updateCount} updates...`);
      await update(ref(db), updates);
      console.log('✅ Successfully updated scenarios with industry data!');
      console.log(`Total scenarios updated: ${updateCount}`);
    } else {
      console.log('No scenarios needed updating.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error updating scenarios:', error);
    process.exit(1);
  }
}

// Run the update
updateScenarios();
