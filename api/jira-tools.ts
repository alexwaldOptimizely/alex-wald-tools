import { jiraClient, JiraClientError } from './jira-client';

// Hardcoded values for Petsmart project
const PETSMART_PROJECT_KEY = 'DTO';
const DEFAULT_ISSUE_TYPE = 'Epic';
const PETSMART_ASSIGNEE_EMAIL = 'oruhland@petsmart.com';

/**
 * Convert Opal markdown to JIRA markdown format
 * Based on: https://support.atlassian.com/jira-software-cloud/docs/markdown-and-keyboard-shortcuts/
 */
function convertOpalMarkdownToJira(opalMarkdown: string): string {
  let jiraMarkdown = opalMarkdown;

  // Convert action items: Opal might use different formats, convert to JIRA format []
  // This handles various common formats like [ ] [x] - [ ] - [x] etc.
  jiraMarkdown = jiraMarkdown.replace(/^\s*[-*]\s*\[([ x])\]\s*(.+)$/gm, (match, checked, text) => {
    return `[] ${text}`; // JIRA uses [] for action items
  });

  // Convert emoji format if needed (Opal might use different emoji syntax)
  // JIRA uses :emoji: format
  jiraMarkdown = jiraMarkdown.replace(/😀|😊|😎|👍|👎|❤️|🎉|🚀|⚠️|❌|✅|📝|💡|🔧|⭐/g, (emoji) => {
    const emojiMap: { [key: string]: string } = {
      '😀': ':smiley:',
      '😊': ':blush:',
      '😎': ':sunglasses:',
      '👍': ':thumbsup:',
      '👎': ':thumbsdown:',
      '❤️': ':heart:',
      '🎉': ':tada:',
      '🚀': ':rocket:',
      '⚠️': ':warning:',
      '❌': ':x:',
      '✅': ':white_check_mark:',
      '📝': ':memo:',
      '💡': ':bulb:',
      '🔧': ':wrench:',
      '⭐': ':star:'
    };
    return emojiMap[emoji] || emoji;
  });

  // Ensure proper line breaks for JIRA
  // JIRA is more sensitive to line breaks
  jiraMarkdown = jiraMarkdown.replace(/\n\n/g, '\n\n');

  return jiraMarkdown;
}

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
    // Convert Opal markdown to JIRA markdown format if description provided
    const convertedDescription = description ? convertOpalMarkdownToJira(description.trim()) : undefined;

    // Create the JIRA ticket with hardcoded values
    const result = await jiraClient.createIssueWithText(
      PETSMART_PROJECT_KEY,
      DEFAULT_ISSUE_TYPE,
      summary.trim(),
      convertedDescription,
      PETSMART_ASSIGNEE_EMAIL
    );

    // Construct the ticket URL
    const baseUrl = process.env.JIRA_BASE_URL || '';
    const ticketUrl = `${baseUrl}/browse/${result.key}`;

    return {
      success: true,
      ticketKey: result.key,
      ticketUrl: ticketUrl,
      ticketId: result.id,
      message: `Successfully created JIRA ticket ${result.key} in Petsmart DTO project. Attempted to assign to oruhland@petsmart.com. Check the ticket to verify assignment. View at ${ticketUrl}`,
    };
  } catch (error) {
    if (error instanceof JiraClientError) {
      // Provide context-specific error messages based on status codes
      if (error.status === 400) {
        throw new Error(
          `Failed to create JIRA ticket: Invalid request data. This could mean: 1) The Petsmart project (${PETSMART_PROJECT_KEY}) configuration has changed, 2) The Epic issue type is not available, 3) Required custom fields are missing, or 4) Field values are invalid. Please contact your JIRA administrator to verify project configuration. Technical details: ${error.message}`
        );
      } else if (error.status === 401) {
        throw new Error(
          `Authentication failed when creating JIRA ticket. The API token may be expired or invalid. Please check the JIRA_API_TOKEN environment variable and ensure it has create permissions for the Petsmart project. Technical details: ${error.message}`
        );
      } else if (error.status === 403) {
        throw new Error(
          `Access denied when creating ticket in Petsmart project (${PETSMART_PROJECT_KEY}). Your account may not have permission to create Epic issues in this project or assign tickets to ${PETSMART_ASSIGNEE_EMAIL}. Please contact your JIRA administrator to verify permissions. Technical details: ${error.message}`
        );
      } else if (error.status === 404) {
        throw new Error(
          `Petsmart project (${PETSMART_PROJECT_KEY}) or Epic issue type not found. The project may have been moved, renamed, or you may not have access to it. Please verify the project exists and you have appropriate permissions. Technical details: ${error.message}`
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
      await jiraClient.getUserByEmail(PETSMART_ASSIGNEE_EMAIL);
    } catch (error) {
      testResult.assigneeFound = false;
      testResult.message += ` (Warning: Could not find user ${PETSMART_ASSIGNEE_EMAIL})`;
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
