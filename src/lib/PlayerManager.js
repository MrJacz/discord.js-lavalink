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
        this.pending = {};
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
            if (message.t === "VOICE_SERVER_UPDATE") this.voiceStateUpdate(message.d);
            if (message.t === "VOICE_STATE_UPDATE") {
                const player = this.get(message.d.guild_id);
                if (player && player.channel.id !== message.d.channel_id) {
                    player.switchChannel(message.d.channel_id);
                }
            }
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
        }
    }

    join(channel, options = {}) {
        return new Promise(async (res, rej) => {
            const player = options.player || this.get(channel.guild.id);
            if (player && player.channel.id !== channel.id) {
                player.switchChannel(channel);
                return res(player);
            }
            const region = this.getRegionFromData(channel.guild.region || options.region || "us");
            const node = this.findIdealNode(region);
            if (!node) rej(new Error("No available voice nodes."));

            this.pending[channel.guild.id] = {
                channel: channel,
                options,
                player: player || null,
                node: node,
                res: res,
                rej: rej,
                timeout: setTimeout(() => {
                    delete this.pending[channel.guild.id];
                    rej(new Error("Voice connection timeout"));
                }, 15000)
            };
            await channel.join();
        });
    }

    findIdealNode(region) {
        let nodes = this.nodes.filter(node => node.ws && node.connected);

        if (region) {
            const regionalNodes = nodes.filter(node => node.region === region);
            if (regionalNodes && regionalNodes.size) nodes = regionalNodes;
        }

        // nodes = nodes.sort((a, b) => {
        //     const aload = a.stats.cpu ? (a.stats.cpu.systemLoad / a.stats.cpu.cores) * 100 : 0;
        //     const bload = b.stats.cpu ? (b.stats.cpu.systemLoad / b.stats.cpu.cores) * 100 : 0;
        //     return aload - bload;
        // });
        return nodes[0];
    }

    getRegionFromData(endpoint) {
        if (!endpoint) return "us";
        endpoint = endpoint.replace("vip-", "");

        for (const key in this.regions) {
            const nodes = this.nodes.filter(n => n.region === key);
            if (!nodes || !nodes.size) continue;
            if (!nodes.find(n => n.connected)) continue;
            for (const region of this.regions[key]) {
                if (endpoint.startsWith(region)) return key;
            }
        }

        return this.options.defaultRegions || "us";
    }

    async voiceServerUpdate(data) {
        const pendingGuild = this.pending[data.guild_id];
        if (pendingGuild && pendingGuild.timeout) {
            clearTimeout(pendingGuild.timeout);
            pendingGuild.timeout = null;
        }

        let player = this.get(data.guild_id);
        if (!player) {
            if (!pendingGuild) return;
            const pendingPlayer = pendingGuild.player;

            if (player) {
                pendingPlayer.sessionId = this.client.ws.connection.sessionID;
                pendingPlayer.hostname = pendingGuild.hostname;
                pendingPlayer.node = pendingGuild.node;
                pendingPlayer.event = data;
                this.add(player);
            }

            player = player || this.add({
                id: data.guild_id,
                client: this.client,
                manager: this,
                node: pendingGuild.node,
                channel: pendingGuild.channel
            });
        }

        player.connect({
            sessionId: this.client.ws.connection.sessionID,
            guildId: data.guild_id,
            channelId: pendingGuild.channel.id,
            event: {
                endpoint: data.endpoint,
                guild_id: data.guild_id,
                token: data.token
            }
        });

        const disconnectHandler = () => {
            player = this.get(data.guild_id);
            if (!this.pending[data.guild_id]) {
                if (player) return player.removeListener("ready", readyHandler);
                return;
            }
            player.removeListener("ready", readyHandler);
            this.pending[data.guild_id].rej(new Error("Disconnected"));
            delete this.pending[data.guild_id];
        };

        const readyHandler = () => {
            player = this.get(data.guild_id);
            if (!this.pending[data.guild_id]) {
                if (player) return player.removeListener("disconnect", disconnectHandler);
                return;
            }
            player.removeListener("disconnect", disconnectHandler);
            this.pending[data.guild_id].res(player);
            delete this.pending[data.guild_id];
        };

        player.on("ready", readyHandler).on("disconnect", disconnectHandler);
    }

}

module.exports = PlayerManager;
