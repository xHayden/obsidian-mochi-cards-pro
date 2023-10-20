import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { MochiAPI } from 'src/mochi';
import ExportCardFromText from './commands/ExportCardFromText';
import { SelectCardTemplate } from './commands';
import { MochiCardsPluginSettings } from './types';

const DEFAULT_SETTINGS: MochiCardsPluginSettings = {
	mochiApiKey: '',
	template: ''
}

export default class MochiPlugin extends Plugin {
	settings: MochiCardsPluginSettings;
	async onload() {
		await this.loadSettings();
		
		if (!this.settings.mochiApiKey) {
			new Notice("Please provide an API key in the Plugin Settings to use Mochi Cards Pro");
		} else {
			this.init();
		}

		this.addSettingTab(new SettingTab(this.app, this));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async init() {
		if (!this.settings.mochiApiKey) {
			new Notice("Please provide an API key in the Plugin Settings to use Mochi Cards Pro");
			return;
		}

		const mochi = new MochiAPI(this.settings.mochiApiKey);
		const templates = await mochi.getTemplates();
		this.settings.templates = templates;
		this.saveSettings();
	
		this.addCommand({
			id: 'select-template-mochi',
			name: 'Select Card Template',
			editorCallback: (editor: Editor, view: MarkdownView) => SelectCardTemplate(editor, view, this, templates)
		})
	
		this.addCommand({
			id: 'export-card-from-text',
			name: 'Export Cards from Text',
			editorCallback: (editor: Editor, view: MarkdownView) => 
				ExportCardFromText(editor, view, this, mochi, templates)
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
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Mochi API Key')
			.setDesc('API Key from app.mochi.cards')
			.addText(text => text
				.setPlaceholder('Enter your api key')
				.setValue(this.plugin.settings.mochiApiKey)
				.onChange(async (value) => {
					this.plugin.settings.mochiApiKey = value;
					await this.plugin.saveSettings();
					await this.plugin.init();
				}));
	}
}
