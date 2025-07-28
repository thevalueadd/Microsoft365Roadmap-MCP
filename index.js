#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import Parser from 'rss-parser';
import fetch from 'node-fetch';

class MicrosoftRoadmapServer {
  constructor() {
    this.server = new Server(
      {
        name: 'microsoft-roadmap-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.rssParser = new Parser({
      customFields: {
        item: ['category', 'pubDate', 'description']
      }
    });

    this.rssUrl = 'https://www.microsoft.com/releasecommunications/api/v2/m365/rss';
    this.cachedData = null;
    this.lastFetch = null;
    this.cacheTime = 5 * 60 * 1000; // 5 minutes cache

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_roadmap_items',
            description: 'Get all Microsoft roadmap items from the RSS feed',
            inputSchema: {
              type: 'object',
              properties: {
                limit: {
                  type: 'number',
                  description: 'Maximum number of items to return (default: 50)',
                  default: 50
                }
              }
            }
          },
          {
            name: 'search_roadmap',
            description: 'Search Microsoft roadmap items by keyword',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query to find in titles and descriptions'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results to return (default: 20)',
                  default: 20
                }
              },
              required: ['query']
            }
          },
          {
            name: 'get_roadmap_by_category',
            description: 'Get Microsoft roadmap items filtered by category',
            inputSchema: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  description: 'Category to filter by (e.g., "Microsoft Teams", "SharePoint", "Exchange")'
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results to return (default: 20)',
                  default: 20
                }
              },
              required: ['category']
            }
          },
          {
            name: 'get_recent_roadmap_items',
            description: 'Get the most recent Microsoft roadmap items',
            inputSchema: {
              type: 'object',
              properties: {
                days: {
                  type: 'number',
                  description: 'Number of days back to look for recent items (default: 30)',
                  default: 30
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results to return (default: 20)',
                  default: 20
                }
              }
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_roadmap_items':
            return await this.getRoadmapItems(args?.limit || 50);
          
          case 'search_roadmap':
            return await this.searchRoadmap(args.query, args?.limit || 20);
          
          case 'get_roadmap_by_category':
            return await this.getRoadmapByCategory(args.category, args?.limit || 20);
          
          case 'get_recent_roadmap_items':
            return await this.getRecentRoadmapItems(args?.days || 30, args?.limit || 20);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }],
          isError: true
        };
      }
    });
  }

  async fetchRSSData() {
    const now = Date.now();
    
    // Return cached data if it's still fresh
    if (this.cachedData && this.lastFetch && (now - this.lastFetch) < this.cacheTime) {
      return this.cachedData;
    }

    try {
      const response = await fetch(this.rssUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const rssText = await response.text();
      const feed = await this.rssParser.parseString(rssText);
      
      this.cachedData = feed;
      this.lastFetch = now;
      
      return feed;
    } catch (error) {
      throw new Error(`Failed to fetch RSS data: ${error.message}`);
    }
  }

  async getRoadmapItems(limit = 50) {
    const feed = await this.fetchRSSData();
    const items = feed.items.slice(0, limit);
    
    const formattedItems = items.map(item => ({
      title: item.title,
      description: item.description || item.contentSnippet || '',
      link: item.link,
      pubDate: item.pubDate,
      category: item.category || 'General'
    }));

    return {
      content: [{
        type: 'text',
        text: `Found ${formattedItems.length} Microsoft roadmap items:\n\n` +
              formattedItems.map((item, index) => 
                `${index + 1}. **${item.title}**\n` +
                `   Category: ${item.category}\n` +
                `   Published: ${item.pubDate}\n` +
                `   Description: ${item.description.substring(0, 200)}${item.description.length > 200 ? '...' : ''}\n` +
                `   Link: ${item.link}\n`
              ).join('\n')
      }]
    };
  }

  async searchRoadmap(query, limit = 20) {
    const feed = await this.fetchRSSData();
    const searchTerm = query.toLowerCase();
    
    const filteredItems = feed.items.filter(item => 
      item.title?.toLowerCase().includes(searchTerm) ||
      item.description?.toLowerCase().includes(searchTerm) ||
      item.contentSnippet?.toLowerCase().includes(searchTerm)
    ).slice(0, limit);

    if (filteredItems.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No roadmap items found matching "${query}"`
        }]
      };
    }

    const formattedItems = filteredItems.map(item => ({
      title: item.title,
      description: item.description || item.contentSnippet || '',
      link: item.link,
      pubDate: item.pubDate,
      category: item.category || 'General'
    }));

    return {
      content: [{
        type: 'text',
        text: `Found ${formattedItems.length} roadmap items matching "${query}":\n\n` +
              formattedItems.map((item, index) => 
                `${index + 1}. **${item.title}**\n` +
                `   Category: ${item.category}\n` +
                `   Published: ${item.pubDate}\n` +
                `   Description: ${item.description.substring(0, 200)}${item.description.length > 200 ? '...' : ''}\n` +
                `   Link: ${item.link}\n`
              ).join('\n')
      }]
    };
  }

  async getRoadmapByCategory(category, limit = 20) {
    const feed = await this.fetchRSSData();
    const categoryLower = category.toLowerCase();
    
    const filteredItems = feed.items.filter(item => 
      item.category?.toLowerCase().includes(categoryLower) ||
      item.title?.toLowerCase().includes(categoryLower)
    ).slice(0, limit);

    if (filteredItems.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No roadmap items found for category "${category}"`
        }]
      };
    }

    const formattedItems = filteredItems.map(item => ({
      title: item.title,
      description: item.description || item.contentSnippet || '',
      link: item.link,
      pubDate: item.pubDate,
      category: item.category || 'General'
    }));

    return {
      content: [{
        type: 'text',
        text: `Found ${formattedItems.length} roadmap items for category "${category}":\n\n` +
              formattedItems.map((item, index) => 
                `${index + 1}. **${item.title}**\n` +
                `   Category: ${item.category}\n` +
                `   Published: ${item.pubDate}\n` +
                `   Description: ${item.description.substring(0, 200)}${item.description.length > 200 ? '...' : ''}\n` +
                `   Link: ${item.link}\n`
              ).join('\n')
      }]
    };
  }

  async getRecentRoadmapItems(days = 30, limit = 20) {
    const feed = await this.fetchRSSData();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentItems = feed.items.filter(item => {
      if (!item.pubDate) return false;
      const itemDate = new Date(item.pubDate);
      return itemDate >= cutoffDate;
    }).slice(0, limit);

    if (recentItems.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `No roadmap items found from the last ${days} days`
        }]
      };
    }

    const formattedItems = recentItems.map(item => ({
      title: item.title,
      description: item.description || item.contentSnippet || '',
      link: item.link,
      pubDate: item.pubDate,
      category: item.category || 'General'
    }));

    return {
      content: [{
        type: 'text',
        text: `Found ${formattedItems.length} recent roadmap items (last ${days} days):\n\n` +
              formattedItems.map((item, index) => 
                `${index + 1}. **${item.title}**\n` +
                `   Category: ${item.category}\n` +
                `   Published: ${item.pubDate}\n` +
                `   Description: ${item.description.substring(0, 200)}${item.description.length > 200 ? '...' : ''}\n` +
                `   Link: ${item.link}\n`
              ).join('\n')
      }]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Microsoft Roadmap MCP server running on stdio');
  }
}

const server = new MicrosoftRoadmapServer();
server.run().catch(console.error);