# Roadmap

## Prioridade atual

O foco é a oficina pessoal: trabalho, edição de Markdown e importação/limpeza de
ebooks. A página de edição chegou a uma base aprovada, intuitiva e econômica em
controles. Próximas melhorias devem partir do uso real. A experiência completa
de leitura fica para outra etapa; o preview é uma ferramenta de edição.

Próxima execução: consolidação global da fundação visual, antes da reorganização
detalhada de conteúdo e da ampliação de funcionalidades. Planejamento concluído
em 7 de outubro de 2026; código ainda não alterado. A direção está em
`product.md`, a arquitetura em `technical.md` e as fatias de execução no
[plano visual](frontend-layout-plan.md).

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

Capas implementadas: upload na visão geral, exibição na biblioteca, arquivos
privados por projeto, troca e reutilização de imagens enviadas.
Próximos ajustes desta etapa: avaliação de usabilidade com conteúdo real,
imagens no corpo do texto e organização de Collections por arrastar.
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
- conteúdo formado somente pelo Markdown salvo, sem inserir títulos cadastrados;
- reader contínuo e progresso;
- testes com Markdown extenso.

Saída: copy e reader mostram os mesmos Texts principais na mesma ordem.

## 4. Gerador de EPUB

Primeira geração implementada, adaptando os serviços do legado
(`md_to_epub_service.py`, `md_to_epub_utils.py` e `markdown_utils.py`) e
reaproveitando o motor EbookLib. Services organizados por responsabilidade,
seguindo o padrão do Holding.
O corpo vem somente do Markdown, na ordem dos Texts principais: `#` identifica
capítulo e `##` subcapítulo. Títulos cadastrados não são inseridos no conteúdo.
Geração e download privados na visão geral, usando a capa já enviada. O último
EPUB pertence à versão que o gerou e é substituído somente após sucesso.
Próximos passos: testar ebooks reais no Kindle, opções de idioma e guia de
Markdown. A checagem atual cobre estrutura XML/ZIP e recursos do pacote;
validação completa com EPUBCheck fica para a evolução do gerador.

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

## Interface — entregas anteriores

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
Collections preservados; upload de capas concluído. Geração de EPUB segue
na etapa de publicação.

## Interface — consolidação global planejada

Sequência: `Holding -> Logos -> App Creator`.

- [x] Estudar código, estilos e documentação das bases atuais.
- [x] Consolidar a direção com imagens e preferências do usuário.
- [x] Mapear arquitetura, consumidores, remoções e validação.
- [x] Confirmar MUI + Geist e refatoração direta da fundação visual.
- [ ] Integrar MUI/Emotion/Next com manifestos e locks compatíveis.
- [ ] Reaproveitar tema da Holding com identidade neutra; erro em laranja.
- [ ] Usar controles MUI e reutilizar composições de cabeçalho da Holding.
- [ ] Separar os painéis recolhíveis dos dados e da disponibilidade do preview.
- [ ] Permitir painel direito vazio na biblioteca.
- [ ] Refatorar todas as views e remover componentes/estilos substituídos.
- [ ] Validar escrita, navegação, responsividade e troca de identidade.
- [ ] Registrar o guia de interface alinhado aos componentes implementados.
- [ ] Transferir fundação genérica e guia ao template do App Creator.
- [ ] Validar geração limpa e independência do app gerado.

Criar/editar segue a leveza visual da referência GPT; biblioteca/livro usam
cards da Holding em paleta neutra. O [plano](frontend-layout-plan.md) detalha
responsabilidades e sequência. Organização fina de capas, textos e ações,
preview de ebook e evolução de leitura ficam para rodadas posteriores.
