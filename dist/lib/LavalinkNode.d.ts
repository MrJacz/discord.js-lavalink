import * as WebSocket from "ws";
import { PlayerManager } from "./PlayerManager";
import { LavalinkNodeStats, LavalinkNodeOptions } from "./Types";
export declare class LavalinkNode {
    manager: PlayerManager;
    tag?: string;
    host: string;
    port: number | string;
    reconnectInterval: number;
    password: string;
    ws: WebSocket | null;
    private reconnect?;
    stats: LavalinkNodeStats;
    resumeKey?: string;
    constructor(manager: PlayerManager, options: LavalinkNodeOptions);
    private connect;
    private onOpen;
    private onMessage;
    private onError;
    private onClose;
    send(msg: object): Promise<boolean>;
    configureResuming(key?: string, timeout?: number): Promise<boolean>;
    destroy(): boolean;
    private _reconnect;
    get connected(): boolean;
}
