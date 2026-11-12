import loops from '../data/audio-loops.json';
import tracks from '../data/audio-tracks.json';

export type AudioId = keyof typeof tracks;
type Loop = { sampleRate: number; startFrame: number; endFrame: number };
type Voice = { source: AudioBufferSourceNode; started: number; offset: number };
type Music = { id: AudioId; offset: number; voice?: Voice };

/** Plays the supplied WAVs; the game remains responsible for choosing event IDs. */
export class AudioEngine {
  private context?: AudioContext;
  private output?: GainNode;
  private buffers = new Map<AudioId, Promise<AudioBuffer>>();
  private music?: Music;
  private interruption?: Music;
  private effects = new Map<string, Voice>();
  private effectVersions = new Map<string, number>();
  private paused = false;
  private muted = false;

  // Async asset errors are retained for the UI/test bridge to inspect.
  readonly errors: string[] = [];

  async unlock(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      this.output = this.context.createGain();
      this.output.gain.value = this.muted ? 0 : 0.7;
      this.output.connect(this.context.destination);
    }
    await this.context.resume();
    this.startMusic();
    this.startInterruption();
    // Short effects are inexpensive to cache. Long music is decoded on demand.
    for (const [id, track] of Object.entries(tracks)) {
      if (track.kind === 'sound_effect' || track.kind === 'pause_command') void this.buffer(id as AudioId).catch((error: unknown) => this.report(error));
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.context && this.output) this.output.gain.setValueAtTime(muted ? 0 : 0.7, this.context.currentTime);
  }

  setPaused(paused: boolean): void {
    if (this.paused === paused) return;
    this.paused = paused;
    if (paused) {
      this.freeze(this.music);
      this.freeze(this.interruption);
      this.clearEffects();
      this.effect('sfx_pause');
    } else {
      this.effect('sfx_unpause');
      this.startInterruption();
      this.startMusic();
    }
  }

  playMusic(id: string): void {
    if (id === 'command_silence') { this.stopMusic(); return; }
    if (!this.isId(id)) return;
    if (this.music?.id === id) return;
    this.stopVoice(this.music?.voice);
    this.music = { id, offset: 0 };
    this.startMusic();
  }

  stopMusic(): void {
    this.stopVoice(this.music?.voice);
    this.stopVoice(this.interruption?.voice);
    this.music = undefined;
    this.interruption = undefined;
  }

  effect(id: string): void {
    if (id === 'command_silence') { this.stopMusic(); return; }
    if (!this.isId(id)) return;
    const track = tracks[id];
    if (track.kind === 'event_music') {
      if (id === 'event_victory') {
        this.stopMusic();
        this.clearEffects();
        this.playMusic(id);
        return;
      }
      if (id === 'event_hurry') {
        this.freeze(this.music);
        const hurry = `${this.music?.id}_hurry`;
        if (this.isId(hurry)) this.music = { id: hurry, offset: 0 };
      } else {
        this.stopMusic();
        this.clearEffects();
      }
      this.stopVoice(this.interruption?.voice);
      this.interruption = { id, offset: 0 };
      this.startInterruption();
      return;
    }
    if (!this.context || (this.paused && track.kind !== 'pause_command')) return;
    // Separate square/noise effects may overlap. A new effect replaces the
    // previous effect on its manifest channel; premixed music remains audible.
    const channel = 'channel' in track ? track.channel : 'pause';
    const version = (this.effectVersions.get(channel) ?? 0) + 1;
    this.effectVersions.set(channel, version);
    this.stopVoice(this.effects.get(channel));
    this.effects.delete(channel);
    void this.buffer(id).then((buffer) => {
      if (this.effectVersions.get(channel) !== version || (this.paused && track.kind !== 'pause_command')) return;
      const voice = this.voice(id, buffer, 0);
      this.effects.set(channel, voice);
      voice.source.onended = () => { if (this.effects.get(channel) === voice) this.effects.delete(channel); };
    }).catch((error: unknown) => this.report(error));
  }

  private isId(id: string): id is AudioId {
    return Object.prototype.hasOwnProperty.call(tracks, id);
  }

  private buffer(id: AudioId): Promise<AudioBuffer> {
    let loading = this.buffers.get(id);
    if (!loading) {
      const load = (url: string) => fetch(url).then((response) => {
        if (!response.ok) throw new Error(`Audio ${id}: HTTP ${response.status}`);
        return response.arrayBuffer();
      }).then((bytes) => this.context!.decodeAudioData(bytes));
      // The compressed copy (tools/harness/compress-audio.mjs, sample-exact for the loop points) is preferred; the original WAV is the fallback.
      const file = tracks[id].file;
      loading = load(`${import.meta.env?.BASE_URL??'/'}assets-web/audio/${file.replace(/\.wav$/, '.mp3')}`).catch(() => load(`${import.meta.env?.BASE_URL??'/'}assets/audio/${file}`));
      this.buffers.set(id, loading);
    }
    return loading;
  }

  private voice(id: AudioId, buffer: AudioBuffer, offset: number): Voice {
    const source = this.context!.createBufferSource();
    source.buffer = buffer;
    const loop = (loops as Partial<Record<AudioId, Loop>>)[id];
    if (loop) {
      source.loop = true;
      source.loopStart = loop.startFrame / loop.sampleRate;
      source.loopEnd = loop.endFrame / loop.sampleRate;
    }
    source.connect(this.output!);
    source.start(0, offset);
    return { source, started: this.context!.currentTime, offset };
  }

  private startMusic(): void {
    const music = this.music;
    if (!this.context || this.paused || this.interruption || !music || music.voice) return;
    void this.buffer(music.id).then((buffer) => {
      if (this.music !== music || this.paused || this.interruption || music.voice) return;
      music.voice = this.voice(music.id, buffer, music.offset);
    }).catch((error: unknown) => this.report(error));
  }

  private startInterruption(): void {
    const interruption = this.interruption;
    if (!this.context || this.paused || !interruption || interruption.voice) return;
    void this.buffer(interruption.id).then((buffer) => {
      if (this.interruption !== interruption || this.paused || interruption.voice) return;
      interruption.voice = this.voice(interruption.id, buffer, interruption.offset);
      interruption.voice.source.onended = () => {
        if (this.interruption !== interruption) return;
        this.interruption = undefined;
        this.startMusic();
      };
    }).catch((error: unknown) => this.report(error));
  }

  private freeze(music?: Music): void {
    if (!music?.voice || !this.context) return;
    music.offset = music.voice.offset + this.context.currentTime - music.voice.started;
    const loop = (loops as Partial<Record<AudioId, Loop>>)[music.id];
    if (loop && music.offset >= loop.endFrame / loop.sampleRate) {
      const start = loop.startFrame / loop.sampleRate;
      const duration = (loop.endFrame - loop.startFrame) / loop.sampleRate;
      music.offset = start + (music.offset - start) % duration;
    }
    this.stopVoice(music.voice);
    music.voice = undefined;
  }

  private stopVoice(voice?: Voice): void {
    if (!voice) return;
    voice.source.onended = null;
    voice.source.stop();
    voice.source.disconnect();
  }

  private clearEffects(): void {
    for (const voice of this.effects.values()) this.stopVoice(voice);
    // Also cancel effects whose network/decode request is still pending.
    for (const [channel, version] of this.effectVersions) this.effectVersions.set(channel, version + 1);
    this.effects.clear();
  }

  private report(error: unknown): void {
    this.errors.push(error instanceof Error ? error.message : String(error));
  }
}
