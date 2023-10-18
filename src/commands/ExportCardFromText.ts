import { MarkdownView, Editor, Notice } from "obsidian";
import MochiPlugin from "src/main";
import { MochiAPI } from "src/mochi";
import { MochiCard, MochiTemplate } from "src/mochi/types";
import { SelectDeckModal, SelectTemplateModal } from "src/modals";

function getNextCardInfo(selection: string) {
    const frontStart = selection.indexOf("#");
    selection = selection.substring(frontStart + 1).trim();
    const newLineIndex = selection.indexOf("\n");
    const name = selection.substring(0, newLineIndex).trim();
    let content = selection.substring(newLineIndex + 1).trim();
    
    if (content.contains("\n# ")) {
        selection = content.substring(content.indexOf("\n# "));
        content = content.substring(0, content.indexOf("\n#"));
    }
    
    return { name, content, updatedSelection: selection };
}

function processCard(mochi: MochiAPI, cards: MochiCard[], name: string, content: string, deckId: string, template: MochiTemplate) {
    const updateCard = cards.find(card => card.name.toLowerCase().trim() == name.toLowerCase());
    if (updateCard && (content !== updateCard.content || name !== updateCard.name)) { // check if either the name or content has changed
        mochi.updateCard(updateCard.id, name, content, deckId, template);
        return true;
    } else if (!updateCard) {
        mochi.createCard(name, content, deckId, template); // if the card doesn't exist, create it
        return true;
    }
    return false;
}


const ExportCardFromText = async (editor: Editor, view: MarkdownView, plugin: MochiPlugin, mochi: MochiAPI, templates: MochiTemplate[]) => {
    try {
        let selection = editor.getSelection();
        if (!templates || !plugin.settings.template || plugin.settings.template == '') {
            new Notice('No template selected.');
            new SelectTemplateModal(plugin, templates, (id: string) => {
                plugin.settings.template = id;
                plugin.saveSettings();
            }).open();
            return;
        }
        
        const decks = await mochi.getDecks();

        new SelectDeckModal(plugin, decks, async (deckId: string) => {
            const cards: MochiCard[] = await mochi.getCards(deckId);
            let cardCounter = 0;
            let modifiedCounter = 0;
            const template = templates.find(temp => temp.id == plugin.settings.template);
            if (!template) {
                new Notice("Error getting template");
                return;
            }

            /*
                Go along, scanning the selection to see what can be turned into a card. Markdown styles of Obsidian
                and Mochi are inconsistent so probably will need revision.
            */
            while (selection.includes("\n# ") || selection.charAt(0) === "#") {
                cardCounter++;
                const { name, content, updatedSelection } = getNextCardInfo(selection);
                selection = updatedSelection;

                if (processCard(mochi, cards, name, content, deckId, template)) {
                    modifiedCounter++;
                }
            }

            new Notice(`Modified/created ${modifiedCounter} out of ${cardCounter} cards`);
        }).open();
    } catch (e) {
        new Notice(e);
    }
}

export default ExportCardFromText;