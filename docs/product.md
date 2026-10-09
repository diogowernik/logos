# Produto

Logos é uma biblioteca e oficina pessoal para escrever, revisar e organizar
textos. A escrita humana e o uso de Markdown por copy/paste são o foco;
integração com IA e publicação externa não fazem parte do MVP.

## Organização

- Collection é uma pasta opcional, sem significado editorial obrigatório.
- Project reúne informações do livro e Texts principais ordenados.
- Text tem título, Markdown e posição. Pode ter variações de um nível, que não
  entram na compilação completa. Variações não são histórico de salvamentos.
- Uma família de Projects tem exatamente uma versão principal, apresentada na
  Collection; versões secundárias ficam preservadas sem duplicar posições.

Criar nova versão principal copia somente os dados básicos. A nova versão nasce
sem Texts, variações ou EPUBs gerados; a anterior conserva seu conteúdo. É possível
restaurar ou excluir versões secundárias. A troca de principal é transacional.
Fontes e imagens pertencem à família; textos e exportações pertencem à versão.

O fluxo principal é `+ -> escrever/colar -> salvar`. Textos podem nascer soltos
sem configurar Project, Profile, idioma, autor, tipo ou status. Editar significa
editar e salvar; reordenar usa arrastar. Autoria é informação, não autorização.

## Escrita, leitura e geração

Copy, leitura e EPUB partem dos Texts principais salvos, na mesma ordem.
Títulos cadastrados não são inseridos no corpo; headings do Markdown permanecem.
No EPUB, H1 define capítulos e H2 define subcapítulos. O título interno vem do
primeiro H1 ou de “Livro”. `pt-BR` é uma escolha do MVP1.

A geração mantém apenas o último EPUB válido, com numeração `_vN`. Uma falha
não substitui esse arquivo. Excluir o EPUB conserva textos, capa e imagens;
a próxima geração reinicia a numeração. Histórico de arquivos não está disponível.

## Fontes e importação

O EPUB original é imutável. Limpar gera outra cópia, voltada a um pacote mais
leve e compatível com leitores. Extrair pode usar o original ou a cópia limpa:
são operações independentes, e a extração cria textos no Project atual.

Cada arquivo Markdown produz um Text, individualmente ou em lote. Os nomes
numerados definem a ordem; os headings internos continuam intactos. Arquivos
podem ser enviados pela interface ou preparados manualmente na pasta da família.
Editar a fonte no VS Code não altera automaticamente os textos do banco.

Antes de gerar textos há uma prévia. Se já existem textos, o usuário escolhe
acrescentar ao final ou substituir todos, incluindo variações. A ação final
confirma essa escolha; não há uma segunda confirmação por checkbox. Mudanças
na fonte ou no projeto invalidam a prévia. Repetições não devem duplicar textos
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
