// @ts-nocheck
export interface VideoProviderCallbacks {
  onLocalVideoTrack?: (track: any) => void;
  onLocalAudioTrack?: (track: any) => void;
  onRemoteUsersChanged?: (users: any[]) => void;
  onError?: (error: string) => void;
  onConnected?: (connected: boolean) => void;
  onMicStateChanged?: (isOn: boolean) => void;
  onCameraStateChanged?: (isOn: boolean) => void;
}

export interface VideoProvider {
  init(config: any): void;
  join(roomId: string, credentials?: any): Promise<void>;
  leave(): Promise<void> | void;
  toggleAudio(): Promise<void> | void;
  toggleVideo(): Promise<void> | void;
  setAudio(enabled: boolean): Promise<void> | void;
  setVideo(enabled: boolean): Promise<void> | void;
  setCallbacks?(callbacks: VideoProviderCallbacks): void;
}

