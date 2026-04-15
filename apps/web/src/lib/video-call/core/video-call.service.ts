// @ts-nocheck
import { VideoProvider, VideoProviderCallbacks } from './video-provider.interface';

export class VideoCallService {
  constructor(private provider: VideoProvider) {}

  public init(config: any) {
    this.provider.init(config);
  }

  public setCallbacks(callbacks: VideoProviderCallbacks) {
    if (this.provider.setCallbacks) {
      this.provider.setCallbacks(callbacks);
    }
  }

  public async startCall(roomId: string, credentials?: any) {
    await this.provider.join(roomId, credentials);
  }

  public async endCall() {
    await this.provider.leave();
  }

  public async toggleAudio() {
    await this.provider.toggleAudio();
  }

  public async toggleVideo() {
    await this.provider.toggleVideo();
  }

  public async setAudio(enabled: boolean) {
    await this.provider.setAudio(enabled);
  }

  public async setVideo(enabled: boolean) {
    await this.provider.setVideo(enabled);
  }
}

