# Inventário funcional do legado

## Escopo

O inventário cobre o app Next em `monorepo/front/logos`, o domínio Django
`publications`, o app compartilhado `profiles` e os arquivos disponíveis na
cópia local do storage.

As classificações abaixo avaliam capacidades de produto, não arquivos. Uma
capacidade marcada como “preservar” pode ser reimplementada sobre outro modelo.

## Capacidades comprovadas

| Área | Capacidade observada | Avaliação inicial |
|---|---|---|
| Autenticação | Login, logout, registro e recuperação de sessão por proxy Next | Preservar a experiência; atualizar a fundação |
| Biblioteca | Listar, buscar, favoritar e criar livros | Preservar; generalizar para projetos e coleções |
| Conteúdo | Criar e editar capítulos em Markdown | Preservar e melhorar |
| Conteúdo | Preview Markdown durante a edição | Preservar |
| Organização | Reordenar capítulos por drag and drop | Preservar |
| Clipboard | Copiar capítulo em Markdown | Preservar |
| Clipboard | Compilar e copiar livro inteiro em Markdown | Preservar e generalizar para todo projeto |
| Imagens | Upload múltiplo, preview, URL Markdown, escolha de capa e exclusão | Preservar com gestão transacional e recuperação |
| Exportação | Gerar e substituir EPUB do livro | Preservar; modelar artefatos e histórico |
| Importação | Upload de EPUB original ou já limpo | Preservar |
| Limpeza | Classificar seções, remover ruído e reconstruir EPUB | Reparar profundamente |
| Diagnóstico | Explicar recurso ausente e reparar fontes ausentes do manifest | Preservar e ampliar |
| Conversão | Transformar EPUB limpo em livro, capítulos, imagens e capa | Preservar o objetivo; substituir a orquestração |
| Leitura | Leitura contínua de publicação | Preservar e unificar |
| Leitura | Estante, sumário, paginação, fonte e continuar leitura | Preservar a intenção; substituir a paginação ingênua |
| PWA | Manifest, ícones, instalação e cache restrito de assets | Preservar |
| Administração | Gestão Django de publicações, grupos, livros e jobs | Reavaliar como ferramenta operacional |
| PDF | Commands de inspeção e extração estruturada | Reavaliar; parecem experimentais e não possuem fluxo web |

## Jornadas disponíveis no frontend

### Biblioteca

1. A home exige sessão no frontend.
2. Carrega livros, ordena por atualização e oferece busca local.
3. Favoritos são guardados no navegador.
4. Um diálogo cria livro com título, subtítulo e idioma.
5. O detalhe mostra capítulos, arquivos gerados e imagens.

### Escrita

1. O usuário abre um livro e cria um capítulo.
2. Escolhe idioma e um Profile como autor.
3. Edita título e Markdown, com preview opcional.
4. O novo capítulo é criado como publicado.
5. A edição permite alterar tipo, status, conteúdo e autor.

### Compilação completa

1. O frontend ordena os capítulos por `order`.
2. Monta título, subtítulo e descrição.
3. Adiciona cada capítulo como seção Markdown.
4. Separa as seções com marcador horizontal.
5. Copia o resultado para a área de transferência.

### Oficina de EPUB

1. Upload do arquivo original ou de um arquivo já limpo.
2. Geração do EPUB limpo.
3. Exibição de diagnóstico quando o processamento falha.
4. Criação de livro a partir do arquivo limpo.
5. Link para o livro criado é lembrado apenas neste navegador.
6. Exclusão do job.

### Leitura

Existem duas experiências paralelas:

- página de publicação: leitura contínua, controles de fonte, variantes,
  copiar, editar e excluir;
- modo Kindle: estante, sumário, páginas artificiais por quantidade de
  caracteres, navegação anterior/próxima e progresso local.

## Capacidades ausentes ou incompletas

- coleções ou séries de livros como entidade persistente;
- relação entre fonte, extração, tradução, manuscrito e edição final;
- área explícita de recuperação ou arquivo editorial;
- vínculo persistente entre importação e resultado;
- idempotência da conversão;
- histórico dos EPUBs gerados;
- compilação configurável que selecione quais materiais entram na edição;
- autosave, aviso de alterações não salvas ou versões do texto;
- progresso de leitura sincronizado por usuário;
- autoria secundária que não bloqueie a criação;
- testes automatizados do frontend;
- conciliação operacional entre banco e storage.

## Direção inicial de paridade

Paridade não significa copiar cada rota ou tela. O novo sistema deve provar,
com testes ou checklists executáveis, que continua capaz de:

1. receber um EPUB problemático sem perder o original;
2. diagnosticar sua estrutura antes de alterá-la;
3. produzir material editável e explicitamente derivado da fonte;
4. permitir reorganização e recuperação;
5. compilar o projeto inteiro em Markdown;
6. gerar uma edição EPUB consistente;
7. oferecer leitura confortável em desktop e celular.

