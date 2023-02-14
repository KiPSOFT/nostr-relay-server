import config from './config/index.ts';
import { serve } from 'https://deno.land/std/http/mod.ts';
import Logger from './lib/log.ts';
import DB from './lib/db.ts';
import Socket from './lib/socket.ts';

class Server {
    private logger: Logger;
    private db: DB;
    
    constructor() {
        this.logger = new Logger();
        this.db = new DB();
        this.init();
    }

    async init() {
        await this.logger.loader();
        await this.db.connect(this.logger);
        this.logger.debug('Listening on', config.port);
        serve(this.reqHandler.bind(this), { port: config.port });
    }

    reqHandler(req: Request) {
        if (req.headers.get('upgrade') !== 'websocket') {
            if (req.headers.get('Accept') === 'application/nostr+json') {
                return new Response(JSON.stringify({
                    name: config.relay.name,
                    description: config.relay.description,
                    pubkey: config.relay.publicKey,
                    contact: config.relay.contact,
                    supported_nips: [1, 4, 11, 14],
                    software: 'Nostr Deno Server by Serkan KOCAMAN',
                    version: '0.1',

                }), {
                    status: 200,
                    headers: new Headers({
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Headers': '*',
                        'Access-Control-Allow-Methods': '*'
                    })
                });
            }
            return new Response(null, { status: 501 });
        }
        const { socket: ws, response } = Deno.upgradeWebSocket(req);
        new Socket(ws, this.logger, this.db);
        return response;
    }
}

new Server();