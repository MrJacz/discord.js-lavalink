declare module "discord.js-lavalink" {
    import { EventEmitter } from "events";
    import * as WebSocket from "ws";
    import {
        Client as DiscordClient,
        Collection
     } from "discord.js";

    export const version: string;

    export class PlayerManager extends Collection<string, Player> {
        public constructor(client: DiscordClient, nodes: object[], options: PlayerManagerOptions);

        public client: DiscordClient;
        public nodes: Collection<string, LavalinkNode>;

        public createNode(options: object): LavalinkNode;
        public removeNode(host: string): boolean;
        private onMessage(message: object): any;
        public join(data: { guild: string, channel: string, host: string, }, options?: { selfmute?: boolean, selfdeaf?: boolean }): Promise<Player>;
        public leave(guild: string): boolean;
        private voiceServerUpdate(data: object): void;
        public spawnPlayer(data: { guild: string, channel: string, host: string }): Player;
        private sendWS(data: { op: number, d: object }): any;
    }

    export class Player extends EventEmitter {
        public constructor(options: PlayerOptions);

        public id: string;
        public client: DiscordClient;
        public manager: PlayerManager;
        public node: LavalinkNode;
        public channel: string;
        public playing: boolean;
        public paused: boolean;
        public state: object;
        public track?: Base64;
        public timestamp?: number;

        public on(event: string, listener: Function): this;
        public on(event: "disconnect", listener: (msg: string) => void): this;
        public on(event: "error", listener: (error: Error) => void): this;
        public on(event: "end", listener: (message: object) => void): this;

        public once(event: string, listener: Function): this;
        public once(event: "disconnect", listener: (msg: string) => void): this;
        public once(event: "error", listener: (error: Error) => void): this;
        public once(event: "end", listener: (message: object) => void): this;

        public connect(data: object): this;
        public disconnect(msg?: string): this;
        public play(track: Base64, options?: { startTime?: number, endTime?: number }): this;
        public stop(): this;
        public pause(pause?: boolean): this;
        public resume(): this;
        public volume(volume: number): this;
        public seek(position: number): this;
        public destroy(): this;
        public switchChannel(channel: string, reactive?: boolean): boolean;
        private event(message: object): any;
        private updateVoiceState(channel: string, options?: { selfmute?: boolean, selfdeaf?: boolean }): void;
    }

    class LavalinkNode extends EventEmitter {
        public constructor(manager: PlayerManager, options: NodeOptions);

        public manager: PlayerManager;
        public host: string;
        public port?: number | string;
        public address?: string;
        public region?: string;
        public password?: string;
        public ready: boolean;
        public ws?: WebSocket;
        public reconnect?: NodeJS.Timer;
        public reconnectInterval?: number;
        public stats: NodeStats;

        public on(event: string, listener: Function): this;
        public on(event: "ready" | "reconnecting", listener: () => void): this;
        public on(event: "disconnect", listener: (reason: string) => void): this;
        public on(event: "message", listener: (data: any) => void): this;
        public on(event: "error", listener: (error: Error) => void): this;

        public once(event: string, listener: Function): this;
        public once(event: "ready" | "reconnecting", listener: () => void): this;
        public once(event: "disconnect", listener: (reason: string) => void): this;
        public once(event: "message", listener: (data: any) => void): this;
        public once(event: "error", listener: (error: Error) => void): this;

        public connect(): void;
        public send(data: object): boolean;
        public destroy(): boolean;
        private _reconnect(): void;
        private _ready(): void;
        private _close(code: number, reason?: string): void;
        private _message(msg: object): any;
        private _error(error: Error): void;
    }

    export { LavalinkNode as Node };

    export type PlayerManagerOptions = {
        user: string;
        shards: number;
    };

    export type PlayerOptions = {
        id: string;
        client: DiscordClient;
        manager: PlayerManager;
        node: LavalinkNode;
        channel: string;
    };

    export type NodeOptions = {
        host: string;
        port?: number | string;
        address?: string;
        region?: string;
        password?: string;
        reconnectInterval?: number;
    };

    export type NodeStats = {
        players: number;
        playingPlayers: number;
    };

    export type Base64 = string;
}
