
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' }); // Try loading .env.local

import { analyzeChange } from '../src/ai/flows/analyze-change';

async function runTest() {
  console.log('Starting Test: analyzeChange Flow');

  // simulated "Concerning" Change: Drop in NDVI, Increase in NDBI
  const input = {
    location: {
      latitude: -3.4653,
      longitude: -62.2159,
      description: "Amazon Rainforest, Brazil"
    },
    dateRange: {
      start: "2023-01-01",
      end: "2023-12-31"
    },
    metrics: [
      { name: "NDVI", value: 0.4, change: -0.3, trend: "decreasing" as const },
      { name: "NDWI", value: 0.1, change: -0.1, trend: "decreasing" as const },
      { name: "NDBI", value: 0.2, change: 0.15, trend: "increasing" as const },
      { name: "NBR", value: 0.3, change: -0.2, trend: "decreasing" as const }
    ],
    historicalContext: "Historically dense rainforest with high vegetation indices (NDVI > 0.7) and stable moisture levels."
  };

  try {
    console.log('Sending input to AI...');
    const result = await analyzeChange(input);
    
    console.log('\n--- AI Analysis Result ---');
    console.log(JSON.stringify(result, null, 2));
    console.log('--------------------------\n');

    if (result.classification === 'Concerning' || result.classification === 'Critical') {
        console.log('PASS: Correctly identified negative change.');
    } else {
        console.warn('WARNING: AI did not classify as Concerning/Critical as expected.');
    }

  } catch (error) {
    console.error('Test Failed:', error);
  }
}

runTest();
