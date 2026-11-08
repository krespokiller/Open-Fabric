// Parses the model's answer. Files are written as:
//   <<<FILE path/to/file
//   ...content...
//   >>>FILE
// and deletions as <<<DELETE path>>> (outside file blocks).
// Tolerates a markdown fence wrapped inside a block, which small models often add.

export const FORMAT_RULES = `Output format (strict):
- Write every file you create or change as a block:
<<<FILE relative/path/to/file
...the complete file content...
>>>FILE
- To delete a file, write: <<<DELETE relative/path/to/file>>>
- Always write complete files. Never write diffs, ellipses or placeholders like "rest unchanged".
- Paths are relative to the project root. Put nothing else on the <<<FILE line.
- Output only the files you create or change. A short note before the first block is allowed.`;

function stripFence(content) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  while (lines.length && lines[0].trim() === '') lines.shift();
  while (lines.length && lines.at(-1).trim() === '') lines.pop();
  if (lines.length >= 2 && /^```[\w.+-]*\s*$/.test(lines[0]) && /^```\s*$/.test(lines.at(-1))) {
    return lines.slice(1, -1).join('\n') + '\n';
  }
  return lines.join('\n') + '\n';
}

function cleanPath(header) {
  // "app/route.ts (main handler)" or "`app/route.ts`" -> "app/route.ts"
  return header.trim().replace(/^[`'"]+|[`'"]+$/g, '').split(/\s+/)[0].replace(/[`'"]+$/g, '');
}

export function parseAnswer(text) {
  const files = [];
  const deletes = [];
  const malformed = [];
  let truncated = null;
  const src = String(text || '').replace(/\r\n/g, '\n');
  const outside = [];
  let pos = 0;
  const header = /<<<FILE[ \t]+([^\n]*)\n/g;
  let m;
  while ((m = header.exec(src))) {
    outside.push(src.slice(pos, m.index));
    const filePath = cleanPath(m[1]);
    const start = header.lastIndex;
    const close = src.indexOf('>>>FILE', start);
    const nextOpen = src.indexOf('\n<<<FILE', start - 1);
    if (close < 0 && nextOpen < 0) {
      truncated = filePath;
      pos = src.length;
      break;
    }
    if (close >= 0 && (nextOpen < 0 || close < nextOpen)) {
      files.push({ path: filePath, content: stripFence(src.slice(start, close)) });
      pos = close + '>>>FILE'.length;
      header.lastIndex = pos;
    } else {
      // The block was never closed before the next one started: keep it, but report it.
      malformed.push(filePath);
      files.push({ path: filePath, content: stripFence(src.slice(start, nextOpen + 1)) });
      pos = nextOpen + 1;
      header.lastIndex = pos;
    }
  }
  if (pos < src.length) outside.push(src.slice(pos));
  for (const chunk of outside) for (const d of chunk.matchAll(/<<<DELETE\s+([^\n>]+?)\s*>>>/g)) deletes.push(cleanPath(d[1]));
  return { files, deletes, truncated, malformed };
}
