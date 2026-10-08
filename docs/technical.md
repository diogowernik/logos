# Notas técnicas

## Forma da aplicação

```text
Browser -> Next.js (`web`) -> Django REST (`api`) -> banco/storage
```

Direção: monólito modular derivado da fundação do App Creator, sem regras do
Holding.

## Fundação visual — arquitetura implementada

MUI e Geist implementados, reaproveitando
o tema, as composições e a integração Next da Holding. O tema MUI concentra
cores, fontes, métricas e variantes, com identidade neutra configurável e
variáveis CSS geradas pelo próprio tema. Usar componentes MUI diretamente;
componentes próprios organizam composições comprovadas. As features cuidam
de conteúdo e geometria do domínio, sem um segundo sistema visual em CSS.

O shell recebe cabeçalho, navegação esquerda, conteúdo central e painel direito
por composição. Estado de abertura e host do painel direito ficam separados
dos dados de `useLibrary`. O editor conserva seu rascunho e publica o preview
no host do shell por portal. O painel pode existir vazio e recolher sem remontar
o editor; conteúdo da view anterior é limpo ao navegar.

O frontend pode ser refatorado diretamente para a estrutura final, removendo
componentes e definições locais substituídos. O uso é pessoal e o produto está
em desenvolvimento; não criar adaptadores de legado, flags de transição ou
duas bases visuais permanentes. Preservar dados e comportamentos editoriais.
A fundação possui duas composições, oficina de texto leve e cards de biblioteca/
livro, compartilhando a mesma identidade. Não acrescenta regra de backend,
endpoint ou dependência de runtime entre os repositórios. Manifestos e locks
registram MUI/Emotion e o adaptador Next compatíveis; não
acoplar as consultas de Logos ao QueryClient financeiro da Holding.

O [plano da fundação visual](frontend-layout-plan.md) registra fontes de
reaproveitamento, arquivos, contratos, sequência e validações. É um detalhamento
desta arquitetura. O [guia da interface](frontend-guide.md) aponta a fonte de cada padrão.
`useProjectEditor.ts` preserva as operações editoriais separadas da apresentação.

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

Textos soltos usam por enquanto um Project reservado (`is_inbox`) como detalhe
interno, sem pasta ou nome na interface. A navegação permite texto independente
e destino explícito posteriormente, preservando dados já existentes.
`Text.last_used_at` registra salvamentos e aberturas para ordenar recentes;
listagens e buscas privadas não carregam todos os corpos Markdown.

## Compilação

Services seguem a separação já usada no Holding: `services/projects.py` e
`services/texts.py` mantêm operações do domínio; `services/assets.py` cuida dos
arquivos; `services/exports.py` orquestra compilação, geração e persistência.
Views apenas autorizam, chamam o service e serializam a resposta.

O pacote `epub/` adapta o motor do legado: conversão de Markdown com as mesmas
extensões e pagebreaks, preparação de capítulos e sumário, e montagem EbookLib.
Esse motor recebe dados simples e não consulta ORM nem gerencia storage.

`ExportArtifact` guarda o último EPUB de cada Project, checksum e versão do
gerador. A geração é síncrona. O novo arquivo é montado e inspecionado antes de
ser salvo; a troca é transacional e a exclusão do anterior ocorre após commit.
O download é privado. Nova versão nasce sem EPUB; cópia independente também
precisa gerar seu próprio EPUB.

Imagens do Project referenciadas no Markdown são incorporadas por seus URLs
privados; recursos remotos não são baixados nesta rodada. Capas JPEG/PNG mantêm
o formato, e WebP é convertido para PNG para compatibilidade EPUB. A validação
local verifica mimetype, ZIP, XML, manifest e spine; não substitui EPUBCheck.
O proxy reserva até 60 segundos para gerar, mantendo o timeout usual nas outras
operações.

Um DTO puro, independente do ORM, reúne metadata, Texts principais ordenados e
assets. Markdown completo, reader e EPUB consomem esse mesmo DTO.

Regras mínimas:

- corpo formado somente pelo Markdown, sem injetar títulos cadastrados;
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

Capas usam `Asset`, vinculado à família do Project. O caminho local é
`media/projects/<family-id>/images/<asset-uuid>.<ext>`, independente do título.
`ebooks/` e `originals/` serão usados pelas próximas etapas dentro da mesma
pasta. JPEG, PNG e WebP são aceitos até 10 MB, com validação real da imagem.

Cada versão escolhe sua capa entre os arquivos compartilhados. Trocar ou
remover a capa conserva a imagem na lista de arquivos. Duplicar um Project
copia seus arquivos para uma nova família; excluir a família apaga os arquivos
após a transação. Excluir somente uma versão mantém os arquivos compartilhados.

Arquivos são servidos por endpoint autenticado e filtrado pelo proprietário,
através do proxy Next. O proxy preserva multipart no envio e bytes no download.
Não há exposição pública de `MEDIA_ROOT`; imagens privadas usam a sessão do
browser, sem otimização remota do Next.

- todo conteúdo privado parte do usuário autenticado;
- jobs e arquivos pertencem ao usuário;
- operações longas têm estado persistido;
- arquivos gerados guardam checksum e versão do compilador;
- falha não substitui artefato válido;
- exclusão material exige confirmação.

Publicação externa, histórico automático de revisões, tags, subpastas,
colaboração e integração com IA não pertencem ao MVP.

## Estado da rodada visual

Implementação concluída, com resultados locais já registrados. Aceite visual
e validação complementar ficam para a próxima rodada do usuário; consulte
[frontend-validation.md](frontend-validation.md).
