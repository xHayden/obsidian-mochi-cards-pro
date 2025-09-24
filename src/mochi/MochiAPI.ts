import { encode } from 'base-64';
import { Notice, RequestUrlResponse, requestUrl } from 'obsidian';
import { MochiCard, MochiCardBuilder, MochiDeck, MochiTemplate, PaginateResponse } from './types';

export class MochiAPI {
	baseURL: string
	apiKey: string
	headers: Record<string, string>

	constructor(apiKey: string) {
		this.baseURL = "https://app.mochi.cards/api";
		this.apiKey = apiKey;
		this.headers = {
			'Authorization': 'Basic ' + encode(this.apiKey + ":"),
			'Content-Type': 'application/json'
		};
	}

	private async sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	private async makeRequestWithRetry<T>(requestFn: () => Promise<T>, maxRetries = 3): Promise<T | undefined> {
		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				const result = await requestFn();
				return result;
			} catch (e: any) {
				if (e?.status === 429 && attempt < maxRetries) {
					const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff with max 5s
					console.warn(`Rate limit hit, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
					await this.sleep(delay);
					continue;
				}
				console.error(e);
				if (attempt === maxRetries) {
					new Notice(`Failed to complete request after ${maxRetries} attempts`);
				}
			}
		}
		return undefined;
	}

	async getCards(deckId: string, bookmark: string | undefined = undefined, allCards: MochiCard[] = []): Promise<MochiCard[]> {
		try {
			let url = `${this.baseURL}/cards/?deck-id=${deckId}&limit=100`;
			if (bookmark) {
				url += `&bookmark=${bookmark}`;
			}
			const res: RequestUrlResponse = await requestUrl({ url, method: 'GET', headers: this.headers });
			const data: PaginateResponse<MochiCard> = res.json;
			allCards.push(...data.docs.filter((card: MochiCard) => !card["trashed?"]));
			// If a bookmark is returned, there are more cards to fetch
			if (data.bookmark == "nil") {
				console.warn(`Deck ${deckId} does not exist or has no data`);
			}
			if (data.bookmark && data.bookmark !== "nil" && bookmark !== data.bookmark) {
				// Recursive call to fetch more cards
				return await this.getCards(deckId, data.bookmark, allCards);
			}
	
			return allCards;
		}
		catch (e) {
			console.error(e)
			return [];
		}

	}

	async updateCard(cardId: string, name: string, content: string, deckId: string, template: MochiTemplate | undefined) {
		if (!template) {
			new Notice("Template does not exist!");
			return;
		}
		const card: MochiCardBuilder = {
			"content": content,
			"deck-id": deckId,
			"template-id": template.id,
			"fields": {
				"name": {
					"id": "name",
					"value": name
				},
			}
		}
		const firstFieldName = Object.keys(template.fields).find((field) => field != "name");
		if (!firstFieldName) {
			new Notice("Template invalid! Needs one field after name.");
			return;
		}
		card.fields[firstFieldName] = {
			"id": firstFieldName,
			"value": content
		}

		await this.makeRequestWithRetry(async () => {
			const res = await requestUrl({url: `${this.baseURL}/cards/${cardId}`, method: 'POST', headers: this.headers, body: JSON.stringify(card)})
			const json = res.json;
			console.log(`update card ${cardId}`, json);
			return res;
		});
	}

	async createCard(name: string, content: string, deckId: string, template: MochiTemplate | undefined) {
		if (!template) {
			new Notice("Template does not exist!");
			return;
		}
		const card: MochiCardBuilder = {
			"content": "test",
			"deck-id": deckId,
			"template-id": template.id,
			"fields": {
				"name": {
					"id": "name",
					"value": name
				},
			}
		}
		const firstFieldName = Object.keys(template.fields).find((field) => field != "name");
		if (!firstFieldName) {
			new Notice("Template invalid! Needs one field after name.");
			return;
		}
		card.fields[firstFieldName] = {
			"id": firstFieldName,
			"value": content
		}

		await this.makeRequestWithRetry(async () => {
			const res: RequestUrlResponse = await requestUrl({ url: `${this.baseURL}/cards`, method: 'POST', headers: this.headers, body: JSON.stringify(card) });
			const json = res.json;
			console.log(`create card ${name}`, json);
			return res;
		});
	}

	async getDecks(): Promise<MochiDeck[]> {
		try {
			const res: RequestUrlResponse = await requestUrl({ url:`${this.baseURL}/decks`, method: 'GET', headers: this.headers });
			const json = res.json;
			return json.docs.filter((deck: MochiDeck) => !deck["trashed?"] && !deck["archived?"]);
		} catch (e) {
			console.error(e);
			return [];
		}
	}

	async getDeck(deckId: string): Promise<MochiDeck | undefined> {
		try {
			const res: RequestUrlResponse = await requestUrl({ url:`${this.baseURL}/decks/${deckId}`, method: 'GET', headers: this.headers });
			const json = res.json;
			return json
		} catch (e) {
			console.error(e);
			return;
		}
	}

	async getTemplates(): Promise<MochiTemplate[]> {
		try {
			const res: RequestUrlResponse = await requestUrl({ url: `${this.baseURL}/templates`, method: 'GET', headers: this.headers });
			const json = res.json;
			return json.docs.filter((template: MochiTemplate) => !template["trashed?"] && !template["archived?"]);
		} catch (e) {
			console.log(e);
			return [];
		}
	}
}