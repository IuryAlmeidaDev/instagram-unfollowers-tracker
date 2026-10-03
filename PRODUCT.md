# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Vanilla JavaScript (Google Chrome Extension Manifest V3, Content Scripts, CSS3 moderno, Chrome Storage & Messaging API).

## Users
Usuários do dia a dia e criadores de conteúdo do Instagram que utilizam o navegador no desktop e desejam identificar rapidamente quem não os segue de volta, fãs e conexões mútuas para organizar seu perfil, sem expor sua conta ou fornecer senhas a aplicativos móveis de terceiros.

## Product Purpose
Fornecer uma experiência de auditoria de seguidores rápida, elegante, gratuita e 100% segura diretamente no navegador. O sucesso é medido pela capacidade do usuário identificar não-seguidores em poucos segundos e realizar ações de limpeza com 1 clique, sem bloqueios de ação pela Meta.

## Positioning
A solução mais segura e ágil para o Instagram Web: opera com zero credenciais solicitadas, processamento estritamente local no navegador, pausas antibloqueio e streaming progressivo dos perfis em tempo real.

## Operating Context
Executado como uma extensão injetada na aba ativa do Instagram Web (`https://www.instagram.com/*`). O usuário aciona o painel por meio de um botão flutuante proeminente posicionado na lateral direita da tela (longe do widget de mensagens diretas) ou pelo popup na barra do navegador.

## Capabilities and Constraints
- **Capacidades:**
  - Varredura de seguidores e seguindo via API interna web do Instagram com credenciais da sessão ativa.
  - Liberação progressiva em tempo real: os resultados entram suavemente na tela sem congelar a interface.
  - Rate limiting inteligente (pausas de 550ms a 800ms) para proteger a conta de restrições automatizadas da Meta.
  - Ações diretas de "Deixar de seguir" e "Seguir de volta" diretamente nos cards com validação CSRF.
  - Exportação instantânea das listagens em arquivos `.txt` e `.csv`.
  - Filtro e pesquisa instantânea por arroba ou nome.
- **Restrições:**
  - Requer que o usuário esteja previamente conectado à sua conta no Instagram Web.
  - Respeito estrito às rotas web da plataforma (`/api/v1/web/friendships/`).

## Brand Commitments
- **Nome:** Quem Não Me Segue - Detector para Instagram™
- **Identidade:** Visual Dark Mode inspirado no tema nativo do Instagram, com gradiente oficial (#833ab4, #fd1d1d, #fcb045), tipografia de sistema limpa e foco absoluto em clareza e segurança visual.

## Evidence on Hand
- Base de código em produção, testada e versionada no repositório `C:\Users\iuryc\projects\instagram-nao-seguidores`.
- Documentação completa em `README.md` e conformidade de privacidade em `PRIVACY_POLICY.md`.

## Product Principles
1. **Segurança Inegociável:** Jamais solicitar, coletar ou transmitir senhas de usuários; toda a operação é local utilizando a sessão ativa do navegador.
2. **Proteção da Conta:** Priorizar a longevidade e saúde da conta do usuário através de paginação controlada e rate-limiting seguro.
3. **Fluidez e Feedback Imediato:** A interface abre instantaneamente, renderiza perfis de forma incremental sem travamentos visuais e reage com clareza a cada clique.
4. **Foco e Leveza:** Manter o projeto como uma micro-ferramenta hiperfocada, sem inchaço de recursos desnecessários.

## Accessibility & Inclusion
- Alto contraste visual em Dark Mode (#121212 de fundo e #f5f5f5 de texto).
- Botões com estados visuais explícitos de hover, foco e desativação (`disabled`).
- Suporte a rótulos acessíveis (`aria-label`, `title`).
