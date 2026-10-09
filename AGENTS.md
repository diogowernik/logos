# Orientações para agentes

Leia somente a documentação relevante à tarefa: `docs/product.md` para regras
de domínio, `docs/technical.md` para contratos e `docs/frontend-guide.md` para
padrões visuais. Não leia nem atualize todos os documentos a cada alteração.

## Escopo e documentação

- Priorize o app. Mudanças simples de botão, ícone, texto ou espaçamento não
  exigem documentação nem novos testes que apenas reproduzam a implementação.
- Documente apenas decisões duráveis, contratos e orientações que ajudem a
  continuar o desenvolvimento. Use um único documento responsável pelo assunto.
- Não mantenha diários de microajustes, contagens de testes ou descrições de
  código que o próprio código explica melhor.
- Roadmap contém somente pendências. Remova itens concluídos; quando não houver
  pendências, remova o arquivo e suas referências. Não crie um arquivo de feitos.
- Valide proporcionalmente ao risco: verifique o comportamento afetado e use
  testes existentes pertinentes. Suíte completa, tipos e build entram quando
  houver motivo, como mudanças de contratos, autenticação ou base compartilhada.
- Depois de uma validação suficiente, não a repita sem mudança ou falha nova.
  Para documentação, confira links e diff; não rode testes do app.
- O usuário faz a checagem visual por prints; não abra navegador sem pedido.

## Domínio e dados

- Preserve `+ -> escrever/colar -> salvar`, sem metadata obrigatória.
- Collection é pasta opcional; Project é o livro estável. TextGroup reúne textos
  principais ordenados e variações de um nível. Fontes e imagens são do livro.
- Criar um grupo não muda o padrão. Duplicação copia textos independentes e
  reutiliza imagens; importação pode criar outro grupo ou alimentar um existente.
- Excluir grupo conserva o livro/fontes; escolha outro padrão antes de excluir
  o atual e preserve pelo menos um grupo. EPUB mantém só a última saída por grupo.
- Copy, leitura e EPUB usam a mesma compilação ordenada dos Texts principais.
- Importação e limpeza não devem complicar escrever do zero.
- Migração do legado é manual e gradual; não altere o legado sem pedido.
- Não copie dados, segredos ou dependências de projetos de referência.

## Fundação e interface

- Django é dono dos dados e autorização; Next é interface e fronteira HTTP.
- Browser usa o proxy Next; tokens ficam em cookie HttpOnly. Endpoints privados
  filtram pelo proprietário e páginas chamam `requireUser()` antes dos dados.
- Use `.venv/` da raiz; ambientes em `api/.env` e `web/.env.local`.
- Preserve `scripts/test_auth.py`; execute-o quando a mudança afetar autenticação.
- Antes de alterar integração Next, leia os guias relevantes em
  `web/node_modules/next/dist/docs/`. Quando precisar de build, use
  `NEXT_DIST_DIR=.next-codex` para preservar o servidor dev.
- Use MUI + Emotion + Geist diretamente. Identidade em `web/src/config/app.ts`,
  padrões recorrentes no tema; não crie outra biblioteca visual.
- Nada de estilos inline ou correções visuais repetidas tela a tela. CSS local
  fica restrito a conteúdo especializado, como Markdown.
