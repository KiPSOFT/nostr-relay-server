import config from './config/index.ts';
import { serve } from 'https://deno.land/std/http/mod.ts';
import Logger from './lib/log.ts';
import DB from './lib/db.ts';
import Socket from './lib/socket.ts';

class Server {
    private logger: Logger;
    private db: DB;
    private config: any;

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
            return new Response(null, { status: 501 });
        }
        const { socket: ws, response } = Deno.upgradeWebSocket(req);
        new Socket(ws, this.logger, this.db);
        return response;
    }
}

new Server();