#!/usr/bin/env bash
# PreToolUse(Bash) — deterministic guard for shell commands the agent wants to run.
# Blocks what a repository or a prompt injection most often asks for. It matches
# whole words and flag combinations, not only literal strings, because the lab
# showed that `rm -f -r` and `find . -delete` slipped past literal patterns.
#
# Limits (do not treat as a sandbox): a determined caller can still obfuscate.
# The sandbox and the deny rules in .claude/settings.json are the outer layer.
set -euo pipefail
. "$(dirname "$0")/_common.sh"

CMD="$(json_str command)"
[ -n "$CMD" ] || exit 0

# .env.example and .env.template hold no secrets (see lesson 09); strip them before the check.
SCAN="${CMD//.env.example/}"
SCAN="${SCAN//.env.template/}"

# Recursive rm: any argument that is -r/-R/--recursive, or a short-flag cluster containing r or R.
if printf '%s' "$SCAN" | grep -qE '(^|[;&|[:space:]])rm([[:space:]]+-[A-Za-z]*[rR][A-Za-z]*|[[:space:]]+--recursive)([[:space:]]|$)' \
  || printf '%s' "$SCAN" | grep -qE '(^|[;&|[:space:]])rm[[:space:]].*[[:space:]]-[A-Za-z]*[rR][A-Za-z]*([[:space:]]|$)' \
  || printf '%s' "$SCAN" | grep -qE '(^|[;&|[:space:]])rm[[:space:]].*[[:space:]]--recursive([[:space:]]|$)'; then
  block "Zablokowane przez politykę zespołu: rekursywne usuwanie (rm -r w dowolnej kolejności flag). Usuń pliki jeden po drugim albo poproś człowieka."
fi

# find ... -delete removes files without rm.
if printf '%s' "$SCAN" | grep -qE '(^|[;&|[:space:]])find([[:space:]]|$).*[[:space:]]-delete([[:space:]]|$)'; then
  block "Zablokowane przez politykę zespołu: find -delete. Użyj jawnego rm na konkretnych plikach."
fi

# Piping a download straight into a shell.
if printf '%s' "$SCAN" | grep -qE '(curl|wget)[^|]*\|[[:space:]]*(sudo[[:space:]]+)?(ba|z|k)?sh([[:space:]]|$)'; then
  block "Zablokowane przez politykę zespołu: pobieranie skryptu prosto do powłoki."
fi

# Credentials and key stores.
if printf '%s' "$SCAN" | grep -qE '(~|\$HOME|/Users/[^/[:space:]]+|/home/[^/[:space:]]+)/\.(ssh|aws|config/gh|kube|npmrc|pypirc)(/|[[:space:]]|$)'; then
  block "Zablokowane przez politykę zespołu: dostęp do kluczy i poświadczeń."
fi

# .env files (the templates were stripped above).
if printf '%s' "$SCAN" | grep -qE '(^|[[:space:]/=])\.env([.[:space:]]|$)'; then
  block "Zablokowane przez politykę zespołu: odczyt pliku .env. Sekrety czytamy z menedżera, nie z pliku."
fi

exit 0
