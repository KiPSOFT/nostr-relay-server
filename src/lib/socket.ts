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
    private subscriptions?: Map<string, Subscription> = new Map();
    public lastEvent?: NostrEvent;
    public floodMessageCounter = 0;

    constructor(_ws: WebSocket, _logger: Logger) {
        super();
        this.ws = _ws;
        this.logger = _logger;
        this.db = new DB();
        this.db.connect(this.logger);
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
        this.subscriptions?.set(subscriptionId, new Subscription(subscriptionId, filters, this.logger, this.db, this));
    }

    removeSubscription(subscriptionId: string) {
        this.subscriptions?.delete(subscriptionId);
    }

    sendNotice(message: string, detail: string) {
        if (this.ws.readyState === 1) {
            this.logger?.debug(`Error ${message} ${detail}`);
            this.ws.send(JSON.stringify(['NOTICE', message]));
        }
    }

    sendOk(id: string) {
        if (this.ws.readyState === 1) {
            this.ws.send(JSON.stringify(['OK', id]));
        }
    }

    sendEvent(event: NostrEvent, subscriptionId: string) {
        if (this.ws.readyState === 1) {
            this.ws.send(JSON.stringify(['EVENT', subscriptionId, event]));
        }
    }

    sendEOSE(subscriptionId: string) {
        if (this.ws.readyState === 1) {
            this.ws.send(JSON.stringify(['EOSE', subscriptionId]));
            this.removeSubscription(subscriptionId);
        }
    }

    close(subscriptionId: string) {
        this.subscriptions?.delete(subscriptionId);
    }

    disconnect() {
        this.subscriptions?.clear();
        this.ws.close();
        this.db.close();
    }

}