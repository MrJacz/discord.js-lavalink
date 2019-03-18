import { Client, Collection } from "discord.js";
import { Player } from "./Player";
import { LavalinkNode } from "./LavalinkNode";
import { PlayerManagerOptions, PlayerManagerNodes, NodeOptions, LavalinkWebSocketMessage, PlayerManagerJoinData, PlayerManagerJoinOptions, VoiceServerUpdateData } from "./Types";

export class PlayerManager extends Collection<string, Player> {
    private client: Client;
    public nodes = new Collection<string, LavalinkNode>();
    public user: string;
    public shards: number;
    private Player: any; // tslint:disable-line: variable-name

    public constructor(client: Client, nodes: PlayerManagerNodes[], options: PlayerManagerOptions) {
        super();

        if (!client) throw new Error("INVALID_CLIENT: No client provided.");

        this.client = client;
        this.user = client.user ? client.user.id : options.user;
        this.shards = client.shard ? client.shard.count : options.shards;
        this.Player = options.Player || Player;

        for (const node of nodes) this.createNode(node);

        client.on("raw", message => {
            if (message.t === "VOICE_SERVER_UPDATE") this.voiceServerUpdate(message.d);
        });
    }

    private createNode(options: NodeOptions): LavalinkNode {
        const node = new LavalinkNode(this, options);

        node.on("error", error => this.client.emit("error", error));
        node.on("message", this.onMessage.bind(this));

        this.nodes.set(options.host, node);

        return node;
    }

    public removeNode(host: string | LavalinkNode): boolean {
        const node = host instanceof LavalinkNode ? host : this.nodes.get(host);
        if (!node) return false;
        node.removeAllListeners();
        return this.nodes.delete(node.host);
    }

    private onMessage(message: LavalinkWebSocketMessage): any {
        if (!message || !message.op) return;

        switch (message.op) {
            case "playerUpdate": {
                const player = this.get(message.guildId);
                if (!player) return;
                player.state = Object.assign(player.state, message.state);
                return;
            }
            case "event": {
                const player = this.get(message.guildId);
                if (!player) return;
                return player.event(message);
            }
        }
    }

    public join(data: PlayerManagerJoinData, options?: PlayerManagerJoinOptions): Player {
        const player = this.get(data.guild);
        if (player) return player;
        this.sendWS({
            op: 4,
            d: {
                guild_id: data.guild,
                channel_id: data.channel,
                self_mute: options.selfmute,
                self_deaf: options.selfdeaf
            }
        });
        return this.spawnPlayer(data);
    }

    public leave(guild: string): boolean {
        this.sendWS({
            op: 4,
            d: {
                guild_id: guild,
                channel_id: null,
                self_mute: false,
                self_deaf: false
            }
        });
        const player = this.get(guild);
        if (!player) return false;
        player.removeAllListeners();
        player.destroy();
        return this.delete(guild);
    }

    /**
     * Used for the Voice Server Update event
     * @param {Object} data Data
     * @returns {void}
     * @private
     */
    private async voiceServerUpdate(data: VoiceServerUpdateData): Promise<void> {
        const guild = this.client.guilds.get(data.guild_id);
        if (!guild) return;
        const player = this.get(data.guild_id);
        if (!player) return;
        if (!guild.me) await guild.members.fetch(this.client.user.id).catch(() => null);
        player.connect({
            // @ts-ignore: support both versions of discord.js
            session: guild.me.voice ? guild.me.voice.sessionID : guild.me.voiceSessionID,
            event: data
        });
    }

    /**
     * Creates or returns a player
     * @param {Object} data Data for the player
     * @param {string} data.guild Player guild id
     * @param {string} data.channel Player channel id
     * @param {string} data.host Player host id
     * @returns {Player}
     */
    private spawnPlayer(data: PlayerManagerJoinData) {
        const exists = this.get(data.guild);
        if (exists) return exists;
        const node = this.nodes.get(data.host);
        if (!node) throw new Error(`INVALID_HOST: No available node with ${data.host}`);
        const player: Player = new this.Player({
            id: data.guild,
            client: this.client,
            manager: this,
            node,
            channel: data.channel
        });
        this.set(data.guild, player);
        return player;
    }

    /**
     * Private function for sending WS packets.
     * @param {Object} data Data for the player
     * @param {number} data.op OP for WS
     * @param {Object} data.d The actual data for the WS
     * @returns {void}
     * @private
     */
    public sendWS(data): void {
        // @ts-ignore: support both versions of discord.js
        return typeof this.client.ws.send === "function" ? this.client.ws.send(data) : this.client.guilds.get(data.d.guild_id).shard.send(data);
    }

}
