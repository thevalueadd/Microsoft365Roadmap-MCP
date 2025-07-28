# Microsoft365Roadmap-MCP
Talk (AI) to the Microsoft 365 Public Roadmap RSS as an MCP server.
# Microsoft Roadmap MCP Server

An MCP (Model Context Protocol) server that provides access to Microsoft's M365 roadmap RSS feed for use with Claude Desktop.

## Project Structure

```
microsoft-roadmap-mcp-server/
├── package.json
├── README.md
└── src/
    └── index.js
```

## Setup Instructions

### 1. Create the Project Directory

```bash
mkdir microsoft-roadmap-mcp-server
cd microsoft-roadmap-mcp-server
```

### 2. Initialize the Project

Create the `src` directory:
```bash
mkdir src
```

Copy the provided `package.json` and `src/index.js` files into their respective locations.

### 3. Install Dependencies

```bash
npm install
```

### 4. Test the Server (Optional)

You can test the server locally:
```bash
npm start
```

The server will start and wait for MCP protocol messages on stdin/stdout.

### 5. Configure Claude Desktop

Edit your Claude Desktop configuration file:

**On macOS:**
```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**On Windows:**
```bash
code %APPDATA%\Claude\claude_desktop_config.json
```

Add the following configuration:

```json
{
  "mcpServers": {
    "microsoft-roadmap": {
      "command": "node",
      "args": ["/absolute/path/to/your/microsoft-roadmap-mcp-server/src/index.js"],
      "env": {}
    }
  }
}
```

**Important:** Replace `/absolute/path/to/your/microsoft-roadmap-mcp-server/` with the actual absolute path to your project directory.

To get the absolute path:
- **macOS/Linux:** Run `pwd` in your project directory
- **Windows:** Run `cd` in your project directory

### 6. Restart Claude Desktop

Close and reopen Claude Desktop to load the new MCP server.

## Available Tools

The server provides four tools for interacting with the Microsoft roadmap:

### 1. `get_roadmap_items`
- **Description:** Get all Microsoft roadmap items from the RSS feed
- **Parameters:**
  - `limit` (optional): Maximum number of items to return (default: 50)

### 2. `search_roadmap`
- **Description:** Search Microsoft roadmap items by keyword
- **Parameters:**
  - `query` (required): Search query to find in titles and descriptions
  - `limit` (optional): Maximum number of results to return (default: 20)

### 3. `get_roadmap_by_category`
- **Description:** Get Microsoft roadmap items filtered by category
- **Parameters:**
  - `category` (required): Category to filter by (e.g., "Microsoft Teams", "SharePoint", "Exchange")
  - `limit` (optional): Maximum number of results to return (default: 20)

### 4. `get_recent_roadmap_items`
- **Description:** Get the most recent Microsoft roadmap items
- **Parameters:**
  - `days` (optional): Number of days back to look for recent items (default: 30)
  - `limit` (optional): Maximum number of results to return (default: 20)

## Usage Examples

Once configured, you can use these commands in Claude Desktop:

- "Show me the latest Microsoft roadmap items"
- "Search for Teams features in the roadmap"
- "What's new with SharePoint in the last 30 days?"
- "Find roadmap items related to security"

## Features

- **Caching:** RSS data is cached for 5 minutes to improve performance
- **Rich Information:** Each roadmap item includes title, description, category, publication date, and link
- **Flexible Search:** Search across titles, descriptions, and categories
- **Recent Items:** Filter by publication date to see what's new
- **Error Handling:** Graceful error handling for network issues

## Troubleshooting

### Server Not Loading
1. Check that the path in `claude_desktop_config.json` is correct and absolute
2. Ensure Node.js is installed and accessible
3. Verify all dependencies are installed (`npm install`)
4. Check Claude Desktop logs for error messages

### No Data Returned
1. Verify internet connection
2. Check if the Microsoft RSS feed is accessible: https://www.microsoft.com/releasecommunications/api/v2/m365/rss
3. Restart Claude Desktop to refresh the MCP connection

### Permission Issues
- On macOS/Linux, ensure the script has execute permissions:
  ```bash
  chmod +x src/index.js
  ```

## Development

To run in development mode with auto-restart:
```bash
npm run dev
```
