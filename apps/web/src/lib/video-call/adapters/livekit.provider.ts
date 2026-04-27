// @ts-nocheck
import { Room, RoomEvent, LocalVideoTrack, LocalAudioTrack, createLocalVideoTrack, createLocalAudioTrack } from 'livekit-client';
import { VideoProvider, VideoProviderCallbacks } from '../core/video-provider.interface';

export class LiveKitProvider implements VideoProvider {
  private client: Room | null = null;
  private callbacks?: VideoProviderCallbacks;
  
  private isConnected = false;
  private isMicOn = true;
  private isCameraOn = true;
  private isJoining = false;

  private localVideoTrack: LocalVideoTrack | null = null;
  private localAudioTrack: LocalAudioTrack | null = null;

  setCallbacks(callbacks: VideoProviderCallbacks) {
    this.callbacks = callbacks;
  }

  init(config: any) {
    console.log("LiveKit initialized", config);
    if (config.video !== undefined) this.isCameraOn = config.video;
    if (config.audio !== undefined) this.isMicOn = config.audio;

    this.client = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    this.setupLiveKitEvents();
  }

  private getMappedParticipants() {
    if (!this.client) return [];
    
    // Map LiveKit RemoteParticipant to UI expected {uid, videoTrack, audioTrack}
    return Array.from(this.client.remoteParticipants.values()).map(participant => {
      const videoPub = Array.from(participant.videoTrackPublications.values()).find(p => p.track);
      const audioPub = Array.from(participant.audioTrackPublications.values()).find(p => p.track);
      
      return {
        uid: participant.identity,
        videoTrack: videoPub?.track,
        audioTrack: audioPub?.track,
      };
    });
  }

  private setupLiveKitEvents() {
    if (!this.client) return;
    
    // Update UI whenever participants change
    const updateParticipants = () => {
      this.callbacks?.onRemoteUsersChanged?.(this.getMappedParticipants());
    };

    this.client.on(RoomEvent.TrackSubscribed, updateParticipants);
    this.client.on(RoomEvent.TrackUnsubscribed, updateParticipants);
    this.client.on(RoomEvent.ParticipantConnected, updateParticipants);
    this.client.on(RoomEvent.ParticipantDisconnected, updateParticipants);
  }

  async join(_roomId: string, credentials?: { token: string; appId?: string }) {
    if (this.isConnected || this.isJoining) return;
    this.isJoining = true;

    try {
      if (!this.client) {
        this.init({});
      }
      
      console.log("Connecting to LiveKit Room...");
      
      // LiveKit uses WS URL (we passed livekitUrl inside channel from the backend mapping)
      // The backend sends `channel: this.livekitUrl`. It's passed as the first argument `_roomId` via DI mapping.
      const wsUrl = _roomId || "ws://localhost:7880"; 
      const token = credentials?.token;

      if (!token) throw new Error("LiveKit token missing");

      await this.client!.connect(wsUrl, token);

      // Start Video
      if (this.isCameraOn) {
        this.localVideoTrack = await createLocalVideoTrack();
        await this.client!.localParticipant.publishTrack(this.localVideoTrack);
        this.callbacks?.onLocalVideoTrack?.(this.localVideoTrack);
      }
      
      // Start Audio
      if (this.isMicOn) {
        this.localAudioTrack = await createLocalAudioTrack();
        await this.client!.localParticipant.publishTrack(this.localAudioTrack);
      }

      this.isConnected = true;
      this.callbacks?.onConnected?.(true);
      this.callbacks?.onRemoteUsersChanged?.(this.getMappedParticipants());

    } catch (err: any) {
      console.error('LiveKit join error:', err);
      this.callbacks?.onError?.(err?.message || 'Failed to join LiveKit room');
    } finally {
      this.isJoining = false;
    }
  }

  async leave() {
    console.log("Leaving LiveKit");
    if (!this.client) return;

    try {
      if (this.localVideoTrack) {
        this.localVideoTrack.stop();
        this.localVideoTrack = null;
      }
      if (this.localAudioTrack) {
        this.localAudioTrack.stop();
        this.localAudioTrack = null;
      }

      await this.client.disconnect();
      
      this.isConnected = false;
      this.callbacks?.onConnected?.(false);
      this.callbacks?.onLocalVideoTrack?.(null);
      this.callbacks?.onRemoteUsersChanged?.([]);
    } catch (err) {
      console.error("LiveKit leave error:", err);
    }
  }

  async toggleAudio() {
    await this.setAudio(!this.isMicOn);
  }

  async setAudio(enabled: boolean) {
    if (!this.client || !this.isConnected || !this.localAudioTrack) {
      this.isMicOn = enabled;
      this.callbacks?.onMicStateChanged?.(this.isMicOn);
      return;
    }

    try {
      if (enabled) {
        await this.localAudioTrack.unmute();
      } else {
        await this.localAudioTrack.mute();
      }
      this.isMicOn = enabled;
      this.callbacks?.onMicStateChanged?.(this.isMicOn);
    } catch (err) {
      console.error('LiveKit set audio error:', err);
    }
  }

  async toggleVideo() {
    await this.setVideo(!this.isCameraOn);
  }

  async setVideo(enabled: boolean) {
    if (!this.client || !this.isConnected || !this.localVideoTrack) {
      this.isCameraOn = enabled;
      this.callbacks?.onCameraStateChanged?.(this.isCameraOn);
      return;
    }

    try {
      if (!enabled) {
        await this.localVideoTrack.mute();
        this.callbacks?.onLocalVideoTrack?.(null);
      } else {
        await this.localVideoTrack.unmute();
        this.callbacks?.onLocalVideoTrack?.(this.localVideoTrack);
      }
      this.isCameraOn = enabled;
      this.callbacks?.onCameraStateChanged?.(this.isCameraOn);
    } catch (err) {
      console.error('LiveKit set video error:', err);
    }
  }
}

