const WebSocket = require("ws");
const { EventEmitter } = require("events");

/**
 * Lavalink Websocket
 * @extends {EventEmitter}
 */
class LavalinkNode extends EventEmitter {

    /**
     * LavalinkNode Options
	 * @typedef {Object} LavalinkNodeOptions
     * @memberof LavalinkNode
     * @property {string} host Lavalink host
     * @property {number|string} [port=2333] Lavalink port
     * @property {string} [address] Lavalink address
     * @property {string} [region] Lavalink region
     * @property {string} [password="youshallnotpass"] Lavalink password
     * @property {number} [reconnectInterval=5000] Reconnectinterval
	 */

    /**
     * LavaLink options
     * @param {PlayerManager} manager The PlayerManager that created the Node
     * @param {LavalinkNodeOptions} options LavaLink options
     */
    constructor(manager, options = {}) {
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
        this.stats = {};

        this.connect();
    }

    /**
     * Connects to the WebSocket server
     */
    connect() {
        this.ws = new WebSocket(this.address, {
            headers: {
                "User-Id": this.manager.user,
                "Num-Shards": this.manager.shards,
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
    _ready() {
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
    send(data) {
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
    destroy() {
        if (!this.ws) return false;
        this.ws.close(1000, "destroy");
        this.ws = null;
        return true;
    }

    /**
     * Reconnects the websocket
     * @private
     */
    _reconnect() {
        this.reconnect = setTimeout(() => {
            this.ws.removeAllListeners();
            /**
			 * Emmited when the node is attempting a reconnect
			 * @event LavalinkNode#reconnecting
			 */
            this.emit("reconnecting");
            this.connect();
        }, this.reconnectInterval);
    }

    /**
     * Function for the onClose event
     * @param {number} code WebSocket closing code (idk tbh)
     * @param {?string} reason reason
     * @returns {void}
     * @private
     */
    _close(code, reason) {
        this.connected = false;
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
    _message(msg) {
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
    _error(error) {
        /**
         * Emitted whenever the Node's WebSocket encounters a connection error.
         * @event LavalinkNode#error
         * @param {Error} error The encountered error
         */
        this.emit("error", error);
    }


}

module.exports = LavalinkNode;
