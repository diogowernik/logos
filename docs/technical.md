# Arquitetura e contratos

## Fronteiras

```text
Browser → Next.js (web) → Django REST (api) → banco/storage
```

Django é dono de dados e autorização. Endpoints privados filtram pelo proprietário,
além da permissão de objeto. Djoser usa o usuário padrão; cadastro público está
desligado. Next guarda o token em cookie HttpOnly e o browser usa o proxy interno.
Páginas privadas chamam `requireUser()` antes de carregar dados; o layout sozinho
não impede renderização paralela de seus filhos.

Sessão inválida limpa o cookie. Indisponibilidade da API permite retry sem encerrar
a sessão; logout sempre limpa a sessão local, mesmo sem conseguir revogar o token
no backend. `src/api/client.ts` centraliza JSON/FormData/downloads;
`src/server/django.ts` trata o acesso server-side. A interface herda o
[tema do app](frontend-guide.md), sem versões visuais por página.

Views autorizam e serializam; `library/services/` concentra operações de domínio.
Motores `epub/` e `epub_import/` recebem dados simples, sem ORM ou gestão de storage.
Manifestos/locks definem dependências. Logos é independente do App Creator;
`.app-creator.json` registra proveniência, não atualização automática.

## Instalação como PWA

O manifesto do Next identifica o app instalado como `books`, com os ícones do
Logos original. O identificador `/` é estável, mesmo com a entrada em `/pwa`.
A ação Instalar fica no cabeçalho em telas largas e na navegação lateral nas
demais. Usa o prompt nativo quando disponível e guia com ícone no iPhone/iPad.
Em modo standalone, a ação fica oculta.

A entrada `/pwa` retoma a última rota conhecida por conta neste dispositivo;
o endereço legado `/?source=pwa` encaminha para essa entrada.
Só guarda caminhos de biblioteca, coleção, livro/leitura e texto existente,
sem parâmetros, rascunhos ou criação. Antes de retomar um recurso, confere o
acesso na API privada; sem permissão ou excluído usa a biblioteca. Falha de rede
oferece nova tentativa sem descartar o destino. Sem sessão, o login retorna
à entrada `/pwa`. Links comuns mantêm o comportamento normal.

O service worker é registrado somente em produção e contexto seguro (HTTPS
ou localhost). Seu cache contém exclusivamente manifesto e ícones públicos:
páginas, chamadas da API, autenticação e arquivos privados continuam na rede.
Não há leitura ou edição offline. O worker usa atualização sem cache HTTP;
novas versões removem somente caches anteriores com o prefixo `books-pwa-`.
Falha ao precachear os recursos opcionais não impede a ativação do worker.

### Desbloqueio opcional do dispositivo

O cadeado abre “Exigir desbloqueio neste dispositivo”, desativado por padrão.
Funciona no navegador e no PWA, em contexto seguro com autenticador de
plataforma. WebAuthn solicita presença e verificação do usuário; o sistema
decide entre Face ID, Touch ID e código. A senha da conta permite recuperar
o acesso ou desativar a opção. Cancelamento ou falha mantém a tela bloqueada.

Django verifica cadastro, desbloqueio e desativação em `/api/device-security/`;
o browser passa pelo proxy `/api/auth/device-lock/`. A origem vem do pedido
validado e a credencial do cookie HttpOnly por conta, nunca do JSON do cliente.
Desafios expiram em dois minutos, são consumidos uma vez e vinculados à conta,
token, origem e finalidade. As tentativas têm limite na API. O banco guarda
chaves públicas e contadores; não recebe dados biométricos.

A preferência é lida antes da interface autenticada. Ao ocultar a página ou
alternar de app, a interface é bloqueada sem encerrar a sessão. Após o primeiro
desbloqueio, editores e diálogos permanecem montados e ocultos durante o bloqueio,
preservando rascunhos. Isso é privacidade visual sobre a sessão existente, não
uma autorização adicional das APIs nem criptografia de dados. Não garante
ocultar a captura de prévia do sistema operacional.

`WEBAUTHN_ALLOWED_ORIGINS` fixa origens exatas; o padrão é
`http://localhost:3026,https://books.wtr.ee`. Credenciais pertencem à origem:
cadastro local não habilita produção. Mudanças de domínio exigem nova inscrição.

## Modelo e destinos

Project possui owner, Collection, identidade, capa e `default_group`. TextGroup
possui sequência de Texts e metadata/capa opcional de saída. `Text.group` e `parent`
formam sequência e variações de um nível. Assets e ImportJobs são do livro;
ExportArtifact e recibos de aplicação são do grupo. `Text.origin` guarda procedência.

Livro novo inclui um grupo; criar/duplicar outro não muda seu padrão. Inbox e
último grupo são protegidos. Textos soltos usam inbox interno. Busca/recentes
incluem todos os grupos; abrir Text resolve seu grupo. Locks ordenam livro antes
de grupo quando ambos são necessários; edição/substituição usam lock do grupo.

Livros e coleções têm `slug` único por proprietário, estável ao renomear; duplicatas
recebem sufixo. URLs web usam `/projects/<slug>` e `/collections/<slug>`; links
antigos com ID (incluindo `/?collection=<id>`) redirecionam preservando a query.
A API aceita ID ou slug nesses recursos; relações e operações internas continuam
usando IDs. A migração preenche slugs dos registros existentes.

Todos os endpoints abaixo são privados em `/api/library/`.

| Endpoint | Contrato necessário à interface |
| --- | --- |
| CRUD `projects/` | Criação inclui grupo inicial; `default_group` é somente leitura. |
| GET `projects/<id>/content/?group=<id>` | Livro, grupos, textos do selecionado, assets, fontes e EPUB; sem grupo, usa padrão. |
| CRUD `groups/` | Criar com `{project, name}`; PATCH aceita nome, `export_title/subtitle/author` e capa do mesmo livro. |
| POST `groups/<id>/duplicate/` | Cópia independente, nome opcional; sem EPUB gerado. |
| POST `groups/<id>/default/` | Escolha explícita do padrão. |
| POST `groups/<id>/reorder/` | `ids` completos dos textos principais. |
| GET `groups/<id>/markdown/` | Compilação ordenada. |
| CRUD `texts/` | Criação usa `group`; `project` é derivado, somente leitura. |
| POST `texts/<id>/move/` | `group` explícito ou `project` para seu padrão; variações acompanham o principal. |
| POST/DELETE `groups/<id>/epub/` | Gerar/substituir última saída ou excluir somente o EPUB. |

## Compilação e geração

Copy, reader e EPUB usam o mesmo DTO de metadata, textos principais ordenados e
assets. Não injetar títulos cadastrados, filtrar por idioma ou reescrever o texto
salvo. Preservar headings, tabelas, notas, listas e imagens. H1/H2 e idioma seguem
as [regras de produto](product.md#compilação-e-epub).

`markdown_references.py` isola rótulos de notas/links repetidos entre Texts na
compilação, protegendo código, URLs e HTML. O cache existe só no DTO do pedido.

A geração é síncrona. Novo EPUB é montado/validado antes da publicação transacional;
a saída anterior é removida após commit. `_vN` avança só após sucesso e reinicia
após exclusão. Snapshot de texto/metadata/assets é conferido sob lock: mudança
concorrente mantém a saída válida. `ExportArtifact.source_sha256` guarda esse
snapshot; `is_current` indica saída desatualizada. Download é privado.

Imagens do livro referenciadas por URL privada são incorporadas; remotas não são
baixadas. JPEG/PNG mantêm formato, WebP vira PNG. No corpo, imagens horizontais
usam classe de 300px e verticais/quadradas de 180px, com largura máxima de 100%
e proporção preservada; capa não recebe essas classes. A validação local cobre
ZIP/XML/mimetype/manifest/spine, sem equivaler a EPUBCheck.

## EPUB de origem

ImportJob guarda original, SHA, inspeção, última cópia limpa, número de limpeza,
diagnóstico e estado `ready/processing/done/error`. Upload repetido no livro
reutiliza o SHA. Original é imutável. Limpeza preserva spine, IDs e links internos;
seleção revisada usa `href` da inspeção, sem reordenar. Seções de capa/navegação
ou vazias ficam desmarcadas por sugestão.

Limpeza/extração são síncronas, sem fila. Só uma limpeza ocorre por job; falha
mantém a última cópia válida. `_clean_vN` substitui a anterior após commit, sem
histórico. Interrupção em `processing` exige recuperação operacional.

| Endpoint | Contrato |
| --- | --- |
| GET/POST `projects/<id>/imports/` | Lista fontes; multipart `file`; 201 novo / 200 reutilizado. |
| GET `epub-imports/` ou `epub-imports/<uuid>/` | Estado, diagnóstico e URLs privadas. |
| POST `epub-imports/<uuid>/clean/` | `{}` usa sugestão; `{sections: [href, ...]}` usa seleção revisada. |
| GET `epub-imports/<uuid>/preview/?group=<id>&source=original` | Markdown por seção, avisos, contagens, `source_sha256` e `group_state`. |
| GET `epub-imports/<uuid>/section/?href=...` | Leitura de uma seção original, inclusive sumário, como `{title, markdown}`; não cria textos. |
| POST `epub-imports/<uuid>/extract/` | Destino, fonte, tokens da prévia e escolha append/replace. |
| GET `epub-imports/<uuid>/original/`, `clean-file/`, `resource/?href=...&source=original` | Downloads/imagens privados, `no-store` e `nosniff`; URLs de recurso incluem SHA. |

Envie sempre `source: original/cleaned`. O default da API é `cleaned`; use na
extração a mesma fonte da prévia. Original pode ser extraído mesmo após falha
de limpeza; fonte limpa exige cópia válida. Ler uma prévia não aplica textos.

Limites: upload 50 MB, ZIP descomprimido 256 MB, entrada 32 MB, até 5.000 entradas.
Rejeitar caminhos inválidos, entidades XML e criptografia não suportada. Remover
conteúdo ativo; não baixar imagens remotas. SVG externo é sanitizado na limpeza;
SVG no corpo bloqueia extração com erro explícito. Tabelas mescladas geram aviso.
Extração preserva JPEG/PNG/WebP e converte GIF para PNG.

## Aplicação de textos: contrato comum

`services/import_targets.py` e `text_imports.py` compartilham destino, hash e
confirmação para EPUB/Markdown.

- Prévia recebe `group` opcional; sem ele representa um grupo novo vazio.
- Aplicação exige `group` existente **ou** `new_group_name` + `operation_id` UUID.
  O destino pertence ao mesmo livro/owner, sem ser inbox.
- Enviar `source_sha256` e `group_state` da prévia. Alteração de fonte ou de
  textos/títulos/ordem/relações retorna 409 e exige consultar nova prévia.
- Usar `mode: append/replace`. Havendo textos, `confirm_existing: true` é obrigatório.
  Replace remove principais e variações somente após confirmação, atomicamente.
- Criação do grupo e aplicação são atômicas. `GroupCreation` liga UUID à identidade
  da operação; retry recupera o resultado, não cria outro grupo.
- Recibos por grupo/fonte/hash protegem revisão humana contra retry. Novo conjunto
  exige operação nova explícita. Arquivos iguais viram assets deduplicados por SHA
  no livro; capa extraída só vira padrão quando ainda não há capa.

## Pastas e Markdown

Convenção local: `media/projects/<project-id>/`, com `originals/`,
`sources/markdown/`, `images/` e `ebooks/`. Caminhos não dependem do título.
Preparação manual e backup estão em [development.md](development.md#fontes-locais-dos-livros).

| Endpoint de Project | Contrato |
| --- | --- |
| GET `local-epubs/` | Nome, tamanho, SHA, job e estado cadastrado/sem vínculo/alterado/ausente. |
| POST `link-epub/` | `{name, sha256}` valida/vincula original existente, sem copiar bytes; 201 novo / 200 reutilizado. |
| GET/POST `markdown-files/` | GET aceita `group` para status; multipart `files` repetido envia lote sem sobrescrita. |
| GET `markdown-file/?name=...` | Download privado como texto, attachment, no-store, nosniff. |
| DELETE `markdown-file/?name=...&sha256=...` | Exclui somente a fonte Markdown; mantém textos e recibos. Hash divergente retorna 409. |
| POST `markdown-preview/` | `{files: [name, ...], group?: id}` retorna prévia e tokens. |
| POST `markdown-import/` | Seleção `files`, destino, tokens, modo e confirmação; 201 aplicação / 200 recibo existente. |

Cada Markdown gera um Text; filename sem extensão/separadores dá o título e a
ordenação numérica define a sequência. Lotes sobrepostos em append reutilizam
Texts já produzidos. Texto removido exige revisão, sem recriação silenciosa.
Editar fonte não sincroniza Text; imagens relativas ainda não são reassociadas.

Até 100 fontes por pasta, 2 MB por Markdown, 16 MB por lote, UTF-8 com BOM opcional.
Rejeitar vazio/binário/nomes inválidos. Upload igual reutiliza arquivo; colisão
com bytes diferentes rejeita todo o lote antes da escrita. Falha de gravação
remove novos arquivos do lote. Atualizar pasta é explícito, sem watcher.

Descoberta percorre só pastas permitidas do livro, sem importação automática.
`services/source_files.py` restringe diretórios/nomes a arquivos regulares, sem
symlinks/hardlinks, com `O_NOFOLLOW`; nunca recebe caminho arbitrário do browser.
A descoberta exige FileSystemStorage/POSIX; object storage precisa de adaptação.
Original registrado não pode ser alterado; checksum igual permite religar nome.

## Arquivos e exclusões

Downloads de assets/fontes/EPUB são privados; configurar `MEDIA_ROOT` não os
publica. Capas aceitam JPEG/PNG/WebP até 10 MB, com validação real da imagem.
Trocar/remover capa conserva o Asset. Grupo pode escolher capa do mesmo acervo.

Excluir grupo conserva fontes/assets. Duplicar livro copia grupos/textos/assets
remapeando URLs, sem ImportJobs, recibos ou EPUBs; falha remove arquivos novos.
Excluir livro remove arquivos registrados após commit, inclusive original local
que foi vinculado. Fontes manuais sem cadastro e Markdown não são removidos
automaticamente. Banco e media exigem backup separado.

## Erros e fronteira HTTP

`ApiError` mantém status, `fieldErrors` e JSON em `payload`. Mensagens entendem
`detail`, `non_field_errors` e erros aninhados por campo. Rótulos legíveis de
campos pertencem ao produto; resposta vazia/não JSON usa mensagem genérica.

`diagnostic` não entra na mensagem de validação. Processamento devolve `detail`
legível e diagnóstico copiável (`id`, operação/fonte/job, código, mensagem, tipos,
localizações e `copy_text`). Traceback completo fica no log pelo ID; não enviar
caminhos absolutos, variáveis, SQL ou credenciais. 400 é validação, 409 conflito,
500 falha inesperada em JSON; autorização/404 não revelam objetos de outro owner.

ImportJob guarda última falha de limpeza, limpa ao iniciar/concluir nova limpeza.
Falhas de upload/prévia/extração ficam na resposta, sem alterar a cópia limpa.
Proxy reserva 60s para geração e operações de fontes, mantendo timeout usual
nas outras. UI distingue falha de processamento de falha ao recarregar resultado
já aplicado; callbacks/respostas de features desmontadas não mudam o estado atual.
