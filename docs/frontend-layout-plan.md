# Planejamento da fundação visual

Data: 7 de outubro de 2026. Estado: planejamento concluído; implementação pendente.

Este plano detalha a direção de [produto](product.md), a organização prevista
nas [notas técnicas](technical.md) e a sequência do [roadmap](roadmap.md).
As observações vieram do código atual e das imagens fornecidas pelo usuário.
Não houve execução ou validação interativa dos apps nesta rodada.

## Objetivo e ordem

**Holding → Logos → App Creator.** Consolidar a identidade visual de Logos
para resolver cada padrão uma única vez. As telas devem consumir essa base e
abandonar as definições locais substituídas. Depois, transferir a fundação
comprovada para o template de apps independentes.

Decisão confirmada: **MUI + Geist para a família de apps**. A rodada pode
refatorar diretamente o frontend: o produto está em desenvolvimento pessoal,
sem consumidores externos que exijam compatibilidade com componentes atuais.
Não manter duas bases visuais, adaptadores de legado ou estilos de transição
como resultado final. Preservar dados e comportamentos editoriais úteis.

Duas composições pertencem à mesma identidade:

- **Oficina de textos:** leveza da referência GPT/Codex, com navegação de
  tamanho uniforme, cores suaves, peso moderado, texto confortável e controles
  discretos. Criar, colar, escrever e revisar continua simples.
- **Biblioteca e livro:** forma, superfícies, títulos, cabeçalhos e alinhamento
  das ações aprovados na Holding, usando uma paleta neutra. Card e Paper
  organizam o conteúdo; copiar e salvar usam ícones quando presentes.

A estrutura inclui painéis esquerdo e direito recolhíveis. Na biblioteca,
o direito poderá ficar aberto mesmo vazio. Preview de ebook e leitura são
possibilidades futuras, sem implementação desses usos nesta fundação.

A reorganização detalhada de capas, informações e funcionalidades vem depois.
Conteúdo provisório não será tratado automaticamente como defeito de produto.

## Diagnóstico e reaproveitamento

| Origem | O que aproveitar | Adaptação em Logos |
| --- | --- | --- |
| Holding `web/src/theme/index.ts` | Escala, raio, borda, sombra, superfícies e estados | Tema MUI comum com identidade configurável, sem verde fixo |
| Holding `CardHeader` | Padding de 10px × 16px, título 18px/peso 500, divisória e ações à direita | Cabeçalho comum com título ou controles por composição |
| Holding `DataSection.tsx` | Paper contornado para subdivisões necessárias | Paper sem sombra de card externo |
| Holding `HeaderControls.tsx` | Alinhamento, agrupamento e ações por ícone de 40px | Componentes comuns usados por cards e barras de escrita |
| Holding `CardTabsHeader.tsx` | Abas na mesma faixa das ações | Reutilizar a composição MUI quando houver consumo real; documentar o padrão |
| Holding `frontend-ui-guide.md` | Hierarquia, economia, responsabilidades e correção na base | Guia próprio com composição de escrita e painéis |
| Logos `LibraryShell.tsx` | Navegação contínua e estrutura de três áreas | Separar dados da biblioteca e estado dos painéis |
| Logos `sidebar.css` | Fonte uniforme, recuos, ícones e ações no hover/foco | Cores e métricas comuns; estilos específicos só para a árvore editorial |
| Logos `ProjectEditor.tsx` | Título discreto, copiar/salvar por ícone, rascunho e preview ao vivo | Consumir base visual e painel direito genérico |

Hoje `globals.css` define separadamente `.project-card`, `.project-overview`,
`.text-editor`, títulos, menus e botões. `sidebar.css`, `project-files.css` e
`project-export.css` acrescentam cores e dimensões próprias. A família geral é
`system-ui`; erros e ações destrutivas usam vermelho `#9c2525` diretamente.

`LibraryShell` mistura projetos, Collections, recentes e guardas de edição com
`previewOpen`, `previewAvailable` e o host do preview. O direito só aparece
quando `previewAvailable` é verdadeiro. Isso impede sua existência vazia na
biblioteca e acopla uma capacidade estrutural a uma ferramenta do editor.

## Decisão de arquitetura

Adotar MUI como infraestrutura visual, mantendo Next, React e TypeScript.
Usar componentes da biblioteca e seu sistema de tema, em vez de implementar
versões próprias de Card, Paper, Button, TextField, Dialog, Menu e Drawer.
Reaproveitar diretamente as composições úteis da Holding e sua integração
com Next, retirando acoplamentos financeiros e cores de identidade fixas.

Criar componentes próprios somente para composições com responsabilidade
comprovada: cabeçalho com controles, seção de dados e shell de trabalho.
Evitar wrappers que apenas renomeiam todos os componentes MUI e recriam sua API.
CSS específico permanece para geometria editorial e conteúdo que a biblioteca
não representa. Padrões recorrentes vivem no tema ou na composição compartilhada,
não em um `sx` diferente por tela.

A implementação deve substituir a base visual atual como conjunto. Fatias de
execução podem existir para organizar o trabalho, mas a entrega é uma fundação
MUI completa, com remoção dos componentes/estilos superados. Evitar flags para
alternar entre frontend antigo e novo ou camadas permanentes de compatibilidade.

Holding permanece a referência MUI; não será convertida para CSS próprio.
Nesta rodada, não criar dependência de runtime entre repositórios. A base comum
será incorporada ao template após validação, com versão e instruções de adoção.

Organização prevista, com nomes ajustáveis durante a implementação:

```text
web/src/
├── theme/
│   ├── createAppTheme.ts          # escala e identidade configurável
│   ├── components.ts             # defaults/overrides/variantes MUI comuns
│   └── types.ts                  # extensões do tema quando necessárias
├── components/
│   ├── AppProviders.tsx          # ThemeProvider + CssBaseline
│   ├── ui/
│   │   ├── DataSection.tsx        # composição Paper + CardHeader da Holding
│   │   ├── HeaderControls.tsx      # composições comprovadas da Holding
│   │   └── composições reais      # componentes MUI usados diretamente
│   └── shell/
│       ├── AppShell.tsx           # Box/AppBar/Drawer + três áreas por slots
│       ├── WorkspacePanels.tsx    # estado visual e host estável à direita
│       └── layout.ts              # métricas do shell, consumidas pelo tema
├── features/library/
│   ├── LibraryShell.tsx           # dados/guardas + composição do shell
│   ├── Library.tsx
│   ├── LibrarySidebar.tsx         # árvore, recentes e operações editoriais
│   ├── ProjectEditor.tsx          # rascunho, operações e composição das views
│   └── estilos da feature         # geometria editorial e capas
└── app/
    ├── layout.tsx                # Geist + cache Next/MUI + providers
    └── globals.css               # camadas CSS e regras mínimas de documento
```

Os componentes visuais recebem conteúdo e callbacks; não carregam projetos,
consultam APIs ou conhecem permissões editoriais. As rotas continuam resolvendo
URL, sessão e composição. Os componentes atuais de `ProjectEditor` podem ser
divididos ou substituídos diretamente para obter uma estrutura clara. Preservar
o comportamento das operações editoriais pelos testes, sem exigir preservar
sua organização atual.

### Tema, cores e fontes

O tema MUI define fundo do app, papel, card, faixa de cabeçalho/rodapé, divisória,
texto principal/secundário, hover, seleção, foco e estados. `createAppTheme`
recebe a identidade e aplica escala, defaults e variantes comuns. Cabeçalho,
links e botões referenciam esses papéis, sem repetir cores em features.

Usar `cssVariables: true`, como na Holding, para que o CSS editorial possa
consumir os mesmos valores. Não manter um segundo tema em `tokens.css` ou
`theme.css`. Cores fixas atualmente repetidas nos overrides da Holding devem
virar referências ao tema na base reaproveitada.

A base usa branco, cinzas suaves e texto escuro, seguindo a referência fornecida.
A cor principal do app pode ser alterada nesse ponto único. A referência não
foi medida; não se afirmará que a paleta ou a fonte são exatamente as do GPT.

Erro usa a família laranja da Holding: `#f57c00` como destaque. Texto, fundo e
borda do erro possuem tokens próprios, para permitir leitura confortável;
ações destrutivas continuam claramente identificadas e confirmadas. Sucesso,
aviso e indisponibilidade preservam seus significados.

Geist é a família adotada para a interface, aproveitando a escolha da Holding.
O carregamento segue o mecanismo disponível no Next instalado, após leitura
dos guias locais. Código e blocos `pre` mantêm família monoespaçada explícita.
Para a escrita, a proposta é usar a mesma família sem serifa e tamanho
confortável; continua sendo edição de Markdown no textarea, sem novo modo de
produto ou editor rico.

| Papel | Referência inicial |
| --- | --- |
| Título de card | 18px, peso 500, entrelinha 1,35 |
| Corpo da interface | 15px, peso 400, entrelinha 1,5 |
| Botão/controle | 14px, peso 500–600 |
| Texto secundário | 12,5px, peso 400 |
| Navegação lateral, grupos e itens | 16px, peso 400; hierarquia por recuo e tom |
| Texto editável e preview | 16px, entrelinha inicial 1,7, largura de leitura limitada |

Esses valores serão validados em conjunto. Tamanhos e pesos de títulos dentro
do Markdown pertencem à leitura do conteúdo; o estilo de um cabeçalho de card
não deve alterar um `#` do texto. A limitação existente de 76ch é um ponto de
partida para leitura, não uma largura obrigatória da área inteira de trabalho.

Espaçamentos usam uma escala comum de 4, 8, 12, 16, 24 e 32px. Ícones e
controles têm métricas por papel, sem variantes inventadas por tela.

### Contratos visuais mínimos

- **Card:** raio de 4px, borda discreta e sombra curta da Holding. Contém
  cabeçalho, conteúdo e rodapé opcionais; não exige texto explicativo.
- **Paper:** superfície neutra, contornada ou plana, para subdivisões reais e
  área de escrita. Evitar sombras e bordas sucessivas sem função.
- **Cabeçalho:** título ou controles à esquerda; ações à direita; alinhamento
  central, divisória e quebra quando necessária. Altura resulta do conteúdo
  e do padding; não fixar uma altura que corte controles.
- **Ações:** gap de 8px; ações por ícone têm tamanho padrão de 40px. A variante
  discreta usa fundo transparente, a contornada serve aos cards. Copiar e salvar
  recebem rótulo acessível e tooltip; botões de formulário, como confirmar uma
  criação, podem manter texto.
- **Navegação:** estilo comum de item/grupo, ícone de 20px, estado selecionado
  suave, peso normal. A árvore específica permanece em `LibrarySidebar`.
- **Formulários e menus:** usar TextField, Select, Dialog, Menu e Alert do MUI,
  com tema e estados compartilhados; manter conteúdo e validações úteis.
  O editor pode usar entrada multiline com estrutura nativa preservada pelo
  componente MUI, sem introduzir um editor rico.

Usar HTML adequado ao contexto: o cartão clicável da biblioteca preserva seu
link; a primitiva visual não introduz botões dentro de links. Cabeçalhos
preservam uma hierarquia acessível mesmo com títulos visualmente menores.

### Shell e painéis

`AppShell` recebe `header`, `left`, `children` e `right` por composição, com
identificação dos painéis e controles de abertura. A configuração de painel
inclui rótulo e conteúdo opcional: um painel configurado com conteúdo vazio
continua existindo; a ausência da configuração significa que o app não o usa.
Layout e dimensões são do shell; a feature fornece navegação e conteúdo. Evitar
dois elementos `aside` aninhados ao adaptar `LibrarySidebar`.

`WorkspacePanels` mantém `leftOpen`, `rightOpen`, operações de alternância e
`rightHost`. Os controles do cabeçalho e do editor consomem o mesmo estado.
`useLibrary` preserva dados, seleção, refresh e guardas; o preview não decide
se o painel existe. O editor publica seu preview no host por portal, como já
faz. Fora da escrita, o painel continua disponível e pode ficar vazio.

Os painéis configurados permanecem montados ao recolher, incluindo o host
direito e a árvore esquerda, preservando sua expansão. Alternar painéis ou
mudar a largura não remonta o editor nem substitui seu rascunho. Ao sair da
escrita, o portal é desmontado com a view: não deixar conteúdo de outro texto
na biblioteca. O painel oculto não fica disponível para foco por teclado.

Política inicial proposta:

- tela larga: três áreas; esquerda e direita começam abertas, inclusive na
  biblioteca. Esquerda parte de 260px; direita de 320–360px, com limite conforme
  a área central disponível;
- largura intermediária: a direita abre sobreposta; a esquerda pode continuar
  ao lado do conteúdo;
- mobile: os dois painéis começam recolhidos e abrem sobrepostos, um por vez;
  escolher um destino na esquerda fecha essa sobreposição;
- sobreposição fecha por controle visível, `Esc` e fundo externo; foco retorna
  ao controle de abertura. Os dados e a posição de escrita são preservados.

O fechamento após navegar na esquerda respeita o cancelamento do link pelas
guardas de alterações não salvas. O componente de navegação deve informar essa
ação ao shell sem depender de um nome de classe CSS antigo.

A referência atual de 1100px deixa aproximadamente 520px para o painel central
com ambas as laterais abertas, antes dos seus espaçamentos. Propor 1280px como
ponto inicial para a composição de três áreas, conferindo 1100, 1280 e 1440px
durante a implementação. O valor é uma proposta de geometria, não uma cópia
medida da referência.

Concentrar métricas do shell em `layout.ts` e breakpoints no tema. Usar
`useMediaQuery` do MUI e estilos responsivos consumindo os mesmos breakpoints.
Drawer temporário atende às sobreposições; a grade desktop pode usar Box com
CSS grid. Evitar definições paralelas de limites em CSS e JavaScript.
O snapshot do servidor deve ser determinístico; a hidratação não pode substituir
o rascunho. Uma escolha explícita de recolher permanece durante a navegação
da sessão. Não acrescentar persistência em banco ou preferências de produto.

## Migração dos consumidores e remoção

| Arquivo atual | Mudança planejada | O que deixa de definir localmente |
| --- | --- | --- |
| `app/layout.tsx`, `app/globals.css` | Carregar fonte, tokens e tema; reduzir CSS global | Estilo independente de cada superfície e título |
| `components/AppHeader.tsx` | Consumir shell, navegação e ações comuns | Dimensões locais de botões e acoplamento a preview disponível |
| `features/library/LibraryShell.tsx` | Compor dados/editor com shell genérico | Grade, offsets e estado de apresentação do preview |
| `LibrarySidebar.tsx`, `SidebarSection.tsx`, `sidebar.css` | Usar itens/grupos comuns | Paleta e tipografia paralelas; preservar recuos e árvore |
| `Library.tsx` | Card/cabeçalho/controles comuns em biblioteca e Collections | `.page-heading`, `.project-card` e ações com versão própria |
| `ProjectEditor.tsx` | Card/Paper e barras comuns nas views de projeto, escrita e leitura | `.project-overview`, `.text-editor`, `.editor-toolbar` e ações particulares |
| `ProjectCover.tsx`, `ProjectFiles.tsx`, `ProjectExport.tsx` e CSS | Tema, controles e seções comuns | Bordas, títulos, estados e cores repetidos |
| Login, logout e página de erro | Consumir controles e estados comuns | Aparência de formulário ou erro fora do tema |
| `components/Markdown.tsx` | Escopo próprio para conteúdo renderizado | Dependência de regras globais de `h1` e `p` da interface |

O CSS restante da feature cuida de conteúdo Markdown e geometrias editoriais
necessárias; grid e recuos também podem usar o sistema MUI. A remoção acontece
junto à substituição de cada consumidor, conferindo outros usos antes de
apagar classes. Não adicionar uma camada final de overrides nem recorrer a
`!important` para esconder duplicação.

## Sequência de implementação

1. **Integração e tema:** incluir dependências MUI/Emotion compatíveis com a
   Holding, manifestos e locks; configurar cache Next/MUI, ThemeProvider e
   CssBaseline após ler os guias locais de Next. Reaproveitar o tema,
   parametrizar identidade, carregar Geist e registrar o guia.
2. **Composições:** reutilizar HeaderControls e DataSection da Holding, com
   componentes MUI diretamente nas views. Usar biblioteca, projeto e barra
   do editor como consumidores reais do tema e das variantes.
3. **Shell:** separar estado visual de `useLibrary`, manter host de portal
   estável e liberar o direito vazio. Definir overlays e teclado em mobile.
4. **Migração global:** cobrir biblioteca, Collections, projeto, escrita,
   leitura básica, arquivos, exportação e autenticação. Remover estilos
   substituídos e verificar que o editor continua simples e confortável.
5. **Validação do conjunto:** aparência, comportamento e variação de tema.
   Ajustes recorrentes voltam à base, em vez de gerar exceções locais.
6. **Transferência:** adaptar arquivos genéricos e guia para o App Creator;
   validar uma geração limpa antes de considerar a fundação entregue.

As etapas são fatias de execução da mesma rodada global. O término não pode
deixar biblioteca, projeto e editor com três sistemas visuais concorrentes.

## Verificação e critérios de conclusão

Para documentação desta rodada: conferir links locais, consistência entre
produto/técnica/roadmap e `git diff --check`. Testes da aplicação ficam para a
implementação.

Na implementação, aproveitar `web/tests/library.test.tsx`: já cobre criação
simples, salvamento, rascunho após erro, alternância de preview, leitura e texto
solto. Preservar testes de capa, exportação e autenticação. Acrescentar cobertura
de comportamento para painel vazio, controles sincronizados, limpeza do portal
ao navegar e conservação do rascunho ao alternar os dois painéis. Geometria
responsiva e foco dos overlays exigem navegador real, não só jsdom.

Validar também a integração Next/MUI: CSS do servidor, hidratação, fonte,
portal, limites entre Server/Client Components e imports de Link. A política
de versões é comum à família; não atualizar React, Next, MUI e adaptador
isoladamente sem conferir compatibilidade e testar a fundação.

Executar lint, tipos, testes frontend e build com `NEXT_DIST_DIR=.next-codex`,
seguindo `docs/development.md`. Confirmar autenticação ponta a ponta na entrega
da fundação. Sem mudança de schema prevista, não criar nem executar migrations
de domínio nesta rodada.

Revisar visualmente biblioteca vazia/preenchida, livro com/sem capa, texto novo
e existente, Markdown longo, erro de salvamento e painel direito vazio.
Conferir 390, 760, 1100, 1280 e 1440px, zoom de 200%, navegação por teclado,
leitura dos rótulos por ícone e controles em dispositivos sem hover.

Critérios:

- [ ] Card, Paper, título e ações têm a mesma definição em todas as views.
- [ ] Controles recorrentes usam MUI, sem uma biblioteca própria paralela.
- [ ] Grupos e itens laterais mantêm tamanho uniforme e seleção suave.
- [ ] Copiar/salvar são ícones identificáveis, alinhados à direita.
- [ ] Escrita permanece confortável e suas ações não disputam atenção.
- [ ] Direito abre vazio na biblioteca; os dois painéis recolhem corretamente.
- [ ] Alternar/reorganizar painéis preserva rascunho, seleção e operações.
- [ ] Trocar a identidade no tema atualiza o conjunto sem editar features.
- [ ] Erros usam laranja legível, com mensagem e recuperação preservadas.
- [ ] Estilos locais substituídos foram removidos; o guia aponta a fonte comum.
- [ ] App gerado funciona sem consultar Holding ou Logos.

## Limites desta entrega

O plano não altera autenticação, endpoints, modelos, compilação, EPUB ou dados.
Não implementa IA, preview de ebook, editor rico, novos fluxos de leitura,
redimensionamento por arrastar ou reorganização editorial. O conteúdo atual
continua sendo o consumidor real da nova base visual.

## Família de apps e extensões futuras

Wtree, hoje no monorepo, é um futuro consumidor informado pelo usuário.
Uma possível evolução para DEX ou CEX será planejada no domínio desse app.
Não incluir carteiras, ordens ou integrações de exchange no starter por
antecipação. O requisito desta rodada é uma base visual comum capaz de
receber outros produtos, com identidade e composições configuráveis.

Painéis redimensionáveis podem ser avaliados com uma biblioteca especializada
quando esse recurso for implementado. Isso complementa MUI; não exige
reconstruir seus controles nem acrescentar resize agora.

Referências técnicas consultadas na avaliação:

- [MUI e Next](https://mui.com/material-ui/integrations/nextjs/);
- [Componentes tematizados](https://mui.com/material-ui/customization/theme-components/);
- [Temas extensíveis](https://mui.com/material-ui/guides/building-extensible-themes/);
- [Drawer](https://mui.com/material-ui/react-drawer/);
- [React Resizable Panels](https://github.com/bvaughn/react-resizable-panels).
