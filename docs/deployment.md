# Deploy

O Books roda em um único servidor, com Nginx na borda e dois processos PM2:
`logos-web` em `3026` e `logos-api` em `8026`. O domínio público é
`books.wtr.ee`; o Django permanece interno e o Next faz o proxy da API.

O servidor mantém o checkout em `/home/wtr/logos`. Banco, ambientes e
`api/media/` são persistentes e ficam fora do Git. No primeiro envio, copie o
`db.sqlite3` pronto sem transformações e sincronize toda a pasta `api/media/`;
Markdown, EPUB, capas e demais arquivos de livros não são versionados.

Para sincronizar novamente um SQLite validado, envie primeiro com o sufixo
`.incoming`, preserve o banco atual e faça a troca local por `mv`. Assim, um
upload incompleto nunca ocupa o caminho usado pela aplicação:

```bash
scp api/db.sqlite3 wtr:~/logos/api/db.sqlite3.incoming
ssh wtr 'mkdir -p ~/logos/api/backups && cp -p ~/logos/api/db.sqlite3 ~/logos/api/backups/db-before-sync-$(date +%Y%m%d-%H%M%S).sqlite3 && mv ~/logos/api/db.sqlite3.incoming ~/logos/api/db.sqlite3 && chmod 600 ~/logos/api/db.sqlite3'
```

Produção já está ativa no servidor compartilhado pelo usuário `wtr`. O serviço
systemd do PM2 é comum à máquina, mas checkout, processos, portas, ambiente,
site Nginx e certificado pertencem ao Logos. Não crie outro daemon PM2 nem
exponha a API diretamente.

## Autorização

Commit, push, deploy e substituição do banco são ações distintas e dependem do
pedido do usuário. A `main` é a única branch de trabalho; `deploy-all`,
`deploy-api` e `deploy-web` são referências remotas que acionam o workflow,
não branches locais de trabalho. Não criar PR para um push comum.

## Publicar

O trabalho permanece em `main`. Branches `deploy-all`, `deploy-api` e
`deploy-web` são apenas gatilhos remotos do GitHub Actions:

```bash
git push origin main
git push origin main:deploy-all
./deploy-status all
```

Push em `main` executa CI, com jobs separados para backend e frontend. O CI
gera os tipos do Next antes do TypeScript, usa `.next-codex` e mantém o teste
integrado de autenticação. O workflow de deploy é independente do CI: publicar
não aguarda automaticamente a aprovação dos testes.

Use `api` ou `web` no segundo comando e no status para publicar somente uma
parte. Consultar status não dispara deploy. O script atualiza `main`, aplica
migrations da API, gera build da web, reinicia os processos correspondentes e
verifica os endpoints. O cache de produção é `.next`; build e start devem usar
o mesmo diretório.

Todos os alvos compartilham uma única fila de produção no Actions; um deploy
em execução não é cancelado por outro. O `flock` do script também impede
sobreposição com execuções manuais no servidor.

O build da web usa heap de 1024 MB por padrão, preservando as demais opções de
`NODE_OPTIONS`. `LOGOS_WEB_BUILD_HEAP_MB` permite ajustar o limite quando a
infraestrutura mudar.

Quando dependências mudarem, execute o workflow manual com instalação:

```bash
gh workflow run deploy.yml --ref main -f target=all -f install=true
```

No servidor, o equivalente é `./deploy all --install`. Instalação de pacotes e
`collectstatic` rodam somente com `--install`. O deploy da API cria backup do
SQLite antes das migrations.

O acesso do Actions ao servidor e o acesso de leitura do servidor ao GitHub
usam chaves separadas. Configure no repositório os secrets `DEPLOY_SSH_HOST`,
`DEPLOY_SSH_USER`, `DEPLOY_SSH_PORT` e `DEPLOY_SSH_KEY`. Nunca coloque chaves,
tokens ou ambientes no remote Git, no PM2 ou na documentação.

## Confirmar publicação e retornar código

Espere `completed` e `success` no workflow e confira os processos e a API:

```bash
ssh wtr 'pm2 status; curl -fsS http://127.0.0.1:8026/api/health/'
```

Valide os fluxos afetados em `https://books.wtr.ee`. O health check não
substitui essa conferência.

A revisão anterior fica em `.deploy/previous`. No servidor, para retornar
código sem atualizar do remoto:

```bash
git switch --detach "$(cat .deploy/previous)"
./deploy all --skip-pull
```

Se o schema mudou de modo incompatível, retornar somente o código não basta:
é necessário um banco compatível. Para retomar publicação normal, use
`git switch main`.

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
