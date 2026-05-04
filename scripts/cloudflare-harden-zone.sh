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
if [[ "${zone_status}" != "active" ]]; then
  echo "warn: zone is '${zone_status}'. Some WAF/Bot/Ruleset features may be unavailable until nameservers finish activation."
fi

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
set_setting "security_level" "medium"

# Managed WAF ruleset (replacement for deprecated waf setting).
CF_MANAGED_WAF_RULESET_ID="efb7b8c949ac4650a09736fc376e9aee"
managed_entry_resp="$(cf_api GET "/zones/${zone_id}/rulesets/phases/http_request_firewall_managed/entrypoint")"
managed_entry_ok="$(echo "${managed_entry_resp}" | jq -r '.success')"
if [[ "${managed_entry_ok}" == "true" ]]; then
  managed_entry_id="$(echo "${managed_entry_resp}" | jq -r '.result.id')"
  has_managed_waf="$(echo "${managed_entry_resp}" | jq -r --arg rid "${CF_MANAGED_WAF_RULESET_ID}" '.result.rules // [] | any(.action == "execute" and (.action_parameters.id // "") == $rid)')"
  if [[ "${has_managed_waf}" == "true" ]]; then
    echo "ok: managed_waf already deployed"
  else
    add_managed_resp="$(cf_api POST "/zones/${zone_id}/rulesets/${managed_entry_id}/rules" "{\"action\":\"execute\",\"action_parameters\":{\"id\":\"${CF_MANAGED_WAF_RULESET_ID}\"},\"expression\":\"true\",\"description\":\"Execute Cloudflare Managed Ruleset\"}")"
    add_managed_ok="$(echo "${add_managed_resp}" | jq -r '.success')"
    if [[ "${add_managed_ok}" == "true" ]]; then
      echo "ok: managed_waf deployed"
    else
      add_managed_msg="$(echo "${add_managed_resp}" | jq -r '.errors[0].message // "unknown error"')"
      echo "warn: managed_waf deploy failed (${add_managed_msg})"
      if [[ "${add_managed_msg}" == *"not allowed for id because not entitled"* ]]; then
        echo "hint: managed WAF usually becomes available after zone activation and plan entitlement sync."
      fi
    fi
  fi
else
  managed_entry_code="$(echo "${managed_entry_resp}" | jq -r '.errors[0].code // 0')"
  if [[ "${managed_entry_code}" == "7003" || "${managed_entry_code}" == "7000" || "${managed_entry_code}" == "1001" ]]; then
    :
  fi
  create_managed_resp="$(cf_api POST "/zones/${zone_id}/rulesets" "{\"name\":\"Managed WAF entry point\",\"description\":\"Zone-level WAF managed rules\",\"kind\":\"zone\",\"phase\":\"http_request_firewall_managed\",\"rules\":[{\"action\":\"execute\",\"action_parameters\":{\"id\":\"${CF_MANAGED_WAF_RULESET_ID}\"},\"expression\":\"true\",\"description\":\"Execute Cloudflare Managed Ruleset\"}]}")"
  create_managed_ok="$(echo "${create_managed_resp}" | jq -r '.success')"
  if [[ "${create_managed_ok}" == "true" ]]; then
    echo "ok: managed_waf entrypoint created"
  else
    create_managed_msg="$(echo "${create_managed_resp}" | jq -r '.errors[0].message // "unknown error"')"
    echo "warn: managed_waf setup failed (${create_managed_msg})"
    if [[ "${create_managed_msg}" == *"not allowed for id because not entitled"* ]]; then
      echo "hint: managed WAF usually becomes available after zone activation and plan entitlement sync."
    fi
  fi
fi

# Bot Fight Mode via bot_management API (replaces unsupported zone setting key).
bot_resp="$(cf_api PUT "/zones/${zone_id}/bot_management" '{"fight_mode":true}')"
bot_ok="$(echo "${bot_resp}" | jq -r '.success')"
if [[ "${bot_ok}" == "true" ]]; then
  bot_mode="$(echo "${bot_resp}" | jq -r '.result.fight_mode // false')"
  echo "ok: bot_fight_mode=${bot_mode}"
else
  bot_msg="$(echo "${bot_resp}" | jq -r '.errors[0].message // "unknown error"')"
  echo "warn: bot_fight_mode failed (${bot_msg})"
  if [[ "${bot_msg}" == *"Authentication error"* ]]; then
    echo "hint: token likely needs 'Bot Management Write' permission (zone scoped)."
  fi
fi

# Zone-level rate limiting using Rulesets API.
rate_rule_json='{"action":"block","expression":"(starts_with(http.request.uri.path, \"/api\") or starts_with(http.request.uri.path, \"/auth\") or starts_with(http.request.uri.path, \"/login\") or starts_with(http.request.uri.path, \"/register\") or starts_with(http.request.uri.path, \"/checkout\"))","description":"Taries default edge rate limit","enabled":true,"ratelimit":{"characteristics":["cf.colo.id","ip.src"],"period":10,"requests_per_period":30,"mitigation_timeout":10}}'
rate_entry_resp="$(cf_api GET "/zones/${zone_id}/rulesets/phases/http_ratelimit/entrypoint")"
rate_entry_ok="$(echo "${rate_entry_resp}" | jq -r '.success')"
if [[ "${rate_entry_ok}" == "true" ]]; then
  rate_entry_id="$(echo "${rate_entry_resp}" | jq -r '.result.id')"
  has_rate_rule="$(echo "${rate_entry_resp}" | jq -r '.result.rules // [] | any(.description == "Taries default edge rate limit")')"
  if [[ "${has_rate_rule}" == "true" ]]; then
    echo "ok: rate_limit_rule already present"
  else
    rate_add_resp="$(cf_api POST "/zones/${zone_id}/rulesets/${rate_entry_id}/rules" "${rate_rule_json}")"
    rate_add_ok="$(echo "${rate_add_resp}" | jq -r '.success')"
    if [[ "${rate_add_ok}" == "true" ]]; then
      rate_rule_id="$(echo "${rate_add_resp}" | jq -r '.result.id // empty')"
      echo "ok: rate_limit_rule created (${rate_rule_id})"
    else
      rate_add_msg="$(echo "${rate_add_resp}" | jq -r '.errors[0].message // "unknown error"')"
      echo "warn: rate_limit_rule failed (${rate_add_msg})"
    fi
  fi
else
  rate_create_resp="$(cf_api POST "/zones/${zone_id}/rulesets" "{\"name\":\"Rate limit entry point\",\"description\":\"Zone-level rate limiting\",\"kind\":\"zone\",\"phase\":\"http_ratelimit\",\"rules\":[${rate_rule_json}]}")"
  rate_create_ok="$(echo "${rate_create_resp}" | jq -r '.success')"
  if [[ "${rate_create_ok}" == "true" ]]; then
    echo "ok: rate_limit entrypoint created"
  else
    rate_create_msg="$(echo "${rate_create_resp}" | jq -r '.errors[0].message // "unknown error"')"
    echo "warn: rate_limit setup failed (${rate_create_msg})"
  fi
fi

echo "done"
