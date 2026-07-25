import { Injectable } from '@angular/core';
import { WEDDING } from '../../assets/config/wedding.config';

@Injectable({ providedIn: 'root' })
export class VisitService {
  async log(deviceId: string): Promise<void> {
    try {
      await fetch(`${WEDDING.supabase.url}/functions/v1/log-visit`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId }),
      });
    } catch { /* visit logging is best-effort */ }
  }
}
