# Azure Function for PR Review with AI Suggestions

This Azure Function integrates with Azure DevOps to provide AI-powered code reviews for pull requests. When triggered by a webhook from Azure DevOps, it analyzes the PR changes, adds AI-generated comments, and optionally creates a new PR with suggested improvements.


[![](https://mermaid.ink/img/pako:eNq1WFtP4zgU_iuWn0Aq0JaWtnlAqhhAlXYZBKMdabarkUlOU4vUzjpOh4v473vspEmbWy879AHi03O-8_nc7PSdutID6tAI_o1BuPCFM1-xxVQQ_IRMae7ykAlNxm-xgi-w_BpGhEXJkiTrGuWbWLiaS5GrryRlg9uYexBwARZ8bfUoY-VChYfJn0g8sNgTkjwffQ1BjCdn1tnZLSy44McVvrge30-KmzBigvJpym5tvyeXlxsbcsgjCI_8gqe5lM8EloCoR_cPxFXANHhnceiZ_6nv5O-d1EDkEhQpYP3FAm7UM7yQvQaSeevGLNAGgDCCXqy_RJ4RXcGdrLgmzB3yADpWgnTbbXI08YXE_QpUW8GkFCGIgEyiSnzjG6Wa6wCIK4VmXERkSv_GuD_Gvg8RbpXc8BeI_pnS3G4_bo_PPMRMnvggQJngoc_jHMwStBEQRa0mj5eXeSk55A-MKlGw5PCL-Jl80z7XPymnPSWc29p4bEQrz1kdo7RyHTIRXHNM_huYEl4YYcEy0awnwjMEr8p-S2RsGzhkHOs5boG7tga5npP78bdCUKxqPQ-2BuGZmAhY6_P96NyCxhyFMuJaKl5KzxYm9Za7ew_jIEAgnIeRJh5gvQd7ssB2qbTbXKWNxSPiKTYr1NAB3WNRNtsma53Ej8AG2slXHpCrObjPZCYVgRceaS58U6yuXCww4VEZZ1toUkui5zgrvQqAssTEac0nro3pa0KorH5A5FaIoZIuRFFx-BSG0AaZnUls1pjJhzYjDL-Kqs23RXKb_UGk3DkTPhzIKDH2yIwHsBcpPJ3JfRJ7AsydWwScbuYLFgTFubb-CaQMyY0pT2O3zqDeZlscZJAgVE_3faNi0HYCOpywwAPt9xE2aJ9AODv3btPDu2GK7HUK5oNBmEgrhYcP_JaYF4or8dNs0jhL7fWwMAK3w23L1y44eF_9P4GovbyOPY9ouYq6GUaEz7CCwIMGh7Vsar-olpqT4WrNtR3GtgyuHq7H365_3l1__5kcfVrFDROhqbmeFBOYfS5msh5gW452AtmfX1pRYRzNk6ub6d3E1-FcLZqCKA70J3DNS6V0d9_rrEletRoxduXYdD_A6knfGLBtwwCMzyzSlbeE7KZQrsynWJcrc8ZQ-ZOotlYHOmFLvI6ypwCaGN9tdPKncRJyRet4jzFQEm4IsoV9oC3qK-5Rx7R9iy5ALZhZ0nejNKX4urKAKXXw0YMZM5WOb64faBYy8UPKxcpSydifU8fmqEWT9_r0J5JMBT2CupKx0NTpWwTqvNMX6nSHg9Nhf9Tp9Ebddud8NGrRV-oMhqcXvdGw0-sOLs4HnfPzjxZ9sy47p8PuoN3tdwb99qh30e71P_4D8R33yg?type=png)](https://mermaid.live/edit#pako:eNq1WFtP4zgU_iuWn0Aq0JaWtnlAqhhAlXYZBKMdabarkUlOU4vUzjpOh4v473vspEmbWy879AHi03O-8_nc7PSdutID6tAI_o1BuPCFM1-xxVQQ_IRMae7ykAlNxm-xgi-w_BpGhEXJkiTrGuWbWLiaS5GrryRlg9uYexBwARZ8bfUoY-VChYfJn0g8sNgTkjwffQ1BjCdn1tnZLSy44McVvrge30-KmzBigvJpym5tvyeXlxsbcsgjCI_8gqe5lM8EloCoR_cPxFXANHhnceiZ_6nv5O-d1EDkEhQpYP3FAm7UM7yQvQaSeevGLNAGgDCCXqy_RJ4RXcGdrLgmzB3yADpWgnTbbXI08YXE_QpUW8GkFCGIgEyiSnzjG6Wa6wCIK4VmXERkSv_GuD_Gvg8RbpXc8BeI_pnS3G4_bo_PPMRMnvggQJngoc_jHMwStBEQRa0mj5eXeSk55A-MKlGw5PCL-Jl80z7XPymnPSWc29p4bEQrz1kdo7RyHTIRXHNM_huYEl4YYcEy0awnwjMEr8p-S2RsGzhkHOs5boG7tga5npP78bdCUKxqPQ-2BuGZmAhY6_P96NyCxhyFMuJaKl5KzxYm9Za7ew_jIEAgnIeRJh5gvQd7ssB2qbTbXKWNxSPiKTYr1NAB3WNRNtsma53Ej8AG2slXHpCrObjPZCYVgRceaS58U6yuXCww4VEZZ1toUkui5zgrvQqAssTEac0nro3pa0KorH5A5FaIoZIuRFFx-BSG0AaZnUls1pjJhzYjDL-Kqs23RXKb_UGk3DkTPhzIKDH2yIwHsBcpPJ3JfRJ7AsydWwScbuYLFgTFubb-CaQMyY0pT2O3zqDeZlscZJAgVE_3faNi0HYCOpywwAPt9xE2aJ9AODv3btPDu2GK7HUK5oNBmEgrhYcP_JaYF4or8dNs0jhL7fWwMAK3w23L1y44eF_9P4GovbyOPY9ouYq6GUaEz7CCwIMGh7Vsar-olpqT4WrNtR3GtgyuHq7H365_3l1__5kcfVrFDROhqbmeFBOYfS5msh5gW452AtmfX1pRYRzNk6ub6d3E1-FcLZqCKA70J3DNS6V0d9_rrEletRoxduXYdD_A6knfGLBtwwCMzyzSlbeE7KZQrsynWJcrc8ZQ-ZOotlYHOmFLvI6ypwCaGN9tdPKncRJyRet4jzFQEm4IsoV9oC3qK-5Rx7R9iy5ALZhZ0nejNKX4urKAKXXw0YMZM5WOb64faBYy8UPKxcpSydifU8fmqEWT9_r0J5JMBT2CupKx0NTpWwTqvNMX6nSHg9Nhf9Tp9Ebddud8NGrRV-oMhqcXvdGw0-sOLs4HnfPzjxZ9sy47p8PuoN3tdwb99qh30e71P_4D8R33yg)



## Features

- Triggers on Azure DevOps PR webhook events
- Analyzes code changes using AI (supports Azure OpenAI, OpenAI, or Google Gemini)
- Adds AI-generated comments to specific lines in the PR
- Optionally creates a new PR with AI-suggested code improvements
- Customizable review guidelines

## Setup Instructions

### 1. Create an Azure Function App

1. In the Azure Portal, create a new Function App with Node.js runtime
2. Choose the Consumption plan for serverless execution

### 2. Deploy the Function

You can deploy this function using Azure Functions Core Tools, Visual Studio Code, or Azure DevOps pipelines.

#### Using Azure Functions Core Tools:

```bash
cd azure-function-pr-review
npm install
func azure functionapp publish YOUR_FUNCTION_APP_NAME
```

### 3. Configure Application Settings

In the Azure Portal, navigate to your Function App > Configuration and add the following application settings:

| Setting Name | Description |
|-------------|-------------|
| AZURE_PAT | Personal Access Token for Azure DevOps with Code (Read & Write) permissions |
| AZURE_ORG | Your Azure DevOps organization name |
| AZURE_PROJECT | Default Azure DevOps project name (optional if provided in webhook) |
| AZURE_REPO | Default repository name (optional if provided in webhook) |
| INSTRUCTION_SOURCE | Path or URL to review guidelines file |
| CREATE_NEW_PR | Set to "true" to create new PRs with AI suggestions |
| GEMINI_API_KEY | Google Gemini API key (optional) |
| OPENAI_API_KEY | OpenAI API key (optional) |
| AZURE_OPENAI_API_KEY | Azure OpenAI API key (optional) |
| AZURE_OPENAI_API_INSTANCE_NAME | Azure OpenAI instance name (required if using Azure OpenAI) |
| AZURE_OPENAI_API_DEPLOYMENT_NAME | Azure OpenAI deployment name (required if using Azure OpenAI) |
| AZURE_OPENAI_API_VERSION | Azure OpenAI API version (defaults to "2023-12-01-preview") |

Note: You must provide at least one of the AI API keys (GEMINI_API_KEY, OPENAI_API_KEY, or AZURE_OPENAI_API_KEY).

### 4. Create Review Guidelines

Create a text file with your code review guidelines and either:
1. Upload it to a location accessible by the function, or
2. Host it on a publicly accessible URL

Set the INSTRUCTION_SOURCE environment variable to the file path or URL.

### 5. Configure Azure DevOps Webhook

1. In your Azure DevOps project, go to Project Settings > Service Hooks
2. Click "+" to add a new service hook
3. Select "Web Hooks" as the service
4. Choose "Pull request created" and/or "Pull request updated" as the trigger
5. Configure the webhook URL to point to your Azure Function URL
6. Add the function key to the URL for authentication

## Usage

Once configured, the function will automatically:
1. Trigger when a new PR is created or updated
2. Analyze the code changes using the specified AI model
3. Add comments to the PR based on the review guidelines
4. Optionally create a new PR with suggested improvements

## Local Development

For local development:

1. Clone the repository
2. Run `npm install` to install dependencies
3. Create a `local.settings.json` file with the required settings
4. Run `func start` to start the function locally
5. Use a tool like ngrok to expose your local endpoint for webhook testing

## Troubleshooting

- Check the function logs for detailed error messages
- Verify that your PAT has sufficient permissions
- Ensure the AI API keys are valid and have sufficient quota
- Confirm that the review guidelines file is accessible
