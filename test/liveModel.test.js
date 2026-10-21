import assert from 'node:assert';
import { generateHunkImpactAndRestore } from '../src/lib/liveModel.js';
import { PRESETS } from '../src/lib/presets.js';
import { analyzePromptAgainstDiff } from '../src/lib/receiptEngine.js';

console.log('--- Testing Live Model Integration ---');

// Test 1: Fallback when API key is empty
const analyzed = analyzePromptAgainstDiff(PRESETS[0].prompt, PRESETS[0].diff);
const unmentionedHunk = analyzed.hunks.find(h => h.status === 'NOT_MENTIONED_IN_PROMPT');

console.log('1. Testing with empty API key (fallback test):');
const fallbackResult = await generateHunkImpactAndRestore(PRESETS[0].prompt, unmentionedHunk, '');
console.log('Fallback result success:', fallbackResult.success);
console.log('Fallback error message:', fallbackResult.error);

assert.strictEqual(fallbackResult.success, false);
assert.ok(fallbackResult.error.includes('Live model unavailable'));

// Test 2: Live call with real API key from environment
const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
if (key) {
  console.log('\n2. Testing live call with configured key:');
  const liveResult = await generateHunkImpactAndRestore(PRESETS[0].prompt, unmentionedHunk, key);
  console.log('Live call success:', liveResult.success);
  console.log('Model used:', liveResult.modelUsed);
  console.log('Impact summary:', liveResult.impactSummary);
  console.log('Restore prompt:', liveResult.restorePrompt);

  assert.strictEqual(liveResult.success, true);
  assert.ok(liveResult.impactSummary.length > 5);
  assert.ok(liveResult.restorePrompt.length > 5);
} else {
  console.log('Skipping live call test because no key in process.env');
}

console.log('\n✅ Live model integration tests PASSED successfully!');
