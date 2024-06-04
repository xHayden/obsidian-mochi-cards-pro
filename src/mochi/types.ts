export interface MochiDeck {
    id: string;
    name: string;
    sort?: number;
    "parent-id"?: string;
    "template-id"?: string;
    "cards-view"?: "list" | "grid" | "note" | "column";
    "show-sides?"?: boolean;
    "sort-by-direction"?: boolean;
    "review-reverse?"?: boolean;
    "trashed?"?: boolean;
    "archived?"?: boolean;
}

export interface MochiParentDeck {
    deck: MochiDeck,
    parents?: MochiDeck[]
}

export type MochiDeckBuilder = Omit<MochiDeck, "id" | "trashed?" | "archived?">

export interface MochiTemplate {
    id: string;
    name: string;
    content: string;
    pos?: string;
    fields: MochiTemplateFields;
    "trashed?"?: boolean;
    "archived?"?: boolean;
}

export interface MochiCard extends Omit<MochiTemplate, "fields"> {
    "deck-id": string;
    "template-id"?: string;
    "review-reverse?"?: boolean;
    "created-at": Date;
    fields: MochiCardFields;
    attachments?: MochiCardAttachment[];
}

export type MochiCardBuilder = Omit<MochiCard, "created-at" | "id" | "name" | "trashed?" | "archived?">

export interface MochiTemplateFields {
    name: MochiTemplateField;
    [fieldName: string]: MochiTemplateField;
}

export interface MochiCardFields {
    name: MochiCardField;
    [fieldName: string]: MochiCardField;
}

export interface MochiCardAttachment {
    "file-name": string;
    "content-type": string; // MIME type
    data: "string" // base64 encoded data
}

export interface MochiCardField {
    id: string;
    value: string;
}

export interface MochiTemplateField {
    id: string;
    name: string;
    pos: string;
    options?: MochiFieldOptions;
}

export interface MochiFieldOptions {
    "multi-line?": boolean;
}

export type MochiDocument<T> = T;

export interface PaginateResponse<T> {
    "bookmark": string,
    "docs": MochiDocument<T>[]
}