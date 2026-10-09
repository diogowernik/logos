# Interface: um padrão para o app

MUI + Emotion + Geist são a base. Use os componentes diretamente e herde o tema.
Logos mantém identidade azul, superfícies neutras e erros em laranja.

As decisões comuns da família estão no
[guia do App Creator](../../app-creator/docs/frontend-guide.md). A composição
do livro ainda precisa de uma revisão de espaçamento: o usuário considerou os
intervalos entre cards grandes. Compactar na composição responsável, evitando
somar margem e gap; preservar o CardHeader padrão e o recolhimento aprovado.

## Herança visual

Fontes, tamanhos, cores, espaçamentos internos e aparência de controles são
padrões do app. Ajustar o padrão deve melhorar todas as telas que o usam.
Não sobrescreva esses valores para resolver uma página isoladamente.

“Inline”, neste projeto, significa também uma regra visual fora do padrão,
mesmo que esteja em `styled` ou em um arquivo de tema. Transferir um ajuste local
para `theme/project.ts` não o transforma em padrão compartilhado.

- Cards usam `Card`, `CardHeader` e `CardContent` com seus defaults do tema.
- Recolhimento acrescenta comportamento ao cabeçalho, sem trocar sua tipografia
  ou espaçamento. O mesmo vale para outros comportamentos novos.
- Botões e ícones usam os componentes e ícones existentes. Não substitua ícones
  por caracteres nem defina tamanhos próprios por página.
- Textos usam variantes do tema conforme sua função, sem novos valores de fonte.
- Não adicione `sx`, `style` ou CSS local para alterar a aparência das páginas.
- Não crie outra biblioteca visual por cima do MUI.

Estilo exclusivo de uma página só cabe quando explicitamente especificado pelo
usuário. Registre aqui o motivo, a página e o limite da exceção; ela não deve
se espalhar para outros componentes. Não presuma uma exceção porque facilita
implementar o recurso.

Geometria funcional pode ser definida pela composição: distribuição em colunas,
largura de leitura, proporção da capa, área de arraste e animação de recolhimento.
A renderização de Markdown e de diagnósticos tem necessidades próprias de
conteúdo. Essas regras não autorizam redefinir a aparência dos controles ao redor.

## Onde alterar

| Assunto | Fonte em `web/src/` |
| --- | --- |
| Identidade e cores do app | `config/app.ts` |
| Tipografia, paleta e métricas gerais | `theme/index.ts` |
| Defaults de controles, cards e diálogos | `theme/components.ts` |
| Shell, editor e leitura | `theme/workspace.ts` |
| Geometria dos recursos do livro | `theme/project.ts` |
| Capas e busca da biblioteca | `theme/library.ts` |
| Upload e revisão de fontes | `theme/source-folder.ts`, `theme/epub-import.ts` |
| Providers e SSR | `components/AppProviders.tsx`, `app/layout.tsx` |

Arquivos por recurso complementam o padrão; não criam versões locais dos
componentes comuns. Valores e breakpoints ficam no código, sem tabelas duplicadas.

## Interação e estado

- Cabeçalhos agrupam ações à direita. Ícones têm nome acessível, tooltip e foco
  visível. Explicações devem ajudar uma decisão, não descrever o óbvio.
- Ações finais de diálogos ficam em `DialogActions`, fora do conteúdo rolável.
  Operações pendentes bloqueiam envios duplicados e mudanças de destino inseguras.
- Recolher uma área ou lateral não desmonta uma operação pendente nem perde
  rascunhos. Respostas antigas não substituem o estado de outro livro/grupo.
- Falha ao atualizar a tela após importar não pode ser apresentada como falha
  de uma importação já concluída.

`AppShell` reserva uma lateral com `right={null}`; omitir `right` remove o
controle. `useShell()` coordena contextos, abertura e `rightHost`. Leituras usam
portal e são limpas ao sair. Biblioteca e painel do livro começam com a direita
fechada; o editor conserva sua preferência de prévia. No mobile, o Drawer cuida
de foco, Escape e backdrop; navegação cancelada não fecha a lateral.

Áreas do livro lembram sua abertura por projeto no navegador. O último documento
selecionado ocupa a leitura lateral; clicar para ler não implica entrar na edição.
Para mudanças no shell, preserve rascunho, foco e navegação cancelada. A validação
visual é feita pelo usuário com prints.
