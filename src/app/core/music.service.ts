import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, signal } from '@angular/core';
import { WEDDING_CONFIG } from './wedding-config.token';
import { WeddingConfig } from './wedding-config';

@Injectable({ providedIn: 'root' })
export class MusicService {
  private static readonly disabledPreferenceKey = 'manhan:music-disabled';
  readonly playing = signal(false);
  readonly autoScrollEnabled = signal(false);
  private readonly player: HTMLAudioElement;
  private readonly storage: Storage | null;

  constructor(
    @Inject(DOCUMENT) document: Document,
    @Inject(WEDDING_CONFIG) cfg: WeddingConfig,
  ) {
    this.player = document.createElement('audio');
    this.player.src = cfg.theme.music;
    this.player.loop = true;
    this.player.preload = 'auto';
    this.player.volume = 0.5;
    try {
      this.storage = document.defaultView?.localStorage ?? null;
    } catch {
      this.storage = null;
    }
    this.player.addEventListener('play', () => this.playing.set(true));
    this.player.addEventListener('pause', () => this.playing.set(false));
  }

  get source(): string {
    return this.player.src;
  }

  get volume(): number {
    return this.player.volume;
  }

  get shouldAutoplay(): boolean {
    try {
      return this.storage?.getItem(MusicService.disabledPreferenceKey) !== '1';
    } catch {
      return true;
    }
  }

  async tryAutoplay(): Promise<boolean> {
    if (!this.shouldAutoplay) return false;
    return this.startPlayback(false);
  }

  async toggle(): Promise<boolean> {
    if (!this.player.paused) {
      this.setAutoplayDisabled(true);
      this.pause();
      return false;
    }

    this.setAutoplayDisabled(false);
    return this.startPlayback(true);
  }

  private async startPlayback(reportFailure: boolean): Promise<boolean> {
    try {
      this.player.volume = 0.5;
      await this.player.play();
      this.playing.set(true);
      this.autoScrollEnabled.set(true);
      return true;
    } catch (error) {
      this.playing.set(false);
      this.autoScrollEnabled.set(false);
      if (reportFailure) {
        console.warn('Music playback failed:', error);
      }
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

  private setAutoplayDisabled(disabled: boolean) {
    try {
      if (disabled) {
        this.storage?.setItem(MusicService.disabledPreferenceKey, '1');
      } else {
        this.storage?.removeItem(MusicService.disabledPreferenceKey);
      }
    } catch {
      // Playback still works when storage is unavailable.
    }
  }
}
