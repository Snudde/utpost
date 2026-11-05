#!/usr/bin/env bash
# En identitet åt pipelinen, utan lösenord (M6). GitHub Actions loggar in i Azure med OIDC:
# jobbet får en kortlivad token av GitHub, och Azure litar på den – men bara för jobb som kör
# i repot REPO och miljön azure-staging, och bara med rätt att ändra resursgruppen RG.
# Körs EN gång per team, efter skapa-staging.sh. Skriver ut raderna för GitHub-miljön.
#
#   REPO=<ägare>/<repo> ./infra/azure/identitet.sh      (kräver az + gh inloggade)
set -euo pipefail

: "${REPO:?Sätt REPO=<ägare>/<repo>}"
REPO="$(echo "${REPO}" | tr -d '\r')"
RG="$(echo "${RG:-utpost-rg}" | tr -d '\r')"
APP="$(echo "${APP:-utpost-staging}" | tr -d '\r')"
GH_ENV="$(echo "${GH_ENV:-azure-staging}" | tr -d '\r')"
NAME="${NAME:-${REPO##*/}-github}"

SUB="$(az account show --query id --output tsv 2>/dev/null | tr -d '\r')"
TENANT="$(az account show --query tenantId --output tsv 2>/dev/null | tr -d '\r')"
SUB="${SUB:-4d9adb71-1afa-4c18-8f8a-e127936a3843}"

echo "→ app registration + service principal: ${NAME}"
# Körs skriptet om återanvänds den app registration som redan finns (ingen dubblett).
APPID="$(az ad app list --display-name "${NAME}" --query '[0].appId' --output tsv 2>/dev/null | tr -d '\r')"
if [ -z "${APPID}" ]; then
  APPID="$(az ad app create --display-name "${NAME}" --query appId --output tsv | tr -d '\r')"
fi
az ad sp show --id "${APPID}" --output none 2>/dev/null || az ad sp create --id "${APPID}" --output none
# Ger az ad app create "Insufficient privileges": du får inte skapa identiteter i den här katalogen –
# be den som administrerar prenumerationen köra skriptet (REPO=… RG=…), resten av flödet är oförändrat.

echo "→ rollen Contributor på BARA resursgruppen ${RG} (inte hela prenumerationen)"
SCOPE="$(az group show --name "${RG}" --query id -o tsv 2>/dev/null | tr -d '\r')"
SCOPE="${SCOPE:-/subscriptions/${SUB}/resourceGroups/${RG}}"
echo "   Scope: ${SCOPE}"

TILLDELAD=""
for i in 1 2 3 4 5 6; do
  if az role assignment create --role Contributor --assignee "${APPID}" --scope "${SCOPE}" --subscription "${SUB}" --output none; then TILLDELAD=ja; break; fi
  echo "   (identiteten syns ofta inte direkt efter att den skapats – väntar 10 s, försök ${i}/6)"; sleep 10
done
if [ -z "${TILLDELAD}" ]; then
  echo "FEL: rolltilldelningen gick inte igenom. Utan den blir Deploy rött med AuthorizationFailed." >&2
  echo "     Kräver Owner eller User Access Administrator på resursgruppen – annars gör en administratör raden ovan." >&2
  exit 1
fi

# GitHub skickar subject med id:n: repo:<ägare>@<ägar-id>/<repo>@<repo-id>:environment:<miljö>.
# Namn räcker inte: ett repo som döps om eller skapas på nytt med samma namn får inte logga in.
# gh (inloggad) i stället för anonym curl – GitHubs anonyma gräns delas av alla på samma nät.
REPO_ID="$(gh api "repos/${REPO}" --jq .id | tr -d '\r')"
OWNER_ID="$(gh api "repos/${REPO}" --jq .owner.id | tr -d '\r')"
SUBJECT="repo:${REPO%%/*}@${OWNER_ID}/${REPO##*/}@${REPO_ID}:environment:${GH_ENV}"
echo "→ federerad identitet, subject: ${SUBJECT}"
# Körs skriptet om finns identiteten redan – då skapas ingen ny (och ingen dubblett).
az ad app federated-credential show --id "${APPID}" --federated-credential-id "github-${GH_ENV}" --output none 2>/dev/null || \
  az ad app federated-credential create --id "${APPID}" --parameters "{\"name\":\"github-${GH_ENV}\",\"issuer\":\"https://token.actions.githubusercontent.com\",\"subject\":\"${SUBJECT}\",\"audiences\":[\"api://AzureADTokenExchange\"]}" --output none

FQDN="$(az containerapp show --name "${APP}" --resource-group "${RG}" --query properties.configuration.ingress.fqdn --output tsv | tr -d '\r')"
echo
echo "Klart. Lägg in på GitHub-miljön ${GH_ENV} (variables, inte secrets – ett id är ingen hemlighet):"
echo "  gh api -X PUT repos/${REPO}/environments/${GH_ENV} > /dev/null"
echo "  gh variable set AZURE_CLIENT_ID       --env ${GH_ENV} --repo ${REPO} --body ${APPID}"
echo "  gh variable set AZURE_TENANT_ID       --env ${GH_ENV} --repo ${REPO} --body ${TENANT}"
echo "  gh variable set AZURE_SUBSCRIPTION_ID --env ${GH_ENV} --repo ${REPO} --body ${SUB}"
echo "  gh variable set AZURE_RG              --env ${GH_ENV} --repo ${REPO} --body ${RG}"
echo "  gh variable set AZURE_APP             --env ${GH_ENV} --repo ${REPO} --body ${APP}"
echo "  gh variable set AZURE_URL             --env ${GH_ENV} --repo ${REPO} --body https://${FQDN}"
