// @ts-nocheck
import { VideoProvider, VideoProviderCallbacks } from '../core/video-provider.interface';

export class WebRTCProvider implements VideoProvider {
  private callbacks?: VideoProviderCallbacks;
  private isMicOn = true;
  private isCameraOn = true;

  setCallbacks(callbacks: VideoProviderCallbacks) {
    this.callbacks = callbacks;
  }

  init(config: any) {
    console.log("WebRTC initialized", config);
  }

  async join(roomId: string, _credentials?: any) {
    console.log("Joining WebRTC room:", roomId);
    this.callbacks?.onConnected?.(true);
  }

  async leave() {
    console.log("Leaving WebRTC");
    this.callbacks?.onConnected?.(false);
  }

  toggleAudio() {
    this.setAudio(!this.isMicOn);
  }

  toggleVideo() {
    this.setVideo(!this.isCameraOn);
  }

  setAudio(enabled: boolean) {
    this.isMicOn = enabled;
    this.callbacks?.onMicStateChanged?.(this.isMicOn);
  }

  setVideo(enabled: boolean) {
    this.isCameraOn = enabled;
    this.callbacks?.onCameraStateChanged?.(this.isCameraOn);
  }
}

