# Optimizely Opal JIRA Cloud Tool

An Optimizely Opal tool for creating JIRA tickets in the DEX project with automatic assignment to Alex Wald.

## Overview

This tool integrates with Optimizely Opal to enable users to create JIRA tickets directly from the Opal interface. The tool is configured specifically for the DEX project with the following hardcoded settings:

- **Project**: DEX (Key: DHK)
- **Issue Type**: Story
- **Assignee**: Alex Wald (alex.wald@optimizely.com)

## Features

- 🎫 **One-Click Ticket Creation**: Create JIRA tickets with just a summary and optional description
- 🔒 **Secure Authentication**: Bearer token protection for tool execution
- 🏥 **Health Monitoring**: Built-in health check and connection validation
- 📋 **Rich Tool Description**: Comprehensive tool documentation in Opal interface
- ⚡ **Fast Response**: Optimized for quick ticket creation and feedback
- 🛡️ **Error Handling**: Detailed error messages with troubleshooting guidance

## Project Structure

```
/
├── api/
│   ├── index.ts           # Main Express app and Opal tool definition
│   ├── jira-client.ts     # JIRA Cloud API client with authentication
│   └── jira-tools.ts      # Business logic for ticket creation
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vercel.json            # Vercel deployment configuration
├── .env.example           # Environment variables template
├── .gitignore             # Git ignore patterns
└── README.md              # This file
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```bash
# Bearer token for securing tool execution endpoints
BEARER_TOKEN=your-secret-token-here

# Base URL for your deployed application
BASE_URL=https://your-project-name.vercel.app

# JIRA Cloud configuration
JIRA_API_TOKEN=your-jira-api-token-here
JIRA_BASE_URL=https://jira.sso.episerver.net
JIRA_USER_EMAIL=your-email@optimizely.com
```

### 3. Local Development

```bash
# Run with Vercel dev for accurate production simulation
vercel dev
```

The server will start on `http://localhost:3000` with the following endpoints:

- **Discovery**: `GET /discovery` (public, for Opal registration)
- **Health Check**: `GET /health` (public, shows JIRA connection status)
- **Create Ticket**: `POST /tools/create_jira_ticket` (protected, requires bearer token)

## API Endpoints

### Discovery Endpoint
```http
GET /discovery
```

Returns the tool manifest for Opal registration. This endpoint is public and required by Opal.

### Health Check
```http
GET /health
```

Returns service health status and JIRA connection validation:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "jira": {
    "success": true,
    "message": "JIRA connection validated successfully",
    "projectAccessible": true,
    "assigneeFound": true
  }
}
```

### Create JIRA Ticket
```http
POST /tools/create_jira_ticket
Authorization: Bearer your-secret-token
Content-Type: application/json

{
  "summary": "Fix login bug on mobile app",
  "description": "Users are unable to log in on iOS devices after the latest update"
}
```

**Response:**
```json
{
  "success": true,
  "ticketKey": "DHK-123",
  "ticketUrl": "https://jira.sso.episerver.net/browse/DHK-123",
  "ticketId": "10001",
  "message": "Successfully created JIRA ticket DHK-123 in DEX project. The ticket has been assigned to Alex Wald and can be viewed at https://jira.sso.episerver.net/browse/DHK-123"
}
```

## Testing

### Test Discovery Endpoint
```bash
curl http://localhost:3000/discovery
```

### Test Health Check
```bash
curl http://localhost:3000/health
```

### Test Ticket Creation
```bash
curl -X POST http://localhost:3000/tools/create_jira_ticket \
  -H "Authorization: Bearer your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{
    "summary": "Test ticket from Opal tool",
    "description": "This is a test ticket created via the Optimizely Opal integration"
  }'
```

## Deployment to Vercel

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/alexwaldOptimizely/alex-wald-tools.git
git push -u origin main
```

### 2. Deploy to Vercel
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard:
   - `BEARER_TOKEN`
   - `BASE_URL`
   - `JIRA_API_TOKEN`
   - `JIRA_BASE_URL`
   - `JIRA_USER_EMAIL`

### 3. Register in Optimizely Opal
1. Go to [Opal Tools](https://opal.optimizely.com/tools)
2. Click "Add tool registry"
3. Fill in:
   - **Registry Name**: `jira_dex_integration`
   - **Discovery URL**: `https://your-project.vercel.app/discovery`
   - **Bearer Token**: `your-secret-token`

## Configuration

### Hardcoded Values
The following values are hardcoded in the implementation:

```typescript
// In api/jira-tools.ts
const DEX_PROJECT_KEY = 'DHK';
const DEFAULT_ISSUE_TYPE = 'Story';
const ALEX_WALD_EMAIL = 'alex.wald@optimizely.com';
```

### Environment Variables
- `BEARER_TOKEN`: Secret token for protecting tool execution endpoints
- `BASE_URL`: Full URL of your deployed application
- `JIRA_API_TOKEN`: JIRA Cloud API token for authentication
- `JIRA_BASE_URL`: Base URL of your JIRA instance
- `JIRA_USER_EMAIL`: Email address for JIRA API authentication

## Error Handling

The tool provides comprehensive error handling with specific guidance:

- **400 Bad Request**: Invalid field data or project configuration issues
- **401 Unauthorized**: API token authentication failures
- **403 Forbidden**: Insufficient permissions for project or user assignment
- **404 Not Found**: Project or issue type not found
- **429 Rate Limited**: Too many API requests

Each error includes:
- Clear description of the problem
- Possible causes
- Troubleshooting steps
- Technical details for debugging

## Security

- API tokens stored as environment variables
- Bearer token authentication for tool endpoints
- Input validation and sanitization
- No sensitive data in logs or error messages
- Secure HTTPS communication with JIRA Cloud

## Support

For issues or questions:
1. Check the health endpoint for JIRA connectivity
2. Verify environment variables are correctly set
3. Ensure JIRA permissions are properly configured
4. Contact Alex Wald for DEX project access issues
