import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting, SuggestModal } from 'obsidian';
import { encode } from 'base-64';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mochiApiKey: string;
	template: string;
}

interface MochiDeck {
	id: string
	name: string
	sort: number
	"parent-id": string
	"template-id"?: string
	"card-width"?: number
}

interface MochiTemplate {
	id: string
	name: string
	content: string
	pos: string
	fields: MochiFields
}

interface MochiFields {
	name: MochiNameField
	[key: string]: MochiField;
}

type MochiNameField = MochiField & {
	id: "name";
  } & ({ value: string } | { name: string });

interface MochiField {
	id: string
	name: string
	pos: string;
	content: string
	options?: MochiFieldOptions;
}

interface MochiFieldOptions {
	"multi-line?": boolean;
  }

const DEFAULT_SETTINGS: MyPluginSettings = {
	mochiApiKey: '',
	template: ''
}

interface MochiCard extends MochiTemplate {
	references?: any[]
	reviews?: any[]
	"created-at": Date
	tags?: any[]
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

	getCards(deckId: string, callback: any) {
		fetch(`${this.baseURL}/cards/?deck-id=${deckId}`, { method: 'GET', headers: this.headers }).then((response: Response) => {
			response.json().then((data: any) => {
				callback(data.docs.filter((card: any) => !card["trashed?"]));
			})
		});
	}

	updateCard(cardId: string, name: string, content: string, deckId: string, template: MochiTemplate | undefined) {
		if (!template) {
			throw new Error("Template does not exist!");
		}
		const card: any = {
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
			throw new Error("Template invalid! Needs one field after name.");
		}
		card.fields[firstFieldName] = {
			"id": firstFieldName,
			"value": content
		}
		fetch(`${this.baseURL}/cards/${cardId}`, { method: 'POST', headers: this.headers, body: JSON.stringify(card)}).then((response: Response) => {
			response.json().then((json: any) => {
				console.log(`update card ${cardId}`, json)
			})
		});
	}

	createCard(name: string, content: string, deckId: string, template: MochiTemplate | undefined) {
		if (!template) {
			throw new Error("Template does not exist!");
		}
		const card: any = {
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
			throw new Error("Template invalid! Needs one field after name.");
		}
		card.fields[firstFieldName] = {
			"id": firstFieldName,
			"value": content
		}
		fetch(`${this.baseURL}/cards`, { method: 'POST', headers: this.headers, body: JSON.stringify(card)}).then((response: Response) => {
			response.json().then((json: any) => {
				console.log(`create card ${name}`, json)
			})
		});
	}

	async getDecks(): Promise<MochiDeck[]> {
		const res: Response = await fetch(`${this.baseURL}/decks`, { method: 'GET', headers: this.headers });
		const json = await res.json();
		return json.docs;
	}

	async getTemplates(): Promise<MochiTemplate[]> {
		const res: Response = await fetch(`${this.baseURL}/templates`, { method: 'GET', headers: this.headers });
		const json = await res.json();
		return json.docs;
	}
}

export default class MochiPlugin extends Plugin {
	settings: MyPluginSettings;
	async onload() {
		await this.loadSettings();
		const mochi = new MochiAPI(this.settings.mochiApiKey);

		const templates = await mochi.getTemplates();
		const data = await this.loadData();
		data.templates = templates;
		await this.saveData(data)

		if (!this.settings.mochiApiKey) {
			new Notice("Please provide an API key in the Plugin Settings to use Mochi Cards Pro");
		}

		this.addCommand({
			id: 'select-template-mochi',
			name: 'Select Card Template',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				new SelectTemplateModal(this.app, templates, this.loadData, this.saveData, (id: string) => {
					this.settings.template = id;
					data.template = id;
					this.saveData(data)
				}).open();
			}
		})

		this.addCommand({
			id: 'export-card-from-text',
			name: 'Export Cards from Text',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				let selection = editor.getSelection();
				if (!templates || !this.settings.template || this.settings.template == '') {
					new Notice('No template selected.');
					new SelectTemplateModal(this.app, templates, this.loadData, this.saveData, (id: string) => {
						this.settings.template = id;
						data.template = id;
						this.saveData(data)
					}).open();
					return;
				}
				mochi.getDecks().then(decks => {
					new SelectDeckModal(this.app, decks, this.loadData, this.saveData, (deckId: string) => {
						mochi.getCards(deckId, (cards: MochiCard[]) => {
							let counter = 0;
							console.log(selection);
							while (selection.contains("\n# ") || selection.at(0) == "#") {
								counter++;
								const frontStart = selection.indexOf("#");
								selection = selection.substring(frontStart + 1).trim();
								const newLineIndex = selection.indexOf("\n");
								const name = selection.substring(0, newLineIndex);
								let content = selection.substring(newLineIndex + 1).trim();
								if (content.contains("\n# ")) {
									selection = content.substring(content.indexOf("\n# "));
									content = content.substring(0, content.indexOf("\n#"));
								}
								const updateCard = cards.find(card => card.name == name);
								if (updateCard) {
									mochi.updateCard(updateCard.id, name, content, deckId, templates.find(temp => temp.id == this.settings.template));
									new Notice(`Modified: ${name}`);
								} else {
									mochi.createCard(name, content, deckId, templates.find(temp => temp.id == this.settings.template));
									new Notice(`Created new card: ${name}`);
								}
							}
							new Notice(`Modified/created ${counter} cards`);
						})
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

class SelectTemplateModal extends SuggestModal<MochiTemplate> {
	templates: MochiTemplate[]
	saveData: any
	loadData: any
	callback: any

	constructor(app: any, templates: MochiTemplate[], loadData: any, saveData: any, callback: any) {
		super(app);	
		this.templates = templates;
		this.saveData = saveData;
		this.loadData = loadData;
		this.callback = callback;
	}

	getSuggestions(query: string): MochiTemplate[] {
		return this.templates.filter((template: MochiTemplate) => {
			return template.name.toLowerCase().includes(query.toLowerCase());
		})
	}

	renderSuggestion(template: MochiTemplate, el: HTMLElement) {
		el.createEl("div", { text: template.name });
		el.createEl("small", { text: template.id });
	}

	async onChooseSuggestion(template: MochiTemplate, evt: MouseEvent | KeyboardEvent) {
		new Notice(`Selected ${template.id}`);
		this.callback(template.id);
		const data = await this.loadData();
		data.template = template.id;
		await this.saveData(data);
	}	
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
