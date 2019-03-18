
import * as WebSocket from "ws";
import { EventEmitter } from "events";
import { PlayerManager } from "./PlayerManager";
import { NodeStats, NodeOptions } from "./Types";

export class LavalinkNode extends EventEmitter {
    public manager: PlayerManager;
    public host: string;
    public port?: number | string;
    public address: string;
    public region?: string;
    public password?: string;
    public ready: boolean;
    public ws?: WebSocket;
    public reconnect?: NodeJS.Timer;
    public reconnectInterval?: number;
    public stats: NodeStats;

    public constructor(manager: PlayerManager, options: NodeOptions) {
        super();

        /**
         * The PlayerManager that created the Node
         * @type {PlayerManager}
         * @private
         */
        Object.defineProperty(this, "manager", { value: manager });
        /**
         * Host
         * @type {string}
         * @private
         */
        Object.defineProperty(this, "host", { value: options.host });
        /**
         * Port
         * @type {number|string}
         * @private
         */
        Object.defineProperty(this, "port", { value: options.port || 2333 });
        /**
         * Address
         * @type {string}
         * @private
         */
        Object.defineProperty(this, "address", { value: options.address || `ws://${options.host}:${options.port}` });
        /**
         * Region
         * @type {?string}
         */
        this.region = options.region || null;
        /**
         * Lavalink Node(Shard) Password
         * @type {string}
         * @private
         */
        Object.defineProperty(this, "password", { value: options.password || "youshallnotpass" });
        /**
         * If the lavalink websocket is ready or not
         * @type {boolean}
         */
        this.ready = false;
        /**
         * The WebSocket
         * @type {?WebSocket}
         */
        this.ws = null;
        /**
         * Roconnection interval
         * @type {?NodeJS.Timer}
         */
        this.reconnect = null;
        /**
         * The interval to use for auto Reconnecting
         * @type {number}
         */
        this.reconnectInterval = options.reconnectInterval || 15000;
        /**
         * Player stats
         * @type {Object}
         */
        this.stats = {
            players: 0,
            playingPlayers: 0
        };

        this._connect();
    }

    /**
     * Connects to the WebSocket server
     */
    private _connect() {
        this.ws = new WebSocket(this.address, {
            headers: {
                "User-Id": this.manager.user,
                "Num-Shards": String(this.manager.shards),
                Authorization: this.password
            }
        });

        this.ws.on("message", this._message.bind(this));
        this.ws.on("open", this._ready.bind(this));
        this.ws.on("close", this._close.bind(this));
        this.ws.on("error", this._error.bind(this));
    }

    /**
     * Function for the onOpen WS event
     * @private
     */
    private _ready() {
        this.ready = true;
        /**
		 * Emmited when the node gets ready
		 * @event LavalinkNode#ready
		 */
        this.emit("ready");
    }

    /**
     * Sends data to the Lavalink Node
     * @param {Object} data Object to send
     * @returns {boolean}
     */
    public send(data: object): boolean {
        if (!this.ws) return false;
        let payload;
        try {
            payload = JSON.stringify(data);
        } catch (error) {
            this.emit("error", error);
            return false;
        }
        this.ws.send(payload);
        return true;
    }

    /**
     * Destroys the WebSocket
     * @returns {boolean}
     */
    public destroy(): boolean {
        if (!this.ws) return false;
        this.ws.close(1000, "destroy");
        this.ws = null;
        return true;
    }

    /**
     * Reconnects the websocket
     * @private
     */
    private _reconnect() {
        this.reconnect = setTimeout(() => {
            this.ws.removeAllListeners();
            /**
			 * Emmited when the node is attempting a reconnect
			 * @event LavalinkNode#reconnecting
			 */
            this.emit("reconnecting");
            this._connect();
        }, this.reconnectInterval);
    }

    /**
     * Function for the onClose event
     * @param {number} code WebSocket closing code (idk tbh)
     * @param {?string} reason reason
     * @returns {void}
     * @private
     */
    private _close(code, reason) {
        this.ready = false;
        if (code !== 1000 || reason !== "destroy") return this._reconnect();
        this.ws = null;
        /**
		 * Emmited when the node disconnects from the WebSocket and won't attempt to reconnect
		 * @event LavalinkNode#disconnect
		 * @param {string} reason The reason for the disconnect
		 */
        this.emit("disconnect", reason);
    }

    /**
     * Function for the onMessage event
     * @param {Object} msg Message object
     * @returns {void}
     * @private
     */
    private _message(msg) {
        try {
            const data = JSON.parse(msg);
            if (data.op === "stats") this.stats = data;
            /**
		     * Emmited when a message is received and parsed
		     * @event LavalinkNode#message
		     * @param {Object} data The raw message data
		     */
            this.emit("message", data);
        } catch (error) {
            this.emit("error", error);
        }
    }

    /**
     * Function for onError event
     * @param {Error} error error from WS
     * @private
     */
    private _error(error) {
        /**
         * Emitted whenever the Node's WebSocket encounters a connection error.
         * @event LavalinkNode#error
         * @param {Error} error The encountered error
         */
        this.emit("error", error);
    }

}
