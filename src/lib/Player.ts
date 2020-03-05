import { Client } from "discord.js";
import { EventEmitter } from "events";
import { PlayerEqualizerBand, PlayerManager, PlayerOptions, PlayerPlayOptions, PlayerState, PlayerUpdateVoiceState } from "..";
import { LavalinkNode } from "./LavalinkNode";

export class Player extends EventEmitter {

    public client: Client;
    public manager: PlayerManager;
    public node: LavalinkNode;
    public id: string;
    public channel: string;
    public state: PlayerState;
    public playing: boolean;
    public timestamp: number | null;
    public paused: boolean;
    public track: string | null;
    public voiceUpdateState: PlayerUpdateVoiceState | null;

    public constructor(node: LavalinkNode, options: PlayerOptions) {
        super();

        this.client = node.manager.client;
        this.manager = node.manager;
        this.node = node;

        this.id = options.id;
        this.channel = options.channel;

        this.state = { volume: 100, equalizer: [] };
        this.playing = false;
        this.timestamp = null;
        this.paused = false;
        this.track = null;
        this.voiceUpdateState = null;

        this.on("event", data => {
            switch (data.type) {
                case "TrackEndEvent":
                    if (data.reason !== "REPLACED") this.playing = false;
                    this.track = null;
                    this.timestamp = null;
                    if (this.listenerCount("end")) this.emit("end", data);
                    break;
                case "TrackExceptionEvent":
                    if (this.listenerCount("error")) this.emit("error", data);
                    break;
                case "TrackStuckEvent":
                    this.stop();
                    if (this.listenerCount("end")) this.emit("end", data);
                    break;
                case "WebSocketClosedEvent":
                    if (this.listenerCount("error")) this.emit("error", data);
                    break;
                default:
                    if (this.listenerCount("warn")) this.emit("warn", `Unexpected event type: ${data.type}`);
                    break;
            }
        }).on("playerUpdate", data => {
            this.state = { volume: this.state.volume, equalizer: this.state.equalizer, ...data.state };
        });
    }

    public async play(track: string, options: PlayerPlayOptions = {}): Promise<boolean> {
        const d = await this.send("play", { ...options, track });
        this.track = track;
        this.playing = true;
        this.timestamp = Date.now();
        return d;
    }

    public async stop(): Promise<boolean> {
        const d = await this.send("stop");
        this.playing = false;
        this.timestamp = null;
        return d;
    }

    public async pause(pause: boolean): Promise<boolean> {
        const d = await this.send("pause", { pause });
        this.paused = pause;
        return d;
    }

    public resume(): Promise<boolean> {
        return this.pause(false);
    }

    public async volume(volume: number): Promise<boolean> {
        const d = await this.send("volume", { volume });
        this.state.volume = volume;
        return d;
    }

    public seek(position: number): Promise<boolean> {
        return this.send("seek", { position });
    }

    public async equalizer(bands: PlayerEqualizerBand[]): Promise<boolean> {
        const d = await this.send("equalizer", { bands });
        this.state.equalizer = bands;
        return d;
    }

    public destroy(): Promise<boolean> {
        return this.send("destroy");
    }

    public connect(data: PlayerUpdateVoiceState): Promise<boolean> {
        this.voiceUpdateState = data;
        return this.send("voiceUpdate", data);
    }

    private send(op: string, data?: object): Promise<boolean> {
        if (!this.node.connected) return Promise.reject(new Error("No available websocket connection for selected node."));
        return this.node.send({
            ...data,
            op,
            guildId: this.id
        });
    }

}
