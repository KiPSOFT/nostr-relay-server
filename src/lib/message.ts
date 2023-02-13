import { NostrMessageType } from '../interfaces/enums.ts';
import { NostrEvent, NostrFilters } from '../interfaces/messages.ts';
import Logger from './log.ts';
import * as secp from "https://deno.land/x/secp256k1@1.7.0/mod.ts";
import Socket from './socket.ts';
import DB from './db.ts';

export default class Message {
    private ws: Socket;
    private data: Array<string> = [];
    private logger: Logger|undefined;
    private type: NostrMessageType|undefined;
    private db: DB;
    
    constructor(_ws: Socket, _data: any, _logger: Logger, _db: DB) {
        this.ws = _ws;
        this.db = _db;
        this.logger = _logger;
        this.logger.debug(`Incoming data; ${_data}`);
        try {
            this.data = JSON.parse(_data);
        } catch (err: any) {
            this.ws.sendNotice(err.message, err.stack);
        }
    }

    async isValidEvent(event: NostrEvent): Promise<boolean> {
        return await secp.schnorr.verify(event.sig, event.id, event.pubkey);
    }

    async parse() {
        if (!Object.values(NostrMessageType).includes(this.data[0] as NostrMessageType)) {
            return this.ws.sendNotice('Message type is incorrect', 'Message type is incorrect;' + this.data[0]);
        }
        this.type = this.data[0] as NostrMessageType;
        this.logger?.debug(`Message type is ${this.data[0]}`);
        switch (this.type) {
            case NostrMessageType.EVENT:
                try {
                    const event = JSON.parse(this.data[1]) as NostrEvent;
                    await this.storeEvent(event);
                    return event;
                } catch (err: any) {
                    this.ws.sendNotice(err.message, err.stack);    
                }
                break;
            case NostrMessageType.REQUEST:
                try {
                    const subscriptionId = this.data[1];
                    const filters = JSON.parse(this.data[2]) as Array<NostrFilters>;
                    this.ws.addSubscription(subscriptionId, filters);
                } catch (err: any) {
                    this.ws.sendNotice(err.message, err.stack);    
                }
                break;
        }
        return null;
    }

    async storeEvent(event: NostrEvent) {
        if (!event) {
            return;
        }
        if (!this.isValidEvent(event)) {
            return this.ws.sendNotice('Event sign is incorrect.', 'Event sign is incorrect.');
        }
        this.db.createEvent(event);
        this.ws.sendOk(event.id);
        this.ws.emit('Event', event);
    }

}