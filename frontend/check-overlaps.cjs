const fs = require('fs');
const path = require('path');

// Read the constants.ts file
const constantsPath = path.join(__dirname, 'src', 'lib', 'constants.ts');
const constantsContent = fs.readFileSync(constantsPath, 'utf8');

// Read the utils.ts file
const utilsPath = path.join(__dirname, 'src', 'lib', 'utils.ts');
const utilsContent = fs.readFileSync(utilsPath, 'utf8');

// Extract normalizeKey function
const normalizeKey = function(text) {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/\s+/g, '_');
};

// Extract PLAN_CATEGORY_LABELS
const planCategoryLabelsMatch = constantsContent.match(/export const PLAN_CATEGORY_LABELS = \[([\s\S]*?)\] as const;/);
const planCategoryLabels = planCategoryLabelsMatch ? planCategoryLabelsMatch[1]
  .split(',')
  .map(label => label.trim())
  .filter(label => label.startsWith("'"))
  .map(label => label.slice(1, -1)) : [];

// Extract DECLARATION_CONFIG
const declarationConfigMatch = constantsContent.match(/const DECLARATION_CONFIG: Record<string, CategoryConfig> = {([\s\S]*?)};/);
const declarationConfig = declarationConfigMatch ? declarationConfigMatch[1]
  .split('}')
  .map(entry => entry.trim())
  .filter(entry => entry.startsWith("'") || entry.includes(':'))
  .map(entry => {
    const keyMatch = entry.match(/^(\w+):/);
    return keyMatch ? keyMatch[1] : null;
  })
  .filter(Boolean) : [];

// Check for overlapping keys
const planKeys = new Set(planCategoryLabels.map(label => normalizeKey(label)));
const declarationKeys = new Set(declarationConfig);
const overlappingKeys = [];

declarationKeys.forEach(key => {
  if (planKeys.has(key)) {
    overlappingKeys.push(key);
  }
});

console.log('Plan category labels:', planCategoryLabels.length);
console.log('Declaration config keys:', declarationConfig.length);
console.log('Overlapping keys:', overlappingKeys);