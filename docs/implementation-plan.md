# Plano de implementação do Logos

Atualização após a primeira rodada: a fundação executável do App Creator foi
concluída e validada localmente. O diagnóstico abaixo registra o estado anterior
à implementação; o próximo passo do Logos é integrar a fundação preservando sua
documentação existente.

Data: 6 de outubro de 2026.

Estado: proposta baseada na documentação e na investigação local. Esta rodada
não implementou a aplicação, executou migrations ou alterou os projetos de
referência. `product.md`, `technical.md` e `roadmap.md` continuam sendo a direção
canônica; este plano organiza sua execução.

## Recomendação

Construir o mínimo executável do App Creator e usar essa fundação para iniciar
o Logos. Entregar primeiro biblioteca e editor, depois reader, exportação EPUB
e importação/limpeza. Trazer conteúdo útil do legado manualmente durante a
validação, sem tornar a migração uma condição para começar a escrever.

Direção confirmada após esta proposta: selecionar aproximadamente um décimo do
conteúdo útil e trazer parte dele nos testes de usabilidade; recompor a biblioteca
com novos livros. O UX novo tem liberdade de desenho, aproveitando o que funciona
no legado quando não houver uma proposta melhor. Holding é principalmente uma
referência de arquitetura.

O painel de gerenciamento, catálogo de projetos e atualizações assistidas do
App Creator não precisam existir para iniciar o Logos.

## Diagnóstico

| Projeto | Estado observado | Papel no Logos |
| --- | --- | --- |
| `logos` | Documentação e cinco auditorias; sem `api/` ou `web/` | Regras e escopo |
| `app-creator` | Documentação; sem `template/` ou `create-app.sh` | Fundação comum ainda a implementar |
| `holding` | Django/DRF, Next/React/TypeScript, autenticação, testes e CI | Referência de infraestrutura e organização |
| `monorepo/back/publications` e `profiles` | Domínio antigo, serviços EPUB/Markdown e banco local | Referência de comportamento e algoritmos |
| `monorepo/front/logos` e `shared` | Interface antiga e proxies de autenticação | Jornadas, reordenação e experiência móvel |
| `monorepo/front/add-app.sh` | Gerador antigo de frontend dentro do workspace | Contexto histórico; não é o novo App Creator |

A pasta correspondente ao pedido sobre create-app é `app-creator`. A geração
moderna ainda não é uma etapa pronta. O script antigo usa grandes blocos de
código no shell, estrutura que a documentação nova manda substituir por um
orquestrador pequeno e arquivos reais em `template/`.

### O que aproveitar do Holding

O código confirma navegador → Next → Django, Djoser/TokenAuthentication,
cookie HttpOnly, páginas protegidas e CI separado por componente. Os manifestos
locais declaram Django na linha 5.2, Next 16.3.8 e React 19.2.8. São versões da
referência examinada; suporte e compatibilidade precisam ser verificados na
documentação oficial ao montar o template.

Reaproveitar por seleção e adaptação:

- configuração Django, autenticação e health check;
- adaptador `web/src/server/django.ts` e rotas de login/logout/sessão;
- proteção de rotas, cliente HTTP e providers essenciais;
- tokens e componentes estruturais mínimos, testes e CI.

Pontos a adaptar antes de incorporar à fundação:

- o `.env` usa `override=True`: respeitar as variáveis do processo;
- separar defaults de desenvolvimento e configuração de produção;
- retirar debug e tipo do banco do health check público;
- nomear o cookie por aplicação, evitando interferência entre apps no mesmo
  host, inclusive em portas diferentes;
- acrescentar suporte explícito a FormData e downloads ao cliente JSON;
- não submeter processamento EPUB ao timeout HTTP atual de cinco segundos;
- validar autenticação ponta a ponta no Next, além dos testes Django existentes.

Não copiar bancos, `.env`, segredos, integrações financeiras, gráficos, regras
de carteira ou o shell de produto. Havia alterações locais nos três arquivos
da página de login do Holding; preservá-las e não tomar a tela em edição como
template definitivo.

### O que aproveitar e corrigir do legado

Consulta somente leitura ao SQLite confirmou 19 livros, 946 publicações, 370
capítulos ligados e 562 capítulos sem livro nem grupo, além de 10 grupos, 52
imagens e 19 jobs CleanEpub.

O código confirma problemas relevantes para a reconstrução:

- leituras de Books e Publications não são privadas por owner;
- importação exige Profile e não persiste vínculo idempotente com o resultado;
- limpeza ordena por heurísticas de título/arquivo em vez do spine;
- exportação pode filtrar capítulos por idioma;
- copiar Markdown e gerar EPUB usam compilações diferentes;
- reader Kindle pagina aproximadamente a cada 1.100 caracteres;
- progresso e vínculos operacionais ficam no navegador;
- geração mantém apenas um EPUB e remove o anterior;
- transações de banco não resolvem sozinhas falhas na gravação de arquivos.

Há valor no reparo de fontes ausentes, diagnóstico, parsing e transformação de
Markdown. Recuperar os algoritmos úteis com testes, substituindo os vínculos
com Book/Publication/Profile e a orquestração antiga.

Na árvore `monorepo/back/files` consultada, foi localizado um EPUB gerado de
`memorias-de-um-engenheiro`; `monorepo/back/media` não existe nesta cópia. Os
exemplos de importação citados na auditoria, como o original problemático de
*Pense em Phlebas*, precisam ser localizados para reproduzir aquele caso. Isso
não comprova ausência ou perda em produção.

Recomendações antigas sobre publicação, migração automática, quarentena e
taxonomia não ampliam o MVP canônico. O legado permanece intacto.

## Sequência de execução

### 1. App Creator mínimo e fundação do Logos

**Posso executar sozinho:** selecionar a infraestrutura transversal do Holding;
criar `template/api`, `template/web`, exemplos de ambiente, testes e CI; criar
o gerador pequeno com validação e proteção contra sobrescrita; gerar um app
descartável e validar instalação, migrations, login, sessão, logout, acesso
anônimo, tipos, lint, testes e build; integrar essa fundação ao Logos.

O Logos já é um diretório existente. Gerar em destino temporário novo e integrar
apenas os arquivos necessários, preservando documentação e Git. Não relaxar a
regra de não sobrescrita nem copiar `.git` ou segredos. Configurar banco/storage
próprios, cookie próprio e portas disponíveis para coexistir com os outros apps.

**Sua participação:** não exige decisão de interface. Antes de usar sua conta
real, definir se deseja manter o login existente ou criar uma conta nova. A
validação inicial usa usuário de desenvolvimento e não depende de credenciais
de produção.

**Conclusão:** aplicação vazia executável, autenticação conectada, verificações
passando e independência do App Creator após a geração.

### 2. Modelo de domínio e contratos

**Posso executar sozinho:** implementar Collection opcional, Project, Text e
Caixa de entrada; escolher e documentar uma entidade interna de família antes
das migrations; garantir uma principal por família, com Collection e posição
coerentes; implementar nova principal vazia, restauração e exclusão de versões
secundárias; variações com um nível; movimentação, duplicação e reordenação;
autorização por usuário, inclusive de arquivos; ciclo de vida dos assets.

**Sua participação:** somente diante de ambiguidade que altere o resultado
visível, como o destino dos textos ao excluir um Project. Apresento opções e
consequências. Estrutura de tabelas, endpoints e services ficam comigo.

**Conclusão:** testes das invariantes e de usuários isolados; falha na troca
preserva a principal anterior; nova principal não copia Texts, variações ou
EPUBs; restauração não duplica posições na Collection.

### 3. Biblioteca e editor — primeira entrega utilizável

**Posso executar sozinho:** preparar proposta navegável desktop/mobile;
implementar `+ → escrever/colar → salvar`, preview Markdown, feedback e
proteção de alterações não salvas; editar/salvar e arrastar para reordenar;
mover, duplicar e excluir; variações recolhidas e versões secundárias; imagens,
capa opcional e busca; núcleo de compilação para copiar Text e Project completo;
validar teclado, toque, estados vazios e falhas de rede/sessão.

**Sua participação:** avaliar a proposta concreta de navegação, densidade e
editor; testar um pequeno Project real e indicar onde o fluxo atrapalha. O
Holding orienta a construção, mas não determina sozinho o visual do Logos.
Posso avançar o backend enquanto essa avaliação ocorre.

**Conclusão:** criar, escrever/colar, salvar, reordenar, mover e copiar sem
Profile, idioma, tipo ou status obrigatórios. Variações não entram
silenciosamente na compilação.

### 4. Reader e compilação comum

**Posso executar sozinho:** consolidar o DTO independente do ORM; fornecer a
mesma seleção, ordem, metadata e assets ao copy, reader e futuro exportador;
normalizar headings duplicados; implementar leitura contínua, sumário, fonte e
progresso persistido por usuário/versão/Text, sem cortes por caracteres; testar
Markdown extenso, tabelas, footnotes, listas e imagens.

**Sua participação:** validar conforto de leitura, controles e retomada no
celular. Revisão automatizada de layout fica comigo; sensação de leitura e
comportamento no seu dispositivo ficam com você.

**Conclusão:** reader e Markdown completo mostram os mesmos Texts principais
na mesma ordem; continuar leitura funciona após sair e voltar.

### 5. Exportação EPUB

**Posso executar sozinho:** adaptar os algoritmos úteis ao DTO; incorporar
capa, imagens, TOC, spine, headings e metadata; resolver idioma/autoria com
defaults e opções avançadas sem bloquear por metadata editorial ausente;
persistir execução, checksum, versão do compilador e artefato; validar antes do
download; preservar o artefato válido anterior se uma geração falhar.

**Sua participação:** abrir um EPUB real no Kindle ou leitor que usa e avaliar
sumário, imagens, quebras, notas e legibilidade. Envio automático ao Kindle não
é condição para esta entrega.

**Conclusão:** arquivo validado, conteúdo e ordem correspondentes à compilação
comum e uso confirmado no dispositivo escolhido.

### 6. Importação e limpeza EPUB

**Posso executar sozinho:** preparar fixtures sintéticas e extrair partes puras
dos serviços; preservar original imutável e fingerprint; inspecionar manifest,
spine, TOC e recursos; usar spine como ordem primária; revisar heurísticas;
persistir diagnóstico, warnings, tentativas e vínculo com o Project criado;
mostrar preview; permitir retry sem duplicação; limpar temporários e tratar
consistência entre banco/storage.

Começar com execução simples e estado persistido. Escolher a forma de
processamento após medir os casos reais; fila distribuída não é requisito
automático, mas operações demoradas não podem depender de uma requisição curta.

**Sua participação:** selecionar alguns EPUBs reais, incluindo um problemático,
e avaliar propostas de limpeza quando houver dúvida editorial. Posso detectar
e explicar diferenças; decidir remover conteúdo ambíguo é sua atribuição. Sem
os arquivos, avanço com fixtures sintéticas e registro a validação real pendente.

**Conclusão:** original preservado, preview na ordem do spine, perdas declaradas
e importação repetida sem duplicação silenciosa.

### 7. Curadoria e entrada em uso

**Posso executar sozinho:** comparar conteúdo, apoiar copy/paste ou reimportação
dos Projects escolhidos, validar assets e corrigir problemas. Preparar
configuração de implantação e proposta de backup quando esse passo for pedido.

**Sua participação:** escolher conteúdo útil, validar os primeiros Projects,
definir destino e autorizar eventual publicação. Não há obrigação de migrar os
946 textos ou resolver todos os órfãos.

**Conclusão:** primeiros Projects úteis disponíveis, fluxo cotidiano validado e
limitações conhecidas registradas.

## Pontos de participação concentrados

| Momento | O que apresento | O que você decide/valida | O que pode continuar |
| --- | --- | --- | --- |
| Início | Este plano e primeira entrega | Mudar prioridade se a necessidade divergir do roadmap | Fundação e contratos conforme a direção existente |
| Biblioteca/editor | Proposta navegável desktop/mobile | Visual e praticidade da escrita | Backend, invariantes, autenticação e compilação |
| Reader/exportação | Reader e EPUB de exemplo | Conforto no celular e compatibilidade com Kindle/leitor | Testes de conteúdo, pacote e falhas |
| Importação/curadoria | Diagnóstico, preview e comparação | Conteúdo a manter, descartar ou recriar | Parser, fixtures sintéticas e idempotência |
| Implantação | Configuração e resultado revisável | Conta real, destino e publicação | Preparação técnica e documentação |

Não preciso que você escolha bibliotecas técnicas, tabelas, migrations, endpoints
ou ferramentas de teste. Decisões reversíveis de engenharia ficam comigo.
Mudanças de produto, seleção editorial e ações destrutivas ou externas entram
nos momentos adequados, com resultado concreto para avaliar.

## Primeiro bloco proposto

Implementar e validar o App Creator mínimo, integrar a fundação ao Logos e
entregar os primeiros contratos de Collection/Project/Text e suas famílias.
Em seguida, apresentar biblioteca/editor navegáveis e concluir a primeira
versão de uso real. Não depende de arquivos EPUB ou desenho final de leitura.

Acompanhar por entregas verificáveis, sem estimar prazo antes de provar geração
limpa e integração. O importador tem maior incerteza por depender da diversidade
de arquivos e de avaliação editorial.

## Limites e fontes da investigação

- Li a direção e todas as auditorias do Logos, a documentação do App Creator,
  arquitetura/migração/MVPs e referências de UI do Holding, instruções dos
  repositórios e pontos relevantes do código moderno e legado.
- Consultei o SQLite somente em modo de leitura. Não rodei os apps, testes ou
  builds; resultados antigos das auditorias não validam esta máquina hoje.
- Não fiz auditoria visual autenticada nem validação EPUB em dispositivo real.
- Caminhos `/Users/diogo/...` na documentação são históricos; a cópia
  investigada está em `/Users/mizratti/Development/...`.

Referências principais:

- Logos: [produto](product.md), [técnica](technical.md), [roadmap](roadmap.md) e
  [índice das auditorias](README.md).
- App Creator: [arquitetura](../../app-creator/docs/architecture.md),
  [referências](../../app-creator/docs/references.md),
  [roadmap](../../app-creator/docs/roadmap.md) e
  [versões](../../app-creator/docs/versioning.md).
- Holding: [arquitetura](../../holding/docs/architecture.md),
  [migração](../../holding/docs/migration.md),
  [MVPs](../../holding/docs/mvp-roadmap.md) e
  [guia de interface](../../holding/docs/frontend-ui-guide.md).
- Legado: [API](../../monorepo/back/publications/views.py),
  [limpeza](../../monorepo/back/publications/epub_clean_service.py),
  [geração](../../monorepo/back/publications/md_to_epub_service.py),
  [copy](../../monorepo/front/logos/src/utils/bookMarkdown.js) e
  [plano mobile](../../monorepo/front/docs/features/logos-mobile-experience-plan.md).
