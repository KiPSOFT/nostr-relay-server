import { NostrEvent, NostrFilters } from '../interfaces/messages.ts';
import DB from './db.ts';
import Logger from './log.ts';
import Socket from './socket.ts';

export default class Subscription {
    private logger: Logger;
    private db: DB;
    private subscriptionId: string;
    private filters: Array<NostrFilters>;
    private ws: Socket;

    constructor(_subscriptionId: string, _filters: Array<NostrFilters>, _logger: Logger, _ws: Socket) {
        this.logger = _logger;
        this.db = new DB();
        this.db.onConnect = () => {
        };
        this.subscriptionId = _subscriptionId;
        this.filters = _filters;
        this.ws = _ws;
        this.getEvents();
    }

    async getEvents() {
        try {
            await this.db.connect(this.logger);
            const events = await this.db.getEvents(this.filters);
            await this.db.close();
            for (const event of events) {
                this.ws.sendEvent(event, this.subscriptionId);
            }
            if (!this.filters[0].limit) {
                this.ws.on('eventReceived', this.checkEvent.bind(this));    
            }
            this.ws.sendEOSE(this.subscriptionId);
        } catch (err) {
            this.ws.sendNotice(err.message, err.stack);
        }
    }

    checkEvent(event: NostrEvent) {
        let founded = false;
        for (const filter of this.filters) {
            if (filter.ids) {
                founded = false;
                founded = filter.ids.indexOf(event.id) > -1;
            }
            if (filter.authors) {
                founded = false;
                founded = filter.authors.indexOf(event.pubkey) > -1;
            }
            if (filter.kinds) {
                founded = false;
                founded = filter.kinds.indexOf(event.kind) > -1;
            }
            if (filter.since) {
                founded = false;
                founded = filter.since < event.created_at;
            }
            if (filter.until) {
                founded = false;
                founded = filter.until > event.created_at;
            }
            if (founded) {
                return this.ws.sendEvent(event, this.subscriptionId);
            }
        }
    }

}