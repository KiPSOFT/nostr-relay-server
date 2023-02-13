import "https://deno.land/std@0.177.0/dotenv/load.ts";

export default {
    port: parseInt(Deno.env.get('PORT') || '8080'),
    mongo: {
        userName: Deno.env.get('MONGODB_USER') || '',
        password: Deno.env.get('MONGODB_PASSWORD') || '',
        host: Deno.env.get('MONGODB_HOST') || 'localhost',
        db: 'nostrdenoserver',
        options: Deno.env.get('MONGODB_OPTIONS') || ''
    },
    relay: {
        name: Deno.env.get('RELAY_NAME') || 'Nostr Deno Relay Server',
        description: Deno.env.get('RELAY_DESCRIPTION') || 'Nostr Deno Relay Server - Nostrprotocol.net',
        publicKey: Deno.env.get('RELAY_PUBLICKEY') || 'npub1r25l7p70wll4wgvpf9u9xw68gs78ev6gajux95y37w9yc09hjw6sxldkdv',
        contact: Deno.env.get('RELAY_CONTACT') || 'kipsoft@nostrprotocol.net'
    }
};