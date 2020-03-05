/// <reference types="node" />
import { Client, Collection } from "discord.js";
import { EventEmitter } from "events";
import { LavalinkNode } from "./LavalinkNode";
import { Player } from "./Player";
import { VoiceServerUpdate, VoiceStateUpdate, LavalinkNodeOptions, PlayerManagerOptions, DiscordPacket, PlayerManagerJoinData, PlayerManagerJoinOptions } from "./Types";
export declare class PlayerManager extends EventEmitter {
    client: Client;
    nodes: Collection<string, LavalinkNode>;
    players: Collection<string, Player>;
    voiceServers: Collection<string, VoiceServerUpdate>;
    voiceStates: Collection<string, VoiceStateUpdate>;
    user: string;
    shards: number;
    private Player;
    constructor(client: Client, nodes: LavalinkNodeOptions[], options: PlayerManagerOptions);
    createNode(options: LavalinkNodeOptions): LavalinkNode;
    removeNode(id: string): boolean;
    join(data: PlayerManagerJoinData, { selfmute, selfdeaf }?: PlayerManagerJoinOptions): Player;
    leave(guild: string): Promise<boolean>;
    switch(player: Player, node: LavalinkNode): Promise<Player>;
    voiceServerUpdate(data: VoiceServerUpdate): Promise<boolean>;
    voiceStateUpdate(data: VoiceStateUpdate): Promise<boolean>;
    private _attemptConnection;
    private spawnPlayer;
    get idealNodes(): Collection<string, LavalinkNode>;
    sendWS(data: DiscordPacket): void;
}
