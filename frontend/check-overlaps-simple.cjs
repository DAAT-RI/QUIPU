const fs = require('fs');
const path = require('path');

const constantsPath = path.join(__dirname, 'src', 'lib', 'constants.ts');
const constantsContent = fs.readFileSync(constantsPath, 'utf8');

// Extract PLAN_CATEGORY_LABELS and DECLARATION_CONFIG keys
const planLabels = constantsContent
  .split('export const PLAN_CATEGORY_LABELS = [')[1]
  .split('] as const;')[0]
  .split(',')
  .map(label => label.trim())
  .filter(label => label.startsWith("'"))
  .map(label => label.slice(1, -1));

const declarationKeys = constantsContent
  .split('const DECLARATION_CONFIG: Record<string, CategoryConfig> = {')[1]
  .split('};')[0]
  .split('}')
  .map(entry => entry.trim())
  .filter(entry => entry.includes(':'))
  .map(entry => entry.split(':')[0].trim());

const normalizeKey = function(text) {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/\s+/g, '_');
};

const planKeys = new Set(planLabels.map(label => normalizeKey(label)));
const overlappingKeys = [];

declarationKeys.forEach(key => {
  if (planKeys.has(key)) {
    overlappingKeys.push(key);
  }
});

console.log('Plan category count:', planLabels.length);
console.log('Declaration category count:', declarationKeys.length);
console.log('Overlapping keys:', overlappingKeys);