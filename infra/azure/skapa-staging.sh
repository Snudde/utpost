#!/usr/bin/env bash
# Skapar Utposts staging i Azure Container Apps (M6): resursgrupp, miljö och appen ur staging.yaml.
# Körs EN gång per team, av en människa, med az CLI (lokalt eller i Cloud Shell). Pipelinen skapar
# inget – den byter bara image i den app som finns (se .github/workflows/ci.yml, jobbet deploy).
#
#   az login
#   REPO=<ägare>/<repo> SHA=<git-sha på main> ./infra/azure/skapa-staging.sh
#
# Imagerna måste finnas i GHCR (jobbet Image på main): ghcr.io/<ägare>/<repo>-api:sha-<7 tecken>.
# Variablerna går att skriva över: RG, LOC, ENV_NAME, APP.
set -euo pipefail

: "${REPO:?Sätt REPO=<ägare>/<repo> (t.ex. jonatanhallenberg/utpost-cloud-labb)}"
: "${SHA:?Sätt SHA=<hela git-sha:n på main som Image har publicerat>}"
RG="${RG:-utpost-rg}"
LOC="${LOC:-swedencentral}"
ENV_NAME="${ENV_NAME:-utpost-env}"
APP="${APP:-utpost-staging}"
OWNER_LC="$(echo "${REPO}" | tr '[:upper:]' '[:lower:]')"
IMAGE_API="ghcr.io/${OWNER_LC}-api:sha-${SHA:0:7}"
IMAGE_CLIENT="ghcr.io/${OWNER_LC}-client:sha-${SHA:0:7}"

# Hemligheterna skapas här och hamnar BARA i Azure (secrets). Skriv aldrig in dem i en fil.
JWT_SECRET="$(openssl rand -hex 32)"
DB_PASSWORD="$(openssl rand -hex 16)"

echo "→ containerapp-tillägget och leverantören Microsoft.App"
az extension add --name containerapp --upgrade --only-show-errors
az provider register --namespace Microsoft.App --wait

echo "→ resursgrupp ${RG} i ${LOC}"
az group create --name "${RG}" --location "${LOC}" --output none

echo "→ miljö ${ENV_NAME} (tar ~2 min; --logs-destination none = ingen Log Analytics, loggar strömmas med az containerapp logs show)"
az containerapp env create --name "${ENV_NAME}" --resource-group "${RG}" --location "${LOC}" --logs-destination none --output none
ENV_ID="$(az containerapp env show --name "${ENV_NAME}" --resource-group "${RG}" --query id --output tsv)"

echo "→ appen ${APP} ur infra/azure/staging.yaml (api ${IMAGE_API}, client ${IMAGE_CLIENT})"
TMP="$(mktemp)"
sed -e "s|__LOCATION__|${LOC}|g" -e "s|__APP__|${APP}|g" -e "s|__RG__|${RG}|g" -e "s|__ENV_ID__|${ENV_ID}|g" \
    -e "s|__IMAGE_API__|${IMAGE_API}|g" -e "s|__IMAGE_CLIENT__|${IMAGE_CLIENT}|g" \
    -e "s|__JWT_SECRET__|${JWT_SECRET}|g" -e "s|__DB_PASSWORD__|${DB_PASSWORD}|g" \
    "$(dirname "$0")/staging.yaml" > "${TMP}"
az containerapp create --resource-group "${RG}" --name "${APP}" --yaml "${TMP}" --output none
rm -f "${TMP}"
unset JWT_SECRET DB_PASSWORD

FQDN="$(az containerapp show --name "${APP}" --resource-group "${RG}" --query properties.configuration.ingress.fqdn --output tsv)"
echo
echo "Klart. Appen: https://${FQDN}"
echo "Första anropet väcker appen från noll (fyra containrar + seed) – räkna med en minut."
echo "Kontroll: curl -s https://${FQDN}/api/health"
