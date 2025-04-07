# Azure Function for PR Review with AI Suggestions 🤖

Automatically review pull requests in Azure DevOps using AI-powered code analysis. This Azure Function integrates with Azure DevOps to provide intelligent code reviews, adding comments directly to your PRs and optionally creating improvement PRs with suggested fixes.

## 🔄 How It Works

1. When a PR is created or updated in Azure DevOps, a webhook event is triggered
2. The Azure Function receives the webhook payload and validates it
3. The function checks if the PR is eligible for review (not a draft, not AI-generated)
4. The function loads the review guidelines from the specified source
5. The function initializes the selected AI model based on the MODEL_TYPE setting
6. For each changed file in the PR:
   - The function retrieves the old and new content
   - The AI model analyzes the changes and generates comments
   - Comments are added to the PR at specific line numbers
7. If corrections are available and CREATE_NEW_PR is true:
   - A new branch is created based on the source branch
   - The corrected files are committed to the new branch
   - A new PR is created with the AI-suggested improvements

<div align="center">
  <img src="https://github.com/user-attachments/assets/83068cbb-b33e-419b-a748-f18a16cc6230" alt="PR Review Process Diagram" width="700">
</div>

## ✨ Features

- 🔄 Automatic triggering on Azure DevOps PR webhook events
- 🧠 AI-powered code analysis (supports multiple AI models)
- 💬 Contextual comments added directly to PR lines
- 🛠️ Optional creation of improvement PRs with AI-suggested fixes
- 📝 Customizable review guidelines
- 🔀 Support for multiple files in a single PR
- 🤖 Configurable AI model selection via environment variables

## 📋 Prerequisites

- Azure account with Function App creation permissions
- Azure DevOps project with admin access
- At least one AI API key (Azure OpenAI, OpenAI, or Google Gemini)
- Code review guidelines document

## 🚀 Setup Guide

### 1. Create a resource group

##### **Using Azure Portal**
  - Azure Portal > Resource Groups > Create
<table>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/cd279a40-7689-4b77-b31e-4d24bf287fcd" alt="image" width="450"></td>
    <td><img src="https://github.com/user-attachments/assets/44b07a00-f5dd-4380-b0c7-907f8122490d" alt="image" width="450"></td>
  </tr>
</table>


##### **Using CLI**
  - ```bash
    azure login
    ```
  - ```bash
    az group create --name <RESOURCE_GROUP_NAME> --location <REGION>
    ```

### 2. Create an Azure Function App

##### **Using Azure Portal**
- Use Node.js runtime stack
<table>
  <tr>
    <td><img width="600" alt="image" src="https://github.com/user-attachments/assets/02a60481-ac49-462a-af69-5462276eceb1" /></td>
    <td><img width="575" alt="image" src="https://github.com/user-attachments/assets/eb31fbcf-5d49-44b7-88be-c82f66c540eb" /></td>
  </tr>
</table>

- Enable Azure OpenAI when creating the function app
  
- <img src="https://github.com/user-attachments/assets/d260ff78-b243-456c-83a0-e23ba2980ded" alt="image" width="600">



##### **Using CLI**

```bash
az functionapp create --resource-group <RESOURCE_GROUP_NAME> --consumption-plan-location <REGION> --runtime node --functions-version 4 --name <APP_NAME> --storage-account <STORAGE_NAME>
```

### 2. Deploy the Function

##### **Using Visual Studio Code**
  - Open the project in VS Code
  - Install the Azure Functions extension
  - Sign in to your Azure account
  - ```ctrl```+```shift```+```P``` on the project and select "Deploy to Function App"
  - Select your target Function App

##### **Using CLI**
      
```bash
cd azure-function-pr-review
npm install
func azure functionapp publish <YOUR_FUNCTION_APP_NAME>
```

### 3. Create Azure OpenAI and Deploy a Model
<table>
  <tr>
<td><img width="612" alt="image" src="https://github.com/user-attachments/assets/78bc5cf3-32ab-4884-91e2-5ab9f50be399" /></td>
<td><img width="556" alt="image" src="https://github.com/user-attachments/assets/7ef3554e-f52c-40c6-b07c-392dde93a10c" /></td>
    </tr>
  <tr>
<td><img width="731" alt="image" src="https://github.com/user-attachments/assets/eb8b3114-4ad5-40c9-88a6-34f51ce3f03f" /></td>
<td><img width="960" alt="image" src="https://github.com/user-attachments/assets/ad57f5aa-d9e5-434f-802d-b916f1d42598" /></td>
    </tr>
  <tr>
<td><img width="960" alt="image" src="https://github.com/user-attachments/assets/783a3822-fbc6-4aa1-94a9-53bbbb0cfae9" /></td>
<td><img width="960" alt="image" src="https://github.com/user-attachments/assets/300a0051-dd5f-44d6-9ae2-4bcf91c16496" /></td>
</tr>
</table>


### 4. Configure Application Settings ⚙️

In the Azure Portal, navigate to your Function App > Configuration and add the following application settings:

| Setting Name | Description |
|-------------|-------------|
| AZURE_PAT | Personal Access Token for Azure DevOps with Code (Read & Write) permissions |
| AZURE_PROJECT | Default Azure DevOps project name (optional if provided in webhook) |
| AZURE_REPO | Default repository name (optional if provided in webhook) |
| INSTRUCTION_SOURCE | Path or URL to review guidelines file |
| CREATE_NEW_PR | Set to "true" to create new PRs with AI suggestions |
| **MODEL_TYPE** | **AI model to use: "azure-openai", "openai", or "gemini"** |
| GEMINI_API_KEY | Google Gemini API key (required if MODEL_TYPE is "gemini") |
| OPENAI_API_KEY | OpenAI API key (required if MODEL_TYPE is "openai") |
| AZURE_OPENAI_API_KEY | Azure OpenAI API key (required if MODEL_TYPE is "azure-openai") |
| AZURE_OPENAI_API_INSTANCE_NAME | Azure OpenAI instance name (required if using Azure OpenAI) |
| AZURE_OPENAI_API_DEPLOYMENT_NAME | Azure OpenAI deployment name (required if using Azure OpenAI) |
| AZURE_OPENAI_API_VERSION | Azure OpenAI API version (defaults to "2023-12-01-preview") |


<div align="center">
  <img src="https://github.com/user-attachments/assets/6fd6e632-73d7-46fb-9328-c87d8cf90266" alt="Environment Variables Configuration" width="600">
</div>

### 5. Configure Azure DevOps Webhook

1. Go to **Project Settings > Service Hooks**
2. Create new webhook with:
   - **Trigger**: Pull request created
   - **URL**: 
     - Using VSCode: ```ctrl```+```shift```+```P``` -> Azure Functions: Copy Function URL
     - Using CLI: Replace "==" in the end of the URL with "%3D%3D" after copying it before pasting in the webhook (This is happening because URL encoding)
       ```bash
       FOR /F "delims=" %a IN ('az functionapp function show --resource-group <RESOURCE_GROUP> --name <FUNCTION_APP> --function-name PRReviewTrigger --query invokeUrlTemplate -o tsv') DO SET "URL=%a"
        FOR /F "delims=" %b IN ('az functionapp function keys list --resource-group <RESOURCE_GROUP> --name <FUNCTION_APP> --function-name PRReviewTrigger --query default -o tsv') DO SET "KEY=%b"
        ECHO %URL%?code=%KEY%
       ```
<table>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/61462fb2-cbe8-4b35-a83e-c1fd4cf0f915" alt="Image 1" width="400px" /></td>
    <td><img src="https://github.com/user-attachments/assets/d9669452-ae9d-479d-9234-c9443f3e6604" alt="Image 2" width="400px" /></td>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/424b5a53-8d27-490e-8db4-c52867377b14" alt="Image 3" width="400px" /></td>
    <td><img src="https://github.com/user-attachments/assets/f25bd7d0-dd43-4a7d-b807-f10e58d56eab" alt="Image 4" width="400px" /></td>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/d818d527-ecf1-4879-8c87-5cce28bba82e" alt="Image 5" width="400px" /></td>
    <td><img src="https://github.com/user-attachments/assets/a47945f8-c4ef-4400-a5cf-92e758e62f00" alt="Image 6" width="400px" /></td>
  </tr>
</table>




## 🧠 AI Model Selection

You can configure multiple API keys in your environment variables and switch between models by changing only the `MODEL_TYPE` setting. This allows you to:

- 🔄 Easily switch between different AI providers
- 💰 Optimize for cost by selecting the most economical option
- 🚀 Choose the model that performs best for your specific codebase
- 🔒 Have fallback options if one service is unavailable


