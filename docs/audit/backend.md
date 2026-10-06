# Auditoria do backend legado

## Resumo executivo

O backend possui motores editoriais úteis, mas o modelo de domínio mistura
publicação pública, capítulo, tradução, livro e importação. A camada HTTP expõe
mais dados do que a interface sugere, e a persistência não representa a
linhagem real do trabalho.

O backend auditado usa Django 3.2, Django REST Framework 3.13.1, Djoser 2.1 e
SQLite. O código do domínio possui aproximadamente 5,7 mil linhas Python,
incluindo migrations e dois commands experimentais extensos de PDF.

## Models observados

### Profile

- pertence a um `User`;
- guarda nome, slug global e imagem;
- é compartilhado por outros apps do monorepo;
- apaga a imagem física quando o Profile muda ou é excluído;
- funciona simultaneamente como identidade pública e requisito de autoria.

No Logos, `Profile` tornou-se uma dependência rígida: toda `Publication` exige
um Profile e a importação de EPUB falha quando o usuário não possui um.

### PublicationGroup

- UUID e slug global;
- títulos fixos para português, inglês, francês, alemão e latim;
- não possui owner;
- agrupa variantes por idioma e tipo;
- a restrição permite somente um item por `(group, language, kind)`.

O modelo foi abandonado no uso recente e não representa coleções editoriais,
séries ou linhagem. A ausência de owner também impede autorização coerente.

### Publication

Representa artigos, ensaios, web, editoriais, vídeos, capítulos e fichamentos.
Possui simultaneamente:

- owner e author/Profile;
- group opcional;
- book opcional;
- ordem opcional;
- idioma, tipo, status e slug semântico;
- corpo Markdown e PDF opcional;
- estado de publicação.

Esta flexibilidade permitiu evolução rápida, mas não impõe invariantes como:

- capítulo deve pertencer a livro;
- conteúdo de livro deve ter ordem;
- publicação independente deve possuir contexto autoral;
- status publicado deve possuir `published_at`.

### Book

- UUID, owner e Profile autor opcional;
- título, slug, subtítulo, descrição e idioma padrão;
- somente um `epub_file` atual;
- uma `BookImage` pode ser escolhida como capa;
- capítulos são Publications relacionadas.

Excluir Book usa `SET_NULL` em seus capítulos. Essa decisão preserva os textos,
mas remove o contexto que lhes dá significado e é a causa estrutural dos
órfãos observados.

### BookImage

- pertence obrigatoriamente a Book;
- guarda arquivo, rótulo e data;
- a exclusão pelo endpoint remove o arquivo físico;
- exclusões em cascata do Book não executam a mesma limpeza física.

### CleanEpub

- pertence ao usuário;
- guarda arquivo original, arquivo limpo, status e erro textual;
- estados: uploaded, processing, done e error;
- não guarda fingerprint, opções, diagnóstico estruturado, livro resultante,
  tentativas ou proveniência.

O endpoint de upload “já limpo” cria o registro sem `original_file`, embora o
campo represente semanticamente uma origem obrigatória.

## API e autorização

### Pontos positivos

- autenticação do browser passa pelo proxy interno do Next;
- escritas de Publication usam permissão por owner;
- livros de outros usuários são filtrados nas operações de escrita;
- serializers impedem associar publicação e capa a livro estrangeiro;
- jobs de EPUB são sempre filtrados pelo usuário autenticado;
- reordenação é transacional e neutraliza temporariamente colisões de ordem.

### Riscos críticos

#### Rascunhos expostos por endpoints de leitura

`PublicationViewSet` usa `IsAuthenticatedOrReadOnly`, mas o queryset inclui
todos os status. Um visitante pode listar ou recuperar rascunhos e arquivados.

`BookViewSet` também retorna todos os livros em métodos seguros. O serializer de
detalhe inclui todos os capítulos e seus corpos, sem filtrar status. O modo
Kindle usa esses endpoints e contorna a proteção mais cuidadosa existente em
`read_by_lang_kind_slug`.

A home chama a biblioteca de privada, porém o backend não aplica essa regra.

#### Groups sem proprietário

`PublicationGroupViewSet` permite escrita autenticada sem permissão por owner,
e o model nem sequer possui owner. Qualquer usuário autenticado pode, em tese,
alterar grupos globais.

#### Tratamento de erro quebrado

O bloco genérico de `generate_epub` usa `except Exception:` e tenta interpolar
`e`, que não foi capturado. Uma falha real no gerador produz um segundo erro em
vez do diagnóstico original.

`create_book` devolve traceback completo e detalhes de caminhos de storage na
resposta 500. Isso é útil durante desenvolvimento, mas não deve compor um
contrato HTTP de produção.

#### Autorização divergente entre interface e API

O frontend considera qualquer usuário autenticado capaz de gerenciar um livro
carregado. O backend rejeita a escrita estrangeira. O resultado é uma interface
que oferece ações que só falham depois do clique.

## Integridade e ciclo de vida

### Confirmado como íntegro na cópia auditada

- nenhum owner de publicação diverge do owner do Profile autor;
- nenhum owner de livro diverge do Profile autor;
- nenhum capítulo pertence a livro de outro owner;
- nenhum item ligado a livro possui tipo diferente de `book_chapter`;
- nenhum capítulo ligado a livro possui ordem nula;
- nenhum idioma fora das choices do backend está persistido;
- todos os jobs concluídos referenciam um `clean_file`.

### Inconsistências confirmadas

- 562 capítulos não possuem livro nem grupo;
- 106 publicações marcadas como publicadas não possuem `published_at`;
- Book usa `SET_NULL`, permitindo órfãos por desenho;
- o fluxo web cria capítulo como publicado, mas `published_at` é read-only e só
  é preenchido pelas ações/admin;
- exclusões de models não têm uma política uniforme para arquivos físicos;
- arquivos temporários criados com `mkdtemp()` não são removidos pelos fluxos
  de importação e exportação;
- `transaction.atomic()` protege o banco, mas não desfaz arquivos gravados no
  storage quando uma etapa posterior falha.

## Contratos frágeis

- slugs de Group não tratam colisão;
- a reordenação aceita uma lista parcial; capítulos omitidos podem manter
  ordens conflitantes com as novas posições;
- Publication aceita combinações sem sentido entre kind, book, group e order;
- a publicação pública e a edição privada usam a mesma entidade e endpoints;
- status e data de publicação podem divergir;
- o arquivo EPUB gerado substitui o anterior e preserva apenas uma referência;
- a numeração da versão depende do nome do único arquivo atual;
- nomes e caminhos de arquivos são parte implícita de vários algoritmos.

## Testes

Existem seis testes no domínio:

- dois de ownership;
- três relacionados a diagnóstico/persistência de erro;
- um para remoção seletiva de fontes ausentes do manifest.

Não há testes para:

- leitura pública versus privada;
- CRUD normal de livros e publicações;
- status e datas;
- reordenação completa/parcial;
- exclusão e arquivos físicos;
- importação integral EPUB → conteúdo;
- idempotência;
- geração Markdown → EPUB;
- round trip EPUB → projeto → EPUB;
- Profiles.

Os seis testes passaram em 5 de outubro de 2026.

## Prioridades

### P0 — antes de reutilizar contratos

1. Definir privacidade por owner e estado editorial.
2. Separar fonte, material de trabalho e edição publicada.
3. Fazer importações idempotentes e registrar o resultado.
4. Definir ciclo de vida conjunto para banco e storage.

### P1 — durante a extração dos motores

1. Remover Profile como pré-condição de autoria.
2. Tornar erros estruturados e não expor tracebacks.
3. Usar temporary directories com cleanup garantido.
4. Cobrir importação, compilação e autorização com testes.

### P2 — evolução

1. Histórico de artefatos e builds.
2. Jobs assíncronos quando o volume justificar.
3. Métricas de diagnóstico e comparação de versões.

