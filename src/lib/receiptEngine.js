/**
 * Deterministic Receipt Engine for DiffStory
 * 
 * Compares prompt tokens against unified diff hunks with 100% deterministic
 * token extraction and intersection. Never delegates classification to an LLM.
 */

// Prompt-instruction words & English stopwords to ignore
export const STOPWORDS = new Set([
  'a', 'an', 'the', 'to', 'in', 'on', 'of', 'for', 'with', 'and', 'or',
  'change', 'make', 'update', 'set', 'add', 'remove', 'fix', 'please',
  'can', 'you', 'it', 'is', 'be', 'into', 'from', 'this', 'that', 'my',
  'at', 'by', 'as', 'do', 'so', 'if', 'we', 'our', 'all', 'any', 'not',
  'but', 'up', 'down', 'out', 'off', 'over', 'under', 'then', 'than',
  'too', 'very', 'just', 'should', 'would', 'could', 'want', 'need'
]);

// Language syntax & framework boilerplate to strip from code hunks
export const CODE_SYNTAX_KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'true',
  'false', 'null', 'undefined', 'classname', 'class', 'name', 'div',
  'span', 'p', 'h1', 'h2', 'h3', 'input', 'form', 'label',
  'import', 'export', 'default', 'type', 'interface', 'new', 'this',
  'async', 'await', 'throw', 'try', 'catch', 'finally', 'string', 'number',
  'boolean', 'any', 'void', 'px', 'py', 'mx', 'my', 'p', 'm', 'bg', 'text',
  'rounded', 'border', 'flex', 'grid', 'w', 'h', 'e', 'event', 'props',
  'state', 'val', 'key', 'index', 'item', 'items', 'onclick', 'onsubmit',
  'onchange', 'style', 'src', 'href', 'target', 'rel', 'id'
]);

/**
 * Split a token on camelCase / PascalCase and clean it up.
 */
export function splitCamelCase(text) {
  if (!text || typeof text !== 'string') return [];
  
  // Split on symbols / dashes / underscores / dots first
  const rawParts = text.split(/[^a-zA-Z0-9]+/g).filter(Boolean);
  const result = [];

  for (const part of rawParts) {
    const split = part
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .toLowerCase()
      .split(/\s+/g)
      .filter(Boolean);

    result.push(...split);
    const lower = part.toLowerCase();
    if (lower && !result.includes(lower)) {
      result.push(lower);
    }
  }

  return result;
}

/**
 * Extract meaningful, deduplicated tokens from prompt text.
 */
export function extractPromptTokens(prompt) {
  if (!prompt || typeof prompt !== 'string') return [];

  const tokens = new Set();
  const parts = splitCamelCase(prompt);

  for (const part of parts) {
    const cleaned = part.trim().toLowerCase();
    if (cleaned.length >= 2 && !STOPWORDS.has(cleaned) && !/^\d+$/.test(cleaned)) {
      tokens.add(cleaned);
    }
  }

  return Array.from(tokens);
}

/**
 * Extract meaningful tokens from mutated code lines in a hunk.
 */
export function extractHunkTokens(mutatedLines) {
  const tokens = new Set();

  for (const line of mutatedLines) {
    // Strip leading '+' or '-'
    const content = line.replace(/^[+-]/, ' ');
    const parts = splitCamelCase(content);

    for (const part of parts) {
      const cleaned = part.trim().toLowerCase();
      // Ignore very short tokens, language boilerplate, stopwords, or numbers
      if (
        cleaned.length >= 2 &&
        !CODE_SYNTAX_KEYWORDS.has(cleaned) &&
        !STOPWORDS.has(cleaned) &&
        !/^\d+$/.test(cleaned)
      ) {
        tokens.add(cleaned);
      }
    }
  }

  return Array.from(tokens);
}

/**
 * Format a list of tokens as single-quoted comma-separated list
 * E.g., ['submit', 'button'] -> "'submit', 'button'"
 */
export function formatList(tokens) {
  if (!tokens || tokens.length === 0) return 'none';
  return tokens.map(t => `'${t}'`).join(', ');
}

/**
 * Parse a raw unified diff into structured hunks.
 */
export function parseUnifiedDiff(rawDiff) {
  if (!rawDiff || typeof rawDiff !== 'string') return [];

  let currentFile = 'modified file';
  const fileMatch = rawDiff.match(/--- (?:a\/)?([^\n\r]+)/);
  if (fileMatch && fileMatch[1] && fileMatch[1] !== '/dev/null') {
    currentFile = fileMatch[1].trim();
  }

  // Split on hunk headers @@ -X,Y +A,B @@
  const hunkSplits = rawDiff.split(/(?=^@@\s+-\d+(?:,\d+)?\s+\+\d+(?:,\d+)?\s+@@)/m);
  const hunks = [];

  let hunkIndex = 0;
  for (const block of hunkSplits) {
    const trimmed = block.trim();
    if (!trimmed.startsWith('@@')) {
      const headerFileMatch = trimmed.match(/\+\+\+ (?:b\/)?([^\n\r]+)/);
      if (headerFileMatch && headerFileMatch[1]) {
        currentFile = headerFileMatch[1].trim();
      }
      continue;
    }

    hunkIndex++;
    const lines = block.split(/\r?\n/);
    const headerLine = lines[0] || '';
    
    // Extract context label after @@ if present
    const headerMatch = headerLine.match(/@@\s+-\d+(?:,\d+)?\s+\+\d+(?:,\d+)?\s+@@\s*(.*)/);
    const hunkHeader = headerLine.replace(/\s*@@\s*(.*)/, ' @@').trim();
    const contextLabel = headerMatch && headerMatch[1] ? headerMatch[1].trim() : '';

    const parsedLines = [];
    const mutatedLines = [];
    let addedCount = 0;
    let deletedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line === '' && i === lines.length - 1) continue;

      if (line.startsWith('+') && !line.startsWith('+++')) {
        addedCount++;
        mutatedLines.push(line);
        parsedLines.push({ type: 'added', text: line.substring(1), raw: line });
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        deletedCount++;
        mutatedLines.push(line);
        parsedLines.push({ type: 'deleted', text: line.substring(1), raw: line });
      } else if (line.startsWith(' ') || line === '') {
        parsedLines.push({ type: 'context', text: line.startsWith(' ') ? line.substring(1) : line, raw: line });
      } else {
        parsedLines.push({ type: 'other', text: line, raw: line });
      }
    }

    hunks.push({
      id: `hunk-${hunkIndex}`,
      index: hunkIndex,
      file: currentFile,
      header: headerLine.split(' @@')[0] + ' @@',
      contextLabel,
      rawBlock: block,
      lines: parsedLines,
      mutatedLines,
      addedCount,
      deletedCount,
    });
  }

  return hunks;
}

/**
 * Main analysis function: parses diff, tokenizes prompt and hunks,
 * determines intersection, and sorts hunks deterministically.
 */
export function analyzePromptAgainstDiff(promptText, diffText) {
  if (!promptText || !diffText) {
    return {
      isValid: false,
      error: 'Both a prompt and a unified diff are required.',
      hunks: [],
      summary: { totalHunks: 0, unmentionedCount: 0, mentionedCount: 0 },
      promptTokens: [],
    };
  }

  const promptTokens = extractPromptTokens(promptText);
  const parsedHunks = parseUnifiedDiff(diffText);

  if (parsedHunks.length === 0) {
    return {
      isValid: false,
      error: 'No valid unified diff hunks found. Ensure your diff contains "@@ -line,count +line,count @@" headers.',
      hunks: [],
      summary: { totalHunks: 0, unmentionedCount: 0, mentionedCount: 0 },
      promptTokens,
    };
  }

  const analyzedHunks = parsedHunks.map((hunk) => {
    const hunkTokens = extractHunkTokens(hunk.mutatedLines);

    // Exact or meaningful substring match on mutated lines
    const matchedTokens = promptTokens.filter((pt) =>
      hunk.mutatedLines.some((line) => {
        // match word boundary or substring
        const words = splitCamelCase(line.replace(/^[+-]/, ''));
        return words.some(w => w === pt || (w.length >= 4 && pt.length >= 4 && (w.includes(pt) || pt.includes(w))));
      })
    );

    const isMentioned = matchedTokens.length > 0;
    const status = isMentioned ? 'MENTIONED_IN_PROMPT' : 'NOT_MENTIONED_IN_PROMPT';

    // Top representative tokens from mutated lines not mentioned in prompt
    const unmentionedHunkTokens = hunkTokens.filter(
      (ht) => !promptTokens.some((pt) => ht === pt || ht.includes(pt) || pt.includes(ht))
    );

    let literalReceipt = '';
    if (isMentioned) {
      literalReceipt = `Matches your prompt words: ${formatList(matchedTokens)}.`;
    } else {
      const topTokens = unmentionedHunkTokens.slice(0, 4);
      literalReceipt = `Your prompt mentions ${formatList(promptTokens)}. Nothing in your prompt mentions ${formatList(topTokens)}.`;
    }

    return {
      ...hunk,
      promptTokens,
      hunkTokens,
      matchedTokens,
      unmentionedHunkTokens,
      status,
      isMentioned,
      literalReceipt,
      // Default live model placeholders (populated by liveModel.js)
      impactSummary: null,
      restorePrompt: null,
      aiLoading: false,
      aiError: null,
    };
  });

  // Sort deterministically: NOT_MENTIONED_IN_PROMPT (amber) first, MENTIONED_IN_PROMPT (green) second
  analyzedHunks.sort((a, b) => {
    if (a.status === 'NOT_MENTIONED_IN_PROMPT' && b.status === 'MENTIONED_IN_PROMPT') return -1;
    if (a.status === 'MENTIONED_IN_PROMPT' && b.status === 'NOT_MENTIONED_IN_PROMPT') return 1;
    return a.index - b.index;
  });

  const unmentionedCount = analyzedHunks.filter((h) => h.status === 'NOT_MENTIONED_IN_PROMPT').length;
  const mentionedCount = analyzedHunks.filter((h) => h.status === 'MENTIONED_IN_PROMPT').length;

  return {
    isValid: true,
    error: null,
    hunks: analyzedHunks,
    promptTokens,
    summary: {
      totalHunks: analyzedHunks.length,
      unmentionedCount,
      mentionedCount,
    },
  };
}
