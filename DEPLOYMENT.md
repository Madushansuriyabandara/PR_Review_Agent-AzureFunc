# Deployment Guide for Azure Function PR Review

This guide provides step-by-step instructions for deploying the Azure Function PR Review application to Azure.

## Prerequisites

- Azure subscription
- Azure CLI installed
- Node.js and npm installed
- Azure Functions Core Tools installed
- Azure DevOps organization with admin access

## Step 1: Create Azure Resources

```bash
# Login to Azure
az login

# Create a resource group
az group create --name pr-review-rg --location eastus

# Create a storage account
az storage account create --name prreviewstorage --location eastus --resource-group pr-review-rg --sku Standard_LRS

# Create a function app with Node.js runtime
az functionapp create --resource-group pr-review-rg --consumption-plan-location eastus --runtime node --runtime-version 18 --functions-version 4 --name pr-review-function --storage-account prreviewstorage
```

## Step 2: Configure Application Settings

```bash
# Set application settings
az functionapp config appsettings set --name pr-review-function --resource-group pr-review-rg --settings "AZURE_PAT=your_pat_here"
az functionapp config appsettings set --name pr-review-function --resource-group pr-review-rg --settings "AZURE_ORG=your_org_name"
az functionapp config appsettings set --name pr-review-function --resource-group pr-review-rg --settings "AZURE_PROJECT=your_project_name"
az functionapp config appsettings set --name pr-review-function --resource-group pr-review-rg --settings "AZURE_REPO=your_repo_name"
az functionapp config appsettings set --name pr-review-function --resource-group pr-review-rg --settings "INSTRUCTION_SOURCE=https://your-guidelines-url-or-path"
az functionapp config appsettings set --name pr-review-function --resource-group pr-review-rg --settings "CREATE_NEW_PR=false"

# Set one of the following AI API keys based on your preference
az functionapp config appsettings set --name pr-review-function --resource-group pr-review-rg --settings "OPENAI_API_KEY=your_openai_key"
# OR
az functionapp config appsettings set --name pr-review-function --resource-group pr-review-rg --settings "GEMINI_API_KEY=your_gemini_key"
# OR
az functionapp config appsettings set --name pr-review-function --resource-group pr-review-rg --settings "AZURE_OPENAI_API_KEY=your_azure_openai_key"
az functionapp config appsettings set --name pr-review-function --resource-group pr-review-rg --settings "AZURE_OPENAI_API_INSTANCE_NAME=your_instance_name"
az functionapp config appsettings set --name pr-review-function --resource-group pr-review-rg --settings "AZURE_OPENAI_API_DEPLOYMENT_NAME=your_deployment_name"
az functionapp config appsettings set --name pr-review-function --resource-group pr-review-rg --settings "AZURE_OPENAI_API_VERSION=2023-12-01-preview"
```

## Step 3: Deploy the Function

```bash
# Navigate to the function directory
cd azure-function-pr-review

# Install dependencies
npm install

# Deploy to Azure
func azure functionapp publish pr-review-function
```

## Step 4: Get the Function URL

```bash
# Get the function URL with key
az functionapp function show --name pr-review-function --resource-group pr-review-rg --function-name PRReviewFunction --query "invokeUrlTemplate" --output tsv
```

## Step 5: Configure Azure DevOps Webhook

1. In Azure DevOps, navigate to your project
2. Go to Project Settings > Service Hooks
3. Click "+" to add a new service hook
4. Select "Web Hooks" as the service
5. Choose the trigger events:
   - Pull request created
   - Pull request updated
6. Configure filters as needed (e.g., specific branches)
7. Set the webhook URL to the function URL obtained in Step 4
8. Save the webhook configuration

## Step 6: Test the Integration

1. Create a new pull request in your repository
2. The function should be triggered automatically
3. Check the function logs for execution details:
   ```bash
   az functionapp log tail --name pr-review-function --resource-group pr-review-rg
   ```
4. Verify that comments are added to the PR

## Troubleshooting

### Function Not Triggering

- Verify the webhook is configured correctly in Azure DevOps
- Check that the function URL is correct and includes the function key
- Ensure the function app is running

### Authentication Errors

- Verify that the PAT has sufficient permissions (Code Read & Write)
- Check that the organization, project, and repository names are correct

### AI Integration Issues

- Verify that at least one AI API key is configured correctly
- Check the function logs for specific error messages
- Ensure the review guidelines file is accessible

## Monitoring and Maintenance

- Set up Application Insights for monitoring
- Regularly update dependencies
- Rotate API keys periodically for security

## Cost Management

- The function uses a consumption plan, so you only pay for execution time
- Monitor usage to avoid unexpected costs
- Consider implementing rate limiting for high-volume repositories
