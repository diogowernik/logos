# Regras do domínio

Logos é uma biblioteca e oficina pessoal. Escrever, revisar e organizar textos
não exige percorrer um fluxo fixo de importação ou configurar metadata antes.
O caminho básico é `+ → escrever/colar → salvar`.

## Livro, grupos e textos

- Collection é uma pasta opcional, sem significado editorial obrigatório.
- Project é o livro estável: identidade, capa padrão e fontes compartilhadas.
- TextGroup é uma sequência independente de textos. Nomes como extraído,
  revisado ou rascunho são livres, não etapas obrigatórias.
- Text possui título, Markdown e posição. Variações de um nível não entram na
  compilação completa nem representam histórico de salvamentos.

Um livro mantém pelo menos um grupo. Criar ou duplicar grupo não troca o padrão;
essa escolha é explícita. Duplicação cria textos editáveis independentemente,
reutiliza imagens e não copia o EPUB gerado. Excluir grupo conserva fontes e
imagens do livro; para excluir o padrão, escolha outro primeiro.

Todos os grupos usam título, subtítulo, autor e capa do projeto na geração;
não há configuração de saída por grupo. Seu nome não muda o título interno do Markdown. Autoria é
informação, não autorização. Textos também podem nascer soltos, sem criar livro.

## Compilação e EPUB

Copy, leitura e EPUB usam a sequência salva dos textos principais do grupo.
Títulos cadastrados não são inseridos no corpo. No EPUB, H1 define capítulos,
H2 define subcapítulos e o título interno vem do primeiro H1 ou de “Livro”.
O idioma é `pt-BR` nesta versão.

Cada grupo mantém somente seu último EPUB válido, com numeração `_vN`.
Falha não substitui a saída anterior. Excluir o EPUB conserva textos e imagens;
a próxima geração reinicia a numeração. Não há histórico de arquivos gerados.

## Fontes e criação de textos

O EPUB original é imutável. Limpeza produz uma cópia independente; extração pode
usar o original ou a cópia limpa, sem exigir limpeza antes. Pode criar um grupo
ou alimentar outro do mesmo livro. As fontes não são substituídas pelos textos finais.

Cada Markdown produz um Text, individualmente ou em lote. Nomes numerados
estabelecem a ordem; headings internos permanecem. Alterar a fonte na pasta não
sincroniza os textos salvos no banco.

A prévia antecede a aplicação. Se o destino já tem textos, o usuário escolhe
acrescentar ou substituir todos, incluindo variações. A ação final confirma essa
escolha, sem um segundo checkbox. Fonte/destino alterados invalidam a prévia;
retry não duplica textos nem sobrescreve revisões humanas.

EPUB local sem cadastro exige vínculo explícito. Falhas de processamento oferecem
explicação e diagnóstico copiável. O livro abre no centro; leitura contextual e
edição são ações distintas. Trabalho e Leitura compartilham os mesmos dados;
por enquanto, o desenvolvimento prioriza Trabalho.

Contratos estão em [technical.md](technical.md), padrões visuais em
[frontend-guide.md](frontend-guide.md) e ideias ainda pendentes em [roadmap.md](roadmap.md).
