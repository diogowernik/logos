# Registro da rodada de interface

Data: 7 de outubro de 2026. Implementação e documentação concluídas;
validação complementar e aceite visual pendentes, a cargo do usuário.
Este registro consolida os resultados já observados. Nenhum teste ou nova
checagem visual foi executado no fechamento documental.

## Entrega

MUI + Emotion + Geist integrados ao Next, com tema centralizado, identidade
neutra, erro laranja, Card/Paper e ações compactas derivados da Holding.
Biblioteca, projeto, escrita, leitura, capas, arquivos, exportação e
autenticação consomem a base. CSS substituído foi removido.

`AppShell` separa painéis e preview dos dados de `LibraryShell`.
`useProjectEditor` concentra operações e estado editorial; `ProjectEditor`
compõe a apresentação. O painel direito pode existir vazio. O guia de uso
está em [frontend-guide.md](frontend-guide.md).

O checkpoint anterior à implementação é `1f6f0cf`. Esta rodada não alterou
modelos, endpoints ou migrations de domínio. A fundação genérica foi
transferida ao template 0.2.0 do App Creator.

## Verificações já executadas

| Verificação | Resultado observado |
| --- | --- |
| Frontend Logos | 33 testes passaram, incluindo painéis, rascunho, falha de salvamento, limpeza do portal e reordenação por teclado |
| Tipos e lint frontend | Passaram |
| Build de produção | Passou com `NEXT_DIST_DIR=.next-codex` |
| Backend Django | 29 testes passaram, executados a partir de `api/` |
| Autenticação real Next → Django | Login, cookie, proteção, invalidação e logout passaram com banco descartável |
| Navegador Chromium | Rodada preliminar passou em biblioteca, projeto, editor, painel vazio, erro de salvamento, cancelamento de navegação e diálogos |
| Viewports | 390, 760, 1100, 1280 e 1440px conferidos na rodada preliminar, sem overflow horizontal do documento nos cenários exercitados |

Os testes de shell confirmaram conservação do mesmo editor e rascunho ao
alternar painéis/mudar viewport, Escape e retorno de foco, além da manutenção
da lateral quando um link é cancelado. A checagem no navegador motivou o
ajuste da posição do controle de fechar sob a barra e do preview sobreposto
nas larguras intermediárias. A rodada preliminar foi repetida após esses ajustes,
sem erros inesperados de console nos cenários exercitados.

As capturas locais de biblioteca, projeto, editor e preview mobile usam
conteúdo sintético. Não representam aceite estético do usuário nem conferência
com os livros e capas reais.

## Limites e pendências registradas

- [ ] Fazer o aceite visual da base com conteúdo real, incluindo biblioteca
  vazia/preenchida, capas, textos, menus e estados de erro.
- [ ] Concluir a checagem complementar de Markdown longo, texto novo salvo
  pelo atalho e leitura compilada. O roteiro foi interrompido ao exigir que
  a fonte já estivesse em estado `loaded`; o navegador ainda informava
  `loading`. Não houve conclusão daquele roteiro ou diagnóstico de falha da fonte.
- [ ] Conferir carregamento de Geist, troca de identidade, contraste,
  zoom de 200%, teclado, seleção e dispositivos sem hover.
- [ ] Validar a experiência no ambiente pessoal após sua configuração.

O banco real e os `.env` pessoais não foram importados. Os ensaios de
autenticação e navegador usaram configuração temporária e banco descartável.
Os builds e testes aprovados não substituem a validação nesse ambiente.

O lint Python apontou 23 problemas preexistentes de formatação/imports na
API, que permaneceu sem alterações nesta refatoração. Essa análise não passou.
A instalação também apontou cinco entradas de severidade alta na cadeia de
lint de `eslint-config-next`, associadas a `braces` 3.0.3
([advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)). Essas resoluções
já estavam no lock anterior. Não foi aplicada correção automática nem downgrade.

Preview de ebook, resize por arrastar, novos fluxos de leitura e reorganização
fina de conteúdo continuam fora desta entrega. A próxima rodada pode partir
deste registro e do [guia da interface](frontend-guide.md).
