# Arquitetura

```text
Browser → Next.js (web) → Django REST (api) → banco/storage
```

Django é a fonte de autenticação, autorização e dados. O usuário padrão é
mantido; Djoser fornece login/logout e usuário atual. Cadastro público está
desligado. Novos endpoints privados devem filtrar dados pelo usuário, além da
permissão de objeto.

Next guarda o token em cookie HttpOnly próprio do app e expõe apenas rotas
internas ao navegador. Sessão inválida limpa o cookie; indisponibilidade da API
retorna erro recuperável sem encerrar a sessão. Logout sempre limpa a sessão
local; se a API estiver indisponível, a revogação do token no backend não pode
ser garantida naquele momento.

Rotas compõem a interface; componentes contêm interação; `src/api/client.ts`
centraliza JSON, FormData e downloads; `src/server/django.ts` contém acesso
server-side ao backend. Páginas privadas chamam `requireUser()` antes de carregar
conteúdo; o layout sozinho não impede a renderização paralela de seus filhos.
Tema mínimo usa tokens CSS e controles nativos, sem
impor navegação ou páginas de negócio. Acrescente providers quando houver uso.

SQLite atende desenvolvimento; `DATABASE_URL` permite PostgreSQL. Storage
privado e processamento de jobs devem ser implementados no domínio conforme
necessidade; `MEDIA_ROOT` configurado não equivale a download público habilitado.

Configuração de produção falha sem segredo forte e hosts explícitos. Variáveis
do processo têm precedência sobre `.env`. Configure `APP_ORIGIN` explicitamente
no Next em produção. Confiança em proxy Django é opt-in; não aceitar cabeçalhos
encaminhados de origem não controlada.

Manifestos e locks são as fontes de dependências. A aplicação é independente do
App Creator e não recebe suas atualizações automaticamente. `.app-creator.json`
registra somente proveniência da geração.
