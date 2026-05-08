/* Lightweight BibTeX Parser — handles ANY format (IEEE, ACM, arXiv, etc.) */

function parseBibtex(bibtexString) {
  const entries = [];
  let i = 0;
  const len = bibtexString.length;

  while (i < len) {
    /* Find next @ sign */
    while (i < len && bibtexString[i] !== '@') i++;
    if (i >= len) break;
    i++; // skip @

    /* Read entry type (article, inproceedings, etc.) */
    let typeStart = i;
    while (i < len && /[a-zA-Z]/.test(bibtexString[i])) i++;
    const type = bibtexString.substring(typeStart, i).toLowerCase();

    if (type === 'comment' || type === 'string' || type === 'preamble') continue;

    /* Skip whitespace, find opening { */
    while (i < len && /\s/.test(bibtexString[i])) i++;
    if (bibtexString[i] !== '{') continue;
    i++;

    /* Read key (until first comma) */
    let keyStart = i;
    while (i < len && bibtexString[i] !== ',' && bibtexString[i] !== '}') i++;
    const key = bibtexString.substring(keyStart, i).trim();
    if (bibtexString[i] === ',') i++;

    /* Read fields until matching closing brace */
    let depth = 1;
    let fieldsStart = i;
    while (i < len && depth > 0) {
      if (bibtexString[i] === '{') depth++;
      else if (bibtexString[i] === '}') depth--;
      if (depth > 0) i++;
    }
    const fieldsBlock = bibtexString.substring(fieldsStart, i);
    i++; // skip closing }

    const entry = { type: type, key: key };
    Object.assign(entry, parseFields(fieldsBlock));
    entries.push(entry);
  }
  return entries;
}

function parseFields(block) {
  const fields = {};
  let i = 0;
  const len = block.length;
  while (i < len) {
    while (i < len && /[\s,]/.test(block[i])) i++;
    if (i >= len) break;
    let nameStart = i;
    while (i < len && /[\w-]/.test(block[i])) i++;
    const fieldName = block.substring(nameStart, i).toLowerCase();
    if (!fieldName) break;
    while (i < len && /\s/.test(block[i])) i++;
    if (block[i] !== '=') break;
    i++;
    while (i < len && /\s/.test(block[i])) i++;
    let value = '';
    if (block[i] === '{') {
      let depth = 1; i++;
      const start = i;
      while (i < len && depth > 0) {
        if (block[i] === '{') depth++;
        else if (block[i] === '}') depth--;
        if (depth > 0) i++;
      }
      value = block.substring(start, i);
      i++;
    } else if (block[i] === '"') {
      i++;
      const start = i;
      while (i < len && block[i] !== '"') i++;
      value = block.substring(start, i);
      i++;
    } else {
      const start = i;
      while (i < len && !/[\s,]/.test(block[i])) i++;
      value = block.substring(start, i);
    }
    fields[fieldName] = cleanValue(value);
  }
  return fields;
}

function cleanValue(s) {
  return s
    .replace(/\s+/g, ' ')
    .replace(/\\&/g, '&')
    .replace(/\\textendash/g, '–')
    .replace(/\\textemdash/g, '—')
    .replace(/\{\\([a-zA-Z])\}/g, '$1')
    .replace(/[{}]/g, '')
    .trim();
}

function formatAuthors(authorString, highlightNames) {
  if (!authorString) return '';
  if (!highlightNames) highlightNames = [];

  /* Split by " and " (BibTeX standard separator) */
  const authors = authorString.split(/\s+and\s+/);

  const formatted = authors.map(function(name) {
    name = name.trim();

    /* If "Last, First" format, swap to "First Last" for display */
    let displayName = name;
    if (name.indexOf(',') !== -1) {
      const parts = name.split(',').map(function(s){ return s.trim(); });
      displayName = (parts[1] || '') + ' ' + parts[0];
      displayName = displayName.trim();
    }

    /* Bold if this name matches one in highlightNames (any partial match) */
    const lower = displayName.toLowerCase();
    const isMatch = highlightNames.some(function(h){
      return lower.indexOf(h.toLowerCase()) !== -1;
    });
    if (isMatch) {
      return '<span class="self">' + displayName + '</span>';
    }
    return displayName;
  });

  return formatted.join(', ');
}

function formatVenue(entry) {
  let venue = entry.journal || entry.booktitle || entry.publisher || '';
  if (entry.volume) venue += ' ' + entry.volume;
  if (entry.number) venue += ' (' + entry.number + ')';
  if (entry.pages) venue += ', pp.' + entry.pages.replace('--', '–').replace(/-/g, '–');
  if (entry.year) venue += ' (' + entry.year + ')';
  return venue;
}
