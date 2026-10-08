# Guia da interface

A base é MUI 9 + Emotion + Geist, integrada ao App Router do Next. Os controles
são componentes MUI usados diretamente. As composições locais existem para
agrupar responsabilidades reais, sem recriar uma biblioteca de controles.

## Onde mudar cada padrão

- `web/src/config/app.ts`: nome, navegação e identidade do app. `primary`
  define os controles, `header`/`headerText` a barra e `cardTitle` os títulos.
- `web/src/theme/index.ts`: escala de fontes, superfícies neutras, raio e
  larguras dos painéis. Erro usa a paleta laranja, preservando contraste.
- `web/src/theme/components.ts`: defaults e overrides de Card, Paper,
  CardHeader, CardActions, botões, campos, listas, menus, diálogos e tabelas.
- `web/src/components/AppProviders.tsx`: ThemeProvider e CssBaseline.
- `web/src/app/layout.tsx`: Geist/Geist Mono e cache SSR do MUI para Next 16.
- `web/src/components/shell/AppShell.tsx`: painéis opcionais e conteúdo central.
- `web/src/components/ui/`: agrupamento das ações, ícones com tooltip,
  seção de dados e menu contextual.

Uma mudança recorrente deve acontecer no tema ou na composição responsável.
O `sx` de uma feature serve para sua geometria particular; não deve redefinir
cores, fonte de controles, aparência de botões ou cabeçalhos globais.

## Cards e leitura

Use `CardHeader` para título e ações à direita, `CardContent` para conteúdo e
`CardActions` quando houver rodapé de ações. O header usa 10px × 16px,
título de 18px e altura mínima de 52px; ações podem quebrar linha em telas
estreitas. Botões comuns são compactos, sem caixa alta. Copiar e salvar usam
`CompactActionButton` de 36px, com nome acessível e tooltip.

Declare a semântica do título: `slotProps={{ title: { component: "h2",
variant: "h6" } }}`; use `h1` para o título principal e `h3` para cartões
subordinados. Aparência e nível do heading são decisões separadas.

`DataSection` compõe Paper delineado, header e conteúdo. Conteúdo de escrita
ou leitura usa superfície branca, largura confortável e tipografia de 16px;
a navegação usa 16px e peso normal. Não transforme a área de escrita em uma
sucessão de cartões decorativos.

## Painéis

```tsx
<AppShell
  header={<AppHeader />}
  left={<Navigation />}
  right={null}
  leftLabel="Navegação"
  rightLabel="Preview"
>
  {children}
</AppShell>
```

Omitir `left`/`right` elimina aquele painel e seu controle no AppHeader.
`right={null}` configura um painel vazio que pode ser aberto. Um app simples
começa apenas com cabeçalho e conteúdo; os painéis são capacidades disponíveis.

`useShell()` expõe estado e controles sincronizados. `rightHost` permite que
uma feature publique conteúdo contextual com `createPortal`, removido quando
a feature desmonta. O conteúdo central permanece na mesma posição na árvore
React ao alternar painéis e mudar de viewport; rascunhos não são remontados.
O host do painel pode ser refeito ao trocar entre coluna e sobreposição,
e o portal acompanha o novo host sem transferir estado do editor.

A lateral esquerda mede 260px e a direita 360px. Desktop começa em 761px;
o direito abre por padrão a partir de 1280px e ocupa uma coluna a partir de
1100px; abaixo disso usa sobreposição para preservar a área central.
Em mobile, Drawer temporário cuida de backdrop, Escape, foco e retorno ao controle; um painel abre por vez.
Links cuja navegação foi cancelada não fecham a lateral. O menu e o preview
rolam independentemente da área central. Resize por arrastar é evolução futura.

## CSS e fronteiras

`globals.css` declara a ordem de layers do MUI. CSS adicional é restrito a
conteúdo especializado, como Markdown. Não aplicar estilos globais a `button`,
`input`, `h1` ou `p`; a aparência da interface pertence ao tema MUI.
Geist Mono é reservado para código. Logos mantém o estilo do documento
Markdown isolado da tipografia dos títulos da interface.

Autenticação continua no servidor. Páginas privadas mantêm `requireUser()`;
a camada visual cliente não recebe tokens. Não acrescentar React Query,
endpoints ou modelos apenas para aproveitar o layout de outro app.

## Validação

O estado desta rodada está em [frontend-validation.md](frontend-validation.md).
Aceite visual e validação complementar permanecem pendentes.

Execute lint, tipos, testes e build com `NEXT_DIST_DIR=.next-codex`. Preserve
os testes de autenticação em `scripts/test_auth.py`. Mudanças no shell exigem
checar rascunho, navegação cancelada, foco e viewport; mudanças no template
exigem gerar um app limpo e validar sua independência.
