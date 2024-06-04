import { MarkdownView, Editor, Notice } from "obsidian";
import MochiPlugin from "src/main";
import { MochiAPI } from "src/mochi";
import { MochiCard, MochiTemplate } from "src/mochi/types";
import { SelectDeckModal, SelectTemplateModal } from "src/modals";

// Get card info from a text selection
function getNextCardInfo(selection: string, delimiter = "#") {    
    const frontStart = selection.indexOf(delimiter);
    selection = selection.substring(frontStart + delimiter.length).trim();
    // take only the string following the delimiter

    const newLineIndex = selection.indexOf("\n");
    // find where the title of the card ends, indicated by a newline

    const name = selection.substring(0, newLineIndex).trim();
    let content = selection.substring(newLineIndex + 1).trim();
    // content after the name
    if (content.contains(`\n${delimiter} `)) {
        // if ends with a new delimiter at some point, make the content only the content up to the delimiter
        selection = content.substring(content.indexOf(`\n${delimiter} `));
        content = content.substring(0, content.indexOf(`\n${delimiter}`));
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


const ExportCardFromText = async (editor: Editor, view: MarkdownView, plugin: MochiPlugin, mochi: MochiAPI, templates: MochiTemplate[], delimiter = "#") => {
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

        new SelectDeckModal(plugin, decks, mochi, async (deckId: string) => {
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
           
                while (selection.includes(`\n${delimiter} `) || selection.trimStart().startsWith(delimiter)) {
                // if we hit a new line with a delimiter, implying a new card, or the first character in our selection is a delimiter to qualify
                // the case without the newline

                cardCounter++;
                const { name, content, updatedSelection } = getNextCardInfo(selection, delimiter);
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