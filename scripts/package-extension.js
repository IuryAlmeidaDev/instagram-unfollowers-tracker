#!/usr/bin/env node
/**
 * Empacotador Automático para a Chrome Web Store
 * Gera um arquivo ZIP limpo contendo apenas os artefatos de produção.
 *
 * Uso:
 *   node scripts/package-extension.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const STAGING_DIR = path.join(DIST_DIR, 'unpacked');

// 1. Carregar manifest para pegar a versão
const manifestPath = path.join(ROOT_DIR, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error('❌ Erro: manifest.json não encontrado!');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const version = manifest.version || '1.0.0';
const zipName = `quem-nao-me-segue-v${version}.zip`;
const zipPath = path.join(DIST_DIR, zipName);

console.log(`\n==================================================`);
console.log(`📦 Empacotando Quem Não Me Segue - v${version}`);
console.log(`==================================================\n`);

// 2. Limpar e criar pastas de build
if (fs.existsSync(DIST_DIR)) {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
}
fs.mkdirSync(STAGING_DIR, { recursive: true });

// 3. Arquivos e pastas essenciais de produção
const PRODUCTION_FILES = [
  'manifest.json',
  'background.js',
  'content.js',
  'popup.html',
  'popup.js',
  'styles.css'
];

const PRODUCTION_DIRS = [
  'icons'
];

// Copiar arquivos
for (const file of PRODUCTION_FILES) {
  const src = path.join(ROOT_DIR, file);
  const dest = path.join(STAGING_DIR, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✓ Copiado: ${file}`);
  } else {
    console.warn(`⚠️ Aviso: ${file} não encontrado na raiz.`);
  }
}

// Copiar pastas recursivamente
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

for (const dir of PRODUCTION_DIRS) {
  const src = path.join(ROOT_DIR, dir);
  const dest = path.join(STAGING_DIR, dir);
  if (fs.existsSync(src)) {
    copyDir(src, dest);
    console.log(`✓ Copiada pasta: ${dir}/`);
  }
}

// 4. Compactar para ZIP usando PowerShell no Windows
console.log(`\nGerando arquivo compactado: ${zipName}...`);
try {
  const psCommand = `powershell -NoProfile -Command "Compress-Archive -Path '${STAGING_DIR}/*' -DestinationPath '${zipPath}' -Force"`;
  execSync(psCommand, { stdio: 'inherit' });
  
  const stats = fs.statSync(zipPath);
  const sizeKB = (stats.size / 1024).toFixed(1);

  console.log(`\n==================================================`);
  console.log(`✅ Pacote Pronto para Publicação!`);
  console.log(`==================================================`);
  console.log(`📦 Arquivo: ${zipPath}`);
  console.log(`⚖️ Tamanho: ${sizeKB} KB`);
  console.log(`\nPróximo passo:`);
  console.log(`1. Acesse https://chrome.google.com/webstore/devcenter`);
  console.log(`2. Clique em 'Novo item' (New Item)`);
  console.log(`3. Arraste e solte o arquivo ${zipName}!`);
  console.log(`==================================================\n`);
} catch (err) {
  console.error('❌ Erro ao compactar arquivo ZIP:', err);
  process.exit(1);
}
