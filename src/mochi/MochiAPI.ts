import { encode } from 'base-64';
import { Notice } from 'obsidian';
import { MochiCard, MochiCardBuilder, MochiDeck, MochiTemplate, PaginateResponse } from './types';

export class MochiAPI {
	baseURL: string
	apiKey: string
	headers: Headers

	constructor(apiKey: string) {
		this.baseURL = "https://app.mochi.cards/api";
		this.headers = new Headers();
		this.apiKey = apiKey;
		this.headers.set('Authorization', 'Basic ' + encode(this.apiKey + ":"));
		this.headers.set('Content-Type', 'application/json');
	}

	async getCards(deckId: string, bookmark: string | undefined = undefined, allCards: MochiCard[] = []): Promise<MochiCard[]> {
		try {
			let url = `${this.baseURL}/cards/?deck-id=${deckId}&limit=100`;
			if (bookmark) {
				url += `&bookmark=${bookmark}`;
			}
			const response = await fetch(url, { method: 'GET', headers: this.headers });
			const data: PaginateResponse<MochiCard> = await response.json();
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
		try {
			const response = await fetch(`${this.baseURL}/cards/${cardId}`, { method: 'POST', headers: this.headers, body: JSON.stringify(card)})
			const json = await response.json();
			console.log(`update card ${cardId}`, json);
		} catch (e) {
			console.error(e);
		}
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
		try {
			const response = await fetch(`${this.baseURL}/cards`, { method: 'POST', headers: this.headers, body: JSON.stringify(card)});
			const json = await response.json();
			console.log(`create card ${name}`, json);
		} catch (e) {
			console.error(e);
		}	
	}

	async getDecks(): Promise<MochiDeck[]> {
		try {
			const res: Response = await fetch(`${this.baseURL}/decks`, { method: 'GET', headers: this.headers });
			const json = await res.json();
			return json.docs.filter((deck: MochiDeck) => !deck["trashed?"] && !deck["archived?"]);
		} catch (e) {
			console.error(e);
			return [];
		}
	}

	async getTemplates(): Promise<MochiTemplate[]> {
		try {
			const res: Response = await fetch(`${this.baseURL}/templates`, { method: 'GET', headers: this.headers });
			const json = await res.json();
			return json.docs.filter((template: MochiTemplate) => !template["trashed?"] && !template["archived?"]);
		} catch (e) {
			console.log(e);
			return [];
		}
	}
}