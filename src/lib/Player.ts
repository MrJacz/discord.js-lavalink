import { EventEmitter } from "events";
import { Client } from "discord.js";
import { PlayerManager } from "./PlayerManager";
import { LavalinkNode } from "./LavalinkNode";
import { Base64, PlayerOptions, VoiceServerUpdateData, LavalinkEQ } from "./Types";

/**
 * Player
 * @extends EventEmitter
 */
export class Player extends EventEmitter {
    public id: string;
    public client: Client;
    public manager: PlayerManager;
    public node: LavalinkNode;
    public channel: string;
    public playing: boolean;
    public paused: boolean;
    public state: any;
    public track?: Base64;
    public timestamp?: number;

    /**
     * Options to pass to Player
	 * @typedef {Object} PlayerOptions
     * @memberof Player
	 * @property {string} id Client user id
	 * @property {external:Client} client Client
     * @property {PlayerManager} manager The player's manager
     * @property {LavalinkNode} node Lavalink node for the Player
     * @property {string} channel Channel id for the player
	 */

    /**
     * LavaLink Player Options
     * @param {PlayerOptions} options Player Options
     */
    public constructor(options: PlayerOptions) {
        super();
        /**
         * Player id (Guild ID)
         * @type {string}
         */
        this.id = options.id;
        /**
         * Discord.js Client
         * @type {external:Client}
         */
        Object.defineProperty(this, "client", { value: options.client });
        /**
         * The PlayerManager that initilized the player
         * @type {PlayerManager}
         */
        Object.defineProperty(this, "manager", { value: options.manager });
        /**
         * The current node for this Player
         * @type {LavalinkNode}
         */
        Object.defineProperty(this, "node", { value: options.node });
        /**
         * The current channel id
         * @type {string}
         */
        this.channel = options.channel;
        /**
         * Playing boolean
         * @type {boolean}
         */
        this.playing = false;
        /**
         * Whether the Player is paused or not.
         * @type {boolean}
         */
        this.paused = false;
        /**
         * LavaLink Player state
         * @type {Object}
         */
        this.state = { volume: 100 };
        /**
         * The current track that the Player is playing
         * @type {?string}
         */
        this.track = null;
        /**
         * The timestamp the Player started playing
         * @type {number}
         */
        this.timestamp = null;
    }

    /**
     * Sends a packet to Lavalink for voiceUpdate
     * @param {Object} data voiceUpdate event data
     * @returns {Player}
     */
    public connect(data: { session: string; event: VoiceServerUpdateData }): Player {
        this.node.send({
            op: "voiceUpdate",
            guildId: this.id,
            sessionId: data.session,
            event: data.event
        });
        return this;
    }

    /**
     * Disconnects the player
     * @param {string} message Disconnect reason
     * @returns {Player}
     */
    public disconnect(message: string): Player {
        this.playing = false;
        this.stop();
        /**
         * Emitted when the Player disconnects
         * @event Player#disconnect
         * @param {string} message Disconnection reason
         */
        this.emit("disconnect", message);
        return this;
    }

    /**
     * Plays a song
     * @param {string} track A Base64 string from LavaLink API
     * @param {Object} [options] Other options
     * @param {number} [options.startTime] Start time
     * @param {number} [options.endTime] End time
     * @returns {Player}
     */
    public play(track: Base64, options?: { startTime?: number, endTime?: number }): Player {
        this.track = track;
        this.node.send(Object.assign({
            op: "play",
            guildId: this.id,
            track
        }, options));
        this.playing = true;
        this.timestamp = Date.now();
        return this;
    }

    /**
     * stops the Player
     * @returns {Player}
     */
    public stop(): Player {
        this.node.send({
            op: "stop",
            guildId: this.id
        });
        this.playing = false;
        this.track = null;
        return this;
    }

    /**
     * Pauses or Resumes the player
     * @param {boolean} [pause=true] Whether to resume or pause the player
     * @returns {Player}
     */
    public pause(pause: boolean = true): Player {
        this.node.send({
            op: "pause",
            guildId: this.id,
            pause
        });
        this.paused = pause;
        return this;
    }

    public resume(): Player {
        return this.pause(false);
    }

    /**
     * Sets the volume for the player
     * @param {number} volume Volume
     * @returns {Player}
     */
    public volume(volume: number): Player {
        this.node.send({
            op: "volume",
            guildId: this.id,
            volume
        });
        this.state.volume = volume;
        return this;
    }

    /**
     * Seeks to a specified position
     * @param {number} position The position to seek to
     * @returns {Player}
     */
    public seek(position: number): Player {
        this.node.send({
            op: "seek",
            guildId: this.id,
            position
        });
        return this;
    }

    /**
     * Destroys the Player
     * @returns {Player}
     */
    public destroy(): Player {
        this.node.send({
            op: "destroy",
            guildId: this.id
        });
        return this;
    }

    public setEQ(bands: LavalinkEQ): Player {
        this.node.send({
            op: "equalizer",
            guildId: this.id,
            bands
        });
        return this;
    }

    /**
     * Switch player channel
     * @param {string} channel Channel id
     * @param {boolean} [reactive=false] Whether to switch channel
     * @return {boolean}
     */
    public switchChannel(channel: string, reactive: boolean = false): boolean {
        if (this.channel === channel) return false;
        this.channel = channel;
        if (reactive) this.updateVoiceState(channel);
        return true;
    }

    /**
     * @param {Object} message a packet
     * @returns {boolean}
     * @private
     */
    public event(message): boolean {
        switch (message.type) {
            case "TrackEndEvent": {
                if (message.reason !== "REPLACED") {
                    this.playing = false;
                    this.track = null;
                }
                return this.emit("end", message);
            }
            case "TrackExceptionEvent": {
                /**
		         * Emmited when the player encounters an error
		         * @event LavaPlayer#error
		         * @prop {Object} message The raw message
		         */
                if (this.listenerCount("error")) return this.emit("error", message);
                return false;
            }
            case "TrackStuckEvent": {
                this.stop();
                /**
                 * Emitted whenever the Player gets Stuck or ends
                 * @event Player#end
                 * @param {string} message Data containg reason
                 */
                return this.emit("end", message);
            }
            default: return this.emit("warn", `Unexpected event type: ${message.type}`);
        }
    }

    /**
     * Updates the Client's voice state
     * @param {string} channel Channel id
     * @param {Object} [options] selfmute and selfdeaf options
     * @param {boolean} [options.selfmute=false] selfmute option
     * @param {boolean} [options.selfdeaf=false] selfdeaf option
     * @private
     */
    private updateVoiceState(channel: string, options: { selfmute?: boolean, selfdeaf?: boolean } = {}) {
        this.manager.sendWS({
            op: 4,
            d: {
                guild_id: this.id,
                channel_id: channel,
                self_mute: options.selfmute,
                self_deaf: options.selfdeaf
            }
        });
    }

}
