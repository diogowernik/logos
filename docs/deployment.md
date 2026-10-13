# Deploy

O Logos roda em um único servidor, com Nginx na borda e dois processos PM2:
`logos-web` em `3026` e `logos-api` em `8026`. O domínio público é
`books.wtr.ee`; o Django permanece interno e o Next faz o proxy da API.

O servidor mantém o checkout em `/home/wtr/logos`. Banco, ambientes e
`api/media/` são persistentes e ficam fora do Git. No primeiro envio, copie o
`db.sqlite3` pronto sem transformações e sincronize toda a pasta `api/media/`;
Markdown, EPUB, capas e demais arquivos de livros não são versionados.

## Publicar

O trabalho permanece em `main`. Branches `deploy-all`, `deploy-api` e
`deploy-web` são apenas gatilhos remotos do GitHub Actions:

```bash
git push origin main
git push origin main:deploy-all
./deploy-status all
```

Use `api` ou `web` no segundo comando e no status para publicar somente uma
parte. O workflow manual oferece `--install`, reservado para a primeira
publicação ou para mudanças de dependências; `collectstatic` também roda apenas
nesse caso. O deploy da API cria backup do SQLite antes das migrations.

O acesso do Actions ao servidor e o acesso de leitura do servidor ao GitHub
usam chaves separadas. Configure no repositório os secrets `DEPLOY_SSH_HOST`,
`DEPLOY_SSH_USER`, `DEPLOY_SSH_PORT` e `DEPLOY_SSH_KEY`. Nunca coloque chaves,
tokens ou ambientes no remote Git, no PM2 ou na documentação.

## Primeira instalação

Crie o checkout com uma Deploy Key de leitura exclusiva do Logos, prepare
`.venv`, `api/.env` e `web/.env.local`, envie banco e mídia e execute:

```bash
./deploy all --install --skip-pull
```

Depois configure o site Nginx para `127.0.0.1:3026`, valide localmente, aponte o
DNS e emita o certificado. Salve a lista do PM2 após os dois processos estarem
saudáveis. Os processos compartilham o serviço systemd já existente do usuário
`wtr`; não crie outro daemon PM2.
