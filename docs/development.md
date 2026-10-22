# Desenvolvimento

## Preparar

Use Python e Node compatíveis com os manifestos e o gerenciador `uv`.
A partir da raiz:

```bash
bash scripts/setup.sh
./.venv/bin/python api/manage.py createsuperuser
```

Setup instala os locks, migra o banco local e copia exemplos de ambiente apenas
quando ausentes. Não cria credenciais. Não execute esse setup sobre produção.

## Executar

Em terminais separados:

```bash
./.venv/bin/python api/manage.py runserver 127.0.0.1:8026
```

```bash
cd web
npm run dev
```

Abra `http://localhost:3026`. Ao mudar portas, ajuste `DJANGO_API_URL` e origens.
Ambientes: `api/.env` e `web/.env.local`; o usuário Django autentica no frontend.

## Validação conforme a mudança

Ajustes simples de aparência ou texto não exigem suíte completa, build ou docs.
Escolha só a verificação que cobre o risco da mudança; não execute esta lista
automaticamente nem repita comandos que já passaram sem uma nova razão.
Para uma seleção de testes Django, acrescente o módulo ou classe ao comando:

```bash
DJANGO_ENV=development ./.venv/bin/python api/manage.py test library config
./.venv/bin/ruff check api
```

No diretório `web`, conforme necessário:

```bash
npm run lint
NEXT_DIST_DIR=.next-codex npm run typecheck
npm test -- tests/library.test.tsx # exemplo: selecione o arquivo afetado
NEXT_DIST_DIR=.next-codex npm run build
```

Quando a mudança afetar autenticação, após o build, da raiz:

```bash
./.venv/bin/python scripts/test_auth.py
```

Esse teste usa banco descartável, processos temporários e portas livres; não
usa credenciais reais nem altera o banco local. A checagem visual é feita pelo
usuário. Alterações apenas de documentação exigem conferir links e diff.

## Fontes locais dos livros

Confira o `Project.id` do livro no banco; não deduza pelo título.
A pasta é estável mesmo ao renomear o livro:

```text
api/media/projects/<project-id>/
├── sources/markdown/         # 01-ato.md, 02-ato.md, …
├── originals/               # EPUB de origem, imutável
├── images/                  # assets enviados
└── ebooks/                  # exportações; imports/ para cópias limpas
```

Crie somente pastas necessárias. Nomes numerados ordenam os Markdown sem mudar
headings internos. Uma nota local de procedência pode registrar origens e hashes.
A interface descobre arquivos dessas pastas: EPUB requer vínculo explícito;
Markdown requer geração de textos. Editar arquivos não sincroniza o banco.
Os [contratos técnicos](technical.md) explicam limites e lifecycle dos arquivos.

Banco, ambientes e media ficam fora do Git. Faça backup do banco e dos arquivos.

## Reassociar fontes preservadas após recriar o banco

Crie o livro na interface e confira seu ID. Copie somente as fontes para sua pasta
com associação explícita; o comando conserva a pasta original e rejeita colisões:

```bash
./.venv/bin/python api/manage.py copy_book_sources <project-id> --from-folder /caminho/do/livro --dry-run
./.venv/bin/python api/manage.py copy_book_sources <project-id> --from-folder /caminho/do/livro
```

A pasta de origem deve conter `originals/` e/ou `sources/markdown/`. Na interface,
atualize as pastas; vincule o EPUB e escolha o grupo ao gerar textos. O comando
não cria textos nem faz extração automática. Se usar fontes arquivadas em `api/media/archive/before-groups-*/projects/`,
confira sua procedência; IDs do banco recriado podem pertencer a outros livros.

## Produção

Configure `DJANGO_ENV=production`, `DJANGO_DEBUG=false`, segredo aleatório com
pelo menos 50 caracteres, hosts explícitos, `DATABASE_URL`, HTTPS e backups.
Next exige `DJANGO_API_URL` e `APP_ORIGIN` pública. Variáveis de processo prevalecem
sobre `.env`; confiança em proxy Django é opt-in. Não versione segredos.
Build e start devem usar o mesmo `NEXT_DIST_DIR`.
