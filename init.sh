#!/bin/sh
set -eu
export PATH="/usr/local/bin:/opt/homebrew/bin:$HOME/.docker/bin:$HOME/.orbstack/bin:$PATH"
cd -- "$(dirname -- "$0")"

umask 077
touch .env
for key in POSTGRES_PASSWORD HR_PASSWORD CREDENTIAL_SECRET DEMO_EMPLOYEE_PASSWORD; do
  if ! grep -q "^${key}=." .env; then
    printf '\n%s=%s\n' "$key" "$(openssl rand -hex 32)" >> .env
  fi
done

docker compose up --build --detach --wait --wait-timeout 120 api
binding="$(docker compose port api 3001 | head -n 1)"
url="http://localhost:${binding##*:}/api/docs"
printf '\nAPI, PostgreSQL и карьерный AI-агент готовы: %s\nПароли для входа — в .env.\n' "$url"
if [ "${1:-}" != --no-open ] && [ "$(uname -s)" = Darwin ]; then
  open "$url"
fi
