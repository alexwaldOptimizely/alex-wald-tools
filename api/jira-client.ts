import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description?: any;
    status: {
      name: string;
      id: string;
    };
    assignee?: {
      displayName: string;
      emailAddress: string;
      accountId: string;
    };
    reporter: {
      displayName: string;
      emailAddress: string;
      accountId: string;
    };
    issuetype: {
      name: string;
      id: string;
    };
    project: {
      key: string;
      name: string;
      id: string;
    };
    created: string;
    updated: string;
  };
}

export interface CreateIssueRequest {
  fields: {
    project: {
      key: string;
    };
    summary: string;
    description?: {
      type: string;
      version: number;
      content: Array<{
        type: string;
        content: Array<{
          text: string;
          type: string;
        }>;
      }>;
    };
    issuetype: {
      name: string;
    };
    assignee?: {
      accountId: string;
    };
  };
}

export interface CreateIssueResponse {
  id: string;
  key: string;
  self: string;
}

export class JiraClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'JiraClientError';
  }
}

class JiraClient {
  private client: any;
  private baseUrl: string;
  private userEmail: string;
  private apiToken: string;

  constructor() {
    this.baseUrl = process.env.JIRA_BASE_URL || '';
    this.userEmail = process.env.JIRA_EMAIL || '';
    this.apiToken = process.env.JIRA_API_TOKEN || '';

    if (!this.baseUrl || !this.userEmail || !this.apiToken) {
      throw new Error(
        'Missing required JIRA configuration. Please set JIRA_BASE_URL, JIRA_EMAIL, and JIRA_API_TOKEN environment variables.'
      );
    }

    // Create base64 encoded credentials for Basic Auth
    const credentials = Buffer.from(`${this.userEmail}:${this.apiToken}`).toString('base64');

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    // Add response interceptor for better error handling
    this.client.interceptors.response.use(
      (response: any) => response,
      (error: any) => {
        if (error.response) {
          const errorData = error.response.data as any;
          const errorMessage = errorData?.message || errorData?.errorMessages?.[0] || error.message;
          throw new JiraClientError(
            errorMessage,
            error.response.status,
            error.response.data
          );
        } else if (error.request) {
          throw new JiraClientError(
            'Network error: Unable to reach JIRA server',
            0
          );
        } else {
          throw new JiraClientError(error.message, 0);
        }
      }
    );
  }

  async getIssue(issueKey: string): Promise<JiraIssue> {
    try {
      const response = await this.client.get(`/rest/api/3/issue/${issueKey}`);
      return response.data;
    } catch (error) {
      if (error instanceof JiraClientError) {
        throw error;
      }
      throw new JiraClientError(`Failed to get issue ${issueKey}: ${error}`, 0);
    }
  }

  async createIssue(issueData: CreateIssueRequest): Promise<CreateIssueResponse> {
    try {
      const response = await this.client.post('/rest/api/3/issue', issueData);
      return response.data;
    } catch (error) {
      if (error instanceof JiraClientError) {
        throw error;
      }
      throw new JiraClientError(`Failed to create issue: ${error}`, 0);
    }
  }

  async updateIssue(issueKey: string, updateData: any): Promise<void> {
    try {
      await this.client.put(`/rest/api/3/issue/${issueKey}`, updateData);
    } catch (error) {
      if (error instanceof JiraClientError) {
        throw error;
      }
      throw new JiraClientError(`Failed to update issue ${issueKey}: ${error}`, 0);
    }
  }

  // Helper method to get user account ID by email (needed for assignee)
  async getUserByEmail(email: string): Promise<{ accountId: string; displayName: string }> {
    try {
      const response = await this.client.get(`/rest/api/3/user/search?query=${encodeURIComponent(email)}`);
      const users = response.data;
      
      if (!users || users.length === 0) {
        throw new JiraClientError(`User with email ${email} not found`, 404);
      }

      return {
        accountId: users[0].accountId,
        displayName: users[0].displayName,
      };
    } catch (error) {
      if (error instanceof JiraClientError) {
        throw error;
      }
      throw new JiraClientError(`Failed to find user ${email}: ${error}`, 0);
    }
  }

  // Helper method to convert plain text description to Atlassian Document Format (ADF)
  private createDescriptionADF(text: string) {
    return {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [
            {
              text: text,
              type: "text"
            }
          ]
        }
      ]
    };
  }

  // Convenience method for creating issues with plain text description
  async createIssueWithText(
    projectKey: string,
    issueType: string,
    summary: string,
    description?: string,
    assigneeEmail?: string
  ): Promise<CreateIssueResponse> {
    const issueData: CreateIssueRequest = {
      fields: {
        project: {
          key: projectKey,
        },
        summary,
        issuetype: {
          name: issueType,
        },
      },
    };

    // Add description if provided
    if (description) {
      issueData.fields.description = this.createDescriptionADF(description);
    }

    // Add assignee if email provided
    if (assigneeEmail) {
      try {
        const user = await this.getUserByEmail(assigneeEmail);
        issueData.fields.assignee = {
          accountId: user.accountId,
        };
      } catch (error) {
        // If user lookup fails, we'll still create the ticket without assignee
        console.warn(`Warning: Could not find user ${assigneeEmail}, creating ticket without assignee`);
      }
    }

    return this.createIssue(issueData);
  }
}

// Export a singleton instance
export const jiraClient = new JiraClient();
