# Roadmap

## Prioridade atual

O foco é a oficina pessoal: trabalho, edição de Markdown e importação/limpeza de
ebooks. A página de edição chegou a uma base aprovada, intuitiva e econômica em
controles. Próximas melhorias devem partir do uso real. A experiência completa
de leitura fica para outra etapa; o preview é uma ferramenta de edição.

## 1. Fundação

Concluída: app gerado, dependências e ambientes preparados, banco migrado e
usuários do Holding copiados com os mesmos logins.

- criar `api/` e `web/` a partir do App Creator;
- autenticação, banco, storage, testes e CI.

Saída: aplicação vazia executável.

## 2. Biblioteca e editor

Primeira rodada implementada: biblioteca, Collections, Projects, Texts soltos,
versões, variações, editor Markdown com preview, busca em títulos e
conteúdo, copy, movimentação e reordenação direta. A migração inicial do domínio
foi aplicada ao banco local.

Próximos ajustes desta etapa: avaliação de usabilidade com conteúdo real,
upload/gestão de imagens e capas e organização de Collections por arrastar.
Imagens já podem ser exibidas no preview por URLs em Markdown.

- Collection, Project e Text;
- variações com um nível;
- versão principal e versões secundárias de Project;
- ação transacional para criar nova versão principal;
- Novo texto sem Project obrigatório, recentes e textos soltos;
- criar pelo botão `+`, editar e salvar;
- reordenar diretamente por arrastar;
- mover e duplicar;
- editor Markdown, preview, imagens e busca;
- copiar Text e Project completo.

Saída: `+ -> escrever/colar -> salvar` funciona sem metadata obrigatória.

## 3. Reader e compilação

Compilação comum e leitura básica do Project já implementadas. Os botões
Escrever/Ler do editor foram removidos; ele permanece dedicado à escrita com
preview lateral. A evolução do reader e do progresso de leitura fica para outra
etapa, depois da experiência de trabalho e limpeza de ebooks.

- compilação comum;
- normalização de títulos duplicados;
- reader contínuo e progresso;
- testes com Markdown extenso.

Saída: copy e reader mostram os mesmos Texts principais na mesma ordem.

## 4. Gerador de EPUB

- capa, assets, TOC, spine e metadata;
- idioma automático com opção avançada;
- validação e download do EPUB.

Saída: qualquer Project gera EPUB sem configurar cada Text.

## 5. Importador e limpador

- original imutável, diagnóstico e limpeza;
- extração baseada no spine;
- preview e criação de Project;
- jobs, retry e warnings.

Saída: EPUB pode ser limpo, convertido e copiado como Markdown sem perdas
silenciosas.

## 6. Curadoria gradual

- trazer os primeiros Projects úteis do legado;
- validar Kindle, reader, imagens e projetos grandes;
- corrigir a experiência antes de ampliar o escopo.

Não entram inicialmente: migração em massa, publicação externa, áudio interno,
IA integrada, histórico automático de revisões ou taxonomia avançada.

## Evolução futura — Pastas

Quando o volume da biblioteca justificar, adicionar uma aba opcional de Pastas
e subpastas para organizar Collections, Projects e textos soltos. Pastas não
alteram compilação, reader ou EPUB.

## Próxima rodada de interface

Primeiro ajuste concluído no Logos: barra azul `#1976d2`, logo Wtree branca,
largura total, navegação com seleção arredondada, posição fixa durante a rolagem
e alturas de 64px no desktop e 56px no mobile. Referências: Logos legado e Holding.

A versão neutra para o App Creator será feita em uma rodada separada.

Rodada de navegação implementada: lateral compartilhada e recolhível com Novo
texto, biblioteca, Projects expansíveis, Collections e recentes. A busca fica
na biblioteca. Texto
solto pode ser adicionado a Project pelo menu ou arrastando um recente.
Project abre na visão geral, com sumário ordenável, informações, versões, copy e
leitura completa; capítulos abrem diretamente. Caminho clicável compacto,
preview lateral opcional à direita. Cartões de Projects e
Collections preservados; upload de capas e geração de EPUB seguem nas etapas
de imagens e publicação.
