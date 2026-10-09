# Roadmap — refatoração do livro e dos conjuntos de textos

Remover os itens concluídos, sem diário de entregas. Excluir este arquivo e seus
links quando não houver pendências. Este plano registra a direção aprovada;
produto e notas técnicas ainda descrevem o domínio implementado anteriormente.

## Escopo autorizado

Refatoração direta, em um produto, frontend e backend, com o domínio no app Django
`library`. O app pode ficar temporariamente indisponível entre rodadas. Não manter
APIs antigas, adaptadores, flags ou dois modelos de domínio durante a transição.

O banco local pode ser apagado e recriado; não é necessária migração dos seus
registros. Isso não autoriza apagar EPUBs, Markdown, imagens, ambientes ou o app
legado. Preservar arquivos locais e prever seu vínculo explícito após recriar o
banco, sem inferir a identidade do livro a partir de IDs novos.

Histórico de gerações de EPUB sai do escopo e da interface, inclusive controles
reservados/desativados. Cada conjunto mantém apenas o último EPUB válido.
A numeração `_vN` existente pode permanecer: ela não exige guardar arquivos antigos.

## 1. Livro e conjuntos — backend

- Substituir `ProjectFamily` pelo Project estável do livro e o Project antigo por
  `TextGroup`. Project concentra owner, Collection, posição, identidade e capa
  padrão; TextGroup concentra nome livre, textos e saída gerada.
- Separar nome do grupo do título da obra. Preservar capacidade de metadata/capa
  específica da saída quando necessária, sem duplicar arquivos compartilhados.
- Manter Texts principais ordenados e variações de um nível dentro do grupo.
  Grupos não são histórico automático nem etapas obrigatórias de um pipeline.
- Criar grupo vazio, duplicar grupo com textos independentes ou criar a partir de
  fonte. Duplicação conserva ordem e variações, reutiliza assets e não copia EPUB.
- Separar criação de grupo da escolha do padrão. Criar outro grupo não altera o
  padrão; excluir um grupo nunca apaga o livro. Definir troca explícita do padrão
  antes de excluí-lo e preservar pelo menos um grupo no livro.
- Preservar criar/escrever/colar/salvar sem configuração obrigatória e textos
  soltos como recurso da interface, sem expor um livro artificial ao usuário.
- Recriar esquema e banco local; atualizar serviços, serializers e rotas para o
  domínio final, removendo operações de restaurar/promover versões antigas.

## 2. Fontes, arquivos e importação — backend

- Vincular Assets, fontes EPUB e arquivos Markdown ao livro. Manter originais
  imutáveis, catálogo local, uploads, downloads privados e associação explícita.
- Preservar limpeza independente e extração do EPUB original ou limpo; a cópia
  limpa continua disponível sem exigir extração ou grupo de textos.
- EPUB e Markdown podem criar grupo novo ou alimentar grupo existente. No destino
  existente, manter acrescentar/substituir e confirmação quando houver textos.
- Compartilhar o serviço de aplicação ao grupo; manter motores de EPUB e Markdown
  separados. Criação do grupo e aplicação são atômicas, sem grupo vazio após falha.
- Garantir idempotência também ao criar grupos por importação: repetir a mesma
  operação recupera o resultado, mas uma nova operação explícita pode criar outro.
- Preservar prévia, hashes, conflito por alteração, recibos e proteção de revisões.
  Revisar origem dos textos para continuar identificável após editar ou duplicar.
- Reutilizar imagens de conteúdo igual dentro do livro, com procedência, evitando
  multiplicação dos assets ao extrair a mesma fonte em diferentes grupos.
- Preservar limites, diagnóstico copiável, rollback e exclusão de arquivos após
  commit. Excluir grupo conserva fontes/assets; excluir livro é outra operação.

## 3. Compilação e geração — backend

- Compilar o grupo escolhido, na ordem dos seus Texts principais. Copy, leitura
  e EPUB continuam usando a mesma compilação; variações ficam excluídas.
- Preservar algoritmos: capítulos por H1, título interno do Markdown, notas e
  referências isoladas, imagens incorporadas, largura por orientação, capa,
  conversão de formatos, navegação, validação e `pt-BR` no MVP1.
- Manter gerar, baixar e excluir o último EPUB por grupo. Falha conserva a última
  saída válida. Não implementar histórico nem lista de gerações anteriores.
- Garantir que o resultado corresponda ao conteúdo compilado: registrar seu hash
  e tratar alterações concorrentes sem apresentar uma saída antiga como atual.

## 4. Interface no domínio final

- Atualizar clientes, tipos, navegação, busca, recentes, edição e leitura para
  Project estável e grupo escolhido; remover caminhos e controles de versões.
- Desenhar seleção/criação de grupo e destinos de importação de forma discreta,
  sem nomes obrigatórios “original/final” nem troca automática do grupo padrão.
- Preservar recursos atuais: Collections, movimentação/duplicação, capas, fontes
  locais, envio múltiplo de Markdown, prévia, extração, limpeza, copy e downloads.
- Reposicionar ações por tarefa: informações do livro, textos do grupo, fontes,
  arquivos compartilhados e geração do grupo. Remover placeholders de histórico.
- Preservar MUI + Geist, estilos centralizados, editor, guard de rascunho, leitura
  lateral e contexto direito fechado ao entrar no livro. Aceite visual por prints.

## 5. Fechar a refatoração

- Adaptar testes existentes ao novo domínio. Cobrir isolamento de owner/grupo,
  duplicação independente, padrão/exclusão, retry de importação, rollback,
  preservação de fontes e compilação/exportação do grupo correto.
- Verificar os fluxos: só limpar EPUB; extrair/reordenar/gerar; importar Markdown
  revisado preservando extraído; duplicar rascunho e reescrever; escrever do zero.
- Rodar checagens de integração ao reconectar o app; não repetir suíte/build a
  cada microajuste. Não usar livros reais para testes destrutivos automáticos.
- Consolidar apenas decisões duráveis nos documentos responsáveis, substituir
  regras antigas do domínio em AGENTS/produto/técnica e remover este plano concluído.

## Pendências de produto após a refatoração

- Refinar abas e explicações pelo uso real; consolidar Snackbar compartilhado.
- Coleções em segundo card: capa do primeiro livro, camadas decorativas de pilha,
  nome pequeno e navegação `Biblioteca / Nome`, sem caixas/contagens por item.
- Gestor ampliado de arquivos e associação de imagens relativas dos Markdown.
- Kindle/EPUBCheck, conteúdo especializado e opções de idioma.
- Trabalho/Leitura, leitura/estudo e progresso; painéis redimensionáveis.
- Recuperação de jobs interrompidos e processamento assíncrono.
- Curadoria manual do legado; capa própria de Collection e ordenação por arrastar.
- Pastas quando o volume justificar; áudio e links de vídeo para MVP3.
