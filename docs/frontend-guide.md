# Guia da interface

MUI + Emotion + Geist são a base. Use componentes MUI diretamente;
composições próprias agrupam responsabilidades reais, sem recriar um framework.
Logos mantém identidade azul, superfícies neutras e erros em laranja.

## Onde alterar

| Assunto | Fonte em `web/src/` |
| --- | --- |
| Identidade, navegação e cores do app | `config/app.ts` |
| Tipografia, paleta e métricas gerais | `theme/index.ts` |
| Defaults de controles, cards e diálogos | `theme/components.ts` |
| Shell, editor, leitura e ações | `theme/workspace.ts` |
| Oficina do livro | `theme/project.ts` |
| Capas e busca da biblioteca | `theme/library.ts` |
| Pastas de fontes e upload | `theme/source-folder.ts` |
| Revisão e diagnóstico de EPUB | `theme/epub-import.ts` |
| Providers e integração SSR | `components/AppProviders.tsx`, `app/layout.tsx` |
| Painéis opcionais | `components/shell/AppShell.tsx` |

Não use estilos inline nem repita cores, fontes e aparência de controles nas
features. Padrões recorrentes vão ao tema; geometria particular fica na composição
responsável. CSS adicional é restrito a conteúdo especializado, como Markdown.
Medidas e breakpoints atuais estão no código, sem uma tabela paralela aqui.

## Princípios

- Navegação, editor e leitura usam Geist Sans; código usa Geist Mono.
- Escrita e prévia usam superfície branca e largura confortável. A área de
  edição ocupa a altura disponível e rola internamente para textos longos.
- Biblioteca apresenta capa e nome pequeno, sem Paper por item ou contagens.
  Não empilhe caixas apenas para criar hierarquia visual.
- Cabeçalhos agrupam ações à direita. Ícones discretos têm tooltip, nome
  acessível e foco visível; títulos mantêm semântica de heading adequada.
- O documento renderizado não precisa de rótulos como “Preview ao vivo”.
- Diálogos mantêm a ação final em `DialogActions`, fora da área rolável.
  Pending bloqueia envios duplicados. Explicações devem ajudar uma decisão.

## Composição e estado

`AppShell` recebe header, left, children e right. Omitir um painel remove seu
controle; `right={null}` reserva um painel vazio. `useShell()` coordena abertura,
contextos e `rightHost`; features publicam leitura via portal e limpam ao sair.
O centro mantém sua posição na árvore React ao alternar painel ou viewport,
preservando rascunhos. Drawer temporário cuida de foco, Escape e backdrop;
no mobile abre um painel por vez. Navegação cancelada não fecha a lateral.

`ProjectOverview` organiza as tarefas do livro e preserva painéis montados ao
alternar abas, incluindo operações pendentes. O contexto do livro começa com
a direita fechada e restaura a preferência geral ao sair. `ProjectReading`
concentra a leitura de Text ou Markdown em um único documento ativo.

`useProjectEditor` cuida de dados, salvamento e guard de rascunho;
`useEpubImport`, `useMarkdownSources` e `useSourceFolder` coordenam suas consultas.
Respostas antigas ou posteriores à desmontagem não devem substituir o estado.
Após importar, falha no recarregamento não pode parecer falha da importação já
concluída. Autenticação permanece no servidor e tokens não chegam às features.

Para mudanças no shell, verifique preservação do rascunho, navegação cancelada
e foco. A validação visual é feita pelo usuário com prints.
