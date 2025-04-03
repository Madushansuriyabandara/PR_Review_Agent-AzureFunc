const { default: axios } = require('axios');
const azdev = require('azure-devops-node-api');
const GitApi = require('azure-devops-node-api/GitApi');
const GitInterfaces = require('azure-devops-node-api/interfaces/GitInterfaces');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { AzureChatOpenAI, ChatOpenAI } = require('@langchain/openai');
const { PromptTemplate } = require('@langchain/core/prompts');
const { JsonOutputParser } = require('@langchain/core/output_parsers');
const { TextLoader } = require('langchain/document_loaders/fs/text');
const { CheerioWebBaseLoader } = require('@langchain/community/document_loaders/web/cheerio');
const fs = require('fs').promises;
const path = require('path');
require('dotenv/config');

// Interfaces for AI comments and file corrections
/**
 * @typedef {Object} AIComment
 * @property {number} lineNumber - Line number for the comment
 * @property {string} comment - The comment text
 */

/**
 * @typedef {Object} AICommentResult
 * @property {AIComment[]} comments - Array of comments
 * @property {string} newContent - New content with suggested changes
 */

/**
 * @typedef {Object} FileCorrection
 * @property {string} path - File path
 * @property {string} originalContent - Original file content
 * @property {string} correctedContent - Corrected file content
 */

/**
 * Azure Function for PR review with AI suggestions
 * @param {Object} context - Azure Function context
 * @param {Object} req - HTTP request
 */
module.exports = async function (context, req) {
    context.log('PR Review Function triggered by webhook');
    
    try {
        // Validate webhook payload
        if (!req.body) {
            context.res = {
                status: 400,
                body: "Invalid webhook payload: Body is empty"
            };
            return;
        }

        // Log the received payload for debugging
        context.log('Received webhook payload:', JSON.stringify(req.body));

        // Check if this is a pull request event
        const eventType = req.body.eventType;
        if (!eventType) {
            context.log('Missing eventType in payload');
            context.res = {
                status: 400,
                body: "Missing eventType in payload"
            };
            return;
        }

        if (!eventType.startsWith('git.pullrequest.')) {
            context.log(`Ignoring non-PR event: ${eventType}`);
            context.res = {
                status: 200,
                body: `Ignoring non-PR event: ${eventType}`
            };
            return;
        }

        // Extract PR information from the webhook payload
        const resource = req.body.resource;
        if (!resource || !resource.pullRequestId) {
            context.log('Missing PR information in payload');
            context.res = {
                status: 400,
                body: "Missing PR information in payload"
            };
            return;
        }

        // Get configuration from environment variables
        const config = {
            PAT: process.env.AZURE_PAT,
            ORG: process.env.AZURE_ORG,
            PROJECT: resource.repository?.project?.name || process.env.AZURE_PROJECT,
            REPO_NAME: resource.repository?.name || process.env.AZURE_REPO,
            PR_ID: resource.pullRequestId,
            GEMINI_API_KEY: process.env.GEMINI_API_KEY,
            OPENAI_API_KEY: process.env.OPENAI_API_KEY,
            AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY,
            AZURE_OPENAI_API_INSTANCE_NAME: process.env.AZURE_OPENAI_API_INSTANCE_NAME,
            AZURE_OPENAI_API_DEPLOYMENT_NAME: process.env.AZURE_OPENAI_API_DEPLOYMENT_NAME,
            AZURE_OPENAI_API_VERSION: process.env.AZURE_OPENAI_API_VERSION || "2023-12-01-preview",
            INSTRUCTION_SOURCE: process.env.INSTRUCTION_SOURCE,
            CREATE_NEW_PR: process.env.CREATE_NEW_PR ? 
                process.env.CREATE_NEW_PR.toLowerCase() === 'true' : false
        };

        // Log configuration (excluding sensitive values)
        context.log('Configuration:', {
            PROJECT: config.PROJECT,
            REPO_NAME: config.REPO_NAME,
            PR_ID: config.PR_ID,
            INSTRUCTION_SOURCE: config.INSTRUCTION_SOURCE,
            CREATE_NEW_PR: config.CREATE_NEW_PR
        });

        // Validate required configuration
        const requiredVars = ['AZURE_PAT', 'AZURE_ORG', 'INSTRUCTION_SOURCE'];
        const missingVars = [];
        
        for (const varName of requiredVars) {
            if (!process.env[varName]) {
                missingVars.push(varName);
            }
        }
        
        if (missingVars.length > 0) {
            const errorMsg = `Missing required environment variables: ${missingVars.join(', ')}`;
            context.log.error(errorMsg);
            context.res = {
                status: 500,
                body: errorMsg
            };
            return;
        }

        // For testing purposes, if this is a test run without actual processing
        if (req.query && req.query.testOnly === 'true') {
            context.log('Test run completed successfully');
            context.res = {
                status: 200,
                body: {
                    message: "Test run completed successfully",
                    config: {
                        PROJECT: config.PROJECT,
                        REPO_NAME: config.REPO_NAME,
                        PR_ID: config.PR_ID,
                        CREATE_NEW_PR: config.CREATE_NEW_PR
                    }
                }
            };
            return;
        }

        // Load review guidelines
        let guidelines;
        try {
            guidelines = await loadGuidelines(config.INSTRUCTION_SOURCE);
            context.log('Successfully loaded review guidelines');
        } catch (error) {
            const errorMsg = `Failed to load review guidelines: ${error.message || error}`;
            context.log.error(errorMsg);
            context.res = {
                status: 500,
                body: errorMsg
            };
            return;
        }
        
        // Process the PR
        await processPullRequest(context, config, guidelines);
        
        context.res = {
            status: 200,
            body: "PR review completed successfully"
        };
    } catch (error) {
        const errorMsg = `PR review failed: ${error.message || error}`;
        context.log.error(errorMsg);
        context.log.error('Stack trace:', error.stack);
        context.res = {
            status: 500,
            body: errorMsg
        };
    }
};

/**
 * Initialize AI model based on available API keys
 * @param {Object} config - Configuration object
 * @returns {Object} - Initialized AI model
 */
function initializeAIModel(config) {
    if (config.AZURE_OPENAI_API_KEY) {
        return new AzureChatOpenAI({
            azureOpenAIApiKey: config.AZURE_OPENAI_API_KEY,
            azureOpenAIApiInstanceName: config.AZURE_OPENAI_API_INSTANCE_NAME,
            azureOpenAIApiDeploymentName: config.AZURE_OPENAI_API_DEPLOYMENT_NAME,
            azureOpenAIApiVersion: config.AZURE_OPENAI_API_VERSION,
            modelName: "gpt-4",
            temperature: 0.7,
            maxTokens: 4096,
        });
    } else if (config.OPENAI_API_KEY) {
        return new ChatOpenAI({
            openAIApiKey: config.OPENAI_API_KEY,
            modelName: "gpt-4",
            temperature: 0.7,
            maxTokens: 4096,
        });
    } else if (config.GEMINI_API_KEY) {
        return new ChatGoogleGenerativeAI({
            modelName: "gemini-1.5-pro",
            apiKey: config.GEMINI_API_KEY
        });
    } else {
        throw new Error("No AI model API key provided");
    }
}

/**
 * Process a pull request
 * @param {Object} context - Azure Function context
 * @param {Object} config - Configuration object
 * @param {string} guidelines - Review guidelines
 */
async function processPullRequest(context, config, guidelines) {
    // Initialize AI model
    const model = initializeAIModel(config);
    const corrections = [];

    // 1. Authenticate with Azure DevOps
    const authHandler = azdev.getPersonalAccessTokenHandler(config.PAT);
    const connection = new azdev.WebApi(`https://dev.azure.com/${config.ORG}`, authHandler);
    const gitApi = await connection.getGitApi();

    // 2. Get target repository
    const repos = await gitApi.getRepositories(config.PROJECT);
    const repo = repos.find(r => r.name === config.REPO_NAME);
    if (!repo?.id) throw new Error("Repository not found");

    // 3. Get target pull request
    const targetPR = await gitApi.getPullRequest(repo.id, config.PR_ID, config.PROJECT);
    
    // Check for draft PR
    if (targetPR.isDraft) {
        context.log("Skipping draft pull request");
        return;
    }

    if (!targetPR?.pullRequestId || !targetPR.sourceRefName || !targetPR.targetRefName) {
        throw new Error("PR not found or missing ref names");
    }

    // 4. Get PR changes using iterations
    const iterations = await gitApi.getPullRequestIterations(repo.id, targetPR.pullRequestId, config.PROJECT);
    const latestIterationId = iterations[iterations.length - 1]?.id;
    if (!latestIterationId) throw new Error("No iterations found");
    
    const prChanges = await gitApi.getPullRequestIterationChanges(
        repo.id,
        targetPR.pullRequestId,
        latestIterationId,
        config.PROJECT
    );

    // 5. Process each changed file
    for (const change of prChanges.changeEntries || []) {
        const itemPath = change.item?.path;
        if (!itemPath || change.item?.isFolder) continue;

        // Get file content from both branches
        const [oldContent, newContent] = await Promise.all([
            getFileContent(gitApi, repo.id, itemPath, targetPR.targetRefName, config.PROJECT),
            getFileContent(gitApi, repo.id, itemPath, targetPR.sourceRefName, config.PROJECT)
        ]);

        // Generate AI comments
        const analysis = await generateComments(oldContent, newContent, itemPath, guidelines, model);
        
        // Post comments to Azure DevOps
        for (const comment of analysis.comments) {
            await createCommentThread(
                gitApi,
                repo.id,
                targetPR.pullRequestId,
                comment.comment,
                itemPath,
                comment.lineNumber,
                config.PROJECT
            );
        }

        // Update the correction collection
        if (analysis.newContent !== newContent && validateCorrection(newContent, analysis.newContent)) {
            corrections.push({
                path: itemPath,
                originalContent: newContent,
                correctedContent: analysis.newContent
            });
        }
    }

    // Create a new PR with corrections if enabled
    if (corrections.length > 0) {
        if (config.CREATE_NEW_PR) {
            await createCorrectionPR(
                gitApi,
                repo.id,
                targetPR,
                corrections,
                config.PROJECT
            );
            context.log("Created new PR with AI-suggested changes");
        } else {
            context.log("AI-suggested changes available. To apply these changes, set CREATE_NEW_PR=true");
        }
    } else {
        context.log("No AI-suggested changes to apply.");
    }
}

/**
 * Load review guidelines from a file or URL
 * @param {string} source - Source path or URL
 * @returns {Promise<string>} - Guidelines content
 */
async function loadGuidelines(source) {
    try {
        let loader;
        
        if (source.startsWith('http://') || source.startsWith('https://')) {
            loader = new CheerioWebBaseLoader(source);
        } else {
            // Resolve absolute path for local files
            const filePath = path.isAbsolute(source)
                ? source
                : path.join(process.cwd(), source);
            loader = new TextLoader(filePath);
        }

        const docs = await loader.load();
        return docs.map(doc => doc.pageContent).join('\n');
    } catch (error) {
        console.error('Failed to load guidelines:', error);
        throw new Error(`Failed to load review guidelines: ${error.message || error}`);
    }
}

/**
 * Get file content from a repository
 * @param {Object} gitApi - Git API client
 * @param {string} repoId - Repository ID
 * @param {string} path - File path
 * @param {string} ref - Git reference
 * @param {string} project - Project name
 * @returns {Promise<string>} - File content
 */
async function getFileContent(gitApi, repoId, path, ref, project) {
    try {
        const versionDescriptor = {
            versionType: GitInterfaces.GitVersionType.Branch,
            version: ref.replace("refs/heads/", "")
        };
        
        const stream = await gitApi.getItemContent(repoId, path, project, undefined, undefined, undefined, undefined, undefined, versionDescriptor);
        return await streamToString(stream);
    } catch (error) {
        console.error(`Error fetching ${path}:`, error instanceof Error ? error.message : error);
        return "";
    }
}

/**
 * Convert a stream to string
 * @param {Object} stream - Readable stream
 * @returns {Promise<string>} - Stream content as string
 */
function streamToString(stream) {
    return new Promise((resolve, reject) => {
        let data = '';
        stream.on('data', chunk => data += chunk);
        stream.on('end', () => resolve(data));
        stream.on('error', reject);
    });
}

/**
 * Split content into lines
 * @param {string} content - Content to split
 * @returns {string[]} - Array of lines
 */
function splitLines(content) {
    return content.split(/\r?\n/);
}

/**
 * Add line numbers to content
 * @param {string} content - Content to number
 * @returns {string} - Numbered content
 */
function numberLines(content) {
    return splitLines(content)
        .map((line, index) => `${index + 1}: ${line}`)
        .join('\n');
}

/**
 * Generate AI comments for a file
 * @param {string} oldContent - Old file content
 * @param {string} newContent - New file content
 * @param {string} filePath - File path
 * @param {string} guidelines - Review guidelines
 * @param {Object} model - AI model
 * @returns {Promise<AICommentResult>} - AI comments and suggested content
 */
async function generateComments(oldContent, newContent, filePath, guidelines, model) {
    const numberedOld = numberLines(oldContent);
    const numberedNew = numberLines(newContent);
    const newLines = splitLines(newContent);

    const prompt = PromptTemplate.fromTemplate(`
        Follow these code review guidelines:
        {guidelines}

        ANALYZE THESE CHANGES:
        - OLD VERSION (numbered):
        {numberedOld}

        - NEW VERSION (numbered):
        {numberedNew}

        INSTRUCTIONS:
        1. Only comment on changed lines
        2. Use EXACT line numbers from NEW VERSION
        3. Reference guidelines like: [Guideline X]
        4. Generate corrected version of the FULL FILE
        5. Maintain original code structure where possible

        RESPONSE FORMAT (JSON):
        {{
            "comments": [{{
                "lineNumber": <ACTUAL_NEW_LINE_NUMBER>,
                "comment": "[Guideline] - <TEXT>"
            }}],
            "newContent": "<FULL_CORRECTED_CODE_WITHOUT_LINE_NUMBERS>"
        }}

        EXAMPLE:
        {{
            "comments": [{{
                "lineNumber": 42,
                "comment": "[Security 3.1] - Fix SQL injection risk"
            }}],
            "newContent": "function safe() {{\\n  // fixed code\\n}}"
        }}
    `);

    try {
        const chain = prompt.pipe(model).pipe(new JsonOutputParser());
        const result = await chain.invoke({
            guidelines,
            numberedOld,
            numberedNew
        });

        return {
            comments: result.comments
                .map(comment => ({
                    lineNumber: Math.min(
                        Math.max(1, Number(comment.lineNumber)),
                        newLines.length
                    ),
                    comment: comment.comment
                }))
                .filter(comment =>
                    comment.lineNumber > 0 &&
                    comment.lineNumber <= newLines.length
                ),
            newContent: result.newContent
        };
    } catch (error) {
        console.error("AI analysis failed:", error);
        return { comments: [], newContent: newContent };
    }
}

/**
 * Create a comment thread on a PR
 * @param {Object} gitApi - Git API client
 * @param {string} repoId - Repository ID
 * @param {number} prId - PR ID
 * @param {string} commentText - Comment text
 * @param {string} filePath - File path
 * @param {number} lineNumber - Line number
 * @param {string} project - Project name
 */
async function createCommentThread(gitApi, repoId, prId, commentText, filePath, lineNumber, project) {
    const azureLine = Math.max(1, lineNumber);
    
    const thread = {
        comments: [{
            content: `[AI Review] ${commentText}`,
            parentCommentId: 0,
            commentType: GitInterfaces.CommentType.Text,
        }],
        status: GitInterfaces.CommentThreadStatus.Active,
        threadContext: {
            filePath: filePath,
            rightFileStart: { line: azureLine, offset: 1 },
            rightFileEnd: { line: azureLine, offset: 1 }
        }
    };

    await gitApi.createThread(thread, repoId, prId, project);
    console.log(`Added comment to ${filePath} line ${lineNumber}`);
}

/**
 * Create a new PR with corrections
 * @param {Object} gitApi - Git API client
 * @param {string} repoId - Repository ID
 * @param {Object} originalPR - Original PR
 * @param {FileCorrection[]} corrections - File corrections
 * @param {string} project - Project name
 */
async function createCorrectionPR(gitApi, repoId, originalPR, corrections, project) {
    try {
        // Create new branch name
        const sourceBranch = originalPR.sourceRefName.replace('refs/heads/', '');
        const newBranchName = `ai-fix/${sourceBranch}-${Date.now()}`;
        const newBranchRef = `refs/heads/${newBranchName}`;

        // Get latest commit from source branch
        const sourceBranchInfo = await gitApi.getBranch(repoId, sourceBranch, project);
        const baseCommitId = sourceBranchInfo.commit?.commitId;
        if (!baseCommitId) throw new Error("Couldn't get base commit");

        // Prepare changes
        const changes = corrections.map(correction => ({
            changeType: GitInterfaces.VersionControlChangeType.Edit,
            item: {
                path: correction.path,
                commitId: baseCommitId,
                versionType: GitInterfaces.GitVersionType.Commit
            },
            newContent: {
                content: correction.correctedContent,
                contentType: GitInterfaces.ItemContentType.RawText
            }
        }));

        // Create commit
        const commit = {
            comment: "AI-suggested code improvements based on review guidelines",
            changes: changes,
            parents: [baseCommitId]
        };

        // Create push with new branch
        const push = {
            refUpdates: [{
                name: newBranchRef,
                oldObjectId: baseCommitId
            }],
            commits: [commit],
            repository: { id: repoId }
        };

        await gitApi.createPush(push, repoId, project);

        // Create pull request
        const newPR = {
            title: `[AI Suggested Fixes] ${originalPR.title}`,
            description: `Automated code improvements based on review guidelines\n\nOriginal PR: ${originalPR.url}`,
            sourceRefName: newBranchRef,
            targetRefName: originalPR.targetRefName
        };

        const createdPR = await gitApi.createPullRequest(newPR, repoId, project);
        console.log(`Created new PR with corrections: ${createdPR.url}`);
    } catch (error) {
        console.error("Failed to create correction PR:", error instanceof Error ? error.message : error);
    }
}

/**
 * Validate a correction
 * @param {string} original - Original content
 * @param {string} corrected - Corrected content
 * @returns {boolean} - Whether the correction is valid
 */
function validateCorrection(original, corrected) {
    // Basic validation to prevent empty files
    if (corrected.trim().length === 0) return false;
    
    // More complex validations can be added here
    return true;
}
