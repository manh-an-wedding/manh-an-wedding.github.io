import { Injectable } from '@angular/core';

const KEY = 'manhan_device_id';

@Injectable({ providedIn: 'root' })
export class DeviceIdService {
  get(): string {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = (crypto.randomUUID?.() ?? Math.random().toString(16).slice(2) + Date.now().toString(16));
      localStorage.setItem(KEY, id);
    }
    return id;
  }
}
