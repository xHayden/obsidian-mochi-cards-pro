import {
	App,
	Editor,
	MarkdownView,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";
import { MochiAPI } from "src/mochi";
import ExportCardFromText from "./commands/ExportCardFromText";
import { SelectCardTemplate } from "./commands";
import { MochiCardsPluginSettings } from "./types";

const DEFAULT_SETTINGS: MochiCardsPluginSettings = {
	mochiApiKey: "",
	template: "",
	delimiter: "#",
};

export default class MochiPlugin extends Plugin {
	settings: MochiCardsPluginSettings;
	async onload() {
		await this.loadSettings();

		if (!this.settings.mochiApiKey) {
			new Notice(
				"Please provide an API key in the Plugin Settings to use Mochi Cards Pro"
			);
		} else if (!this.settings.delimiter) {
			new Notice("A delimiter is required in the Plugin Settings to use Mochi Cards Pro");
		} else {
			this.init();
		}

		this.addSettingTab(new SettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async init() {
		if (!this.settings.mochiApiKey) {
			new Notice(
				"Please provide an API key in the Plugin Settings to use Mochi Cards Pro"
			);
			return;
		}

		const mochi = new MochiAPI(this.settings.mochiApiKey);
		const templates = await mochi.getTemplates();
		this.settings.templates = templates;
		this.saveSettings();

		this.addCommand({
			id: "select-template-mochi",
			name: "Select Card Template",
			editorCallback: (editor: Editor, view: MarkdownView) =>
				SelectCardTemplate(editor, view, this, templates),
		});

		this.addCommand({
			id: "export-card-from-text",
			name: "Export Cards from Text",
			editorCallback: (editor: Editor, view: MarkdownView) =>
				ExportCardFromText(editor, view, this, mochi, templates, this.settings.delimiter),
		});
	}
}

class SettingTab extends PluginSettingTab {
	plugin: MochiPlugin;

	constructor(app: App, plugin: MochiPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Mochi API Key")
			.setDesc("API Key from app.mochi.cards found in 'Account settings'.")
			.addText((text) =>
				text
					.setPlaceholder("Enter your api key")
					.setValue(this.plugin.settings.mochiApiKey)
					.onChange(async (value) => {
						this.plugin.settings.mochiApiKey = value;
				
						await this.plugin.saveSettings();
						await this.plugin.init();
					})
			);

		const delimiterDescFragment = document.createDocumentFragment();
		const delimiterDescText = `
		This indicates the start of a new card.
		Ex: to create a card with the title 'My Card' and the '#' as the delimiter, the first line of the card would be '# My Card' with the content starting on the next line.
		`;
		const descLines = delimiterDescText.trim().split('\n');
		// Create the first line with a border below
		const firstLine = document.createElement('div');
		firstLine.textContent = descLines[0];
		firstLine.style.paddingBottom = "0.25rem";
		// firstLine.style.width = "max-content";
		// firstLine.style.borderBottom = "1px solid gray";
		delimiterDescFragment.appendChild(firstLine);

		// Create and append the rest of the lines
		descLines.slice(1).forEach(line => {
			const lineDiv = document.createElement('div');
			lineDiv.textContent = line;
			lineDiv.style.fontStyle = "italic";
			delimiterDescFragment.appendChild(lineDiv);
			delimiterDescFragment.appendChild(document.createElement('br'));
		});

		new Setting(containerEl)
			.setName("Card Delimiter")
			.setDesc(delimiterDescFragment)
			.addText((text) =>
				text
					.setPlaceholder("Enter a delimiter")
					.setValue(this.plugin.settings.delimiter)
					.onChange(async (value) => {
						this.plugin.settings.delimiter = value;
						await this.plugin.saveSettings();
						await this.plugin.init();
					})
			);
	}
}
