import { Notice, Plugin, SuggestModal } from "obsidian";
import { MochiDeck } from "src/mochi/types";

export class SelectDeckModal extends SuggestModal<MochiDeck> {
	plugin: Plugin
	decks: MochiDeck[]
	callback: (deckId: string) => void

	constructor(plugin: Plugin, decks: MochiDeck[], callback: (deckId: string) => void) {
		super(plugin.app);
		this.plugin = plugin;
		this.decks = decks;
		this.callback = callback;
	}

	getSuggestions(query: string): MochiDeck[] {
		return this.decks.filter((deck: MochiDeck) => {
			return deck.name.toLowerCase().includes(query.toLowerCase());
		})
	}

	renderSuggestion(deck: MochiDeck, el: HTMLElement) {
		el.createEl("div", { text: deck.name });
		el.createEl("small", { text: deck.id });
	}

	async onChooseSuggestion(deck: MochiDeck, evt: MouseEvent | KeyboardEvent) {
		new Notice(`Selected ${deck.name}`);
		this.callback(deck.id);
		const data = await this.plugin.loadData();
		data.selectedDeck = deck;
		await this.plugin.saveData(data);
	}
}