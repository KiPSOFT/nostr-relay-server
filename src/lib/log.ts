import * as log from "https://deno.land/std@0.177.0/log/mod.ts";

export default class Logger {
    private _logger: log.Logger|undefined;

    constructor() {
        this.loader();
    }

    async loader() {
        await log.setup({
            handlers: {
              console: new log.handlers.ConsoleHandler("DEBUG"),
            },
          
            loggers: {
              "nostr-deno-server": {
                level: "DEBUG",
                handlers: ["console"],
              },
            },
        });
        this._logger = log.getLogger('nostr-deno-server');
    }

    debug(msg: string, ...args: any) {
        this._logger?.debug(msg, args);
    }
    
}