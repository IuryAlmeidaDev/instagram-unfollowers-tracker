# Guia de Deploy na Vercel e Ativação da Pushin Pay

Este guia explica como colocar a sua API de pagamentos Pix no ar na **Vercel** (grátis), vincular com a sua conta da **Pushin Pay** e conectar com a extensão no Chrome.

---

## 1. Como a Arquitetura Funciona

```text
[ Cliente no Instagram ]
         │
         ▼
[ Extensão Chrome ] ───(POST /api/create)───► [ Vercel Serverless ]
         ▲                                            │ (com Token Seguro)
         │                                            ▼
         └──────(GET /api/status?id=...)─────── [ Pushin Pay API ]
```

- **Seu Token Secreto da Pushin Pay** fica 100% protegido na Vercel (nunca é exposto na extensão).
- **Sem taxa fixa pesada:** Você recebe ~R$ 9,50 a R$ 9,80 líquidos por cada venda de R$ 9,99.
- **Ativação automática:** Assim que o cliente faz o Pix no banco, a extensão detecta em 3 segundos, ativa o PRO vitalício e entrega a chave de recuperação na tela.

---

## 2. Passo a Passo: Subindo a API para a Vercel

Como o projeto está estruturado como um monólito, a pasta `/api` na raiz do repositório já contém as rotas serverless (`api/create.js`, `api/status.js`, `api/license-utils.js`).

### Opção A: Pelo Dashboard Web da Vercel (Mais Fácil)
1. Acesse **[vercel.com](https://vercel.com)** e faça login com seu GitHub.
2. Clique em **"Add New..." > "Project"**.
3. Selecione o repositório da sua extensão (`instagram-nao-seguidores`).
4. **Framework Preset:** Selecione `Other`.
5. **Root Directory:** Deixe `./` (raiz).
6. Na seção **Environment Variables**, adicione:
   - **Key:** `PUSHIN_PAY_TOKEN`
   - **Value:** Cole o seu Token da Pushin Pay (gerado em *app.pushinpay.com.br > Integrações / API*).
7. Clique em **"Deploy"**.
8. Em menos de 1 minuto, a Vercel fornecerá a URL pública do seu projeto:
   `https://seu-projeto.vercel.app`

### Opção B: Pela CLI da Vercel
Se você tiver a CLI da Vercel instalada no terminal:
```bash
cd C:\Users\iuryc\projects\instagram-nao-seguidores
vercel
```
Siga os prompts e adicione a variável com:
```bash
vercel env add PUSHIN_PAY_TOKEN
```

---

## 3. Conectando a URL da Vercel na Extensão

1. Abra o arquivo `content.js` na raiz do projeto.
2. Na linha **1218**, localize a constante:
   ```javascript
   const PIX_API_URL = 'https://instagram-nao-seguidores.vercel.app/api';
   ```
3. Substitua pela URL gerada pela sua Vercel:
   ```javascript
   const PIX_API_URL = 'https://SEU-PROJETO.vercel.app/api';
   ```
4. Salve o arquivo.

### Dica para Testes Rápidos sem Editar Código:
Você também pode sobrescrever a URL temporariamente via console do navegador no Instagram:
```javascript
localStorage.setItem('IG_PIX_API_URL', 'https://SEU-PROJETO.vercel.app/api');
```
Para voltar ao padrão:
```javascript
localStorage.removeItem('IG_PIX_API_URL');
```

---

## 4. Como Testar no Modo Simulado (Mock) Sem Gastar 1 Centavo

A API foi desenvolvida com suporte inteligente a **Modo Simulado**:

- Se você ainda **não adicionou** o `PUSHIN_PAY_TOKEN` na Vercel, ou se estiver testando localmente, a API entra automaticamente em modo Mock.
- Ela gera um QR Code de teste imediatamente.
- Após **8 segundos**, o endpoint de status simula a aprovação automática do pagamento, liberando o plano PRO e gerando uma chave de licença válida na tela!

### Para testar na prática:
1. Abra o Chrome e vá em `chrome://extensions/`.
2. Ative o **Modo do desenvolvedor** (canto superior direito).
3. Localize a extensão **"Quem Não Me Segue"** e clique no ícone circular de **Recarregar (🔄)**.
4. Abra o Instagram Web (`https://www.instagram.com`).
5. Abra o painel da extensão e vá até a aba **PRO**.
6. Clique em **"⚡ Pagar R$ 9,99 no PIX (Liberar Agora)"**.
7. O modal exibirá o QR Code e o botão de copiar o código Pix.
8. Ao detectar a confirmação, o modal se transforma na tela de comemoração, ativa o PRO e entrega sua Chave de Licença de Backup!

---

## 5. Chaves de Licença e Ativação Offline

- Caso o usuário formate o computador ou queira ativar em outro navegador, basta abrir a aba PRO no Instagram e clicar em **"Já tem uma chave de licença? Ativar aqui"**.
- As chaves geradas seguem o formato:
  `IGPRO-XXXXX-XXXXX-XXXXX`
- Todas as chaves são validadas de forma matemática e offline pelo algoritmo criptográfico do `content.js`.
- Para fins de suporte ou demonstração técnica, a chave master `PRO-VIP-2026` também é aceita como válida.
