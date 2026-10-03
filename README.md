# 👥 Quem Não Me Segue - Detector para Instagram™

Uma extensão de alta precisão e segurança para o Google Chrome (Manifest V3) que compara quem você segue com os seus seguidores no Instagram, revelando quem não te segue de volta, fãs e amigos mútuos — **sem pedir sua senha** e com **pausas antibloqueio**.

---

## ✨ Recursos

- 🛡️ **100% Seguro (Sem Pedir Senha):** Diferente de aplicativos suspeitos de celular, esta extensão roda diretamente na aba do Instagram onde você já está conectado. Suas credenciais nunca saem do seu computador.
- ⏱️ **Proteção Antibloqueio (Rate Limiting Seguro):** Coleta as listas em pequenos lotes com pausas automáticas de 1.2 a 1.6 segundos entre cada requisição para respeitar as diretrizes da Meta e manter sua conta segura.
- 📊 **3 Categorias em Tempo Real:**
  - **Não me seguem de volta:** Pessoas que você segue, mas que não te seguem.
  - **Fãs:** Pessoas que te seguem, mas que você não segue de volta.
  - **Mútuos:** Amigos que você segue e te seguem.
- 🔍 **Busca Instantânea:** Filtre qualquer lista em tempo real digitando o nome ou `@arroba`.
- 📥 **Exportação Rápida:** Baixe suas listas em formato `.txt` ou `.csv` para salvar ou usar no Excel/Google Planilhas.
- 🌐 **Links Diretos:** Botão rápido "Ver Perfil" para você decidir manualmente quem deseja deixar de seguir.

---

## 🚀 Como testar no seu Google Chrome (Modo Desenvolvedor)

1. Abra o Google Chrome e digite na barra de navegação:  
   `chrome://extensions/`
2. No canto superior direito, ative a chave **"Modo do desenvolvedor"**.
3. No canto superior esquerdo, clique no botão **"Carregar sem compactação"**.
4. Selecione esta pasta (`instagram-nao-seguidores`).
5. Acesse o [Instagram](https://www.instagram.com) (já conectado na sua conta).
6. Um botão gradiente flutuante aparecerá no canto inferior direito: **"👥 Quem Não Me Segue?"**. Clique nele e aperte **"Iniciar Análise Segura"**!

---

## 📁 Estrutura do Projeto

```
instagram-nao-seguidores/
├── manifest.json       # Configuração da extensão (Manifest V3)
├── content.js          # Injeção do modal, scanner com pausas seguras e exportador
├── styles.css          # Interface escura moderna com gradiente oficial
├── popup.html          # Menu rápido da barra de ferramentas
├── popup.js            # Lançador e comunicador com a aba ativa
├── icons/              # Ícones oficiais (16x16, 48x48, 128x128)
├── PRIVACY_POLICY.md   # Política de privacidade pronta para a Chrome Web Store
└── README.md           # Documentação do projeto
```

---

## ⚠️ Isenção de Responsabilidade

Este projeto é uma ferramenta independente de código aberto e não possui vínculo, afiliação, autorização ou endosso oficial por parte da Meta Platforms, Inc. ou do Instagram.
