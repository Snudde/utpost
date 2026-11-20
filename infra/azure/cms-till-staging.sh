#!/usr/bin/env bash
# M9: ger containerappen i staging det den behöver för CMS:et.
#
#   RG=<er resursgrupp> APP=<er containerapp> infra/azure/cms-till-staging.sh
#
# Läser CONTENTFUL_SPACE_ID, CONTENTFUL_DELIVERY_TOKEN och CONTENTFUL_PREVIEW_TOKEN ur .env i repots
# rot (gitignorerad) och lägger nycklarna som SECRETS på containerappen. api-containern får dem som
# miljövariabler som pekar på hemligheterna (secretref). Värdena skrivs aldrig ut, och de hamnar
# inte i staging.yaml eller i pipelinen. Webhook-hemligheten slumpas här om den inte finns i .env.
# Management-token (CONTENTFUL_MANAGEMENT_TOKEN) ska INTE till molnet – appen använder den aldrig.
set -euo pipefail
: "${RG:?Sätt RG till er resursgrupp}" "${APP:?Sätt APP till er containerapp}"
cd "$(dirname "$0")/../.."
set -a; source .env; set +a
: "${CONTENTFUL_SPACE_ID:?saknas i .env}" "${CONTENTFUL_DELIVERY_TOKEN:?saknas i .env}" "${CONTENTFUL_PREVIEW_TOKEN:?saknas i .env}"
WEBHOOK_SECRET="${CMS_WEBHOOK_SECRET:-$(openssl rand -hex 24)}"

az containerapp secret set -g "$RG" -n "$APP" -o none --secrets \
  contentful-delivery-token="$CONTENTFUL_DELIVERY_TOKEN" \
  contentful-preview-token="$CONTENTFUL_PREVIEW_TOKEN" \
  cms-webhook-secret="$WEBHOOK_SECRET"

# En ny revision startas med de nya variablerna. Space-id:t är ingen hemlighet och sätts som vanligt värde.
az containerapp update -g "$RG" -n "$APP" --container-name api -o none --set-env-vars \
  CONTENTFUL_SPACE_ID="$CONTENTFUL_SPACE_ID" \
  CONTENTFUL_DELIVERY_TOKEN=secretref:contentful-delivery-token \
  CONTENTFUL_PREVIEW_TOKEN=secretref:contentful-preview-token \
  CMS_WEBHOOK_SECRET=secretref:cms-webhook-secret

FQDN="$(az containerapp show -g "$RG" -n "$APP" --query properties.configuration.ingress.fqdn -o tsv)"
echo "✓ CMS-nycklarna ligger som secrets på $APP, och api har fått variablerna"
echo
echo "Webhooken i Contentful (Settings > Webhooks > Add webhook):"
echo "  URL:     POST https://$FQDN/api/cms/webhook"
echo "  Trigger: Entry – Publish och Unpublish"
echo "  Header:  X-Utpost-Webhook-Secret (välj Secret header). Värdet läser ni ut med:"
echo "    az containerapp secret show -g $RG -n $APP --secret-name cms-webhook-secret --query value -o tsv"
echo "  På Mac: lägg till | pbcopy sist, så hamnar värdet i urklipp utan att visas. På Windows: | clip"
