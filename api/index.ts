import {
  ToolsService,
  tool,
  ParameterType,
} from "@optimizely-opal/opal-tools-sdk";
import express from "express";
import dotenv from "dotenv";
import { createJiraTicket, validateJiraConnection } from "./jira-tools";
import type { CreateJiraTicketParams } from "./jira-tools";

dotenv.config();

const app = express();
app.use(express.json());

const toolsService = new ToolsService(app);
const bearerToken = process.env.BEARER_TOKEN;

// Add a root route to provide a status message
app.get("/", (req, res) => {
  res.json({
    message: "Optimizely Opal JIRA Cloud Tool is running",
    status: "active",
    endpoints: {
      discovery: "/discovery",
      createTicket: "/tools/create_jira_ticket"
    },
    project: "DEX (DHK)",
    assignee: "Alex Wald",
    issueType: "Story"
  });
});

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const jiraStatus = await validateJiraConnection();
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      jira: jiraStatus,
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Define the JIRA ticket creation tool function
async function createJiraTicketTool(params: CreateJiraTicketParams) {
  return await createJiraTicket(params);
}

// Register the tool with Opal SDK
tool({
  name: "create_jira_ticket",
  description: `🎫 JIRA TICKET CREATOR - Create tickets in the Petsmart DTO project

📋 WHAT IT DOES:
• Creates JIRA tickets in the Petsmart DTO project
• Automatically assigns tickets to oruhland@petsmart.com
• Sets issue type to "Epic"
• Converts Opal markdown to JIRA format
• Returns ticket URL for immediate access

✨ FEATURES:
• Instant ticket creation with one request
• Automatic project and issue type configuration
• Markdown conversion from Opal to JIRA format
• Full ticket URL for easy navigation
• Comprehensive error handling with helpful messages

📝 REQUIRED INFORMATION:
• Summary: Clear, descriptive title for the ticket
• Description: Optional detailed description of the work needed

💡 USAGE EXAMPLES:
• "Fix login bug on mobile app"
• "Implement new user dashboard feature"
• "Update API documentation for v2.0"

⚠️ VALIDATION:
• Summary is required and cannot be empty
• Summary must be 255 characters or less
• Description must be 32,767 characters or less
• Provides detailed error messages for troubleshooting

🔗 OUTPUT:
Returns ticket key (e.g., DTO-123), full URL, and success confirmation`,
  parameters: [
    {
      name: "summary",
      type: ParameterType.String,
      description:
        "The ticket summary/title - a clear, concise description of the work to be done",
      required: true,
    },
    {
      name: "description",
      type: ParameterType.String,
      description:
        "Optional detailed description of the ticket - provide context, requirements, or additional information",
      required: false,
    },
  ],
})(createJiraTicketTool);

// Apply authentication middleware only to tool execution endpoints
if (bearerToken) {
  app.use("/tools/create_jira_ticket", (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${bearerToken}`) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Valid bearer token required for tool execution",
      });
    }
    next();
  });
} else {
  console.warn(
    "WARNING: No BEARER_TOKEN configured. Tool endpoints will be unprotected."
  );
}

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", error);
  
  res.status(500).json({
    error: "Internal Server Error",
    message: "An unexpected error occurred while processing your request",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Endpoint ${req.method} ${req.path} not found`,
    availableEndpoints: {
      discovery: "GET /discovery",
      health: "GET /health",
      createTicket: "POST /tools/create_jira_ticket",
    },
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Opal JIRA Tool server running on port ${PORT}`);
  console.log(`📋 Discovery endpoint: http://localhost:${PORT}/discovery`);
  console.log(`🎫 Create ticket endpoint: http://localhost:${PORT}/tools/create_jira_ticket`);
  console.log(`💡 Project: Petsmart (DTO), Assignee: oruhland@petsmart.com, Issue Type: Epic`);
});

export default app;
