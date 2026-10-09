# Notas técnicas

## Fundação

```text
Browser → Next.js (web) → Django REST (api) → banco/storage
```

Django é a fonte de autenticação, autorização e dados. O usuário padrão é
mantido; Djoser fornece login/logout e usuário atual. Cadastro público está
desligado. Novos endpoints privados devem filtrar dados pelo usuário, além da
permissão de objeto.

Next guarda o token em cookie HttpOnly próprio do app e expõe apenas rotas
internas ao navegador. Sessão inválida limpa o cookie; indisponibilidade da API
retorna erro recuperável sem encerrar a sessão. Logout sempre limpa a sessão
local; se a API estiver indisponível, a revogação do token no backend não pode
ser garantida naquele momento.

Rotas compõem a interface; componentes contêm interação; `src/api/client.ts`
centraliza JSON, FormData e downloads; `src/server/django.ts` contém acesso
server-side ao backend. Páginas privadas chamam `requireUser()` antes de carregar
conteúdo; o layout sozinho não impede a renderização paralela de seus filhos.
A interface usa MUI + Emotion + Geist, com tema centralizado, cache SSR e
providers mínimos. Card/Paper e painéis opcionais seguem o
[guia da interface](frontend-guide.md). O shell não carrega regras de domínio.

SQLite atende desenvolvimento; `DATABASE_URL` permite PostgreSQL. Storage
privado e processamento de jobs devem ser implementados no domínio conforme
necessidade; `MEDIA_ROOT` configurado não equivale a download público habilitado.

Configuração de produção falha sem segredo forte e hosts explícitos. Variáveis
do processo têm precedência sobre `.env`. Configure `APP_ORIGIN` explicitamente
no Next em produção. Confiança em proxy Django é opt-in; não aceitar cabeçalhos
encaminhados de origem não controlada.

Manifestos e locks são as fontes de dependências. A aplicação é independente do
App Creator e não recebe suas atualizações automaticamente. `.app-creator.json`
registra somente proveniência da geração.

## Erros de validação HTTP

O cliente entende `detail`, `non_field_errors` e erros por campo do Django REST,
inclusive estruturas aninhadas. `ApiError` mantém o status e `fieldErrors`; sua
mensagem já pode ser exibida diretamente. O terceiro argumento de `apiRequest`
ou `downloadRequest` permite fornecer rótulos legíveis dos campos. Esses rótulos
pertencem ao produto, não ao starter. Respostas vazias ou não JSON usam uma
mensagem genérica. Não foi adicionada nenhuma dependência.

`ApiError.payload` conserva o JSON original para diagnósticos de domínio. O campo
reservado `diagnostic` não entra na concatenação da mensagem; a feature decide
como oferecer seus detalhes e texto copiável. Erros por campo continuam no
contrato de `fieldErrors`, sem misturar o relatório à validação.

## Dados e grupos

`Project` é o livro estável (owner, Collection, identidade, capa e `default_group`).
`TextGroup` contém nome, metadata/capa opcional de saída e seus Texts.
`Text.group` e `parent` mantêm sequência e variações de um nível. `Asset` e
`ImportJob` pertencem ao livro; `ExportArtifact`, `ImportExtraction` e
`MarkdownImport` pertencem ao grupo. `Text.origin` conserva procedência.

Criação do livro inclui um grupo inicial. Criar/duplicar outro grupo não muda o
padrão; duplicação copia textos/variações independentes e reutiliza assets.
Excluir padrão exige escolher outro antes; último grupo e inbox são protegidos.
As operações de domínio ficam em `services/projects.py`, `groups.py` e `texts.py`.
Não existem famílias, restauração ou promoção de versões.

| Endpoint privado em `/api/library/` | Contrato |
| --- | --- |
| CRUD `projects/` | Livro; criação inclui grupo inicial. `default_group` é somente leitura. |
| GET `projects/<id>/content/?group=<id>` | Livro, grupos, textos do selecionado, assets, fontes e EPUB; omitir grupo usa padrão. |
| CRUD `groups/` | Corpo de criação `{project, name}`; PATCH permite nome, `export_title/subtitle/author` e capa do livro. |
| POST `groups/<id>/duplicate/` | Cópia independente; nome opcional. |
| POST `groups/<id>/default/` | Escolha explícita do padrão do livro. |
| POST `groups/<id>/reorder/` | `ids` completos dos textos principais do grupo. |
| GET `groups/<id>/markdown/` | Compilação ordenada do grupo. |
| CRUD `texts/` | Criação usa `group`; `project` é identidade derivada somente leitura. |
| POST `texts/<id>/move/` | `group` explícito ou `project` para seu padrão; variações acompanham o principal. |

Consultas filtram pelo owner do livro. Textos soltos usam um livro/grupo inbox
interno, sem configuração obrigatória na interface. Busca/recentes incluem todos
os grupos; abrir um Text resolve seu grupo. Locks ordenam livro antes de grupo
quando ambos são necessários; edição/substituição compartilham lock do grupo.

## Compilação

Services seguem a separação já usada no Holding: `services/projects.py` e
`services/texts.py` mantêm operações do domínio; `services/assets.py` cuida dos
arquivos; `services/exports.py` orquestra compilação, geração e persistência.
Views apenas autorizam, chamam o service e serializam a resposta.

O pacote `epub/` adapta o motor do legado: conversão de Markdown com as mesmas
extensões e pagebreaks, preparação de capítulos e sumário, e montagem EbookLib.
Esse motor recebe dados simples e não consulta ORM nem gerencia storage.

`ExportArtifact` guarda o último EPUB de cada TextGroup, número de geração,
checksum e versão do gerador. O nome de download usa `_vN`; a sequência avança
somente após sucesso e recomeça em 1 após excluir o EPUB. Não há histórico armazenado.
POST gera e DELETE exclui em `/groups/<id>/epub/`, ambos privados e com lock
do livro e grupo. Exclusão usa o mesmo lifecycle de storage após commit e preserva
textos, capa e outros assets. A geração é síncrona. O novo arquivo é montado e inspecionado antes de
ser salvo; a troca é transacional e a exclusão do anterior ocorre após commit.
O download é privado. Grupo novo nasce sem EPUB; cópia independente também
precisa gerar seu próprio EPUB.

Imagens do livro referenciadas no Markdown são incorporadas por seus URLs
privados; recursos remotos não são baixados nesta rodada. Capas JPEG/PNG mantêm
o formato, e WebP é convertido para PNG para compatibilidade EPUB. A validação
da orientação das imagens do corpo usa Pillow: horizontal recebe classe de 300px,
vertical/quadrada de 180px, ambas com `max-width: 100%` e altura proporcional
no CSS compartilhado do EPUB. A capa não recebe essas classes. A validação
local verifica mimetype, ZIP, XML, manifest e spine; não substitui EPUBCheck.
O proxy reserva até 60 segundos para gerar, mantendo o timeout usual nas outras
operações.

Um DTO puro, independente do ORM, reúne metadata, Texts principais ordenados e
assets. Markdown completo, reader e EPUB consomem esse mesmo DTO.
`markdown_references.py` detecta definições com Python-Markdown e isola rótulos
de notas/links repetidos por Text na compilação. Referências explícitas,
abreviadas, imagens e notas mantêm seu destino local; código, URLs e marcação
HTML são protegidos. O conteúdo salvo não é reescrito. O resultado é cacheado
somente no DTO daquele pedido; não altera a regra de capítulos por H1.

Regras mínimas:

- corpo formado somente pelo Markdown, sem injetar títulos cadastrados;
- nunca filtrar conteúdo por idioma;
- preservar headings, tabelas, footnotes, listas e imagens;
- usar a mesma ordem em todas as saídas;
- permitir Text isolado no reader/copy;
- validar EPUB antes de concluir o job.

Idioma permanece `pt-BR` no MVP1; opções avançadas são futuras. O título interno
continua vindo do primeiro H1 do Markdown ou do fallback neutro, por decisão de
produto. Autoria é metadata, não autorização.

## Importação

O pacote puro `epub_import/`
separa leitura limitada do ZIP/OPF, inspeção conservadora, limpeza, conversão
HTML → Markdown e proposta de extração. Serviços de domínio separados cuidam
de storage, estado, autorização de destino e transações; views tratam HTTP.
`services/import_sources.py` seleciona original/cópia limpa. Os dois caminhos
chamam o mesmo motor puro de extração; nenhum precisa executar a limpeza antes
quando a fonte escolhida é o original. O Markdown é sanitizado para conversão,
sem alterar os bytes do EPUB de origem.

`ImportJob` pertence ao livro e registra original, SHA-256, inspeção, última
cópia limpa, número de limpeza, diagnóstico e estado (`ready`, `processing`,
`done`, `error`). Upload repetido no mesmo livro reutiliza o registro pela
impressão SHA-256. O original é imutável. Limpeza conserva ordem do spine,
reconstrói navegação e links e preserva IDs para notas internas. Seções de capa,
navegação e vazias ficam desmarcadas por padrão; demais classificações são
sugestões. A seleção explícita usa os `href` da inspeção, sem reordenar o spine.

Limpeza e extração são síncronas neste MVP, sem fila. Falha na limpeza mantém a
última cópia válida e permite retry; somente uma limpeza ocorre por job.
Interrupção do processo enquanto `processing` exige recuperação operacional;
não há watchdog nesta rodada. A cópia limpa usa nome `_clean_vN` e a anterior
é removida após commit; isso não constitui histórico de arquivos.

| Endpoint privado em `/api/library/` | Contrato |
| --- | --- |
| GET/POST `projects/<id>/imports/` | Lista fontes do livro; multipart `file` envia EPUB, 201 novo / 200 reutilizado. |
| GET `epub-imports/` e `epub-imports/<uuid>/` | Estado, diagnósticos, URLs privadas e recibos de extração. |
| POST `epub-imports/<uuid>/clean/` | Corpo `{}` usa seleção sugerida; `sections: [href, ...]` define seleção revisada. |
| GET `epub-imports/<uuid>/preview/?group=<id>&source=original` | `source: original/cleaned`, Markdown por seção, avisos, contagens existentes, `source_sha256` e `group_state`. |
| POST `epub-imports/<uuid>/extract/` | Destino, `source` e ambos os tokens da prévia; `mode: append/replace` e `confirm_existing: true` obrigatórios se já houver textos. |
| GET `epub-imports/<uuid>/original/`, `clean-file/`, `resource/?href=...&source=original` | Downloads privados e imagem raster da fonte escolhida, com `no-store` e `nosniff`; URLs da prévia incluem SHA da fonte para detectar mudança. |

O valor omitido de `source` continua `cleaned`, preservando o contrato da primeira
rodada. A interface deve sempre enviar a escolha explícita e repetir a fonte
retornada pela prévia na extração. O original pode ser extraído mesmo quando uma
limpeza falhou. A fonte limpa exige uma cópia válida previamente gerada.

A prévia recebe `group` opcional; sem ele representa um novo grupo vazio. A
aplicação exige `group` existente **ou** `new_group_name` e `operation_id` UUID.
`services/import_targets.py` compartilha esse contrato para EPUB e Markdown.
Criação e aplicação são atômicas; falha não deixa um grupo vazio.
`GroupCreation` vincula o UUID à identidade da operação e ao grupo criado:
retry recupera o resultado; operação nova explícita pode criar outro conjunto.

O destino deve pertencer ao mesmo livro do job e ao owner, sem ser inbox.
`group_state` é hash dos Texts/títulos/Markdown/posição/relações; mudança após
prévia retorna 409. Acrescentar mantém textos; substituir remove principais e
variações somente após confirmação. Recibos são únicos por grupo/fonte/hash e
protegem textos revisados contra retry. Assets iguais são deduplicados por SHA
no livro, acumulando origens; capa extraída só vira padrão se ainda não houver
capa. Excluir grupo mantém fontes/assets. Originais nunca são alterados.

Limites: 50 MB de upload, 256 MB descomprimidos, 32 MB por entrada e 5.000 entradas.
Caminhos inválidos, entidades XML e conteúdo criptografado não suportado são
rejeitados. Fontes ausentes/obfuscadas produzem avisos; CSS é substituído pelo
padrão compartilhado. Conteúdo ativo é removido. SVG externo é sanitizado na
limpeza; SVG no corpo não é convertido para Text e bloqueia a extração com erro
explícito. Imagens remotas não são baixadas; tabelas com células mescladas
recebem aviso de simplificação. JPEG, PNG e WebP são preservados na extração;
GIF vira PNG. A validação local do pacote não equivale a EPUBCheck.

Falhas de processamento usam `import_errors.py`: resposta JSON com `detail`
legível e `diagnostic` (`id`, `operation`, `source`, `job`, `code`, `message`,
`exception_types`, `locations`, `copy_text`). O texto já vem formatado para
copiar. Causas conhecidas mantêm a explicação; erros inesperados retornam tipo e
localização relativa no código, com o traceback completo no log correlacionado
pelo ID. Não enviar caminhos absolutos, variáveis locais, SQL ou credenciais.
400 continua validação; 409 continua conflito; falha inesperada retorna 500 em
JSON. Autorização e 404 seguem o contrato normal, sem revelar objetos alheios.
`ImportJob.error_diagnostic` conserva a última falha de limpeza e é limpo quando
uma nova limpeza começa ou termina com sucesso. Falhas de upload/prévia/extração
são devolvidas na resposta, sem alterar o estado da cópia limpa.

## Segurança e storage

Capas usam `Asset`, vinculado ao Project. O caminho local é
`media/projects/<project-id>/images/<asset-uuid>.<ext>`, independente do título.
`ebooks/` recebe exportações geradas. A preparação manual usa `originals/`
para EPUBs de origem e `sources/markdown/` para fontes editáveis, dentro da
mesma pasta. JPEG, PNG e WebP são aceitos até 10 MB, com validação real da imagem.

Fontes manuais são descobertas somente nas duas pastas permitidas do livro,
sem varredura global ou importação automática. EPUBs podem ser vinculados após
validação/checksum ao mesmo `ImportJob` do uploader, sem mover ou duplicar bytes.
O cadastro passa a participar do lifecycle do ImportJob; excluir o livro também
exclui esse original vinculado. Uma fonte desaparecida pode ser religada a outro
nome com checksum igual, preservando o job. Alterações do original são recusadas;
catálogo sinaliza ausentes/alterados. Fontes sem cadastro e Markdown não são
apagados automaticamente ao excluir o livro.

`services/source_files.py` restringe nomes, diretórios, tamanho e leitura a arquivos
regulares sem links simbólicos/hardlinks. A abertura usa diretórios relativos ao
storage local com `O_NOFOLLOW`; não recebe caminhos do browser. A descoberta local
usa FileSystemStorage/POSIX nesta versão; object storage exige outra integração.
`media/` continua fora do Git e exige backup separado. A convenção está em [Desenvolvimento](development.md#fontes-locais-dos-livros).

## Fontes locais e Markdown — contratos privados

Todos os endpoints abaixo são ações owner-filtered de Project em `/api/library/`.

| Endpoint | Operação |
| --- | --- |
| GET `projects/<id>/local-epubs/` | Nome, tamanho, SHA, job e estado encontrado/cadastrado/alterado/ausente. |
| POST `projects/<id>/link-epub/` | `{name, sha256}` vincula fonte existente; 201 novo / 200 reutilizado. |
| GET/POST `projects/<id>/markdown-files/` | Listagem; GET aceita `group` para status de importação; multipart `files` repetido envia lote sem sobrescrita. |
| GET `projects/<id>/markdown-file/?name=...` | Download privado como texto simples, attachment, no-store, nosniff. |
| POST `projects/<id>/markdown-preview/` | `{files: [name, ...], group?: id}` devolve prévia, fingerprint e estado do destino. |
| POST `projects/<id>/markdown-import/` | Seleção, destino existente/novo, `source_sha256`, `group_state`, `mode`, `confirm_existing`; 201 aplicação / 200 recibo já concluído. |

`services/local_sources.py` concilia EPUBs com ImportJob. `markdown_sources.py`
prepara um Text por arquivo, nomeado pelo filename sem extensão e separadores,
ordenando numericamente os nomes e mantendo headings/conteúdo internos.
`services/text_imports.py` compartilha hash do grupo e confirmação entre EPUB
e Markdown. `MarkdownImport` registra seleção+checksums+modo e
IDs de Texts por grupo. Repetir não sobrescreve revisões; lotes sobrepostos em
append reutilizam Texts já produzidos. Se um Text foi removido, pedir revisão em
vez de recriá-lo silenciosamente. Alterações na fonte ou no grupo invalidam a
prévia com 409. Substituição confirmada remove principais e variações na mesma
transação; falhas conservam o conteúdo anterior. Editar fontes pelo VS Code não
sincroniza os Texts. Não reescrever caminhos relativos de imagens dos Markdown:
associação/importação desses recursos é uma etapa posterior.

Limites: até 100 fontes por pasta, 2 MB por Markdown, 16 MB por lote, UTF-8 com
BOM opcional; rejeitar fontes vazias/binárias e nomes inválidos. Upload igual
reutiliza o arquivo; colisão com bytes diferentes rejeita todo o lote antes de
escrever. Falha de gravação remove arquivos novos do lote. Atualizar pasta é
explícito, sem watcher. Proxy recebe 60s para EPUBs locais e operações de fonte.
`useMarkdownSources` coordena o fluxo e `TextImportDialog` compartilha revisão,
prévia renderizada e confirmação com EPUB. Consultas tardias não substituem as
mais recentes nem callbacks de features desmontadas. UI usa erros copiáveis já
existentes; sem Snackbar próprio.

A capa padrão pertence ao livro; cada grupo pode escolher outra imagem do mesmo
acervo para sua saída. Trocar/remover capa mantém o Asset. Duplicar livro copia
seus grupos/Textos/Assets remapeando URLs, mas não ImportJobs, recibos ou EPUBs.
Falha remove arquivos recém-copiados. Exclusão do livro remove os arquivos
registrados após commit; fontes manuais sem cadastro não são apagadas.

`ExportArtifact.source_sha256` representa texto, metadata e assets usados.
Publicação verifica o snapshot sob lock; mudança concorrente conserva o último
EPUB válido e pede nova geração. `is_current` sinaliza uma saída desatualizada.
