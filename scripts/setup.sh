#!/usr/bin/env bash
set -euo pipefail
APP_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
command -v uv >/dev/null || { echo "Instale uv para preparar o backend." >&2; exit 1; }
command -v npm >/dev/null || { echo "Instale Node/npm para preparar o frontend." >&2; exit 1; }
for ENV_FILE in "$APP_ROOT/api/.env" "$APP_ROOT/web/.env.local"; do
  if [ ! -e "$ENV_FILE" ]; then
    cp "$ENV_FILE.example" "$ENV_FILE"
  fi
done
UV_PROJECT_ENVIRONMENT="$APP_ROOT/.venv" uv sync --project "$APP_ROOT/api" --frozen
(cd "$APP_ROOT/web" && npm ci --no-audit --no-fund)
"$APP_ROOT/.venv/bin/python" "$APP_ROOT/api/manage.py" migrate
echo "Ambientes, dependências e banco local prontos. Consulte o README para criar seu usuário e iniciar."
