# Notas técnicas

## Forma da aplicação

```text
Browser -> Next.js (`web`) -> Django REST (`api`) -> banco/storage
```

Direção: monólito modular derivado da fundação do App Creator, sem regras do
Holding.

## Dados centrais

- `Collection`: owner, título, descrição e posição;
- `Project`: owner, collection opcional, título, subtítulo, capa e autor
  opcional;
- `Text`: project, parent opcional, título, Markdown e posição;
- `Asset`: arquivos e imagens do Project;
- `ImportJob`: execução e arquivos da importação;
- `ExportArtifact`: EPUB gerado e metadata técnica;
- `ReadingProgress`: posição de leitura.

`Text.parent` aceita somente um nível no MVP. Um filho é variação e não entra na
compilação completa. Mover o filho para o nível principal remove essa condição.

## Versões do Project

O backend deve representar uma família de Projects com exatamente uma versão
principal. A família pertence à Collection; suas versões não aparecem como
Projects duplicados dentro dela.

Invariantes:

- cada versão continua sendo um Project completo, com seus próprios Texts;
- somente uma versão da família é principal;
- a compilação e os EPUBs finais pertencem à versão que os produziu;
- arquivos originais e limpos podem ser referenciados pela família inteira;
- uma versão secundária pode ser restaurada, mantida ou excluída;
- excluir uma versão secundária não altera a principal;
- trocar a principal é uma operação transacional;
- falha durante a cópia mantém a principal anterior intacta.

Algoritmo de **Criar nova versão principal**:

1. criar outro Project na mesma família e Collection, copiando somente os dados
   básicos adequados do Project;
2. não copiar Texts, variações nem EPUBs gerados;
3. marcar o novo Project vazio como principal;
4. rebaixar o anterior, com todo seu conteúdo, para versão secundária;
5. concluir a troca na mesma transação lógica.

O objetivo é receber novos Markdown organizados, não reproduzir o conteúdo ruim
da versão anterior. Arquivos de origem compartilhados pela família continuam
acessíveis sem serem duplicados.

Antes das migrations, deve-se escolher entre uma entidade interna de linhagem e
uma relação autorreferente. A entidade de linhagem tende a ser mais segura para
trocar a versão principal sem reescrever uma árvore de relações. Ela é detalhe
de backend e não faz parte do modelo mental do usuário.

Decisão de implementação: `ProjectFamily` guarda owner, Collection, posição e
referência à versão principal. Cada `Project` guarda seus próprios dados e
Texts. A família não aparece como entidade na interface. Criação e troca da
principal são transacionais; mover um Project de Collection move sua família.

## Compilação

Um DTO puro, independente do ORM, reúne metadata, Texts principais ordenados e
assets. Markdown completo, reader e EPUB consomem esse mesmo DTO.

Regras mínimas:

- não duplicar título quando o corpo já começa com heading equivalente;
- nunca filtrar conteúdo por idioma;
- preservar headings, tabelas, footnotes, listas e imagens;
- usar a mesma ordem em todas as saídas;
- permitir Text isolado no reader/copy;
- validar EPUB antes de concluir o job.

Idioma usa opção de exportação, preferência do usuário, detecção ou fallback
seguro. Autoria é metadata, não autorização.

## Importação

- preservar EPUB original imutável;
- calcular fingerprint;
- inspecionar manifest, spine, TOC e recursos;
- limpar sem substituir o original;
- usar spine como ordem primária;
- mostrar preview dos Texts extraídos;
- criar Project de forma idempotente;
- registrar warnings e perdas conhecidas;
- permitir retry sem duplicação silenciosa.

## Segurança e storage

- todo conteúdo privado parte do usuário autenticado;
- jobs e arquivos pertencem ao usuário;
- operações longas têm estado persistido;
- arquivos gerados guardam checksum e versão do compilador;
- falha não substitui artefato válido;
- exclusão material exige confirmação.

Publicação externa, histórico automático de revisões, tags, subpastas,
colaboração e integração com IA não pertencem ao MVP.
