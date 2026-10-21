import assert from 'node:assert';
import { PRESETS } from '../src/lib/presets.js';
import { analyzePromptAgainstDiff, extractPromptTokens, extractHunkTokens } from '../src/lib/receiptEngine.js';

console.log('--- Testing Deterministic Receipt Engine on Preset 1 ---');

const preset1 = PRESETS[0];
console.log('Preset 1 Prompt:', preset1.prompt);

const result = analyzePromptAgainstDiff(preset1.prompt, preset1.diff);

console.log('Valid:', result.isValid);
console.log('Total Hunks:', result.summary.totalHunks);
console.log('Unmentioned Count:', result.summary.unmentionedCount);
console.log('Mentioned Count:', result.summary.mentionedCount);
console.log('Prompt Tokens:', result.promptTokens);

assert.strictEqual(result.isValid, true, 'Result should be valid');
assert.strictEqual(result.summary.totalHunks, 2, 'Should have exactly 2 hunks');
assert.strictEqual(result.summary.unmentionedCount, 1, 'Should have 1 unmentioned hunk');
assert.strictEqual(result.summary.mentionedCount, 1, 'Should have 1 mentioned hunk');

const hunk1 = result.hunks[0];
const hunk2 = result.hunks[1];

console.log('\nHunk 1 (First sorted):');
console.log('  Header:', hunk1.header);
console.log('  Status:', hunk1.status);
console.log('  Tokens:', hunk1.hunkTokens);
console.log('  Receipt:', hunk1.literalReceipt);

console.log('\nHunk 2 (Second sorted):');
console.log('  Header:', hunk2.header);
console.log('  Status:', hunk2.status);
console.log('  Tokens:', hunk2.hunkTokens);
console.log('  Matched:', hunk2.matchedTokens);
console.log('  Receipt:', hunk2.literalReceipt);

assert.strictEqual(hunk1.status, 'NOT_MENTIONED_IN_PROMPT', 'Hunk 1 must be NOT_MENTIONED_IN_PROMPT');
assert.ok(hunk1.header.includes('-10,7'), 'Hunk 1 should be the validation deletion hunk');
assert.ok(hunk1.literalReceipt.includes('Nothing in your prompt mentions'), 'Hunk 1 receipt must state unmentioned words');

assert.strictEqual(hunk2.status, 'MENTIONED_IN_PROMPT', 'Hunk 2 must be MENTIONED_IN_PROMPT');
assert.ok(hunk2.header.includes('-26,5'), 'Hunk 2 should be the button color change hunk');
assert.ok(hunk2.literalReceipt.includes('Matches your prompt words:'), 'Hunk 2 receipt must state matched words');
assert.ok(hunk2.matchedTokens.includes('blue'), 'Hunk 2 matched tokens must include blue');

console.log('\n--- Testing Deterministic Receipt Engine on Preset 2 ---');
const preset2 = PRESETS[1];
const result2 = analyzePromptAgainstDiff(preset2.prompt, preset2.diff);
console.log('Preset 2 Total hunks:', result2.summary.totalHunks);
console.log('Preset 2 Unmentioned:', result2.summary.unmentionedCount);
console.log('Preset 2 Mentioned:', result2.summary.mentionedCount);

assert.strictEqual(result2.summary.totalHunks, 2);
assert.strictEqual(result2.summary.unmentionedCount, 1);
assert.strictEqual(result2.summary.mentionedCount, 1);
assert.strictEqual(result2.hunks[0].status, 'NOT_MENTIONED_IN_PROMPT');
assert.strictEqual(result2.hunks[1].status, 'MENTIONED_IN_PROMPT');

console.log('\n✅ All deterministic engine tests PASSED successfully!');
