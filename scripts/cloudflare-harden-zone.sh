#!/usr/bin/env bash
set -euo pipefail

if ! command -v curl >/dev/null 2>&1; then
  echo "error: curl is required" >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "error: jq is required" >&2
  exit 1
fi

DOMAIN="${1:-tariesbeauty.com}"
TOKEN="${CLOUDFLARE_API_TOKEN:-${CF_API_TOKEN:-}}"

if [[ -z "${TOKEN}" ]]; then
  echo "error: set CLOUDFLARE_API_TOKEN (or CF_API_TOKEN) with Zone:Read + Zone Settings:Edit + WAF:Edit" >&2
  exit 1
fi

CF_API="https://api.cloudflare.com/client/v4"

cf_api() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  if [[ -n "${body}" ]]; then
    curl -sS -X "${method}" "${CF_API}${path}" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      --data "${body}"
  else
    curl -sS -X "${method}" "${CF_API}${path}" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json"
  fi
}

zone_resp="$(cf_api GET "/zones?name=${DOMAIN}")"
zone_id="$(echo "${zone_resp}" | jq -r '.result[0].id // empty')"
zone_status="$(echo "${zone_resp}" | jq -r '.result[0].status // "missing"')"

if [[ -z "${zone_id}" ]]; then
  echo "error: zone '${DOMAIN}' not found for this token/account" >&2
  echo "hint: add the zone in Cloudflare dashboard, then rerun this script" >&2
  exit 2
fi

echo "zone: ${DOMAIN} (${zone_id}) status=${zone_status}"

set_setting() {
  local key="$1"
  local value="$2"
  local resp
  resp="$(cf_api PATCH "/zones/${zone_id}/settings/${key}" "{\"value\":\"${value}\"}")"
  local ok
  ok="$(echo "${resp}" | jq -r '.success')"
  if [[ "${ok}" == "true" ]]; then
    local got
    got="$(echo "${resp}" | jq -r '.result.value // "unknown"')"
    echo "ok: ${key}=${got}"
  else
    local msg
    msg="$(echo "${resp}" | jq -r '.errors[0].message // "unknown error"')"
    echo "warn: ${key} failed (${msg})"
  fi
}

set_setting "ssl" "strict"
set_setting "always_use_https" "on"
set_setting "automatic_https_rewrites" "on"
set_setting "min_tls_version" "1.2"
set_setting "tls_1_3" "on"
set_setting "browser_check" "on"
set_setting "waf" "on"
set_setting "security_level" "medium"

# Optional: available on many plans; ignore if unavailable.
set_setting "bot_fight_mode" "on"

rate_rule='{
  "description": "Taries default edge rate limit",
  "expression": "(http.request.uri.path matches \"^/(api|auth|login|register|checkout)\")",
  "action": "block",
  "enabled": true,
  "ratelimit": {
    "characteristics": ["cf.colo.id", "ip.src"],
    "period": 60,
    "requests_per_period": 120,
    "mitigation_timeout": 600
  }
}'

rate_resp="$(cf_api POST "/zones/${zone_id}/rulesets/phases/http_ratelimit/entrypoint/rules" "${rate_rule}")"
rate_ok="$(echo "${rate_resp}" | jq -r '.success')"
if [[ "${rate_ok}" == "true" ]]; then
  rule_id="$(echo "${rate_resp}" | jq -r '.result.id // empty')"
  echo "ok: rate_limit_rule created (${rule_id})"
else
  rate_msg="$(echo "${rate_resp}" | jq -r '.errors[0].message // "unknown error"')"
  echo "warn: rate_limit_rule failed (${rate_msg})"
fi

echo "done"
