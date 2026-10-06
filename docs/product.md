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

## Caixa de entrada

Lugar simples para guardar textos e ideias antes de saber a qual Project
pertencem. Depois é possível movê-los para um Project. Na implementação, pode
ser um Project reservado do usuário.

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
