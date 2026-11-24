# Azure Cloud Resume Challenge

A personal cloud engineering project demonstrating how to build, deploy, secure and monitor a serverless portfolio website using Microsoft Azure.

**Live Portfolio (custom domain):** https://aniketpawar.is-a.dev

**Azure Static Web Apps fallback URL:** https://gentle-glacier-047897600.3.azurestaticapps.net

**GitHub Repository:** https://github.com/712Aniket/azure-cloud-resume-challenge

---

## 1. Project Overview

This project implements a cloud-hosted personal portfolio website with a serverless visitor counter and event-tracking capabilities.

The frontend is hosted on Azure Static Web Apps. A Python-based Azure Function handles visitor-counter requests and stores counter data in Azure Cosmos DB. The frontend also records resume and certificate view/download events and portfolio appreciation/engagement events.

Terraform configuration is maintained in the repository for Azure infrastructure. GitHub Actions automates the Static Web Apps frontend deployment; the Python Function App backend is published separately using Azure Functions Core Tools.

**Branch/deployment boundary:** the Static Web Apps workflow in this repository triggers on pushes to `main`. The later Project 2 backend extension source (portfolio analytics and protected cost-cache endpoints) is maintained on the `resume-develop` branch. The Function App is a shared live resource; the Static Web Apps workflow does not deploy the Python backend.

## 2. Architecture

The application architecture consists of the frontend, backend API, database and supporting Azure services.

### Application Architecture

![Azure Application Architecture](docs/architecture.png)

### Infrastructure and Deployment Architecture

![Infrastructure and Deployment Architecture](docs/deployment-architecture.png)

## 3. Technology Stack

| Category | Technology |
|---|---|
| Frontend | HTML5, CSS3, JavaScript |
| Frontend Hosting | Azure Static Web Apps |
| Backend | Azure Functions |
| Backend Language | Python 3.11 |
| Database | Azure Cosmos DB (SQL API) |
| Storage | Azure Storage Account |
| Infrastructure as Code | Terraform |
| CI/CD | GitHub Actions |
| Identity and Access | Microsoft Entra ID, Managed Identity, Azure RBAC |
| Monitoring | Application Insights, Azure Monitor |
| Source Control | Git and GitHub |
| Security Scanning | GitHub CodeQL |
| Dependency Management | Dependabot |

## 4. Azure Resources

The project uses the following Azure resources:

| Resource | Purpose |
|---|---|
| Azure Resource Group | Logical grouping of project resources |
| Azure Static Web Apps | Hosts the portfolio frontend |
| Azure Function App | Runs the Python visitor counter API |
| Azure Functions Service Plan | Provides serverless compute |
| Azure Cosmos DB | Stores visitor counter data |
| Azure Storage Account | Provides Azure Functions runtime storage |
| Application Insights | Collects application telemetry |

The Cosmos DB account has Free Tier enabled. Other Azure resources may incur charges depending on usage and configuration.

## 5. Visitor Counter Implementation

The portfolio includes a dynamic visitor counter powered by Azure Functions and Azure Cosmos DB.

### Request Flow

1. A visitor opens the portfolio website.
2. The frontend sends a GET request to the Azure Function API.
3. The Python HTTP-triggered function receives the request.
4. The function connects to Azure Cosmos DB using Managed Identity.
5. The visitor counter is incremented.
6. The updated count is returned as a JSON response.
7. The frontend renders country-level visitor aggregates when the API returns them. The overall aggregate visit total is intentionally not displayed in the public portfolio UI.

### API Endpoint

```http
GET /api/visitor-count
```

### Sample JSON Response

```json
{
  "visitor_count": 123
}
```

The counter uses an atomic increment operation in Cosmos DB to update the stored visitor count.

If the counter document does not exist, the function creates it. It also handles a concurrent document-creation scenario.

## 6. Identity and Security

Security is implemented using Azure-native identity and access management capabilities.

### Managed Identity

The Azure Function App uses a system-assigned Managed Identity to access Azure resources.

This avoids storing database credentials directly in application code.

### Azure RBAC

Azure role assignments provide the Function App identity with the required permissions to access Cosmos DB and Azure Storage.

### Additional Security Measures

- Function App HTTPS-only is enabled; HTTP health requests were verified to redirect to HTTPS.
- Storage Account HTTPS-only access is enabled and its minimum TLS version is configured as 1.2.
- Function App system-assigned Managed Identity is used for Cosmos DB and Function host storage access.
- Cosmos DB local/key authentication is disabled (`disableLocalAuth=true`).
- Cosmos DB SQL RBAC grants the Function App identity the built-in Data Contributor role scoped to the `portfolio-db/visitor-counters` container.
- Cosmos DB selected-network firewall contains 31 specific IP entries plus the `0.0.0.0` Azure-datacenter exception (32 rules total).
- CORS is configured for browser access from the portfolio origin.
- GitHub Secrets are used for the Static Web Apps deployment token.
- GitHub CodeQL workflow and Dependabot configuration are present in the repository.

**Network-security caveat:** The Cosmos DB `0.0.0.0` rule permits network connection attempts from Azure datacenters generally, not only from this Function App. Cosmos DB still requires Microsoft Entra ID authorization because local/key authentication is disabled.

**API authorization:** Visitor-facing routes (`health`, `visitor-count`, `portfolio-event`, and `portfolio-engagement`) use anonymous Function authorization because the public website needs them. The Project 2 extension routes `cost-analytics` and `cost-cache-refresh` require a Function key. The aggregated `portfolio-analytics` route is anonymous for the Azure Workbook. Managed Identity protects server-to-service access; it does not authenticate visitors. CORS is a browser control, not API authentication.

**Residual risk:** The Function App identity retains account-scope `Storage Blob Data Owner` on `aniketportfolio07`, which supports Function runtime storage and the auxiliary cost cache. This is broader than a cache-only permission. Project 1 and Project 2 Terraform state have since moved to the separate `aniketterraformstate26` account; the Function App identity has no direct role assignment on that dedicated state account.

## 7. API and Analytics Capabilities

The core Project 1 backend contains the following public website endpoints:

| Endpoint | Purpose | Authorization |
|---|---|---|
| `GET /api/health` | Health status for monitoring | Anonymous |
| `GET /api/visitor-count` | Update/read visitor-counter aggregates | Anonymous |
| `POST /api/portfolio-event` | Record resume and certificate views/downloads | Anonymous |
| `POST /api/portfolio-engagement` | Record daily likes/appreciations and accepts session/section engagement event types | Anonymous |

The frontend records:
- Resume views and downloads through `resume-viewer.js`.
- Certificate views and downloads through `app.js`.
- Portfolio appreciation through `portfolio-like.js`.
- Session and section-view/section-time events through `engagement-analytics.js`.

The Project 2 extension adds the following functions to the same live Function App. Their latest source is maintained on the `resume-develop` branch:

| Endpoint / trigger | Purpose | Authorization |
|---|---|---|
| `GET /api/portfolio-analytics` | Return aggregated visitor, resume, certificate and portfolio engagement metrics for the Azure Workbook | Anonymous, read-only aggregate response |
| `GET /api/cost-analytics` | Read the cached cost snapshot | Function key |
| `POST /api/cost-cache-refresh` | On-demand cost cache refresh | Function key |
| `daily_cost_cache_refresh` | Scheduled daily cost cache refresh | Timer trigger |

The Azure Workbook's cost panels query Azure Cost Management through the Workbook ARM endpoint directly; they do not depend on the `/api/cost-analytics` function endpoint.

Source for the Project 2 API extension: [`resume-develop/api`](https://github.com/712Aniket/azure-cloud-resume-challenge/tree/resume-develop/api). This extension source has been deployed to the shared live Function App, but has not yet been promoted into the `main` branch.

## 8. Infrastructure as Code – Terraform

Terraform adopts and manages the Project 1-owned Azure resources. Existing resources were imported into state rather than recreated.

### Dedicated remote state

| Setting | Value |
|---|---|
| Resource Group | `rg-portfolio` |
| Storage Account | `aniketterraformstate26` |
| Container | `project1-tfstate` |
| State Key | `project1.tfstate` |
| Local authentication | Microsoft Entra ID / Azure CLI |
| Backend access | Storage Blob Data Contributor scoped to the Project 1 container |

The shared resource group and the shared Function runtime/cache storage account `aniketportfolio07` are intentionally excluded from Project 1 state. Application Insights (`aniket-portfolio-api`) is shared telemetry and is owned by Project 2 Terraform state. Each Azure resource should have one Terraform state owner.

### Eight imported resources

1. Cosmos DB account — `azurerm_cosmosdb_account.portfolio`
2. Cosmos SQL database — `azurerm_cosmosdb_sql_database.portfolio`
3. Cosmos SQL container — `azurerm_cosmosdb_sql_container.visitor_counters`
4. Function App service plan — `azurerm_service_plan.portfolio`
5. Function App Flex Consumption app — `azurerm_function_app_flex_consumption.portfolio`
6. Function App Managed Identity Cosmos SQL role assignment — `azurerm_cosmosdb_sql_role_assignment.function_identity`
7. Function App Managed Identity Storage Blob Data Owner assignment — `azurerm_role_assignment.storage_blob_owner`
8. Static Web App — `azurerm_static_web_app.portfolio`

### Drift reconciliation

The import exposed differences between generated configuration and live Azure settings. The reviewed configuration records:

- Function App HTTPS-only is enabled (`https_only = true`).
- Cosmos DB local/key authentication is disabled, public network access is enabled, virtual network filtering is disabled, and Azure-services ACL bypass is disabled.
- CORS retains all six verified origins: the Static Web Apps fallback URL, `https://aniketpawar.is-a.dev`, local development origins on ports 8000, 5000 and 5500, and `https://portal.azure.com`.
- Function App app settings are excluded from Terraform change detection because the generated import snapshot does not contain the complete operational settings. A separate controlled process is required to manage those settings.
- The Cosmos DB firewall currently has 31 explicit IP entries plus the `0.0.0.0` Azure-datacenter exception (32 entries total). In this source branch, `ip_range_filter` is intentionally ignored until the complete verified allowlist is maintained in source control. The live firewall list must not be replaced by an incomplete list.

The earlier local reconciliation run produced `No changes. Your infrastructure matches the configuration. Plan: 0 to add, 0 to change, 0 to destroy.` This documentation/source synchronization branch still needs its own `terraform fmt`, `terraform validate` and `terraform plan` review before merge. Do not apply a plan that proposes replacement or deletion of Cosmos DB, the Function App, Static Web App or their data.

### Shared cost governance

The `portfolio-monthly-budget` budget is configured at the `rg-portfolio` scope for ₹300 per month, with notifications at 50%, 80% and 100% actual spend and 100% forecast spend. It covers Project 1 and Project 2 resources in the shared resource group; it is not a Project 1-only budget. Budget notifications do not stop or cap spending.

Terraform state files and plan files must never be committed to Git.

## 9. CI/CD – GitHub Actions

GitHub Actions automates the frontend deployment process.

### Workflow Configuration

Workflow file:

```text
.github/workflows/azure-static-web-apps-gentle-glacier-047897600.yml
```

### Deployment Process

1. A developer pushes changes to the `main` branch.
2. GitHub Actions starts the Static Web Apps workflow.
3. The repository is checked out using GitHub Actions.
4. The Azure Static Web Apps deployment action builds and deploys the `./frontend` folder.
5. The updated frontend becomes available through Azure Static Web Apps.

### Workflow Details

| Configuration | Value |
|---|---|
| CI/CD Platform | GitHub Actions |
| Runner | Ubuntu Latest |
| Trigger Branch | main |
| Deployment Target | Azure Static Web Apps |
| Frontend Location | `./frontend` |
| Deployment Action | Azure/static-web-apps-deploy@v1 |
| Deployment Authentication | GitHub Secret |

### Pull Request Preview

The checked-in Static Web Apps workflow does not declare a `pull_request` trigger. Pull-request preview deployment is therefore not claimed as a configured workflow.

### Backend Deployment

The Static Web Apps workflow described above deploys the frontend only. It does not deploy the Python Azure Functions backend.

## 10. Repository Structure

```text
azure-cloud-resume-challenge/
│
├── .github/
│   └── workflows/
│       ├── azure-static-web-apps-gentle-glacier-047897600.yml
│       └── codeql.yml
│
├── api/
│   ├── function_app.py
│   ├── host.json
│   └── requirements.txt
│
├── docs/
│   ├── architecture.mmd
│   ├── architecture.png
│   ├── deployment-architecture.mmd
│   └── deployment-architecture.png
│
├── frontend/
│   ├── index.html
│   ├── compact.html
│   ├── app.js
│   ├── land.js
│   ├── style.css
│   ├── engagement-analytics.js
│   ├── portfolio-like.js
│   ├── resume-viewer.js
│   ├── resume-viewer.css
│   ├── view-transition.js
│   ├── view-transition.css
│   ├── css/
│   ├── js/
│   └── assets/
│
├── infrastructure/
│
├── terraform/
│   ├── backend.tf
│   ├── main.tf
│   ├── functionapp.tf
│   ├── cosmos.tf
│   ├── storage.tf
│   ├── staticwebapp.tf
│   ├── variables.tf
│   ├── providers.tf
│   └── generated-imports.tf
│
├── .gitignore
└── README.md
```

## 11. Monitoring and Observability

Application Insights is integrated with the Azure Function App to collect application telemetry.

It supports monitoring and diagnostics of application requests and runtime behaviour.

The integration provides a foundation for investigating application issues and understanding backend activity.

## 12. Challenges and Technical Learning

During development, the following areas were explored:

- Hosting a static website using Azure Static Web Apps.
- Developing a serverless backend using Python and Azure Functions.
- Connecting Azure Functions to Cosmos DB.
- Implementing atomic counter updates.
- Configuring Managed Identity and Azure RBAC.
- Managing Azure resources using Terraform.
- Automating frontend deployment using GitHub Actions.
- Configuring application telemetry using Application Insights.
- Applying GitHub security features such as CodeQL and Dependabot.
- Managing development and stable branches using Git.

## 13. Future Improvements

Potential next improvements include:

- Add a tested GitHub Actions deployment workflow for the Python Function App with protected approvals and rollback-aware release handling.
- Add automated unit, integration and API contract tests for the Python Functions.
- Maintain the verified Cosmos DB firewall allowlist in source control; the current review branch intentionally ignores `ip_range_filter` rather than risk overwriting the live 32-entry list.
- Consider a narrower, stable-egress network design (for example, VNet integration with controlled egress) if budget and hosting constraints justify it.
- Separate Function runtime/cache storage from Terraform state storage to reduce the impact of a compromised Function App identity.
- Review the shared ₹300 monthly Resource Group budget and tune thresholds only when actual usage justifies a change.
- Continue improving rate limiting, abuse protection and API monitoring for anonymous visitor-facing endpoints.

## 14. Project Status

**Status: Completed – Core Portfolio Scope and Live Backend Integration; Terraform source synchronization under review**

The public portfolio frontend, serverless visitor counter, resume/certificate event capture, portfolio appreciation/engagement event capture, Azure infrastructure configuration, frontend CI/CD workflow, and core security controls are in place.

The additional Project 2 analytics and cost API functions have been deployed to the shared Function App from the `resume-develop` source branch. The latest API extension source has not yet been merged into `main`; the Static Web Apps frontend workflow continues to deploy from `main`.

The dedicated Project 1 remote backend and ownership boundaries are documented in this README. The latest infrastructure synchronization is being reviewed separately from the live application: validate the review branch and its Terraform plan before merging it into `main` or applying any infrastructure changes.
