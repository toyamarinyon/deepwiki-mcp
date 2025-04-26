#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Window } from "happy-dom";
import { z } from "zod";

// Create server instance
const server = new McpServer({
	name: "deepwiki-mcp",
	description: "Retrieves deepwiki for OSS repositories.",
	version: "0.0.3",
	capabilities: {
		resources: {},
		tools: {},
	},
});

server.tool(
	"get-repository-overview",
	"Get the overview for the given repository(owner/repository)",
	{
		owner: z.string().describe("Owner of the repository"),
		repo: z.string().describe("Repository name to get the overview"),
	},
	async ({ owner, repo }) => {
		const url = `https://deepwiki.com/${owner}/${repo}`;
		const response = await fetch(url, {
			headers: {
				contentType: "text/html",
			},
		});
		const html = await response.text();
		const window = new Window({ url });
		const document = window.document;
		document.body.innerHTML = html;
		const contentElement = document.querySelector(
			".prose-custom.prose-custom-md.prose-custom-gray",
		);

		if (contentElement) {
			// Remove all SVG elements
			const svgElements = contentElement.querySelectorAll("svg");
			svgElements.forEach((svg) => svg.remove());

			// Remove all class attributes
			const elementsWithClass = contentElement.querySelectorAll("[class]");
			elementsWithClass.forEach((el) => el.removeAttribute("class"));

			return {
				content: [
					{
						type: "text",
						text: contentElement.innerHTML,
					},
				],
			};
		}
		return {
			content: [
				{
					type: "text",
					text: `Documentation not found for ${owner}/${repo}.`,
				},
			],
		};
	},
);

async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("deepwik MCP Server running on stdio");
}

main().catch((error) => {
	console.error("Fatal error in main():", error);
	process.exit(1);
});
