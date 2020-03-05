"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WebSocket = require("ws");
class LavalinkNode {
    constructor(manager, options) {
        this.manager = manager;
        this.tag = options.tag;
        this.host = options.host;
        this.port = options.port || 2333;
        this.reconnectInterval = options.reconnectInterval || 5000;
        this.password = options.password || "youshallnotpass";
        this.ws = null;
        this.stats = {
            players: 0,
            playingPlayers: 0,
            uptime: 0,
            memory: {
                free: 0,
                used: 0,
                allocated: 0,
                reservable: 0
            },
            cpu: {
                cores: 0,
                systemLoad: 0,
                lavalinkLoad: 0
            }
        };
        this.connect();
    }
    connect() {
        if (this.connected) {
            this.ws.removeAllListeners();
            this.ws.close();
        }
        const headers = {
            Authorization: this.password,
            "Num-Shards": String(this.manager.shards || 1),
            "User-Id": this.manager.user
        };
        if (this.resumeKey)
            headers["Resume-Key"] = this.resumeKey;
        this.ws = new WebSocket(`ws://${this.host}:${this.port}/`, { headers });
        this.ws.on("open", this.onOpen.bind(this));
        this.ws.on("message", this.onMessage.bind(this));
        this.ws.on("error", this.onError.bind(this));
        this.ws.on("close", this.onClose.bind(this));
    }
    onOpen() {
        if (this.reconnect)
            clearTimeout(this.reconnect);
        this.manager.emit("ready", this);
        this.configureResuming();
    }
    onMessage(d) {
        if (Array.isArray(d))
            d = Buffer.concat(d);
        else if (d instanceof ArrayBuffer)
            d = Buffer.from(d);
        const msg = JSON.parse(d.toString());
        if (msg.op && msg.op === "stats")
            this.stats = { ...msg };
        delete this.stats.op;
        if (msg.guildId && this.manager.players.has(msg.guildId))
            this.manager.players.get(msg.guildId).emit(msg.op, msg);
        this.manager.emit("raw", this, msg);
    }
    onError(error) {
        if (!error)
            return;
        this.manager.emit("error", this, error);
        this._reconnect();
    }
    onClose(code, reason) {
        this.manager.emit("disconnect", this, { code, reason });
        if (code !== 1000 || reason !== "destroy")
            return this._reconnect();
    }
    send(msg) {
        return new Promise((res, rej) => {
            const parsed = JSON.stringify(msg);
            if (!this.connected)
                return res(false);
            this.ws.send(parsed, (error) => {
                if (error)
                    rej(error);
                else
                    res(true);
            });
        });
    }
    configureResuming(key = Math.random().toString(36).substring(7), timeout = 120) {
        this.resumeKey = key;
        return this.send({ op: "configureResuming", key, timeout });
    }
    destroy() {
        if (!this.connected)
            return false;
        this.ws.close(1000, "destroy");
        this.ws.removeAllListeners();
        this.ws = null;
        return true;
    }
    _reconnect() {
        this.reconnect = setTimeout(() => {
            this.ws.removeAllListeners();
            this.ws = null;
            this.manager.emit("reconnecting", this);
            this.connect();
        }, this.reconnectInterval);
    }
    get connected() {
        if (!this.ws)
            return false;
        return this.ws.readyState === WebSocket.OPEN;
    }
}
exports.LavalinkNode = LavalinkNode;
//# sourceMappingURL=LavalinkNode.js.map