# Produto

## O que é

O Logos é uma biblioteca-oficina pessoal. Serve para guardar uma ideia, escrever
uma obra, reunir material de estudo, recuperar um EPUB e transformar Markdown
em formas diferentes de consumo.

## Backend — organização conceitual

```text
Collection (opcional)
└── Project
    └── Text
        └── variations (opcionais)
```

### Collection

É uma pasta para Projects relacionados. Pode representar série, tema ou caminhos
independentes que o usuário quer ver lado a lado. Não altera EPUB, idioma,
autoria ou conteúdo.

```text
Cultura — Iain M. Banks
├── O Jogador
├── Pense em Phlebas
└── Uso das Armas

Entre a Verdade e o Pertencimento
├── Sem LLM
├── Com LLM
└── Versão 2
```

Project pode existir sem Collection.

Collection não deve ser usada para exibir cópias sucessivas da mesma obra. Se
um Project foi refeito para substituir uma versão ruim, a versão anterior fica
ligada ao novo Project principal sem ocupar outra posição na Collection.

### Pastas — evolução futura

Se a biblioteca crescer, uma aba separada de Pastas poderá organizar
Collections, Projects e textos soltos, inclusive com subpastas.

Folder será apenas navegação. Não substituirá Collection e não afetará conteúdo,
reader, Markdown ou EPUB. Não faz parte do MVP inicial.

### Project

É um conjunto ordenado de Texts. Pode ser livro, estudo, roteiro, material de
concurso ou conjunto de ideias, sem escolher um tipo.

```text
Artigos e Reflexões
├── Reflexão 1
├── Reflexão 2
├── Reflexão 3 — V1
│   ├── versão em inglês
│   └── versão sem filtro
└── Reflexão 4
```

Os Texts no nível principal formam o Project. As variações ficam recolhidas sob
seu Text principal e têm peso secundário.

### Versões do Project

Project pode possuir versões secundárias. Apenas uma versão é a principal e
representa a obra na Collection.

```text
Collection “Cultura”
└── Project principal “Pense em Phlebas” — versão boa
    └── versão anterior — capítulos bagunçados
```

A regra de backend para **Criar nova versão principal**:

1. cria outro Project com os dados básicos do atual, mas sem copiar seus Texts;
2. torna o novo Project a versão principal;
3. mantém o Project anterior, com seus Texts, como versão secundária;
4. preserva a opção de restaurar ou excluir a versão anterior.

Isso é uma cópia explícita para refazer uma obra, não histórico automático de
cada salvamento.

### Text

Tem somente:

- título;
- conteúdo Markdown;
- posição no Project;
- Text principal opcional, quando for variação.

Criar um Text continua simples:

```text
+ -> escrever ou colar -> salvar
```

Duplicar um Text pode criar uma variação. Uma variação pode ser editada,
copiada, excluída ou movida para a lista principal.

Por padrão, somente os Texts principais entram no Markdown completo, reader e
EPUB. Variações não entram silenciosamente.

O conteúdo dessas saídas vem somente do Markdown salvo. Títulos e subtítulos
cadastrados são usados para organização e navegação, sem serem inseridos no
corpo do livro. `#` marca capítulo e `##` subcapítulo no futuro gerador.

## Frontend — comportamento simples

No Project, o comportamento já comprovado é:

```text
reordenar -> arrastar
editar -> salvar
adicionar -> botão +
```

Não existe etapa adicional para ordenar ou editar. Ao criar uma nova versão
principal, o novo Project abre vazio e recebe os novos Markdown pelo mesmo botão
`+`.

O desenho visual definitivo será tratado separadamente do backend.

O Logos novo pode redesenhar sua experiência com liberdade. Comportamentos úteis
do legado serão aproveitados quando não houver uma alternativa melhor; não há
exigência de fidelidade às telas antigas como na reconstrução do Holding.

## Novo texto e navegação

`Novo texto`, com lápis, é o primeiro item da lateral. Abre a escrita sem exigir
Project. Textos soltos podem depois ser adicionados a um Project pelo menu ou
arrastando um recente para o Project. Recentes mostra os textos utilizados por
último, associados ou não a Projects; não é uma pasta. Textos antigos continuam
acessíveis na biblioteca e busca. Não há uma Caixa de entrada na interface.

A lateral acompanha biblioteca, Project e Text: Novo texto, buscar, biblioteca,
Collections, Projects e recentes. Clicar no nome do Project abre sua visão geral;
clicar num Text abre a escrita. A visão geral não aparece como capítulo fixo e
não entra na compilação. Ela reúne sumário ordenável, informações, versões e
ações do livro. Capas e geração de EPUB pertencem à etapa de publicação.

O caminho clicável `Biblioteca / Collection / Project / Text` substitui a volta
isolada e títulos repetidos. Collection aparece somente quando existir.
Escrita permite mostrar ou esconder o preview lateral à direita. Título é um
campo discreto na barra; copiar, preview e salvar são controles por ícone.
Não há abas Escrever/Ler no editor. A lateral pode ser recolhida.

Prioridade atual: experiência de trabalho, edição e limpeza de ebooks para uso
pessoal. A experiência completa de leitura será tratada em outro momento; o
preview atende à revisão durante a escrita. A leitura básica de Project já
disponível não precisa crescer junto com a oficina.

Livros e Collections usam cartões na biblioteca, preparados para receber capas.

A lateral segue as referências fornecidas do GPT: mesma escala de texto,
peso normal, cores neutras suaves, ícones SVG de 20px e linhas alinhadas.
Projects usam pasta; no hover/foco aparece o lápis para adicionar um Text e o
menu contextual. Em dispositivos sem hover, as ações permanecem visíveis.
Os padrões do Holding serão considerados depois, preservando este formato de
navegação. O estilo da lateral vive em `sidebar.css`, junto de seu componente.

## Ações principais

Em Text:

- editar;
- copiar Markdown;
- duplicar como variação;
- mover;
- excluir.

Em Project:

- adicionar e ordenar Texts;
- duplicar Project;
- criar nova versão principal;
- copiar Markdown completo;
- ler;
- gerar EPUB.

Em Collection:

- criar, mover e ordenar Projects.

## Importar e limpar EPUB

```text
upload do original
-> diagnóstico
-> EPUB limpo
-> extração para Project e Texts
```

O original é preservado. O Project extraído pode ser corrigido ou servir apenas
para copiar o Markdown e criar outro Project limpo.

## Consumo

### Capa e arquivos do Project

Na visão geral, clicar na capa permite enviar ou trocar a imagem, em uma ação
única. Ela aparece também no cartão da biblioteca, sem recortar seu conteúdo.
Imagens anteriores continuam nos arquivos do Project e podem voltar a ser capa.

Arquivos ficam reunidos sob `projects/<identificador>/`, com imagens em
`images/`, EPUBs em `ebooks/` e fontes em `originals/`. O identificador permanece
estável ao renomear o Project. Versões compartilham os arquivos, mas cada versão
escolhe sua capa. Uma cópia independente recebe seus próprios arquivos.

Na visão geral, **Gerar EPUB** produz o arquivo a partir do Markdown salvo,
incluindo a capa escolhida. **Baixar EPUB** recupera a última geração desta
versão do Project. Gerar novamente só substitui o arquivo anterior depois do
sucesso; editar o texto não gera EPUB automaticamente.

`#` abre um capítulo e `##` entra no sumário como subcapítulo. Conteúdo sem
heading também é preservado, com uma entrada neutra no sumário. O título interno
do EPUB vem do primeiro `#` do Markdown, com fallback neutro quando ausente.
Títulos cadastrados não entram no EPUB; o nome do Project identifica o arquivo
baixado. A autoria opcional é metadata técnica. O idioma inicial é `pt-BR`,
sem filtrar textos nem exigir configuração.

O mesmo conteúdo pode ser:

- lido no app;
- gerado como EPUB e enviado ao Kindle;
- copiado como Markdown para trabalhar no GPT;
- copiado para produzir áudio em outra ferramenta.

Geração de áudio e integração direta com IA ficam fora do MVP.

## O que não pedir no fluxo de escrita

- Profile;
- idioma por Text;
- autor por Text;
- tipo de conteúdo;
- publicado/rascunho;
- classificação editorial;
- destino final do texto.

Idioma e autoria exigidos pelo EPUB são inferidos ou ajustados apenas nas opções
avançadas da exportação. Nunca podem impedir a geração.

## Migração

O legado continua consultável. Somente Projects úteis serão recriados aos
poucos, por copy/paste de Texts, Markdown completo ou nova importação do EPUB.
Não haverá migração obrigatória das 946 Publications e dos órfãos.

A seleção inicial será aproximadamente um décimo dos livros, textos e capítulos
úteis, sem uma quota rígida por entidade. Parte dessa transferência acontecerá
durante testes de usabilidade. Depois, a biblioteca será recomposta gradualmente
com novos livros e conteúdo.
