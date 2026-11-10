#!/usr/bin/env bash
# Skapar Utposts bildfunktion i Azure Functions (M7): storage-konto, en function app i Flex Consumption
# (Node 22), lägger upp koden i functions/ en första gång och skriver ut funktionens URL.
# Körs EN gång per team, av en människa, med az CLI och Core Tools (func). Pipelinen skapar inget –
# jobbet Deploy → Azure Functions lägger bara upp ny kod i den app som finns.
#
#   az login
#   (cd functions && npm install)        # deploypaketet tar med functions/node_modules
#   REPO=<ägare>/<repo> ./infra/azure/skapa-funktion.sh
#
# Koppla till staging (från M6) samtidigt – api-containern får adressen som variabel och nyckeln som secret:
#   REPO=<ägare>/<repo> RG=<staging-gruppen> CONTAINER_APP=<staging-appen> ./infra/azure/skapa-funktion.sh
#
# Variablerna går att skriva över: RG, LOC, APP, SA, CONTAINER_APP, INSTANCE_MEMORY, MAX_INSTANCES,
# HTTP_CONCURRENCY. Skriptet går att köra igen: det som redan finns skapas inte om.
set -euo pipefail

: "${REPO:?Sätt REPO=<ägare>/<repo> (t.ex. jonatanhallenberg/utpost-serverless-labb)}"
REPO_NAME="$(echo "${REPO#*/}" | tr '[:upper:]' '[:lower:]')"
RG="${RG:-utpost-rg}"
LOC="${LOC:-swedencentral}"                      # Flex Consumption finns inte i alla regioner: az functionapp list-flexconsumption-locations
APP="${APP:-${REPO_NAME}-fn}"                    # blir <APP>.azurewebsites.net – måste vara unikt i hela Azure
INSTANCE_MEMORY="${INSTANCE_MEMORY:-2048}"       # MB per instans (512, 2048 eller 4096). 2048 = 1 kärna
MAX_INSTANCES="${MAX_INSTANCES:-10}"             # tak för utskalningen – och för vad en bugg kan kosta
HTTP_CONCURRENCY="${HTTP_CONCURRENCY:-1}"        # samtidiga anrop per instans, se nedan
CONTAINER_APP="${CONTAINER_APP:-}"
SUB_ID="$(az account show --query id --output tsv)"
# Storage-kontots namn: 3–24 tecken, bara gemener och siffror, unikt i hela Azure. Härlett ur appens namn
# och prenumerationen, så att samma körning ger samma namn nästa gång (skriptet ska gå att köra om).
SA="${SA:-$(echo "${APP}" | tr -cd 'a-z0-9' | cut -c1-18)$(printf '%s' "${SUB_ID}/${RG}/${APP}" | cksum | cut -c1-6)}"
FN_DIR="$(cd "$(dirname "$0")/../../functions" && pwd)"

echo "→ leverantörerna Microsoft.Web och Microsoft.Storage (görs en gång per prenumeration)"
az provider register --namespace Microsoft.Web --wait
az provider register --namespace Microsoft.Storage --wait

echo "→ resursgrupp ${RG} i ${LOC}"
az group create --name "${RG}" --location "${LOC}" --output none

# Flex Consumption kräver ett storage-konto: där ligger deploypaketet (en blob-container) och
# värdens egna data (AzureWebJobsStorage). Lokalt behövs det inte – därför är den tom i local.settings.json.
echo "→ storage-konto ${SA}"
az storage account create --name "${SA}" --resource-group "${RG}" --location "${LOC}" \
  --sku Standard_LRS --kind StorageV2 --allow-blob-public-access false --min-tls-version TLS1_2 --output none

if az functionapp show --name "${APP}" --resource-group "${RG}" --output none 2>/dev/null; then
  echo "→ function app ${APP} finns redan – skapas inte om"
else
  echo "→ function app ${APP} (Flex Consumption, Node 22, ${INSTANCE_MEMORY} MB, högst ${MAX_INSTANCES} instanser)"
  az functionapp create --name "${APP}" --resource-group "${RG}" --storage-account "${SA}" \
    --flexconsumption-location "${LOC}" --runtime node --runtime-version 22 \
    --instance-memory "${INSTANCE_MEMORY}" --maximum-instance-count "${MAX_INSTANCES}" --output none
fi

# Standard i Flex: 16 samtidiga HTTP-anrop per instans (2048 MB). Vår funktion räknar i Node, som har EN
# tråd – 16 anrop på samma instans körs ändå ett i taget, precis som i API:et före M7. Med 1 får varje
# samtidigt anrop en egen instans: det är utskalningen vi vill mäta. (Ett I/O-tungt API vill ha högre.)
echo "→ ${HTTP_CONCURRENCY} samtidigt HTTP-anrop per instans"
az functionapp scale config set --name "${APP}" --resource-group "${RG}" \
  --trigger-type http --trigger-settings "perInstanceConcurrency=${HTTP_CONCURRENCY}" --output none

echo "→ koden i functions/ till ${APP} (första gången; sedan gör pipelinen det)"
[ -d "${FN_DIR}/node_modules/@azure/functions" ] || { echo "Kör först: (cd functions && npm install)"; exit 1; }
(cd "${FN_DIR}" && func azure functionapp publish "${APP}")

# Funktionsnyckeln (authLevel: 'function'). Värden skapar den när den startar första gången – därför
# några försök. Nyckeln skrivs bara ut här och sätts som secret nedan – lägg den aldrig i en fil i repot.
KEY=""
for i in $(seq 1 12); do
  KEY="$(az functionapp keys list --name "${APP}" --resource-group "${RG}" --query functionKeys.default --output tsv 2>/dev/null | tr -d '\r' || true)"
  [ -n "${KEY}" ] && break
  echo "  väntar på funktionsnyckeln ($i/12) …"
  sleep 10
done
[ -n "${KEY}" ] || { echo "Fick ingen nyckel. Portalen: ${APP} → Functions → App keys."; exit 1; }
# az 2.90 lägger Flex-appens fält under properties (defaultHostName på toppnivån blir tomt) – därför båda (sett 5/11 2026).
URL="https://$(az functionapp show --name "${APP}" --resource-group "${RG}" --query "defaultHostName || properties.defaultHostName" --output tsv | tr -d '\r')/api/process-image"

if [ -n "${CONTAINER_APP}" ]; then
  # Secrets ger ingen ny revision – variabeländringen gör det, och den nya revisionen läser secreten.
  # Suffixet gör att det blir en ny revision även när bara nyckeln har ändrats (omkörning).
  echo "→ ${CONTAINER_APP}: secret image-function-key + IMAGE_FUNCTION_URL/IMAGE_FUNCTION_KEY på api-containern"
  az containerapp secret set --name "${CONTAINER_APP}" --resource-group "${RG}" \
    --secrets "image-function-key=${KEY}" --output none
  az containerapp update --name "${CONTAINER_APP}" --resource-group "${RG}" --container-name api \
    --set-env-vars "IMAGE_FUNCTION_URL=${URL}" "IMAGE_FUNCTION_KEY=secretref:image-function-key" \
    --revision-suffix "fn-$(date +%m%d%H%M%S)" \
    --query properties.latestRevisionName --output tsv
fi

echo
echo "Klart. Funktionen: ${URL}"
echo "Nyckeln (visa aldrig på skärm du delar, skriv aldrig in i en fil i repot):"
echo "  ${KEY}"
echo "Prova (två gånger – första är en kallstart):"
# shellcheck disable=SC2028  # \n ska skrivas ut som det står – det är curl som tolkar det
echo "  curl -w '\\ntid: %{time_total}s\\n' -X POST \"${URL}\" -H \"x-functions-key: \$KEY\" -d '{\"filename\":\"fjall.jpg\",\"width\":4000,\"height\":3000}'"
echo "Till GitHub-miljön (jobbet Deploy → Azure Functions):"
echo "  gh variable set AZURE_FUNCTION_APP --env azure-staging --body ${APP} --repo ${REPO}"
unset KEY