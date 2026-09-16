import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const schemaRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../core/schemas');

const schemaCache = new Map();

function loadSchema(name) {
  if (!schemaCache.has(name)) {
    schemaCache.set(name, JSON.parse(readFileSync(path.join(schemaRoot, `${name}.schema.json`), 'utf8')));
  }
  return schemaCache.get(name);
}

function checkType(value, type) {
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  return typeof value === type;
}

function validateProperty(value, schema, field, errors, { draftLesson = false } = {}) {
  if (schema.type && !checkType(value, schema.type)) {
    errors.push(`${field} must be a ${schema.type}.`);
    return;
  }
  if (schema.const !== undefined && value !== schema.const) {
    errors.push(`${field} must be ${JSON.stringify(schema.const)}.`);
    return;
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${field} must be one of ${schema.enum.join(', ')}.`);
    return;
  }
  if (schema.pattern && typeof value === 'string' && !new RegExp(schema.pattern).test(value)) {
    errors.push(`${field} does not match required pattern.`);
  }
  if (schema.minLength && typeof value === 'string' && value.length < schema.minLength) {
    errors.push(`${field} is too short.`);
  }
  if (schema.minItems && Array.isArray(value) && value.length < schema.minItems) {
    if (!(draftLesson && field === 'validationEvidenceIds')) {
      errors.push(`${field} requires at least ${schema.minItems} item(s).`);
    }
  }
  if (schema.items && Array.isArray(value)) {
    for (const [index, item] of value.entries()) validateProperty(item, schema.items, `${field}[${index}]`, errors, { draftLesson });
  }
  if (schema.properties && value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, childSchema] of Object.entries(schema.properties)) {
      if (value[key] !== undefined) validateProperty(value[key], childSchema, `${field}.${key}`, errors, { draftLesson });
    }
  }
}

export function validateRecordSchema(kind, record) {
  const schemaName = kind.endsWith('s') ? kind.slice(0, -1) : kind;
  const map = { task: 'task', tasks: 'task', incident: 'incident', incidents: 'incident', lesson: 'lesson', lessons: 'lesson', handoff: 'handoff', handoffs: 'handoff', evidence: 'evidence', decision: 'decision', decisions: 'decision' };
  const schemaKey = map[schemaName] ?? schemaName;
  const schema = loadSchema(schemaKey);
  const errors = [];
  const draftLesson = schemaKey === 'lesson' && record.status === 'draft';

  if (!checkType(record, schema.type)) {
    errors.push(`Record must be a ${schema.type}.`);
    return { valid: false, errors };
  }

  for (const field of schema.required ?? []) {
    if (record[field] === undefined || record[field] === null || record[field] === '') {
      if (draftLesson && field === 'validationEvidenceIds') continue;
      errors.push(`${field} is required.`);
    }
  }

  for (const [field, propertySchema] of Object.entries(schema.properties ?? {})) {
    if (record[field] !== undefined) validateProperty(record[field], propertySchema, field, errors, { draftLesson });
  }

  return { valid: errors.length === 0, errors };
}
