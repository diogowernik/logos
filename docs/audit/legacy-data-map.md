# Mapa de dados legado

## Fonte e limites

Dados observados em `/Users/diogo/Development/monorepo/back/db.sqlite3` em 5 de
outubro de 2026. A cópia local do storage está incompleta, portanto contagens de
referências e existência física são apresentadas separadamente.

Nenhuma conclusão sobre perda em produção deve ser tirada apenas da ausência de
arquivos nesta máquina.

## Volumes

| Entidade | Total |
|---|---:|
| usuários Django | 8 |
| Profiles | 5 |
| Books | 19 |
| Publications | 946 |
| PublicationGroups | 10 |
| BookImages | 52 |
| CleanEpub jobs | 19 |

Todos os 19 livros e as 946 publicações pertencem ao mesmo usuário operacional.
Os outros usuários não possuem dados do Logos nesta cópia.

## Distribuição das publicações

| Tipo | Status | Idioma | Total | Ligadas a livro | Ligadas a grupo |
|---|---|---|---:|---:|---:|
| book_chapter | draft | en | 834 | 272 | 0 |
| book_chapter | published | pt | 89 | 88 | 1 |
| book_chapter | published | en | 10 | 10 | 0 |
| digest | published | pt | 4 | 0 | 4 |
| article | published | pt | 3 | 0 | 3 |
| book_chapter | draft | pt | 3 | 0 | 3 |
| article | draft | pt | 1 | 0 | 1 |
| editorial | draft | pt | 1 | 0 | 1 |
| editorial | published | pt | 1 | 0 | 1 |

Resumo estrutural:

- 370 capítulos estão ligados aos 19 livros;
- 14 itens estão ligados a grupos;
- 562 capítulos não possuem livro nem grupo;
- nenhum livro está vazio.

## Órfãos

Os 562 órfãos são `book_chapter`, idioma inglês e status draft. Foram criados em
três lotes:

| Data | Total |
|---|---:|
| 3 de janeiro de 2026 | 346 |
| 11 de janeiro de 2026 | 18 |
| 14 de janeiro de 2026 | 198 |

**Inferência:** os lotes correspondem a importações cujos Books foram excluídos
posteriormente. A hipótese é consistente com `Book -> Publication` usando
`SET_NULL`, mas deve ser confirmada por títulos, logs e backups antes da
migração definitiva.

Direção: importar estes itens para quarentena/recovery, nunca para a edição
ativa e nunca apagá-los automaticamente.

## Groups

Há 10 grupos e 14 itens relacionados. Um grupo está vazio. Os títulos indicam
uso em artigos, reflexões, glossário e estudos de pensadores gregos. O modelo
não foi usado como série de livros e não possui owner.

Direção: não transportar `PublicationGroup` mecanicamente. Seus itens devem ser
reclassificados em projetos, materiais ou coleções após inventário semântico.

## Profiles e autoria

O usuário operacional possui dois Profiles:

- “Diogo Wernik”: 886 publicações e 7 livros;
- “diogo.wernik”: 60 publicações e 2 livros.

Dez livros não têm Profile autor associado. Não foram encontrados conflitos
entre owner do conteúdo e owner do Profile.

Direção: ownership será ligado diretamente ao User. Os dois Profiles podem
virar identidades autorais candidatas, sujeitas a consolidação, sem bloquear
nenhum projeto.

## Estado editorial

- 106 publicações possuem status `published` e `published_at` nulo;
- nenhum draft/archived possui data indevida;
- nenhum corpo está vazio;
- não há idiomas fora das choices atuais;
- capítulos ligados a livro têm ordem preenchida.

A ausência de datas decorre provavelmente do fluxo web: ele cria publicação
como published, enquanto `published_at` é read-only no serializer e só é
preenchido no admin.

## Jobs de EPUB

| Status | Total | Originais referenciados | Limpos referenciados |
|---|---:|---:|---:|
| done | 18 | 18 | 18 |
| uploaded | 1 | 1 | 0 |

O banco não registra qual Book foi criado por cada job. O frontend guarda esse
vínculo em localStorage, logo não existe reconciliação confiável no servidor.

## Referências de arquivos

| Campo | Referências no banco |
|---|---:|
| EPUB gerado de Book | 8 |
| imagens de Book | 52 |
| imagens de Profile | 3 |
| EPUB original de job | 19 |
| EPUB limpo de job | 18 |
| PDF de Publication | 0 |

Na cópia local do storage, 98 dessas referências não encontram arquivo físico:

- 8 EPUBs gerados;
- 52 BookImages;
- 18 originais de jobs;
- 18 arquivos limpos;
- 2 imagens de Profile.

O disco local contém apenas um conjunto recente relacionado a *Pense em
Phlebas*, um EPUB gerado de outro livro, quatro imagens desse projeto e uma
imagem de Profile. Isso indica que o SQLite e o storage local vieram de cortes
diferentes ou que os arquivos operacionais vivem em outro ambiente.

## Critérios preliminares de importação

### Importação automática candidata

- 19 Books como projetos legados;
- 370 capítulos ligados, preservando IDs legados, ordem, idioma e conteúdo;
- 52 registros de imagem, condicionados à localização do arquivo;
- metadata de jobs, mesmo quando o arquivo não estiver disponível;
- usuários e hashes seguindo a estratégia já comprovada no Holding.

### Importação assistida

- 14 publicações agrupadas;
- 10 PublicationGroups;
- consolidação dos dois Profiles do usuário operacional;
- reconstrução de vínculos entre jobs e Books somente quando título, arquivo,
  datas e conteúdo fornecerem evidência suficiente.

### Quarentena

- 562 capítulos órfãos;
- referências a arquivos ausentes;
- seções de EPUB classificadas com baixa confiança;
- capas ou front matter importados como capítulo.

## Reconciliação necessária antes do corte

1. localizar o storage usado em produção;
2. gerar inventário com hash e tamanho dos arquivos;
3. relacionar referências do banco ao inventário físico;
4. comparar o SQLite local com a cópia de produção escolhida para o corte;
5. executar importadores em dry-run;
6. reconciliar contagens, owners, idiomas, ordens e hashes;
7. emitir relatório separado para recovery.

