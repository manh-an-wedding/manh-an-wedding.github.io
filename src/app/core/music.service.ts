import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, signal } from '@angular/core';
import { WEDDING_CONFIG } from './wedding-config.token';
import { WeddingConfig } from './wedding-config';

@Injectable({ providedIn: 'root' })
export class MusicService {
  readonly playing = signal(false);
  readonly autoScrollEnabled = signal(false);
  private readonly player: HTMLAudioElement;

  constructor(
    @Inject(DOCUMENT) document: Document,
    @Inject(WEDDING_CONFIG) cfg: WeddingConfig,
  ) {
    this.player = document.createElement('audio');
    this.player.src = cfg.theme.music;
    this.player.loop = true;
    this.player.preload = 'auto';
    this.player.volume = 0.5;
    this.player.addEventListener('play', () => this.playing.set(true));
    this.player.addEventListener('pause', () => this.playing.set(false));
  }

  get source(): string {
    return this.player.src;
  }

  get volume(): number {
    return this.player.volume;
  }

  async toggle(): Promise<boolean> {
    if (!this.player.paused) {
      this.pause();
      return false;
    }

    try {
      this.player.volume = 0.5;
      await this.player.play();
      this.playing.set(true);
      this.autoScrollEnabled.set(true);
      return true;
    } catch (error) {
      this.playing.set(false);
      this.autoScrollEnabled.set(false);
      console.warn('Music playback failed:', error);
      return false;
    }
  }

  pause() {
    this.player.pause();
    this.playing.set(false);
    this.autoScrollEnabled.set(false);
  }

  stopAutoScroll() {
    this.autoScrollEnabled.set(false);
  }
}
