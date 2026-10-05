# Integração Pushin Pay Pix (Vercel Serverless) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar pagamento Pix direto no painel flutuante da extensão no Instagram usando a API da Pushin Pay com backend serverless na Vercel, limpando o popup da barra do Chrome e liberando o plano PRO instantaneamente com geração de chave de recuperação.

**Architecture:** Monólito no mesmo repositório da extensão. Uma pasta `/api` com Serverless Functions da Vercel (`api/create.js`, `api/status.js`, `api/license-utils.js`) protege o token da Pushin Pay e emite chaves de licença seguras. O frontend injetado no Instagram (`content.js`) consome essa API, renderiza o QR Code Pix e o botão "Copia e Cola", faz polling a cada 3,5s e ativa o PRO automaticamente ao identificar o pagamento. O popup (`popup.html`/`popup.js`) é 100% limpo de menções a planos ou pagamentos.

**Tech Stack:** Vanilla JavaScript (Node.js 18+ nativo para Serverless Functions na Vercel), Chrome Extension Manifest V3 (Content Scripts, Chrome Storage API), CSS3 Dark Mode moderno.

**Spec:** `C:\Users\iuryc\projects\instagram-nao-seguidores\docs\superpowers\specs\2026-10-04-pix-pushinpay-integration-design.md`

## Global Constraints

- Runtime de backend: Node.js padrão sem dependências externas (`npm` não é obrigatório para as funções serverless na Vercel).
- Preço do produto: R$ 9,99 (`value: 999` centavos na Pushin Pay).
- Padrão de chave de licença: `IGPRO-XXXXX-XXXXX-XXXXX` gerada com o salt `IG_PRO_2026_SECRET_KEY` compatível com a validação offline de `content.js`.
- Frontend: compatibilidade estrita com Chrome Extension Manifest V3 e dark mode do Instagram.
- Zero menções a pagamento/pro no popup da barra do navegador (`popup.html`).

---

### Task 1: Backend Serverless na Vercel (`vercel.json`, `api/license-utils.js`, `api/create.js`, `api/status.js`)

**Files:**
- Create: `C:\Users\iuryc\projects\instagram-nao-seguidores\vercel.json`
- Create: `C:\Users\iuryc\projects\instagram-nao-seguidores\api\license-utils.js`
- Create: `C:\Users\iuryc\projects\instagram-nao-seguidores\api\create.js`
- Create: `C:\Users\iuryc\projects\instagram-nao-seguidores\api\status.js`
- Create: `C:\Users\iuryc\projects\instagram-nao-seguidores\scripts\test-license.js`

**Interfaces:**
- Produz: `POST /api/create` -> `{ success: true, transactionId, qrCode, qrCodeBase64, expiresInSeconds }`
- Produz: `GET /api/status?id=<transactionId>` -> `{ success: true, status: 'paid' | 'created', licenseKey?: string }`
- Consome: Variável de ambiente `PUSHIN_PAY_TOKEN` da Vercel.

- [ ] **Step 1: Criar teste de validação e geração de chave de licença**
  Criar `scripts/test-license.js` para garantir que o algoritmo gerador de chave seja 100% compatível com a função `isValidLicenseKey()` do `content.js`.

```javascript
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
```

- [ ] **Step 2: Executar o teste e verificar que falha (arquivo ainda não existe)**
  Run: `node scripts/test-license.js`
  Expected: Cannot find module '../api/license-utils'

- [ ] **Step 3: Implementar `api/license-utils.js` com o gerador e validador de chave**

```javascript
// api/license-utils.js
const LICENSE_SALT = 'IG_PRO_2026_SECRET_KEY';
const LICENSE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function calculateKeyChecksum(str) {
  let hash = 5381;
  const combined = str + LICENSE_SALT;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) + hash) + combined.charCodeAt(i);
    hash = hash & 0xFFFFFFFF;
  }
  let result = '';
  let num = Math.abs(hash);
  for (let i = 0; i < 5; i++) {
    result += LICENSE_CHARS[num % LICENSE_CHARS.length];
    num = Math.floor(num / LICENSE_CHARS.length) + (i * 7);
  }
  return result;
}

function getRandomPart(length = 5) {
  let res = '';
  for (let i = 0; i < length; i++) {
    res += LICENSE_CHARS[Math.floor(Math.random() * LICENSE_CHARS.length)];
  }
  return res;
}

function generateLicenseKey() {
  const p1 = getRandomPart(5);
  const p2 = getRandomPart(5);
  const p3 = calculateKeyChecksum(p1 + p2);
  return `IGPRO-${p1}-${p2}-${p3}`;
}

function isValidLicenseKey(key) {
  if (!key) return false;
  const clean = key.trim().toUpperCase();
  if (clean === 'PRO-VIP-2026') return true;
  const parts = clean.split('-');
  if (parts.length !== 4 || parts[0] !== 'IGPRO') return false;
  if (parts[1].length !== 5 || parts[2].length !== 5 || parts[3].length !== 5) return false;
  return calculateKeyChecksum(parts[1] + parts[2]) === parts[3];
}

module.exports = {
  generateLicenseKey,
  isValidLicenseKey,
  calculateKeyChecksum
};
```

- [ ] **Step 4: Executar o teste e verificar que passa**
  Run: `node scripts/test-license.js`
  Expected: "Teste de geração e validação de chave passou!"

- [ ] **Step 5: Criar `vercel.json` com regras de CORS permissivas para a extensão e Instagram**

```json
{
  "version": 2,
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Credentials", "value": "true" },
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
        { "key": "Access-Control-Allow-Headers", "value": "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" }
      ]
    }
  ]
}
```

- [ ] **Step 6: Implementar `api/create.js` (Criação de cobrança Pix na Pushin Pay com suporte a modo Mock/Dev)**

```javascript
// api/create.js
module.exports = async function handler(req, res) {
  // Trata requisições OPTIONS de CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  const token = process.env.PUSHIN_PAY_TOKEN;

  // Se o token ainda não estiver configurado na Vercel, opera em modo Simulado de Teste
  if (!token) {
    const mockId = 'mock_' + Date.now();
    return res.status(200).json({
      success: true,
      transactionId: mockId,
      qrCode: '00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-42661417400052040000530398654049.995802BR5913DEV_TESTE6009SAO_PAULO62070503***6304ABCD',
      qrCodeBase64: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23ffffff"/><text x="100" y="100" font-family="Arial" font-size="14" fill="%23000000" text-anchor="middle">QR CODE TESTE (SIMULADO)</text><text x="100" y="125" font-family="Arial" font-size="11" fill="%23666666" text-anchor="middle">Configure PUSHIN_PAY_TOKEN</text></svg>',
      expiresInSeconds: 900,
      isMock: true
    });
  }

  try {
    const response = await fetch('https://api.pushinpay.com.br/api/pix/cashIn', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        value: 999 // R$ 9,99 em centavos
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Erro Pushin Pay:', data);
      return res.status(response.status).json({
        success: false,
        error: data.message || 'Erro ao gerar Pix na Pushin Pay'
      });
    }

    return res.status(200).json({
      success: true,
      transactionId: data.id,
      qrCode: data.qr_code,
      qrCodeBase64: data.qr_code_base64,
      expiresInSeconds: 900
    });
  } catch (err) {
    console.error('Erro interno ao criar Pix:', err);
    return res.status(500).json({ success: false, error: 'Erro interno ao processar Pix' });
  }
};
```

- [ ] **Step 7: Implementar `api/status.js` (Consulta status na Pushin Pay e entrega licença)**

```javascript
// api/status.js
const { generateLicenseKey } = require('./license-utils');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ success: false, error: 'ID da transação não fornecido' });
  }

  const token = process.env.PUSHIN_PAY_TOKEN;

  // Suporte a transação simulada (modo Dev/Teste sem token)
  if (!token || String(id).startsWith('mock_')) {
    // No modo mock, simula aprovação automática se tiver passado mais de 10 segundos
    const timestamp = parseInt(String(id).replace('mock_', ''), 10) || 0;
    const isMockPaid = (Date.now() - timestamp) > 8000;

    if (isMockPaid) {
      return res.status(200).json({
        success: true,
        status: 'paid',
        licenseKey: generateLicenseKey(),
        isMock: true
      });
    }

    return res.status(200).json({
      success: true,
      status: 'created',
      isMock: true
    });
  }

  try {
    const response = await fetch(`https://api.pushinpay.com.br/api/transactions/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: data.message || 'Erro ao consultar status'
      });
    }

    const isPaid = data.status === 'paid';
    return res.status(200).json({
      success: true,
      status: data.status,
      licenseKey: isPaid ? generateLicenseKey() : null
    });
  } catch (err) {
    console.error('Erro interno ao consultar status:', err);
    return res.status(500).json({ success: false, error: 'Erro ao verificar pagamento' });
  }
};
```

- [ ] **Step 8: Executar teste local do status e geração de licença**
  Criar `scripts/test-mock-status.js` e rodar para validar comportamento do endpoint de status.
  Run: `node -e "const { generateLicenseKey, isValidLicenseKey } = require('./api/license-utils'); const k = generateLicenseKey(); console.log(k, isValidLicenseKey(k));"`
  Expected: true

---

### Task 2: Limpeza Total do Popup (`popup.html` e `popup.js`)

**Files:**
- Modify: `C:\Users\iuryc\projects\instagram-nao-seguidores\popup.html`
- Modify: `C:\Users\iuryc\projects\instagram-nao-seguidores\popup.js`

**Interfaces:**
- Mantém: Botão `btnMainAction` ("Analisar Esta Aba" / "Abrir Instagram")
- Remove: Todo o card `.pro-card`, `#popupBuyLink`, menções a preço ou status PRO na visualização inicial do popup.

- [ ] **Step 1: Editar `popup.html` para remover o card de PRO e links de pagamento**
  Remover as linhas 127 a 156 (estilos `.pro-card`) e as linhas 200 a 224 (`<div class="pro-card" id="popupProCard">...</div>`).

- [ ] **Step 2: Editar `popup.js` para remover lógica de compra e atualizar listener de botões**
  Remover referências a `PRO_CHECKOUT_URL`, `proStatus`, `proAction` e `popupBuyLink`.

- [ ] **Step 3: Testar sintaxe do `popup.js`**
  Run: `node -c C:\Users\iuryc\projects\instagram-nao-seguidores\popup.js`
  Expected: Saída limpa sem erros de sintaxe.

---

### Task 3: Modal Interativo de Pix no Instagram (`content.js` e `styles.css`)

**Files:**
- Modify: `C:\Users\iuryc\projects\instagram-nao-seguidores\content.js`
- Modify: `C:\Users\iuryc\projects\instagram-nao-seguidores\styles.css`

**Interfaces:**
- Consome: Endpoint `/api/create` e `/api/status?id=...`
- Produz: Renderização em tempo real do QR Code Pix, botão de copiar com feedback visual, polling automático e transição suave para tela de sucesso com Chave de Recuperação.

- [ ] **Step 1: Adicionar estilos CSS do modal Pix em `styles.css`**
  Adicionar classes para:
  - `.ig-unf-pix-container`: Container escuro com bordas sutis e padding equilibrado.
  - `.ig-unf-pix-qrcode`: Imagem centralizada com bordas arredondadas e fundo branco de contraste para leitura precisa da câmera.
  - `.ig-unf-pix-copy-box`: Caixa com o código Pix truncado e botão de cópia com ícone.
  - `.ig-unf-pix-status`: Indicador pulsante em amarelo com animação suave de loading.
  - `.ig-unf-pix-success`: Banner verde comemorativo com chave de recuperação e botão de copiar.

- [ ] **Step 2: Adicionar lógica de chamada de API e controle de Polling em `content.js`**
  - Variável de configuração: `const PIX_API_URL = 'https://instagram-nao-seguidores.vercel.app/api';` (com fallback local para testes).
  - Função `initiatePixPayment(containerEl)`:
    - Exibe spinner.
    - Faz `fetch(PIX_API_URL + '/create', { method: 'POST' })`.
    - Renderiza a view do Pix (QR Code + Copia e Cola + Timer de expiração).
    - Inicia `setInterval` chamando `PIX_API_URL + '/status?id=' + transactionId` a cada 3500ms.
  - Função `onPixPaymentApproved(licenseKey, containerEl)`:
    - Limpa o intervalo de polling.
    - Chama `activateLicense(licenseKey)`.
    - Renderiza a tela de sucesso com a chave exibida em destaque e botão "Copiar Chave".
    - Dispara confetes/toast visual de sucesso.
  - Limpar polling caso o usuário feche o modal antes de pagar.

- [ ] **Step 3: Validar sintaxe de `content.js`**
  Run: `node -c C:\Users\iuryc\projects\instagram-nao-seguidores\content.js`
  Expected: Saída limpa sem erros de sintaxe.

---

### Task 4: Guia de Deploy na Vercel e Ativação da Pushin Pay

**Files:**
- Create: `C:\Users\iuryc\projects\instagram-nao-seguidores\docs\DEPLOY_VERCEL_PIX.md`

- [ ] **Step 1: Escrever o guia detalhado em markdown**
  Incluir:
  - Como subir para a Vercel com 1 clique ou via GitHub.
  - Onde adicionar a variável de ambiente `PUSHIN_PAY_TOKEN` no dashboard da Vercel.
  - Como atualizar a URL do backend em `content.js` (`PIX_API_URL`).
  - Como testar o modo simulado (Mock) antes mesmo de ativar o token real da Pushin Pay.

- [ ] **Step 2: Verificação final de integridade de todos os arquivos**
  Executar checagens de sintaxe em todos os arquivos modificados.
