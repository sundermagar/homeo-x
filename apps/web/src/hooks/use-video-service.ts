// @ts-nocheck
import { useState, useRef, useCallback, useEffect } from 'react';
import { createProvider } from '../lib/video-call/core/video-provider.factory';
import { VideoCallService } from '../lib/video-call/core/video-call.service';
import { VideoProviderCallbacks } from '../lib/video-call/core/video-provider.interface';

interface UseVideoServiceOptions {
  onUserJoined?: (user: any) => void;
  onUserLeft?: (user: any) => void;
  initialVideoEnabled?: boolean;
  initialAudioEnabled?: boolean;
}

export function useVideoService(_options: UseVideoServiceOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [localVideoTrack, setLocalVideoTrack] = useState<any | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<any | null>(null);
  
  const [isMicOn, setIsMicOn] = useState(_options.initialAudioEnabled ?? true);
  const [isCameraOn, setIsCameraOn] = useState(_options.initialVideoEnabled ?? true);

  const serviceRef = useRef<VideoCallService | null>(null);

  useEffect(() => {
    // 1. Read Provider from Environment with fallback to LiveKit
    const providerType = import.meta.env.VITE_VIDEO_PROVIDER || 'livekit';
    
    console.log(`[VideoService] Initializing with provider: ${providerType}`);
    
    const provider = createProvider(providerType);
    const service = new VideoCallService(provider);
    
    // 2. Setup Callbacks
    const callbacks: VideoProviderCallbacks = {
      onConnected: (connected) => setIsConnected(connected),
      onRemoteUsersChanged: (users) => setRemoteUsers(users),
      onError: (err) => setError(err),
      onLocalVideoTrack: (track) => setLocalVideoTrack(track),
      onLocalAudioTrack: (track) => setLocalAudioTrack(track),
      onMicStateChanged: (isOn) => setIsMicOn(isOn),
      onCameraStateChanged: (isOn) => setIsCameraOn(isOn),
    };
    
    service.setCallbacks(callbacks);
    service.init({
      video: _options.initialVideoEnabled ?? true,
      audio: _options.initialAudioEnabled ?? true,
    });
    serviceRef.current = service;

    return () => {
      if (serviceRef.current) {
        serviceRef.current.endCall().catch(console.error);
        serviceRef.current = null;
      }
    };
  }, []); // Init once on mount

  const join = useCallback(async (appId: string, channel: string, token: string, uid?: number) => {
    if (!serviceRef.current) return;
    try {
      setError(null);
      // Passing all credentials necessary for Agora or generic providers
      await serviceRef.current.startCall(channel, { appId, token, uid });
    } catch (err: any) {
      setError(err?.message || 'Failed to join call');
    }
  }, []);

  const leave = useCallback(async () => {
    if (!serviceRef.current) return;
    try {
      await serviceRef.current.endCall();
    } catch (err: any) {
      console.error(err);
    }
  }, []);

  const toggleMic = useCallback(async () => {
    if (serviceRef.current) {
      await serviceRef.current.toggleAudio();
    }
  }, []);

  const toggleCamera = useCallback(async () => {
    if (serviceRef.current) {
      await serviceRef.current.toggleVideo();
    }
  }, []);

  const setAudio = useCallback(async (enabled: boolean) => {
    if (serviceRef.current) {
      await serviceRef.current.setAudio(enabled);
    }
  }, []);

  const setVideo = useCallback(async (enabled: boolean) => {
    if (serviceRef.current) {
      await serviceRef.current.setVideo(enabled);
    }
  }, []);

  return {
    isConnected,
    localVideoTrack,
    localAudioTrack, // Currently returned for compatibility with UI expectations for Agora
    remoteUsers,
    error,
    join,
    leave,
    toggleMic,
    toggleCamera,
    setAudio,
    setVideo,
    isMicOn,
    isCameraOn,
  };
}
