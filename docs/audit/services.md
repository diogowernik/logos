# Auditoria dos services editoriais

## Visão geral

O legado já contém uma cadeia editorial quase completa:

```text
EPUB original
  -> reparo de archive/manifest
  -> inspeção e classificação
  -> EPUB limpo
  -> parsing de seções e imagens
  -> HTML para Markdown
  -> Book + Publications
  -> Markdown para HTML
  -> EPUB final
```

O maior valor está nos algoritmos e nos casos descobertos. Os maiores riscos
estão na classificação heurística, na mistura com models e storage e na falta
de proveniência.

## Matriz de decisão

| Módulo | Responsabilidade | Decisão inicial |
|---|---|---|
| `epub_archive_repair.py` | remove do manifest somente fontes ausentes e tenta nova leitura | Preservar e ampliar testes |
| `epub_diagnostics.py` | traduz erros conhecidos em diagnóstico acionável | Preservar o comportamento; estruturar códigos |
| `epub_clean_service.py` | classifica documentos e reconstrói EPUB | Reparar profundamente |
| `epub_clean_utils.py` | move arquivo entre storage/temp e persiste status | Substituir pela nova orquestração de jobs |
| `epub_to_book_service.py` | lê spine, extrai metadata/imagens e converte HTML em Markdown | Preservar partes puras; corrigir filtros |
| `epub_to_book_utils.py` | cria Book, Profile, imagens e Publications | Substituir pelo importador de projeto/manuscrito |
| `markdown_utils.py` | Markdown para HTML e page breaks | Preservar com testes de contrato |
| `md_to_epub_service.py` | compila Book/Publications em EPUB | Generalizar para manuscrito/edição |
| `md_to_epub_utils.py` | salva EPUB atual e remove o anterior | Substituir por artefatos versionados |
| commands de PDF | diagnóstico e extração estruturada | Reavaliar como experimento separado |

## Reparo de archive

### Valor comprovado

`read_epub_tolerating_missing_fonts` tenta a leitura normal e, quando o archive
referencia fontes ausentes, cria uma cópia reparada removendo somente esses
itens do manifest.

No arquivo disponível de *Pense em Phlebas*, a leitura normal falhou porque
oito fontes declaradas não existiam. O reparo identificou e removeu exatamente
essas oito referências, permitindo a inspeção do livro.

### Evoluções necessárias

- retornar diagnóstico estruturado junto ao livro;
- registrar que houve reparo e quais recursos foram removidos;
- testar que capítulos, imagens e CSS ausentes não são descartados como fontes;
- evitar que a cópia temporária sobreviva além da operação.

## Limpeza e classificação

### Heurísticas úteis

- detecção de HTML/XHTML, CSS e imagens;
- identificação de sumário por densidade de links;
- classes para front matter, chapter, back matter e ignore;
- detecção de título por headings;
- descarte de script/style;
- normalização simples de spans e atributos;
- preservação opcional de front matter;
- incorporação somente de imagens utilizadas;
- geração de EPUB autocontido.

### Defeitos confirmados

#### Ordem não parte do spine

A limpeza itera `book.get_items()` e depois ordena capítulos por número
extraído do título ou, na ausência, por href. Isso pode divergir da ordem de
leitura declarada no spine, exatamente a fonte canônica do EPUB.

#### Classificação agressiva

- documento com mais de 2.000 caracteres vira capítulo;
- números romanos I–X são classificados como back matter;
- itens curtos sem título tendem a front matter;
- capa textual pode sobreviver como seção;
- a primeira imagem não usada pode virar capa quando o nome não ajuda.

#### Metadata e semântica

- idioma do EPUB limpo é fixado como `pt-BR` no código atual;
- IDs, classes e estilos são removidos, podendo eliminar âncoras e semântica;
- substituição de caminhos de imagem é textual;
- somente capítulos classificados entram no TOC, mas todas as páginas HTML
  entram no spine;
- não há relatório de quais seções foram mantidas, descartadas ou movidas.

## Caso real: Pense em Phlebas

### Original disponível

- metadata: título *Pense em Phlebas*, idioma `en`;
- 53 entradas no spine e 81 itens no package;
- oito fontes ausentes reparadas;
- classificação observada: 23 capítulos, 6 itens front, 1 back, 2 sumários e
  22 itens ignorados.

### Arquivo limpo disponível

- 31 entradas no spine e 35 itens;
- classificação: 23 capítulos, 4 front, 1 back, 1 sumário e 1 ignorado.

### Conversão do limpo

O parser produziu 29 seções. A primeira foi `cover.xhtml` com título artificial
“Capítulo 1”. Várias seções sem heading receberam “Capítulo N”, e seções
editoriais como “Sobre o autor” entraram na mesma sequência de capítulos.

O resultado confirma o relato de capa como capítulo, títulos truncados e
estrutura que exige reconstrução manual.

## Parsing para conteúdo editável

### Pontos fortes

- prefere a ordem do spine;
- possui fallback específico para `Text/section_XXXX.xhtml`;
- extrai metadata e imagens;
- remove sumários por título/densidade de links;
- converte headings, parágrafos, listas, links, imagens, blockquotes e
  pagebreaks para Markdown;
- resolve variações simples de caminhos relativos.

### Pontos frágeis

- inclui `cover.xhtml` quando a capa está no spine;
- qualquer seção sem heading recebe `Capítulo N`;
- filtro de sumário não distingue outras páginas de navegação;
- conversão HTML→Markdown perde estruturas não contempladas;
- não registra warnings ou confiança da conversão;
- não mantém relação entre seção de origem e conteúdo criado.

## Importação no banco

### Pontos fortes

- operação de banco é atômica;
- slugs de capítulos tratam colisão;
- imagens podem ser limitadas às usadas;
- capa e seções são criadas numa única operação.

### Defeitos

- exige Profile;
- cria sempre um novo Book;
- não usa fingerprint nem chave de idempotência;
- CleanEpub não recebe referência para o Book criado;
- repetição cria duplicatas completas;
- `mkdtemp()` não é limpo;
- arquivos escritos não são revertidos pela transação do banco;
- não existe área de recovery para seções duvidosas;
- toda seção vira `book_chapter`.

## Compilação Markdown e EPUB

### Pontos fortes

- pipeline Markdown único com tabelas, listas, attributes e footnotes;
- pagebreaks semânticos;
- imagens do projeto são incorporadas no EPUB;
- orientação da imagem influencia largura;
- capa, autor, idioma, NCX, nav, spine e TOC são gerados;
- headings H2 geram subentradas de sumário;
- ordem persistida dos capítulos é respeitada.

### Limitações

- compilador recebe diretamente models Book/Publication;
- somente `book_chapter` entra no EPUB;
- filtro por idioma é implícito e pode ocultar conteúdo;
- CSS está embutido no módulo;
- substituição de URL de imagem é textual;
- um único arquivo atual representa a exportação;
- novo build apaga o anterior;
- `mkdtemp()` não é limpo;
- não existe manifesto do build, hash de entrada ou reprodutibilidade auditada.

## Direção de extração

Os motores novos devem operar sobre estruturas explícitas e independentes do
ORM:

```text
SourcePackage -> InspectionReport -> NormalizedPackage
NormalizedPackage -> ImportProposal -> Project materials
Project edition -> CompiledManuscript -> ExportArtifact
```

Cada etapa deve:

- preservar a entrada;
- produzir warnings estruturados;
- declarar decisões e descartes;
- ser repetível com o mesmo resultado;
- permitir revisão humana antes da persistência definitiva;
- possuir fixtures reais e sintéticas.

