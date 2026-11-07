#!/usr/bin/env bash
set -euo pipefail

RG="rg-portfolio"
SUB_ID=$(az account show --query id -o tsv)
RG_ID="/subscriptions/$SUB_ID/resourceGroups/$RG"

echo "========== FUNCTION APP =========="
az functionapp show \
  --name aniket-portfolio-api \
  --resource-group "$RG" \
  --query id -o tsv

echo "========== APPLICATION INSIGHTS =========="
az resource list \
  --resource-group "$RG" \
  --resource-type Microsoft.Insights/components \
  --query "[].id" -o tsv

echo "========== STATIC WEB APP =========="
az staticwebapp list \
  --query "[?name=='aniket-portfolio'].id" -o tsv

echo "========== COSMOS DB ROLE ASSIGNMENTS =========="
az cosmosdb sql role assignment list \
  --account-name aniket-portfolio-cosmos \
  --resource-group "$RG" \
  --query "[].{id:id,roleDefinitionId:roleDefinitionId,scope:scope,principalId:principalId}" \
  -o json

echo "========== STORAGE ROLE ASSIGNMENTS =========="
az role assignment list \
  --scope "$RG_ID/providers/Microsoft.Storage/storageAccounts/aniketportfolio07" \
  --all \
  --query "[].{id:id,roleDefinitionName:roleDefinitionName,principalId:principalId,scope:scope}" \
  -o json
