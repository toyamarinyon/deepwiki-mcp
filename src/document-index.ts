import type { Document } from "happy-dom";

interface DocumentMetadata {
	lastUpdated: string;
	version: string;
}

interface DocumentItem {
	id: string;
	title: string;
	path: string;
	children?: DocumentItem[];
}

interface DocumentIndex {
	metadata: DocumentMetadata;
	items: DocumentItem[];
}

export function createDocumentIndex(doc: Document): DocumentIndex {
	const lastUpdatedText =
		doc.querySelector("div > div > div")?.textContent || "";
	const lastUpdatedMatch = lastUpdatedText.match(
		/Last updated: (\d+ \w+ \d+) \(([a-f0-9]+)\)/,
	);

	const metadata: DocumentMetadata = {
		lastUpdated: lastUpdatedMatch?.[1] || "",
		version: lastUpdatedMatch?.[2] || "",
	};

	const linkElements = Array.from(doc.querySelectorAll("ul li a, ul a"));

	const allItems: DocumentItem[] = linkElements.map((link) => {
		const path = link.getAttribute("href") || "";
		const idMatch = path.match(/\/([0-9.]+)-/);
		const id = idMatch?.[1] || "";
		const title = link.textContent || "";

		return {
			id,
			title,
			path,
			children: [],
		};
	});

	const topLevelItems: DocumentItem[] = [];
	const itemsMap: { [key: string]: DocumentItem } = {};

	allItems.forEach((item) => {
		if (item.id) {
			itemsMap[item.id] = item;
		}
	});

	allItems.forEach((item) => {
		if (!item.id) return;

		const idParts = item.id.split(".");

		if (idParts.length === 1) {
			topLevelItems.push(item);
		} else {
			const parentId = idParts.slice(0, -1).join(".");
			const parent = itemsMap[parentId];

			if (parent) {
				if (!parent.children) {
					parent.children = [];
				}
				parent.children.push(item);
			}
		}
	});

	const cleanupEmptyChildren = (items: DocumentItem[]) => {
		items.forEach((item) => {
			if (item.children && item.children.length === 0) {
				delete item.children;
			} else if (item.children) {
				cleanupEmptyChildren(item.children);
			}
		});
	};

	cleanupEmptyChildren(topLevelItems);

	return {
		metadata,
		items: topLevelItems,
	};
}
