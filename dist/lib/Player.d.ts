/// <reference types="node" />
import { EventEmitter } from "events";
import { PlayerManager } from "./PlayerManager";
import { LavalinkNode } from "./LavalinkNode";
import { Client } from "discord.js";
import { PlayerState, PlayerUpdateVoiceState, PlayerOptions, PlayerPlayOptions, PlayerEqualizerBand } from "..";
export declare class Player extends EventEmitter {
    client: Client;
    manager: PlayerManager;
    node: LavalinkNode;
    id: string;
    channel: string;
    state: PlayerState;
    playing: boolean;
    timestamp: number | null;
    paused: boolean;
    track: string | null;
    voiceUpdateState: PlayerUpdateVoiceState | null;
    constructor(node: LavalinkNode, options: PlayerOptions);
    play(track: string, options?: PlayerPlayOptions): Promise<boolean>;
    stop(): Promise<boolean>;
    pause(pause: boolean): Promise<boolean>;
    resume(): Promise<boolean>;
    volume(volume: number): Promise<boolean>;
    seek(position: number): Promise<boolean>;
    equalizer(bands: PlayerEqualizerBand[]): Promise<boolean>;
    destroy(): Promise<boolean>;
    connect(data: PlayerUpdateVoiceState): Promise<boolean>;
    private send;
}
