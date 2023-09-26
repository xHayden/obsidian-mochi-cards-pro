import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, MarkdownRenderer, MarkdownRenderChild, SuggestModal } from 'obsidian';
import { encode } from 'base-64';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mochiApiKey: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mochiApiKey: ''
}

class MochiAPI {
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

	getCards(id: string) {
		fetch(`${this.baseURL}/cards/`, { method: 'GET', headers: this.headers }).then((response: Response) => {
			response.json().then((json: any) => {
				console.log(json)
			})
		});
	}

	createCard(name: string, content: string, deckId: string) {
		const card = {
			"content": "test",
			"deck-id": deckId,
			"template-id": "cpyLWrBm",
			"fields": {
				"name": { 
					"id": "name",
					"value": name
				},
				"V72yjxYh": {
					"id": "V72yjxYh",
					"value": content
				}
			}
		}
		fetch(`${this.baseURL}/cards`, { method: 'POST', headers: this.headers, body: JSON.stringify(card)}).then((response: Response) => {
			response.json().then((json: any) => {
				console.log(json)
			})
		});
	}

	async getDecks(): Promise<MochiDeck[]> {
		const res: Response = await fetch(`${this.baseURL}/decks`, { method: 'GET', headers: this.headers });
		const json = await res.json();
		return json.docs;
	}
}

export default class MochiPlugin extends Plugin {
	settings: MyPluginSettings;
	async onload() {
		await this.loadSettings();
		const mochi = new MochiAPI(this.settings.mochiApiKey);
		// 

		// // This creates an icon in the left ribbon.
		// const ribbonIconEl = this.addRibbonIcon('copy-plus', 'Sample Plugin', (evt: MouseEvent) => {
		// 	// Called when the user clicks the icon.
		// 	new Notice('Under Construction');
		// });
		// // Perform additional things with the ribbon
		// ribbonIconEl.addClass('my-plugin-ribbon-class');

		// this.registerMarkdownCodeBlockProcessor("mochi", (source, el, ctx) => {
		// 	const mochiBody = el.createDiv();
		// 	const mochiContent = mochiBody.createSpan(source);
		// 	ctx.addChild(mochiBody);

		// 	console.log(source, el, ctx);
		// });

		// class MochiRenderer extends MarkdownRenderChild {
		// 	constructor(el: HTMLElement, src: string) {
		// 		super(el);
		// 	}

		// 	onload() {
				
		// 	}
		// }

		this.addCommand({
			id: 'export-card-from-text',
			name: 'Export Mochi Cards from Text',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				let selection = editor.getSelection();
				mochi.getDecks().then(decks => {
					new SelectDeckModal(this.app, decks, this.loadData, this.saveData, (id: string) => {
						while (selection.contains("\n# ")) {
							const frontStart = selection.indexOf("#");
							selection = selection.substring(frontStart + 1).trim();
							const newLineIndex = selection.indexOf("\n");
							const name = selection.substring(0, newLineIndex);
							let content = selection.substring(newLineIndex + 1).trim();
							if (content.contains("\n# ")) {
								selection = content.substring(content.indexOf("\n# "));
								content = content.substring(0, content.indexOf("\n#"));
							}
							mochi.createCard(name, content, id);
							
						}
						// editor.replaceSelection(
						// 	`\`\`\`mochi\n${selection}\n\`\`\`\n`
						// )
						// const test = view.containerEl.createEl("div", { text: "Test" });
					}).open();
				})
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

type MochiDeck = {
	id: string
	name: string
	sort: number
	"parent-id": string
	"template-id"?: string
	"card-width"?: number
}

class SelectDeckModal extends SuggestModal<MochiDeck> {
	decks: MochiDeck[]
	saveData: any
	loadData: any
	callback: any

	constructor(app: any, decks: MochiDeck[], loadData: any, saveData: any, callback: any) {
		super(app);
		this.decks = decks;
		this.saveData = saveData;
		this.loadData = loadData;
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

	// Perform action on the selected suggestion.
	async onChooseSuggestion(deck: MochiDeck, evt: MouseEvent | KeyboardEvent) {
		new Notice(`Selected ${deck.name}`);
		this.callback(deck.id);
		const data = await this.loadData();
		data.selectedDeck = deck;
		await this.saveData(data);
	}
}

class SettingTab extends PluginSettingTab {
	plugin: MochiPlugin;

	constructor(app: App, plugin: MochiPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Mochi Card Creator Settings'});

		new Setting(containerEl)
			.setName('Mochi API Key')
			.setDesc('API Key from app.mochi.cards')
			.addText(text => text
				.setPlaceholder('Enter your api key')
				.setValue(this.plugin.settings.mochiApiKey)
				.onChange(async (value) => {
					this.plugin.settings.mochiApiKey = value;
					await this.plugin.saveSettings();
				}));
	}
}
