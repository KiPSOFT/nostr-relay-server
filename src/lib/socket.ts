import EventEmitter from "https://deno.land/x/events@v1.0.0/mod.ts";
import Logger from './log.ts';
import DB from './db.ts';
import Message from './message.ts';
import { NostrEvent, NostrFilters } from '../interfaces/messages.ts';
import Subscription from "./subscription.ts";

export default class Socket extends EventEmitter {
    private ws: WebSocket;
    private logger: Logger;
    private db: DB;
    private subscriptions: WeakMap<{ subscriptionId: string }, Subscription> = new WeakMap();

    constructor(_ws: WebSocket, _logger: Logger, _db: DB) {
        super();
        this.ws = _ws;
        this.logger = _logger;
        this.db = _db;
        this.ws.onmessage = async (m) => {
            const msg = new Message(this, m.data, this.logger, this.db);
            const event = await msg.parse();
            if (event) {
                this.emit('eventReceived', event);
            }
        };
        this.ws.onclose = () => this.logger.debug('Disconnected from client ...');
    }

    send(message: any) {
        this.ws.send(message);
    }

    addSubscription(subscriptionId: string, filters: Array<NostrFilters>) {
        this.subscriptions?.set({ subscriptionId }, new Subscription(subscriptionId, filters, this.logger, this.db, this));
    }

    removeSubscription(subscriptionId: string) {
        this.subscriptions.delete({ subscriptionId });
    }

    sendNotice(message: string, detail: string) {
        this.logger?.debug(`Error ${message} ${detail}`);
        this.ws.send(JSON.stringify(['NOTICE', message]));
    }

    sendOk(id: string) {
        this.ws.send(JSON.stringify(['OK', id]));
    }

    sendEvent(event: NostrEvent, subscriptionId: string) {
        this.ws.send(JSON.stringify(['EVENT', subscriptionId, event]));
    }

    sendEOSE(subscriptionId: string) {
        this.ws.send(JSON.stringify(['EOSE', subscriptionId]));
        this.removeSubscription(subscriptionId);
    }


}