# Orientações para agentes

Leia `docs/product.md`, `docs/technical.md` e `docs/roadmap.md` antes de
implementar.

Regras centrais:

- separe explicitamente regras de backend de propostas de frontend;
- preserve `+ -> escrever/colar -> salvar`;
- no frontend, editar é editar e salvar; reordenar é arrastar;
- use `Collection opcional -> Project principal -> versões do Project` e
  `Project -> Text principal -> variações do Text`;
- Collection funciona como pasta, sem significado editorial;
- Project não exige tipo ou modo;
- Text principal tem título, Markdown e posição;
- variação é um Text secundário ligado a outro Text, não um sistema de versões;
- uma família de Projects possui exatamente uma versão principal; versões
  secundárias não ocupam posições duplicadas na Collection;
- criar nova versão principal copia somente os dados básicos do Project; o novo
  Project nasce sem Texts, variações ou EPUBs gerados;
- a troca da versão principal é transacional e não representa histórico
  automático de salvamentos;
- não exija Profile, idioma, autor, tipo ou status de publicação para escrever;
- Markdown completo, reader e EPUB partem da mesma compilação;
- importação e limpeza não devem complicar projetos criados do zero;
- migração do legado é manual e gradual;
- IA continua fora do app no MVP, via copy/paste de Markdown;
- não altere o legado sem pedido explícito.

As auditorias em `docs/audit/` descrevem o legado. As decisões futuras estão
somente nos três documentos canônicos citados acima.

## Fundação técnica

- Django é dono de dados, autorização e regras; Next é interface e fronteira HTTP.
- Browser chama rotas internas Next. Tokens ficam somente em cookie HttpOnly.
- Todo endpoint privado exige autenticação e queryset filtrado pelo proprietário.
- Páginas privadas chamam `requireUser()` antes de carregar conteúdo; não confie apenas no layout.
- Use `.venv/` da raiz; ambientes ficam em `api/.env` e `web/.env.local`.
- Preserve o teste de autenticação ponta a ponta em `scripts/test_auth.py`.
- Antes de alterar Next, leia os guias relevantes em `web/node_modules/next/dist/docs/`.
- Valide builds com `NEXT_DIST_DIR=.next-codex` para preservar o servidor dev.
- Leia `docs/foundation.md`; acrescente documentação de produto antes do domínio.
- Não copie dados, segredos ou dependências de projetos de referência.
