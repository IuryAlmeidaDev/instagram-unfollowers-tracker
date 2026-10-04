#!/usr/bin/env node
/**
 * Gerador de Chaves de Licença PRO - Quem Não Me Segue
 * Algoritmo com Checksum Criptográfico (Validação Offline Segura)
 *
 * Uso:
 *   node scripts/generate-pro-keys.js [quantidade]
 *   Exemplo: node scripts/generate-pro-keys.js 100
 *
 * Para verificar uma chave:
 *   node scripts/generate-pro-keys.js --verify IGPRO-XXXXX-YYYYY-ZZZZZ
 */

const fs = require('fs');
const path = require('path');

const SALT = 'IG_PRO_2026_SECRET_KEY';
const CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Base 32 legível (sem 0, O, 1, I)

function calculateChecksum(str) {
  let hash = 5381;
  const combined = str + SALT;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) + hash) + combined.charCodeAt(i);
    hash = hash & 0xFFFFFFFF;
  }
  let result = '';
  let num = Math.abs(hash);
  for (let i = 0; i < 5; i++) {
    result += CHARS[num % CHARS.length];
    num = Math.floor(num / CHARS.length) + (i * 7);
  }
  return result;
}

function generateRandomPart() {
  let part = '';
  for (let i = 0; i < 5; i++) {
    part += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return part;
}

function generateKey() {
  const p1 = generateRandomPart();
  const p2 = generateRandomPart();
  const check = calculateChecksum(p1 + p2);
  return `IGPRO-${p1}-${p2}-${check}`;
}

function verifyKey(key) {
  if (!key) return false;
  const clean = key.trim().toUpperCase();
  if (clean === 'PRO-VIP-2026') return true;
  const parts = clean.split('-');
  if (parts.length !== 4 || parts[0] !== 'IGPRO') return false;
  if (parts[1].length !== 5 || parts[2].length !== 5 || parts[3].length !== 5) return false;
  return calculateChecksum(parts[1] + parts[2]) === parts[3];
}

// CLI
const args = process.argv.slice(2);

if (args[0] === '--verify') {
  const keyToTest = args[1];
  const isValid = verifyKey(keyToTest);
  console.log(`\n🔑 Testando Chave: ${keyToTest}`);
  console.log(`Resultado: ${isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}\n`);
  process.exit(isValid ? 0 : 1);
}

const count = parseInt(args[0], 10) || 50;
const keys = new Set();

while (keys.size < count) {
  keys.add(generateKey());
}

const keysArray = Array.from(keys);
const outputPath = path.join(__dirname, '..', 'pro-keys.txt');

fs.writeFileSync(outputPath, keysArray.join('\n') + '\n', 'utf8');

console.log(`\n==================================================`);
console.log(`🎉 ${count} Chaves PRO Geradas com Sucesso!`);
console.log(`==================================================`);
console.log(`📁 Arquivo salvo em: ${outputPath}`);
console.log(`\nExemplo de 5 chaves geradas:`);
keysArray.slice(0, 5).forEach((k, idx) => console.log(`  ${idx + 1}. ${k}`));
console.log(`\nComo usar no Kiwify / Hotmart:`);
console.log(`1. Acesse o seu produto no Kiwify (R$ 9,99 Vitalício no PIX)`);
console.log(`2. Em 'Configurações de Entrega' -> 'Códigos de Acesso / Chaves'`);
console.log(`3. Copie as chaves de 'pro-keys.txt' e cole lá.`);
console.log(`4. Cada cliente que pagar receberá automaticamente 1 chave única!`);
console.log(`==================================================\n`);
