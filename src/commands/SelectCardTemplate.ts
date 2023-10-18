import { Editor, MarkdownView } from "obsidian";
import MochiPlugin from "src/main";
import { MochiTemplate } from "src/mochi/types";
import { SelectTemplateModal } from "src/modals";

export const SelectCardTemplate = (editor: Editor, view: MarkdownView, plugin: MochiPlugin, templates: MochiTemplate[]) => {
    new SelectTemplateModal(plugin, templates, (id: string) => {
        plugin.settings.template = id;
        plugin.saveSettings();
    }).open();
}