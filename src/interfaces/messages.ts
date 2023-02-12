import { NostrKind } from "./enums.ts";

export interface NostrFilters {
    ids?: Array<string>;
    authors?: Array<string>;
    kinds?: Array<NostrKind>;
    "#e"?: Array<string>;
    "#p"?: Array<string>;
    since?: number;
    until?: number;
    limit?: number;
}

export interface NostrEvent {
    id: string;
    pubkey: string;
    created_at: number;
    kind: NostrKind;
    tags: Array<any>;
    content: string;
    sig: string;
}

export interface NostrRequest {
    subscription_id: string;
    filters: Array<NostrFilters>;
}

export interface NostrClose {
    subscription_id: string;
}