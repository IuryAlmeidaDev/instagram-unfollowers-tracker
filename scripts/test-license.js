// scripts/test-license.js
const { generateLicenseKey, isValidLicenseKey } = require('../api/license-utils');

const key = generateLicenseKey();
console.log('Chave gerada:', key);
const valid = isValidLicenseKey(key);
console.log('Validação:', valid ? 'SUCESSO' : 'FALHA');

if (!valid) {
  process.exit(1);
}
console.log('Teste de geração e validação de chave passou!');
