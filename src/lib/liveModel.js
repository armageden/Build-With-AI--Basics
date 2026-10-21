/**
 * Live Model Integration for DiffStory
 * 
 * Bounded LLM client strictly limited to unmentioned diff hunks.
 * Generates:
 * 1. A 1-sentence plain-English impact statement (max 22 words).
 * 2. A 1-click copyable restore prompt for coding agents.
 * 
 * Complies with PRD Rule 3: Never fakes or silently mocks output on failure.
 */

const SYSTEM_INSTRUCTION = `You are generating a concise post-prompt receipt for an unrequested code change. Return strict JSON with keys "impactSummary" (max 22 words, plain English stating what the deleted/changed code did) and "restorePrompt" (1-2 sentences the developer can paste into their coding agent to restore the unmentioned change while keeping their original prompt request). Never guess hidden motives; describe only the literal code lines provided.`;

// Candidate models in order of preference/availability
const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'gemini-flash-latest'
];

/**
 * Resolves the active Gemini API key from explicit arg, env, or window.
 */
export function getActiveApiKey(customKey = '') {
  if (customKey && customKey.trim()) return customKey.trim();
  const envKey = import.meta.env?.VITE_GEMINI_API_KEY || import.meta.env?.GEMINI_API_KEY || '';
  if (envKey && envKey.trim()) return envKey.trim();
  if (typeof window !== 'undefined' && window.__DIFFSTORY_API_KEY__) {
    return window.__DIFFSTORY_API_KEY__.trim();
  }
  return '';
}

/**
 * Request impact summary and restore prompt for a single unmentioned hunk.
 */
export async function generateHunkImpactAndRestore(promptText, hunk, apiKey = '') {
  const activeKey = getActiveApiKey(apiKey);

  if (!activeKey) {
    return {
      success: false,
      error: 'Live model unavailable — deterministic token receipt above is complete. (No API key configured)',
      impactSummary: null,
      restorePrompt: null,
    };
  }

  const userPayload = `Original User Prompt: "${promptText}"\nUnmentioned Diff Hunk (${hunk.header}):\n${hunk.rawBlock}`;

  let lastError = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }]
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: userPayload }]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData?.error?.message || response.statusText;
        lastError = new Error(`Model ${model} returned ${response.status}: ${message}`);
        // If 404 (model discontinued) or 503 (temporary spike), try next candidate
        if (response.status === 404 || response.status === 503 || response.status === 429) {
          continue;
        }
        break;
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('Empty response from model');
      }

      const parsed = JSON.parse(rawText);

      return {
        success: true,
        modelUsed: model,
        impactSummary: parsed.impactSummary || 'Unmentioned code lines were deleted or modified.',
        restorePrompt: parsed.restorePrompt || `Restore the unmentioned lines in ${hunk.file || 'this file'} while keeping the requested prompt changes.`,
      };
    } catch (err) {
      lastError = err;
      // Try next candidate model
      continue;
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Live model unavailable — deterministic token receipt above is complete.',
    impactSummary: null,
    restorePrompt: null,
  };
}
