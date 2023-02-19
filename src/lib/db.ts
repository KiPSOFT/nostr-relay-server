import config from '../config/index.ts';
import { MongoClient } from 'https://deno.land/x/mongo@v0.31.1/mod.ts';
import { NostrEvent, NostrFilters } from '../interfaces/messages.ts';
import Logger from './log.ts';

export default class DB {
    public onConnect: any;
    public db: any;
    private logger?: Logger;
    private client?: MongoClient;

    async connect(_logger: Logger) {
        const mongoDBUri = `mongodb+srv://${config.mongo.userName}:${config.mongo.password}@${config.mongo.host}/${config.mongo.db}${config.mongo.options}`;
        this.logger = _logger;
        this.logger.debug(`DB Connecting to; ${mongoDBUri} `);
        this.client = new MongoClient();
        await this.client.connect(mongoDBUri);
        this.onConnect();
        this.db = this.client.database(config.mongo.db);
    }

    async createEvent(event: NostrEvent) {
        return await this.db.collection('events').insertOne(event);
    }

    async close() {
        this.client?.close();
        this.logger?.debug('DB disconnected.');
    }

    async getEvents(filters: Array<NostrFilters>) {
        if (!this.db) {
            throw new Error('Internal error.');
        }
        let tmp: Array<any> = [];
        for (const filter of filters) {
            const search = { } as any;
            if (filter.ids) {
                search.id = {
                    $in: filter.ids
                };
            }
            if (filter.authors) {
                search.pubkey = {
                    $in: filter.authors
                };
            }
            if (filter.kinds) {
                search.kind = {
                    $in: filter.kinds
                };
            }
            if (filter.tags) {
                const tmp = [];
                for (const tag of filter.tags) {
                    tmp.push([tag.tagName, tag.value]);
                }
                search.tags = {
                    $in: tmp
                };
            }
            if (filter.since) {
                search.created_at = { $gt: filter.since };
            }
            if (filter.until) {
                search.created_at = { $lt: filter.until };
            }
            if (filter.limit) {
                const data = await this.db.collection('events').find(search).limit(filter.limit).toArray();
                tmp = tmp.concat(data);
            } else {
                const data = await this.db.collection('events').find(search).toArray();
                tmp = tmp.concat(data);
            }
        }
        return tmp;
    }

}