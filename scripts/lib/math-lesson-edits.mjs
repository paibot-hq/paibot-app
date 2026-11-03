// Apply a model's small JSON Patch to an unpublished candidate. The input stays
// intact if an edit is invalid; publication metadata is outside the editable body.
export function applyLessonEdits(lesson, edits) {
  if (!Array.isArray(edits)) throw new Error('edits must be an array');
  const copy = structuredClone(lesson);
  for (const edit of edits) {
    if (!edit || !['add', 'replace', 'remove'].includes(edit.op) || typeof edit.path !== 'string' || !edit.path.startsWith('/')) throw new Error('each edit needs add/replace/remove and a JSON Pointer path');
    const path = edit.path.slice(1).split('/').map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'));
    if (!['sections', 'examples', 'mistakes'].includes(path[0]) || path.some(part => ['__proto__', 'prototype', 'constructor'].includes(part))) throw new Error(`path is outside the lesson body: ${edit.path}`);
    let parent = copy;
    for (const part of path.slice(0, -1)) {
      if (parent === null || typeof parent !== 'object' || !Object.hasOwn(parent, part)) throw new Error(`missing parent: ${edit.path}`);
      parent = parent[part];
    }
    if (parent === null || typeof parent !== 'object') throw new Error(`not an editable object: ${edit.path}`);
    const key = path.at(-1);
    if (edit.op !== 'remove' && !Object.hasOwn(edit, 'value')) throw new Error(`missing value: ${edit.path}`);
    if (Array.isArray(parent)) {
      const index = key === '-' && edit.op === 'add' ? parent.length : /^(0|[1-9]\d*)$/.test(key) ? Number(key) : NaN;
      if (!Number.isSafeInteger(index) || index < 0 || index > parent.length || (edit.op !== 'add' && index === parent.length)) throw new Error(`invalid array index: ${edit.path}`);
      if (edit.op === 'add') parent.splice(index, 0, structuredClone(edit.value));
      else if (edit.op === 'remove') parent.splice(index, 1);
      else parent[index] = structuredClone(edit.value);
    } else {
      if (edit.op !== 'add' && !Object.hasOwn(parent, key)) throw new Error(`missing property: ${edit.path}`);
      if (edit.op === 'remove') delete parent[key];
      else parent[key] = structuredClone(edit.value);
    }
  }
  return copy;
}
