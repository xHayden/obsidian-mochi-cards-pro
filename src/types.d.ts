import { MochiTemplate } from "./mochi";

export interface MochiCardsPluginSettings {
    mochiApiKey: string;
    template: string;
    delimiter: string;
    templates?: MochiTemplate[];
}