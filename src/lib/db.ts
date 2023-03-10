import config from '../config/index.ts';
import { MongoClient } from 'https://deno.land/x/mongo@v0.31.1/mod.ts';
import { NostrEvent, NostrFilters } from '../interfaces/messages.ts';
import Logger from './log.ts';

export default class DB {
    public onConnect: any;
    public db: any;
    private logger?: Logger;
    private client?: MongoClient;

    async connect(_logger: Logger, dbName: string = config.mongo.db) {
        const mongoDBUri = `mongodb+srv://${config.mongo.userName}:${config.mongo.password}@${config.mongo.host}/${config.mongo.db}${config.mongo.options}`;
        this.logger = _logger;
        this.logger.debug(`DB Connecting to; ${mongoDBUri} `);
        this.client = new MongoClient();
        await this.client.connect(mongoDBUri);
        this.onConnect();
        this.db = this.client.database(dbName);
    }

    async createEvent(event: NostrEvent) {
        await this.db.collection('events').insertOne(event);
    }

    async close() {
        this.client?.close();
        this.logger?.debug('DB disconnected.');
    }

    async findUsers(event: NostrEvent) {
        const search: any = {};
        search[config.registerCheck.field] = event.pubkey;
        const usr = await this.db.collection(config.registerCheck.collection).find(search).toArray();
        return usr.length > 0;
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
                search.$and = [];
                const tmp = {
                    $and: [] as any
                };
                for (const tag of filter.tags) {
                    tmp.$and.push({
                        tags: {
                            $elemMatch: {
                                $elemMatch: {
                                    $in: [tag.tagName]
                                }
                            }
                        }
                    });
                    tmp.$and.push({
                        tags: {
                            $elemMatch: {
                                $elemMatch: {
                                    $in: [tag.value]
                                }
                            }
                        }
                    });
                }
                search.$and.push(tmp);
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