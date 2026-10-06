# Auditoria do frontend legado

## Resumo executivo

O frontend reúne recursos valiosos e navegáveis, sobretudo no celular, mas foi
construído por camadas sucessivas. Biblioteca, publicação e Kindle representam
visões diferentes do mesmo conteúdo sem uma arquitetura comum. As páginas de
criação e edição duplicam bastante lógica, e estados importantes vivem apenas
no navegador.

O app usa Next.js 14.2.2, React 18, JavaScript, Pages Router, Material UI 5 e
aproximadamente 7,7 mil linhas de JS em `src`. As dependências pertencem ao
workspace global do monorepo; o `package.json` do Logos não declara sua pilha.

## Rotas

| Rota | Papel atual |
|---|---|
| `/` | biblioteca privada no frontend, busca, favoritos e criação de livro |
| `/books/[bookSlug]` | detalhe, capítulos, ordem, Markdown completo, imagens e EPUB |
| `/books/[bookSlug]/new` | criação de capítulo |
| `/books/[bookSlug]/edit/[id]` | edição de publicação |
| `/books/[bookSlug]/[publicationSlug]` | leitura contínua de publicação |
| `/ebook-cleaner` | upload, limpeza, diagnóstico e conversão |
| `/kindle` | estante de leitura |
| `/kindle/[slug]` | sumário e continuar leitura |
| `/kindle/[slug]/[chapterId]` | leitor paginado |
| `/profiles` | lista e criação de identidades |
| `/profiles/[slug]` | detalhe, edição e exclusão de identidade |
| `/auth/login` e `/auth/register` | autenticação |

## Pontos fortes a preservar

### Experiência móvel

- barra inferior dedicada no celular;
- reader sem o layout principal;
- navegação anterior/próxima entre páginas e capítulos;
- controles simples de fonte;
- instalação PWA e safe areas;
- componentes geralmente responsivos.

### Feedback operacional

- snackbars para sucesso e erro;
- loading states nas operações principais;
- rollback local quando a reordenação falha;
- diagnóstico detalhado de EPUB no próprio job;
- ações destrutivas pedem confirmação.

### Ferramentas autorais

- editor Markdown com preview;
- copy de publicação;
- copy do livro completo em ordem;
- drag and drop dos capítulos;
- upload múltiplo de imagens;
- cópia da URL relativa para uso no Markdown;
- seleção de capa;
- geração e download do EPUB.

## Problemas de experiência e produto

### Três representações concorrentes

O mesmo livro aparece como:

1. item da Biblioteca;
2. conjunto de Publications;
3. item da estante Kindle.

Isso duplica navegação, carregamento e decisões de interface. O usuário não vê
claramente a diferença entre editar, publicar e ler uma edição.

### Profile domina a criação

Criar capítulo exige escolher Profile. O dropdown carrega todos os perfis
públicos, inclusive os de outros usuários, embora o backend rejeite a escolha
estrangeira. A identidade autoral se torna obstáculo operacional em vez de
metadado secundário.

### Estado preso ao navegador

Ficam em `localStorage`:

- favoritos;
- progresso de leitura;
- escala de fonte por livro;
- vínculo entre job de EPUB e livro criado.

Esses dados não acompanham o usuário em outro dispositivo. O vínculo do job é
especialmente crítico porque representa fato de domínio, não preferência de UI.

### Paginação Kindle por caracteres

O leitor corta Markdown a cada aproximadamente 1.100 caracteres. Parágrafos
longos podem ser divididos no meio e construções Markdown podem atravessar a
fronteira. O número de páginas muda com conteúdo, mas não com a largura real,
fonte ou viewport. O progresso salvo é, portanto, instável.

### Edição insegura para trabalho longo

- não existe autosave;
- não há aviso ao sair com alterações não salvas;
- não existe rascunho local ou versão anterior;
- uma falha de rede mantém apenas o estado React da aba;
- criação e edição são páginas grandes e parcialmente duplicadas.

### Ações e permissões desalinhadas

`canManageBook` verifica apenas autenticação e existência do livro. Um usuário
autenticado pode ver botões de outro owner e descobrir a negação somente após a
requisição.

A home se apresenta como biblioteca privada, mas os endpoints seguros do
backend retornam livros e capítulos de todos os usuários.

### Idiomas divergentes

O frontend oferece português, inglês e espanhol. O backend oferece português,
inglês, francês, alemão e latim. Espanhol é rejeitado pelo serializer e os três
últimos não podem ser escolhidos nas telas.

## Arquitetura e manutenção

### Pontos positivos

- cliente `request` centraliza JSON, FormData e erros básicos;
- proxies Next mantêm o token Django em cookie HttpOnly;
- componentes recentes extraem capítulos, arquivos, imagens e diagnósticos;
- o service worker evita cache de API e limita-se a assets estáticos;
- a build de produção passa.

### Dívida observada

- Pages Router e JavaScript sem tipos;
- nenhum teste frontend;
- nenhum script próprio de lint, teste ou build independente;
- páginas de 400 a 600 linhas concentram fetch, estado, regras e layout;
- criação e edição duplicam formulário e carregamento;
- chamadas HTTP estão divididas entre `src/api`, `fetch` direto e AuthContext;
- `NEXT_PUBLIC_DJANGO_API_URL` ainda é usado para imagens no Kindle;
- carregamento é quase todo client-side após mount;
- há helper `createBookPart` para endpoint que não existe mais;
- filtros compartilhados de Publication não possuem consumidor;
- comentários e estados mantêm vestígios de campos não existentes, como
  `summary` e `book_info`;
- o design system limita-se a theme MUI e estilos locais extensos;
- o reader Kindle mantém CSS global separado da experiência principal.

## Melhorias de produto sugeridas pela auditoria

Estas são direções, não layout final:

- uma entrada de Projetos em vez de bibliotecas concorrentes;
- coleção/série como contexto acima dos projetos;
- áreas distintas para Materiais, Escrita, Edição e Exportações;
- leitor como modo da edição, não cópia paralela do livro;
- autoria opcional, herdada do usuário ou projeto;
- recuperação em vez de exclusão destrutiva imediata;
- progresso por seção/posição sem depender de paginação artificial;
- compilação completa disponível para qualquer projeto;
- histórico persistente de imports e exports.

## Lacuna desta rodada

A build e os fluxos do código foram inspecionados, mas a sessão não ofereceu
uma superfície de navegador controlável para uma auditoria visual pixel a
pixel. Antes do guia definitivo de interface, deve haver uma rodada com:

- capturas desktop e mobile das telas atuais;
- execução autenticada das jornadas principais;
- inventário de padrões visuais que merecem ser preservados;
- protótipo navegável do novo mapa de informação.

