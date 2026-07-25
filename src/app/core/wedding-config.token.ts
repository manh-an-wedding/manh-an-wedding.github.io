import { InjectionToken } from '@angular/core';
import { WeddingConfig } from './wedding-config';
import { WEDDING } from '../../assets/config/wedding.config';

export const WEDDING_CONFIG = new InjectionToken<WeddingConfig>('WEDDING_CONFIG', {
  providedIn: 'root',
  factory: () => WEDDING,
});
