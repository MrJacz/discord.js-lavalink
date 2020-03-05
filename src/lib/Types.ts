import { Player } from "./Player";

export interface PlayerManagerOptions {
    user: string;
    shards?: number;
    Player?: Player;
}

export interface PlayerManagerJoinData {
    guild: string;
    channel: string;
    host: string;
}

export interface PlayerManagerJoinOptions {
    selfmute?: boolean;
    selfdeaf?: boolean;
}

export interface VoiceServerUpdate {
    token: string;
    guild_id: string;
    endpoint: string;
}

export interface VoiceStateUpdate {
    guild_id: string;
    channel_id?: string;
    user_id: string;
    session_id: string;
    deaf?: boolean;
    mute?: boolean;
    self_deaf?: boolean;
    self_mute?: boolean;
    suppress?: boolean;
}

export interface DiscordPacket {
    op: number;
    d: any;
    s?: number;
    t?: string;
}

export interface LavalinkNodeOptions {
    tag?: string;
    host: string;
    port: number | string;
    password?: string;
    reconnectInterval?: number;
}

export interface LavalinkNodeStats {
    players: number;
    playingPlayers: number;
    uptime: number;
    memory: {
        free: number;
        used: number;
        allocated: number;
        reservable: number;
    };
    cpu: {
        cores: number;
        systemLoad: number;
        lavalinkLoad: number;
    };
    frameStats?: {
        sent?: number;
        nulled?: number;
        deficit?: number;
    };
}

export interface PlayerOptions {
    id: string;
    channel: string;
}

export interface PlayerState {
    time?: number;
    position?: number;
    volume: number;
    equalizer: PlayerEqualizerBand[];
}

export interface PlayerPlayOptions {
    startTime?: number;
    endTime?: number;
    noReplace?: boolean;
    pause?: boolean;
    volume?: number;
}

export interface PlayerEqualizerBand {
    band: number;
    gain: number;
}

export interface PlayerUpdateVoiceState {
    sessionId: string;
    event: {
        token: string;
        guild_id: string;
        endpoint: string;
    };
}
