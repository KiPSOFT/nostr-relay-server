import config from '../config/index.ts';
import { NostrMessageType } from '../interfaces/enums.ts';
import { NostrEvent, NostrFilters } from '../interfaces/messages.ts';
import Logger from './log.ts';
import * as secp from "https://deno.land/x/secp256k1@1.7.0/mod.ts";
import Socket from './socket.ts';
import DB from './db.ts';

export default class Message {
    private ws: Socket;
    private data: Array<any> = [];
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
                    const event = this.data[1] as NostrEvent;
                    if (this.checkMessageRules(event)) {
                        await this.storeEvent(event);
                        return event;
                    }
                } catch (err: any) {
                    this.ws.sendNotice(err.message, err.stack);
                }
                return null;
            case NostrMessageType.REQUEST:
                try {
                    const subscriptionId = this.data[1];
                    const data = this.data.splice(2);
                    const filters: Array<NostrFilters> = [];
                    for (const filter of data) {
                        const tmp: any = {};
                        for (const key in filter) {
                            if (key.substring(0, 1) === '#') {
                                if (!tmp.tags) {
                                    tmp.tags = [];
                                }
                                tmp.tags.push({
                                    tagName: key.substring(1),
                                    value: filter[key]
                                });
                            } else {
                                tmp[key] = filter[key];
                            }
                        }
                        filters.push(tmp as NostrFilters);
                    }
                    this.ws.addSubscription(subscriptionId, filters);
                } catch (err: any) {
                    this.ws.sendNotice(err.message, err.stack);    
                }
                break;
            case NostrMessageType.CLOSE:
                this.ws.close(this.data[1]);
                break;
        }
        return null;
    }

    checkMessageRules(event: NostrEvent) {
        if (!this.ws.lastEvent) {
            return true;
        }
        if (this.ws.floodMessageCounter === 9) {
            this.logger?.debug('Flood message limit is reached.');
            this.ws.disconnect();
            return false;
        }
        const messagePerSecondLimit = parseInt(config.relay.messagePerSecond);
        // const correctTime = parseInt(this.ws.lastEvent.created_at.toString()) + messagePerSecondLimit;
        if (event.pubkey === this.ws.lastEvent.pubkey && event.created_at === this.ws.lastEvent.created_at) {
            this.ws.floodMessageCounter += 1;
            throw new Error(`You must send the message after ${messagePerSecondLimit} seconds later.`);
        }
        if (this.ws.lastEvent.sig === event.sig) {
            this.ws.floodMessageCounter += 1;
            throw new Error(`Flood messages are not accepted.`);
        }
        return true;
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
        this.ws.lastEvent = event;
        this.ws.floodMessageCounter = 0;
        this.ws.emit('Event', event);
    }

}