import * as core from '@actions/core';

// Version from package.json
const VERSION = '1.0.0';
const ACTION_NAME = 'get-github-token';

interface AuthTokenResponse {
  token: string;
  expiresAt: string;
  type: string;
  provider: string;
  scope: string;
}

interface ErrorResponse {
  message?: string;
  statusCode?: number;
}

function printHeader(repository: string, serverUrl: string): void {
  const line = '-'.repeat(90);
  console.log(line);
  console.log(`flxbl-actions  -- ❤️  by flxbl.io ❤️  -Version:${VERSION}`);
  console.log(line);
  console.log(`Action     : ${ACTION_NAME}`);
  console.log(`Repository : ${repository}`);
  console.log(`SFP Server : ${serverUrl}`);
  console.log(line);
  console.log();
}

export async function run(): Promise<void> {
  try {
    // Get inputs
    const serverUrl = core.getInput('sfp-server-url', { required: true });
    const serverToken = core.getInput('sfp-server-token', { required: true });
    const repository = core.getInput('repository', { required: false }) || process.env.GITHUB_REPOSITORY || '';

    if (!repository) {
      throw new Error('Repository not specified and GITHUB_REPOSITORY not set');
    }

    // Print header
    printHeader(repository, serverUrl);

    // Retry configuration
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 5000; // 5 seconds in milliseconds
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        core.info(`Attempt ${attempt} of ${MAX_RETRIES}...`);

        // Build API URL
        const apiUrl = new URL('/sfp/api/repository/auth-token', serverUrl);
        apiUrl.searchParams.append('repositoryIdentifier', repository);

        core.debug(`Fetching token from: ${apiUrl.toString()}`);

        // Make HTTP request
        const response = await fetch(apiUrl.toString(), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${serverToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        // Handle non-OK responses
        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

          try {
            const errorData = await response.json() as ErrorResponse;
            if (errorData.message) {
              errorMessage = errorData.message;
            }
          } catch {
            // If JSON parsing fails, try to get text
            try {
              const errorText = await response.text();
              if (errorText) {
                errorMessage = errorText;
              }
            } catch {
              // Use default error message
            }
          }

          throw new Error(`Failed to get token: ${errorMessage}`);
        }

        // Parse JSON response
        const data = await response.json() as AuthTokenResponse;

        if (!data.token) {
          throw new Error('Response did not contain a token');
        }

        // Set output
        core.setOutput('token', data.token);

        // Mask the token in logs
        core.setSecret(data.token);

        core.info(`Successfully retrieved GitHub token on attempt ${attempt}`);
        core.info(`Token expires at: ${data.expiresAt}`);
        core.info(`Token type: ${data.type}`);
        core.info(`Provider: ${data.provider}`);

        return; // Success - exit function

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        core.warning(`Attempt ${attempt} failed: ${lastError.message}`);

        // If we're not on the last attempt, wait before retrying
        if (attempt < MAX_RETRIES) {
          core.info(`Retrying in ${RETRY_DELAY / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
      }
    }

    // If we get here, all retries failed
    throw new Error(
      `Failed to get GitHub token after ${MAX_RETRIES} attempts. Last error: ${lastError?.message || 'Unknown error'}`
    );

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('Unknown error occurred');
    }
  }
}

// Run the action only when executed directly (not when imported for testing)
if (require.main === module) {
  run();
}
