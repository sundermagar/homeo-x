// @ts-nocheck
import { VideoProvider } from './video-provider.interface';
import { ZoomProvider } from '../adapters/zoom.provider';
import { WebRTCProvider } from '../adapters/webrtc.provider';
import { LiveKitProvider } from '../adapters/livekit.provider';

export function createProvider(type: string): VideoProvider {
  switch (type.toLowerCase()) {
    case "zoom":
      return new ZoomProvider();

    case "livekit":
      return new LiveKitProvider();

    case "webrtc":
      return new WebRTCProvider();

    default:
      throw new Error(`Unsupported provider: ${type}`);
  }
}

