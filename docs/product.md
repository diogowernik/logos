# Produto

Logos é uma biblioteca e oficina pessoal para escrever, revisar e organizar
textos. A escrita humana e o uso de Markdown por copy/paste são o foco;
integração com IA e publicação externa não fazem parte do MVP.

## Organização

- Collection é uma pasta opcional, sem significado editorial obrigatório.
- Project representa o livro estável: informações, capa padrão e arquivos de origem.
- TextGroup reúne uma sequência independente de textos, com nome livre e último
  EPUB. Pode ter metadata/capa específica para sua saída, herdando o livro quando
  não configurada. O nome do grupo não altera o título interno do Markdown.
- Text tem título, Markdown e posição. Variações de um nível não entram na
  compilação completa e não são histórico de salvamentos.

Um livro tem pelo menos um grupo. Criar grupo vazio, duplicar um grupo ou gerar
outro a partir de EPUB/Markdown não troca o padrão. A escolha do padrão é explícita.
Duplicação conserva ordem/variações e cria textos editáveis independentemente,
sem copiar EPUB gerado. Excluir grupo mantém o livro e os arquivos compartilhados;
para excluir o padrão, escolha outro primeiro. Grupos são conjuntos livres, não
etapas obrigatórias: extraído, revisado ou rascunho são apenas exemplos de nomes.

O fluxo principal é `+ -> escrever/colar -> salvar`. Textos podem nascer soltos
sem configurar Project, Profile, idioma, autor, tipo ou status. Editar significa
editar e salvar; reordenar usa arrastar. Autoria é informação, não autorização.

## Escrita, leitura e geração

Copy, leitura e EPUB partem dos Texts principais salvos do grupo escolhido, na mesma ordem.
Títulos cadastrados não são inseridos no corpo; headings do Markdown permanecem.
No EPUB, H1 define capítulos e H2 define subcapítulos. O título interno vem do
primeiro H1 ou de “Livro”. `pt-BR` é uma escolha do MVP1.

A geração mantém apenas o último EPUB válido, com numeração `_vN`. Uma falha
não substitui esse arquivo. Excluir o EPUB conserva textos, capa e imagens;
a próxima geração reinicia a numeração. Histórico de arquivos não está disponível.

## Fontes e importação

O EPUB original é imutável. Limpar gera outra cópia, voltada a um pacote mais
leve e compatível com leitores. Extrair pode usar o original ou a cópia limpa:
são operações independentes, e a extração pode criar um grupo ou alimentar um grupo escolhido do mesmo livro.

Cada arquivo Markdown produz um Text, individualmente ou em lote. Os nomes
numerados definem a ordem; os headings internos continuam intactos. Arquivos
podem ser enviados pela interface ou preparados manualmente na pasta do livro.
Editar a fonte no VS Code não altera automaticamente os textos do banco.

Antes de gerar textos há uma prévia. Se o grupo de destino já tem textos, o usuário escolhe
acrescentar ao final ou substituir todos, incluindo variações. A ação final
confirma essa escolha; não há uma segunda confirmação por checkbox. Mudanças
na fonte ou no grupo invalidam a prévia. Repetições não devem duplicar textos
nem sobrescrever revisões humanas já feitas.

Fontes EPUB locais ainda sem cadastro precisam ser vinculadas explicitamente.
Falhas de processamento oferecem mensagem legível e detalhes técnicos copiáveis.
Migração de livros do legado é manual e gradual, sem importação em massa.

## Experiência de trabalho

O livro abre no centro. A lateral direita começa fechada e serve à leitura de
Texts e Markdown selecionados; a edição mantém sua própria prévia lateral.
Título de texto abre leitura, e o lápis abre edição. Informações e capa ficam
na Visão geral; copiar a sequência completa pertence à tarefa Textos.

Trabalho e Leitura são contextos de interface sobre os mesmos dados, sem tipos
obrigatórios nem domínio duplicado. Neste momento o desenvolvimento prioriza
Trabalho. A direção visual é escrita confortável, controles discretos e economia
de espaço, com identidade azul e superfícies neutras. Os padrões estão no
[guia da interface](frontend-guide.md); ideias futuras ficam nas [pendências](roadmap.md).
