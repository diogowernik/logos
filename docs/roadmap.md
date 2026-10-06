# Roadmap

## 1. Fundação

- criar `api/` e `web/` a partir do App Creator;
- autenticação, banco, storage, testes e CI.

Saída: aplicação vazia executável.

## 2. Biblioteca e editor

- Collection, Project e Text;
- variações com um nível;
- versão principal e versões secundárias de Project;
- ação transacional para criar nova versão principal;
- Caixa de entrada;
- criar pelo botão `+`, editar e salvar;
- reordenar diretamente por arrastar;
- mover e duplicar;
- editor Markdown, preview, imagens e busca;
- copiar Text e Project completo.

Saída: `+ -> escrever/colar -> salvar` funciona sem metadata obrigatória.

## 3. Reader e compilação

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
