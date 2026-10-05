# Política de Privacidade / Privacy Policy

**Última atualização / Last updated:** 05 de outubro de 2026

Esta Política de Privacidade descreve como a extensão **Quem Não Me Segue - Detector para Instagram™** ("nós", "nosso" ou "a extensão") lida com as informações dos usuários.

---

## 1. Princípio Fundamental de Privacidade (Zero Coleta Externa)

A extensão **Quem Não Me Segue** foi projetada com foco total na privacidade e na segurança do usuário. 
- **NÃO coletamos, transmitimos, vendemos ou compartilhamos** quaisquer dados pessoais, credenciais, histórico de navegação ou listas de seguidores com servidores de terceiros ou ferramentas de rastreamento.
- **NUNCA solicitamos sua senha do Instagram.** A extensão funciona exclusivamente aproveitando a sessão que já está ativa no seu próprio navegador no site oficial `instagram.com`.

---

## 2. Dados Processados e Armazenamento Local

- **Processamento em Memória Local:** As informações de seguidores e seguidos do seu perfil são lidas diretamente da interface do Instagram Web e comparadas localmente no seu computador através de scripts executados na sua máquina.
- **Chrome Storage API:** As configurações de preferência (como intervalos de pausa antibloqueio) e o histórico de análises ficam armazenados unicamente no armazenamento local do seu próprio navegador (`chrome.storage.local`). Nenhuma dessas informações é enviada para a nuvem.
- **Chave de Licença PRO:** Ao efetuar o pagamento da versão PRO via Pix, a chave de licença gerada é validada de forma matemática e offline no navegador, sendo salva no armazenamento local da extensão.

---

## 3. Permissões Solicitadas no Manifesto (Chrome MV3)

- **`storage`**: Necessária para salvar localmente suas preferências e o histórico de contatos na sua máquina.
- **`alarms`**: Utilizada para gerenciar pausas antibloqueio e agendamentos de descanso entre requisições.
- **`notifications`**: Utilizada para enviar notificações locais no sistema quando uma análise de contatos for finalizada.
- **Host permissions (`https://*.instagram.com/*`)**: Necessária para injetar a interface de controle flutuante e ler a lista pública de contatos dentro da aba ativa do Instagram do usuário.
- **Host permissions (`https://*.vercel.app/*`)**: Necessária exclusivamente para comunicação segura com a API serverless responsável pela criação da cobrança Pix e consulta de status de pagamento. Nenhuma informação pessoal ou lista de contatos é enviada a este endpoint.

---

## 4. Segurança das Informações

Implementamos padrões rígidos de segurança técnica:
1. **Sem código remoto:** Todo o código JavaScript e CSS da extensão é empacotado localmente no pacote da Chrome Web Store. Não carregamos bibliotecas externas ou scripts de terceiros em tempo de execução.
2. **Sem rastreadores ou Analytics invasivos:** Não utilizamos Google Analytics, cookies de rastreamento ou pixels de terceiros dentro da extensão.

---

## 5. Isenção de Responsabilidade (Disclaimer)

A extensão **Quem Não Me Segue - Detector para Instagram™** é uma ferramenta de produtividade independente desenvolvida por terceiros. Não é afiliada, associada, autorizada, endossada ou de qualquer forma oficialmente conectada ao Instagram, Meta Platforms, Inc. ou a qualquer uma de suas subsidiárias.

---

## 6. Contato e Suporte

Caso você tenha dúvidas sobre esta política de privacidade ou sobre o funcionamento da extensão, entre em contato através do nosso repositório oficial de suporte:
- **Repositório GitHub:** [https://github.com/IuryAlmeidaDev/instagram-nao-seguidores](https://github.com/IuryAlmeidaDev/instagram-nao-seguidores)
- **Abertura de Chamados / Issues:** [https://github.com/IuryAlmeidaDev/instagram-nao-seguidores/issues](https://github.com/IuryAlmeidaDev/instagram-nao-seguidores/issues)
