import * as WebSocket from "ws";
import { PlayerManager } from "./PlayerManager";
import { Player } from "./Player";
import { LavalinkNodeStats, LavalinkNodeOptions } from "./Types";

export class LavalinkNode {

    public manager: PlayerManager;
    public tag?: string;
    public host: string;
    public port: number | string;
    public reconnectInterval: number;
    public password: string;
    public ws: WebSocket | null;
    private reconnect?: NodeJS.Timeout;
    public stats: LavalinkNodeStats;
    public resumeKey?: string;

    public constructor(manager: PlayerManager, options: LavalinkNodeOptions) {
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

    private connect(): void {
        if (this.connected) {
            this.ws!.removeAllListeners();
            this.ws!.close();
        }

        const headers = {
            Authorization: this.password,
            "Num-Shards": String(this.manager.shards || 1),
            "User-Id": this.manager.user
        };

        if (this.resumeKey) (headers as any)["Resume-Key"] = this.resumeKey;

        this.ws = new WebSocket(`ws://${this.host}:${this.port}/`, { headers });

        this.ws.on("open", this.onOpen.bind(this));
        this.ws.on("message", this.onMessage.bind(this));
        this.ws.on("error", this.onError.bind(this));
        this.ws.on("close", this.onClose.bind(this));
    }

    private onOpen(): void {
        if (this.reconnect) clearTimeout(this.reconnect);
        this.manager.emit("ready", this);
        this.configureResuming();
    }

    private onMessage(d: Buffer | string): void {
        if (Array.isArray(d)) d = Buffer.concat(d);
        else if (d instanceof ArrayBuffer) d = Buffer.from(d);

        const msg = JSON.parse(d.toString());

        if (msg.op && msg.op === "stats") this.stats = { ...msg };
        delete (this.stats as any).op;

        if (msg.guildId && this.manager.players.has(msg.guildId)) (this.manager.players.get(msg.guildId) as Player).emit(msg.op, msg);

        this.manager.emit("raw", this, msg);
    }

    private onError(error: Error): void {
        if (!error) return;

        this.manager.emit("error", this, error);
        this._reconnect();
    }

    private onClose(code: number, reason: string): void {
        this.manager.emit("disconnect", this, { code, reason });
        if (code !== 1000 || reason !== "destroy") return this._reconnect();
    }

    public send(msg: object): Promise<boolean> {
        return new Promise((res, rej) => {
            const parsed = JSON.stringify(msg);

            if (!this.connected) return res(false);
            this.ws!.send(parsed, (error: any) => {
                if (error) rej(error);
                else res(true);
            });
        });
    }

    public configureResuming(key: string = Math.random().toString(36).substring(7), timeout = 120): Promise<boolean> {
        this.resumeKey = key;

        return this.send({ op: "configureResuming", key, timeout });
    }

    public destroy(): boolean {
        if (!this.connected) return false;
        this.ws!.close(1000, "destroy");
        this.ws!.removeAllListeners();
        this.ws = null;
        return true;
    }

    private _reconnect(): void {
        this.reconnect = setTimeout(() => {
            this.ws!.removeAllListeners();
            this.ws = null;

            this.manager.emit("reconnecting", this);
            this.connect();
        }, this.reconnectInterval);
    }

    public get connected(): boolean {
        if (!this.ws) return false;
        return this.ws!.readyState === WebSocket.OPEN;
    }

}
