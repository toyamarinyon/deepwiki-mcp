#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Window } from "happy-dom";
import { z } from "zod";
import { createDocumentIndex } from "./document-index.js";

const server = new McpServer({
	name: "deepwiki-mcp",
	description: "Retrieves deepwiki for OSS repositories.",
	version: "0.0.5",
	capabilities: {
		resources: {},
		tools: {},
	},
});

server.tool(
	"get-repository-document",
	"Get the overview for the given repository(owner/repository)",
	{
		path: z
			.string()
			.describe("Path to the document provided by get-repository-index"),
	},
	async ({ path }) => {
		const url = `https://deepwiki.com${path}`;
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
			for (const svg of svgElements) {
				svg.remove();
			}

			// Remove all class attributes
			const elementsWithClass = contentElement.querySelectorAll("[class]");
			for (const el of elementsWithClass) {
				el.removeAttribute("class");
			}

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
					text: `Documentation not found for ${path}.`,
				},
			],
		};
	},
);

server.tool(
	"get-respository-index",
	"Required first step: get the indexes for the given repository(owner/repository). Must be called before using `get-repository-document`.",
	{
		owner: z.string().describe("Owner of the repository"),
		repo: z.string().describe("Repository name to get the indexes"),
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
			".container-wrapper .container .md\\:w-64",
		);
		if (contentElement) {
			const documentIndex = createDocumentIndex(document);
			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(documentIndex),
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
	console.error("deepwiki MCP Server running on stdio");
}

main().catch((error) => {
	console.error("Fatal error in main():", error);
	process.exit(1);
});
