// @ts-nocheck
// Zoom provider stub — not used in current deployment
import { VideoProvider, VideoProviderCallbacks } from '../core/video-provider.interface';

export class ZoomProvider implements VideoProvider {
  setCallbacks(_cb: VideoProviderCallbacks) {}
  init(_config: any) {}
  async join(_roomId: string, _credentials?: any) { throw new Error('Zoom not configured'); }
  async leave() {}
  async toggleAudio() {}
  async setAudio(_enabled: boolean) {}
  async toggleVideo() {}
  async setVideo(_enabled: boolean) {}
}
