import { Notice, Plugin, SuggestModal } from "obsidian";
import { MochiDeck, MochiParentDeck } from "src/mochi/types";
import { MochiAPI } from "src/mochi";

export class SelectDeckModal extends SuggestModal<MochiParentDeck> {
	plugin: Plugin
	decks: MochiDeck[]
	callback: (deckId: string) => void
	mochi: MochiAPI

	constructor(plugin: Plugin, decks: MochiDeck[], mochi: MochiAPI, callback: (deckId: string) => void) {
		super(plugin.app);
		this.plugin = plugin;
		this.decks = decks;
		this.callback = callback;
		this.mochi = mochi;
	}

	async getSuggestions(query: string): Promise<MochiParentDeck[]> {
		const results: MochiParentDeck[] = [];
		for (const deck of this.decks) {
			const suggestionList = await this.getRecursiveSuggestionList(deck);
			const suggestion = suggestionList.map(d => d.name).join(" > ");
	
			if ((suggestion + deck.name).toLowerCase().includes(query.toLowerCase())) {
				results.push({deck, parents: suggestionList});
			}
		}
	
		return results;
	}
	

	async getRecursiveSuggestionList(deck: MochiDeck, decks: MochiDeck[] = []): Promise<MochiDeck[]> {
		if (deck["parent-id"]) {
			const parentDeck = this.decks.find(d => d.id == deck["parent-id"]);
			if (parentDeck) {
				decks.push(parentDeck);
				return this.getRecursiveSuggestionList(parentDeck, decks);
			} else {
				console.log("Could not fetch parent deck, if the relative path is wrong the parent deck either does not exist or is archived/deleted.");
			}
		}
		return decks;
	}
	

	renderSuggestion(parentDeck: MochiParentDeck, el: HTMLElement) {
		let path = parentDeck.deck.name;
		const parent = el.createEl("div", { text: parentDeck.deck.name });
		const childPath = parent.createEl("div", { cls: "card__desc" });
		
		if (parentDeck.parents && parentDeck.parents.length) {
			path = parentDeck.parents.map(d => d.name).join(" > ") + " > " + path;
			childPath.createEl("small", { text: path, cls: "card__path" });
		}

		childPath.createEl("small", { text: parentDeck.deck.id, cls: "card__id" });
	}

	async onChooseSuggestion(parentDeck: MochiParentDeck, evt: MouseEvent | KeyboardEvent) {
		new Notice(`Selected ${parentDeck.deck.name}`);
		this.callback(parentDeck.deck.id);
		const data = await this.plugin.loadData();
		data.selectedDeck = parentDeck.deck;
		await this.plugin.saveData(data);
	}
}