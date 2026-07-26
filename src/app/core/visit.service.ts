import { Injectable } from '@angular/core';
import { WEDDING } from '../../assets/config/wedding.config';

@Injectable({ providedIn: 'root' })
export class VisitService {
  async log(deviceId: string): Promise<void> {
    try {
      const response = await fetch(`${WEDDING.supabase.url}/functions/v1/log-visit`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId }),
      });
      if (!response.ok) {
        console.warn(`Visit logging failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.warn('Visit logging failed:', error);
    }
  }
}
