import { Notice, Plugin, SuggestModal } from "obsidian";
import { MochiTemplate } from "src/mochi/types";

export class SelectTemplateModal extends SuggestModal<MochiTemplate> {
	templates: MochiTemplate[]
	plugin: Plugin
	callback: (templateId: string) => void

	constructor(plugin: Plugin, templates: MochiTemplate[], callback: (templateId: string) => void) {
		super(plugin.app);	
		this.templates = templates;
		this.plugin = plugin;
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
		const data = await this.plugin.loadData();
		data.template = template.id;
		await this.plugin.saveData(data);
	}	
}