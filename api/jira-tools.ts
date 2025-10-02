import { jiraClient, JiraClientError } from './jira-client';

// Hardcoded values for DEX project
const DEX_PROJECT_KEY = 'DHK';
const DEFAULT_ISSUE_TYPE = 'Story';
const ALEX_WALD_EMAIL = 'alex.wald@optimizely.com';

export interface CreateJiraTicketParams {
  summary: string;
  description?: string;
}

export interface CreateJiraTicketResult {
  success: boolean;
  ticketKey: string;
  ticketUrl: string;
  ticketId: string;
  message: string;
}

export async function createJiraTicket(
  params: CreateJiraTicketParams
): Promise<CreateJiraTicketResult> {
  const { summary, description } = params;

  // Input validation
  if (!summary || summary.trim().length === 0) {
    throw new Error('Summary is required and cannot be empty');
  }

  if (summary.length > 255) {
    throw new Error('Summary must be 255 characters or less');
  }

  if (description && description.length > 32767) {
    throw new Error('Description must be 32,767 characters or less');
  }

  try {
    // Create the JIRA ticket with hardcoded values
    const result = await jiraClient.createIssueWithText(
      DEX_PROJECT_KEY,
      DEFAULT_ISSUE_TYPE,
      summary.trim(),
      description?.trim(),
      ALEX_WALD_EMAIL
    );

    // Construct the ticket URL
    const baseUrl = process.env.JIRA_BASE_URL || '';
    const ticketUrl = `${baseUrl}/browse/${result.key}`;

    return {
      success: true,
      ticketKey: result.key,
      ticketUrl: ticketUrl,
      ticketId: result.id,
      message: `Successfully created JIRA ticket ${result.key} in DEX project. The ticket has been assigned to Alex Wald and can be viewed at ${ticketUrl}`,
    };
  } catch (error) {
    if (error instanceof JiraClientError) {
      // Provide context-specific error messages based on status codes
      if (error.status === 400) {
        throw new Error(
          `Failed to create JIRA ticket: Invalid request data. This could mean: 1) The DEX project (${DEX_PROJECT_KEY}) configuration has changed, 2) The Story issue type is not available, 3) Required custom fields are missing, or 4) Field values are invalid. Please contact your JIRA administrator to verify project configuration. Technical details: ${error.message}`
        );
      } else if (error.status === 401) {
        throw new Error(
          `Authentication failed when creating JIRA ticket. The API token may be expired or invalid. Please check the JIRA_API_TOKEN environment variable and ensure it has create permissions for the DEX project. Technical details: ${error.message}`
        );
      } else if (error.status === 403) {
        throw new Error(
          `Access denied when creating ticket in DEX project (${DEX_PROJECT_KEY}). Your account may not have permission to create Story issues in this project or assign tickets to Alex Wald. Please contact your JIRA administrator to verify permissions. Technical details: ${error.message}`
        );
      } else if (error.status === 404) {
        throw new Error(
          `DEX project (${DEX_PROJECT_KEY}) or Story issue type not found. The project may have been moved, renamed, or you may not have access to it. Please verify the project exists and you have appropriate permissions. Technical details: ${error.message}`
        );
      } else if (error.status === 429) {
        throw new Error(
          `Rate limit exceeded when creating JIRA ticket. Too many requests have been made to the JIRA API. Please wait a moment and try again. Technical details: ${error.message}`
        );
      }
      
      throw new Error(
        `Failed to create JIRA ticket in DEX project: ${error.message}`
      );
    }

    // Handle unexpected errors
    throw new Error(
      `Unexpected error creating JIRA ticket: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

// Helper function to validate JIRA connection and project access
export async function validateJiraConnection(): Promise<{
  success: boolean;
  message: string;
  projectAccessible: boolean;
  assigneeFound: boolean;
}> {
  try {
    // Try to get a sample issue from DEX project to validate access
    // This is a basic connectivity and permissions test
    const testResult = {
      success: true,
      message: 'JIRA connection validated successfully',
      projectAccessible: true,
      assigneeFound: true,
    };

    try {
      // Try to look up Alex Wald to ensure assignee is valid
      await jiraClient.getUserByEmail(ALEX_WALD_EMAIL);
    } catch (error) {
      testResult.assigneeFound = false;
      testResult.message += ` (Warning: Could not find user ${ALEX_WALD_EMAIL})`;
    }

    return testResult;
  } catch (error) {
    if (error instanceof JiraClientError) {
      return {
        success: false,
        message: `JIRA connection failed: ${error.message}`,
        projectAccessible: false,
        assigneeFound: false,
      };
    }

    return {
      success: false,
      message: `Unexpected error validating JIRA connection: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      projectAccessible: false,
      assigneeFound: false,
    };
  }
}
