const PlayerManagerStore = require("./structures/PlayerManagerStore");
const Player = require("./Player");
const Node = require("./Node");
const { Collection } = require("discord.js");

/**
 * Player Manager class
 * @extends {PlayerManagerStore}
 */
class PlayerManager extends PlayerManagerStore {

    constructor(client, nodes = [], options = {}) {
        super(options.player || Player);

        this.client = client;
        this.nodes = new Collection();
        this.pending = {
            guilds: new Collection(),
            sessions: new Collection()
        };
        this.options = options;
        this.defaultRegion = options.region || "us";
        this.defaultRegions = {
            asia: ["sydney", "singapore", "japan", "hongkong"],
            eu: ["london", "frankfurt", "amsterdam", "russia", "eu-central", "eu-west"],
            us: ["us-central", "us-west", "us-east", "us-south", "brazil"]
        };
        this.regions = options.regions || this.defaultRegions;

        for (let i = 0; i < nodes.length; i++) this.createNode(Object.assign({}, nodes[i], options));

        client.on("raw", message => {
            if (message.t === "VOICE_SERVER_UPDATE") this.voiceServerUpdate(message.d);
        });
    }

    createNode(options) {
        const node = new Node({
            host: options.host,
            port: options.port,
            region: options.region,
            shardCount: options.shardCount,
            userId: options.userId,
            password: options.password
        });

        node.on("error", error => this.client.emit("error", error));
        node.on("disconnect", this.onDisconnect.bind(this, node));
        node.on("message", this.onMessage.bind(this, node));

        this.nodes.set(options.host, node);
    }

    onDisconnect(node, reason) {
        if (!this.nodes.size) throw new Error("No available voice nodes.");
        throw new Error(reason);
    }

    onMessage(node, message) {
        if (!message || !message.op) return;

        switch (message.op) {
            case "playerUpdate": {
                const player = this.get(message.guildId);
                if (!player) return;
                player.state = message.state;
                return;
            }
            case "event": {
                const player = this.players.get(message.guildId);
                if (!player) return;

                switch (message.type) {
                    case "TrackEndEvent": return player.end(message);
                    case "TrackExceptionEvent": return player.exception(message);
                    case "TrackStuckEvent": return player.stuck(message);
                    default: return player.emit("warn", `Unexpected event type: ${message.type}`);
                }
            }
        }
    }

    join(data) {
        const player = this.get(data.d.guild_id);
        if (player) return player;
        if (!this.client.connections && this.client.ws) {
            this.client.ws.send(data);
            return this.spawnPlayer({
                host: data.host,
                guild: data.d.guild_id,
                channel: data.d.channel_id
            });
        }
        if (this.client.connections && !this.client.ws) {
            this.client.connections.get(data.shard).send(data.op, data.d);
            return this.spawnPlayer({
                host: data.host,
                guild: data.d.guild_id,
                channel: data.d.channel_id
            });
        }
    }


    voiceServerUpdate(data) {
        const player = this.get(data.guild_id);
        const guild = this.client.guilds.get(data.guild_id);
        if (!player) return;
        player.connect({
            session: guild.me.voiceSessionID,
            event: data
        });
    }

    spawnPlayer(data) {
        const player = this.get(data.guild);
        if (player) return player;
        return this.add({
            id: data.guild,
            client: this.client,
            manager: this,
            node: this.nodes.get(data.host),
            channel: data.channel
        });
    }

}

module.exports = PlayerManager;
