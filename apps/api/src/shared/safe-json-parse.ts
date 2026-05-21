// ─── Safe JSON Parse with Repair ──────────────────────────────────────────────
// Local LLMs (especially small ones like qwen2.5:1.5b) often return malformed
// JSON: truncated mid-value, missing commas, code-fence wrappers, prose noise.
// This helper attempts strict parse first, then progressively repairs and
// retries. Returns null on final failure — callers decide the fallback.

/**
 * Walks the string tracking string/escape state and brace/bracket depth.
 * Returns the position just after the last "safe" boundary at depth 1
 * (a complete top-level element followed by `,`, `}`, or `]`). If the JSON
 * is already balanced, returns the full length.
 */
function findLastSafePosition(s: string): number {
  let depth = 0;
  let inString = false;
  let escape = false;
  let lastSafe = -1;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (c === '{' || c === '[') {
      depth++;
    } else if (c === '}' || c === ']') {
      depth--;
      if (depth === 0) lastSafe = i + 1;
    } else if (c === ',' && depth === 1) {
      lastSafe = i; // truncate before the comma; we'll close brackets after
    }
  }

  return lastSafe;
}

/**
 * Appends the closing brackets needed to balance an unclosed JSON fragment.
 * Walks the string, tracks the open-bracket stack (so nested {[ vs [{ closes
 * in the right order), strips a dangling trailing comma, and closes any
 * unterminated string literal.
 */
function balanceClose(s: string): string {
  let inString = false;
  let escape = false;
  const stack: string[] = [];

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (c === '{') stack.push('}');
    else if (c === '[') stack.push(']');
    else if (c === '}' || c === ']') stack.pop();
  }

  let result = s;
  if (inString) result += '"';
  result = result.replace(/,\s*$/, '');

  while (stack.length > 0) result += stack.pop();
  return result;
}

/**
 * Strips ```json fences and prose around the outermost JSON delimiter,
 * preferring `{...}` if both `{` and `[` exist (object beats array unless
 * the array starts first).
 */
function trimToOuter(content: string): string {
  let s = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  const firstBrace = s.indexOf('{');
  const firstBracket = s.indexOf('[');
  const lastBrace = s.lastIndexOf('}');
  const lastBracket = s.lastIndexOf(']');

  const useArray =
    firstBracket !== -1 &&
    (firstBrace === -1 || firstBracket < firstBrace);

  if (useArray) {
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      return s.substring(firstBracket, lastBracket + 1);
    }
    if (firstBracket !== -1) return s.substring(firstBracket);
  } else {
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return s.substring(firstBrace, lastBrace + 1);
    }
    if (firstBrace !== -1) return s.substring(firstBrace);
  }

  return s;
}

/**
 * Tries to parse `content` as JSON. On failure, applies progressively more
 * aggressive repairs (strip fences, trim to outer braces, balance brackets,
 * truncate to last complete top-level element). Returns the parsed value or
 * null if every repair attempt fails.
 *
 * Conservative by design: never fabricates data, only closes what the LLM
 * left dangling.
 */
export function safeJsonParse<T = unknown>(content: string): T | null {
  if (!content || typeof content !== 'string') return null;

  try { return JSON.parse(content) as T; } catch { /* fall through */ }

  const trimmed = trimToOuter(content);
  try { return JSON.parse(trimmed) as T; } catch { /* fall through */ }

  // Strip trailing commas before close brackets (`{"a": 1,}` → `{"a": 1}`)
  const noTrailingCommas = trimmed.replace(/,(\s*[}\]])/g, '$1');
  try { return JSON.parse(noTrailingCommas) as T; } catch { /* fall through */ }

  // Truncate to last safe position (handles mid-value cutoff) and close.
  const safeEnd = findLastSafePosition(noTrailingCommas);
  if (safeEnd > 0) {
    const truncated = balanceClose(noTrailingCommas.substring(0, safeEnd));
    try { return JSON.parse(truncated) as T; } catch { /* fall through */ }
  }

  // Last resort: balance whatever's there.
  const balanced = balanceClose(noTrailingCommas);
  try { return JSON.parse(balanced) as T; } catch { /* fall through */ }

  return null;
}
