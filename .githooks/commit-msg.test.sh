#!/bin/sh

set -eu

hook=$(dirname "$0")/commit-msg
message_file=$(mktemp)
trap 'rm -f "$message_file"' EXIT

assert_valid() {
  printf '%s\n' "$1" >"$message_file"
  "$hook" "$message_file" >/dev/null 2>&1
}

assert_invalid() {
  printf '%s\n' "$1" >"$message_file"
  if "$hook" "$message_file" >/dev/null 2>&1; then
    printf 'Deveria ser inválido: %s\n' "$1" >&2
    exit 1
  fi
}

assert_valid 'feat(12345): adiciona autenticação por api key'
assert_valid 'refactor(pubsub)!: reorganiza integração'
assert_valid 'docs?: corrige erro de digitação'
assert_invalid 'feat: adiciona endpoint'
assert_invalid 'feat(ajustes-gerais)!: altera projeto'
assert_invalid 'fix(123): corrige validação.'
assert_invalid 'chore?: ajustes'

printf '%s\n' 'commit-msg: testes concluídos'
