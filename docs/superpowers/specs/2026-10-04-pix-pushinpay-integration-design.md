# Especificação Técnica: Integração de Pagamento Pix com Pushin Pay via Vercel Serverless

- **Data:** 04/10/2026
- **Status:** Aprovado para Implementação
- **Projeto:** Quem Não Me Segue - Detector para Instagram™ (`C:\Users\iuryc\projects\instagram-nao-seguidores`)
- **Objetivo:** Permitir que o usuário pague R$ 9,99 via Pix diretamente no painel flutuante da extensão no Instagram, com ativação automática instantânea e sem menções a pagamento no popup da barra de ferramentas do Chrome.

---

## 1. Visão Geral e Requisitos

### 1.1 Objetivos de Negócio & UX
1. **Zero atrito no checkout:** O usuário clica em "Virar PRO" dentro do painel do Instagram e recebe o QR Code e o código "Copia e Cola" do Pix imediatamente, sem sair da página do Instagram nem preencher formulários externos (Kiwify eliminado).
2. **Taxa ultrabaixa:** Utilizar a Pushin Pay com taxa percentual baixa (eliminando a taxa fixa de R$ 2,49 da Kiwify que consumia 34% de uma venda de R$ 9,99).
3. **Popup 100% limpo:** Nenhuma menção a "PRO", "FREE", "Pagar" ou links de compra no popup da barra do Chrome (`popup.html` / `popup.js`). O usuário comum não deve ver de cara que existem recursos pagos.
4. **Ativação Instantânea (Polling):** A extensão detecta a confirmação do pagamento em 2 a 5 segundos após o Pix ser feito no app do banco e desbloqueia os recursos na hora.
5. **Recuperação de Licença:** Ao aprovar o pagamento, o sistema gera e exibe uma chave de licença no formato `IGPRO-XXXXX-XXXXX-XXXXX` para o usuário salvar e reutilizar se trocar de computador ou navegador.

---

## 2. Arquitetura do Sistema (Monólito no Repositório)

```text
instagram-nao-seguidores/
├── api/
│   ├── create.js        # Serverless Function: Cria cobrança Pix na Pushin Pay
│   └── status.js        # Serverless Function: Consulta status e emite licença se pago
├── vercel.json          # Configuração de CORS e headers para a API
├── content.js           # Modal do Instagram com tela de QR Code Pix, polling e ativação
├── styles.css           # Estilos Dark Mode do QR Code, botão de cópia e animações
├── popup.html           # Popup limpo (sem menção a PRO/compra)
├── popup.js             # Lógica simplificada do popup
└── manifest.json        # Declaração dos scripts e permissões da extensão
```

---

## 3. Especificação do Backend Serverless (Vercel)

As rotas residem na pasta `/api` e rodam no runtime Node.js nativo (sem dependências npm).

### 3.1 `vercel.json`
Configura CORS permissivo para requisições com origem `https://www.instagram.com` e preflight `OPTIONS`:
```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,POST,OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type,Authorization" }
      ]
    }
  ]
}
```

### 3.2 Variáveis de Ambiente na Vercel
- `PUSHIN_PAY_TOKEN`: Bearer token gerado no painel da Pushin Pay.

### 3.3 `POST /api/create`
- **Função:** Recebe o pedido da extensão e solicita a cobrança Pix à Pushin Pay.
- **Chamada upstream:**
  - `POST https://api.pushinpay.com.br/api/pix/cashIn`
  - Headers: `Authorization: Bearer <PUSHIN_PAY_TOKEN>`, `Content-Type: application/json`, `Accept: application/json`
  - Body: `{ "value": 999 }` (R$ 9,99 em centavos).
- **Resposta da API para a extensão:**
  ```json
  {
    "success": true,
    "transactionId": 123456,
    "qrCode": "00020126580014br.gov.bcb.pix...",
    "qrCodeBase64": "data:image/png;base64,iVBORw0KGgo...",
    "expiresInSeconds": 900
  }
  ```

### 3.4 `GET /api/status?id=<transactionId>`
- **Função:** Consulta a Pushin Pay para verificar se o pagamento foi concluído.
- **Chamada upstream:**
  - `GET https://api.pushinpay.com.br/api/transactions/<transactionId>`
  - Headers: `Authorization: Bearer <PUSHIN_PAY_TOKEN>`, `Accept: application/json`
- **Se `status === 'paid'`:**
  - O backend gera uma chave de licença matematicamente válida pelo mesmo algoritmo do `content.js` (`IGPRO-XXXXX-XXXXX-XXXXX`).
  - Retorna:
    ```json
    {
      "success": true,
      "status": "paid",
      "licenseKey": "IGPRO-77ZT4-79B2D-F2PKB"
    }
    ```
- **Se `status === 'created'`:**
  - Retorna `{ "success": true, "status": "created" }`.

---

## 4. Especificação do Frontend

### 4.1 Limpeza do Popup (`popup.html` e `popup.js`)
- Remover:
  - Elemento `.pro-card` e `#popupProCard`.
  - Elementos `#popupBuyLink`, `#popupProStatus`, `#popupProActionArea`.
  - Referências à constante `PRO_CHECKOUT_URL` no `popup.js`.
- Manter:
  - Cabeçalho com logo e badges de segurança.
  - Cards de informações institucionais.
  - Botão principal: "Analisar Esta Aba" / "Abrir Instagram".
  - Notificações de desktop (somente se já for PRO, caso contrário oculto).

### 4.2 Modal no Instagram (`content.js` e `styles.css`)
- Quando o usuário abre o modal PRO:
  - **Estado 1: Oferta Inicial:**
    - Card com "R$ 9,99 vitalício no PIX".
    - Botão: `[ ⚡ Pagar R$ 9,99 no PIX (Liberar Agora) ]`.
    - Link sutil para ativar com chave já existente ("Já tem uma chave de licença? Ativar aqui").
  - **Estado 2: Gerando e Exibindo Pix:**
    - Spinner de carregamento rápido.
    - Imagem do QR Code renderizada (`<img src="${qrCodeBase64}">`).
    - Campo e botão de ação com ícone: `[ 📋 Copiar Código Pix ]`.
    - Ao clicar em copiar: feedback visual imediato "✓ Código Pix copiado!".
    - Status animado: `🟡 Aguardando pagamento... (confirmação em tempo real)`.
    - Polling ativo a cada 3,5 segundos consultando `/api/status?id=...`.
  - **Estado 3: Sucesso e Desbloqueio:**
    - Polling identifica `status === 'paid'`.
    - Grava `ig_is_pro: true` e `ig_pro_license: licenseKey` no `chrome.storage.local`.
    - Atualiza imediatamente a variável local `isPro = true` e chama `updateProUiState()`.
    - Exibe banner de celebração: `🎉 Pagamento Confirmado! Seu Plano PRO foi ativado com sucesso!`.
    - Exibe a caixa de **Chave de Recuperação** com botão de copiar: *"Guarde esta chave. Use-a caso troque de computador: `IGPRO-XXXXX-XXXXX-XXXXX`"*.
    - Botão `[ Concluir e Usar Recursos PRO ]` que fecha o modal ou exibe as funções desbloqueadas.

---

## 5. Tratamento de Erros & Resiliência
1. **Falha na chamada da API / Offline:**
   - Mensagem clara na interface com botão de tentar novamente (`[ 🔄 Tentar Novamente ]`).
2. **Timeout do Pix:**
   - Se passar de 15 minutos sem pagamento, o polling para e exibe opção de gerar novo Pix.
3. **Cancelamento do Modal:**
   - Se o usuário fechar o modal, o polling é cancelado via `clearInterval` para evitar consumo desnecessário de requisições.

---

## 6. Plano de Verificação e Testes
1. **Teste unitário da geração de licença:** Garantir que as chaves geradas em `api/status.js` sejam validadas com sucesso pela função `isValidLicenseKey()` do `content.js`.
2. **Teste do popup:** Abrir `popup.html` e verificar que não há nenhum vestígio de links de compra ou status de paywall.
3. **Teste do fluxo de UI:** Simular resposta mock de criação de Pix e confirmação de pagamento para validar transição de telas sem travamentos.
4. **Deploy na Vercel:** Configurar a variável `PUSHIN_PAY_TOKEN` e testar a geração real de um QR Code Pix.
