# Orientações para agentes

## Trabalhar no app

- Siga o pedido atual do usuário. Documentação não autoriza ampliar a tarefa nem
  transforma uma ideia futura em requisito da implementação.
- Leia apenas o documento pertinente: [domínio](docs/product.md),
  [contratos](docs/technical.md), [interface](docs/frontend-guide.md) ou
  [ambiente](docs/development.md). Não percorra toda a documentação a cada ajuste.
- Quando Serena estiver configurado, consulte o inventário completo e carregue
  suas instruções antes de buscas semânticas. Não faça onboarding nem grave
  memórias automaticamente. Use `rg` para buscas textuais e arquivos não simbólicos.
- Não altere dados locais, ambientes, dependências ou o legado sem necessidade
  e autorização da tarefa. Não copie segredos de projetos de referência.

## Padrão visual

- Use MUI + Emotion + Geist diretamente. Componentes devem herdar os defaults
  do tema; uma mudança no padrão deve valer para o app inteiro.
- “Inline” inclui qualquer exceção visual criada para uma página, mesmo em
  `styled` ou em um arquivo de tema: fonte, tamanho, cor, padding ou aparência
  próprios de um controle que já tem padrão não são permitidos por conveniência.
- Não adicione `sx`, `style` ou CSS local para corrigir a aparência de uma página.
  Estilo exclusivo de página exige especificação explícita do usuário, com seu
  escopo registrado no [guia da interface](docs/frontend-guide.md).
- Composições podem definir a geometria necessária ao recurso, como grade,
  leitura, capa, arraste e recolhimento. Isso não autoriza redesenhar controles.
- Ao acrescentar um comportamento, preserve o componente visual existente.
  Um cabeçalho recolhível continua usando o padrão de `CardHeader`.

## Documentar e validar

- Priorize o app. Microajustes de botão, ícone, texto ou espaçamento não exigem
  documentação nem testes novos que apenas reproduzam a implementação.
- Registre somente decisões duráveis, restrições não evidentes e contratos que
  evitem redescoberta. Cada assunto tem um documento responsável.
- Não copie o código para os docs, nem mantenha diário, contagens de testes ou
  listas de feitos. Implementado fica documentado somente se ajudar a continuar.
- Roadmap contém apenas pendências pertinentes. Remova o que foi concluído ou
  perdeu sentido; sem pendências, remova o arquivo e suas referências.
- Valide proporcionalmente ao risco. Use os testes existentes afetados; suíte
  completa e build precisam de motivo. Não repita verificações que já passaram
  sem mudança ou falha nova. Documentação exige só links e diff.
- A checagem visual é feita pelo usuário com prints. Não abra o navegador sem pedido.

## Integração e ambiente

- Django é dono dos dados e autorização. Browser usa o proxy Next; token fica
  em cookie HttpOnly. Endpoints privados filtram pelo proprietário e páginas
  chamam `requireUser()` antes de carregar conteúdo.
- Use `.venv/` da raiz; ambientes em `api/.env` e `web/.env.local`.
- Preserve `scripts/test_auth.py`; execute-o quando a mudança afetar autenticação.
- Antes de alterar integração Next, leia o guia pertinente em
  `web/node_modules/next/dist/docs/`. Builds usam `NEXT_DIST_DIR=.next-codex`
  para preservar o servidor de desenvolvimento.
