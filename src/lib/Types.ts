import { Client } from "discord.js";
import { PlayerManager } from "./PlayerManager";
import { LavalinkNode } from "./LavalinkNode";
import { Player } from "./Player";

export type PlayerManagerOptions = {
    user: string;
    shards: number;
    Player?: Player;
};

export type PlayerManagerNodes = {
    host: string;
    port?: number | string;
    password?: string;
};

export type PlayerManagerJoinData = {
    guild: string;
    channel: string;
    host: string;
};

export type PlayerManagerJoinOptions = {
    selfmute?: boolean,
    selfdeaf?: boolean
};

export type PlayerOptions = {
    id: string;
    client: Client;
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

export type LavalinkWebSocketMessage = {
    [key: string]: any;
    op: "playerUpdate" | "stats" | "event";
};

export type VoiceServerUpdateData = {
    token: string;
    guild_id: string;
    endpoint: string;
};

export type LavalinkEQ = {
    band: number;
    gain: number;
}[];

export type Base64 = string;
