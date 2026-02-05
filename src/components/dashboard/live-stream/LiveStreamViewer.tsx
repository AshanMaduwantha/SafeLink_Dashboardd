"use client";

import React, { useEffect, useRef, useState } from "react";
import AgoraRTC, {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from "agora-rtc-sdk-ng";

const AGORA_APP_ID = "7df716494b734dfdb300208f2caabce2";

interface LiveStreamViewerProps {
  channelName: string;
  onLeave?: () => void;
}

export default function LiveStreamViewer({
  channelName,
  onLeave,
}: LiveStreamViewerProps) {
  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
  const [joined, setJoined] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<number[]>([]);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeAgora();
    return () => {
      cleanupAgora();
    };
  }, [channelName]);

  const initializeAgora = async () => {
    try {
      console.log("🔧 Initializing Agora Web SDK...");

      // Create Agora client
      const agoraClient = AgoraRTC.createClient({
        mode: "live",
        codec: "vp8",
      });

      // Set client role to audience
      await agoraClient.setClientRole("audience");

      // Handle user published event
      agoraClient.on("user-published", async (user, mediaType) => {
        console.log("👤 User published:", user.uid, mediaType);

        await agoraClient.subscribe(user, mediaType);
        console.log("✅ Subscribed to user:", user.uid);

        if (mediaType === "video" && videoContainerRef.current) {
          const remoteVideoTrack = user.videoTrack;
          if (remoteVideoTrack) {
            // Clear existing video
            videoContainerRef.current.innerHTML = "";
            // Play remote video
            remoteVideoTrack.play(videoContainerRef.current);
            console.log("📺 Playing remote video");
          }
        }

        if (mediaType === "audio") {
          const remoteAudioTrack = user.audioTrack;
          remoteAudioTrack?.play();
          console.log("🔊 Playing remote audio");
        }

        setRemoteUsers((prev) => [...new Set([...prev, user.uid as number])]);
      });

      // Handle user unpublished event
      agoraClient.on("user-unpublished", (user) => {
        console.log("👤 User unpublished:", user.uid);
        setRemoteUsers((prev) => prev.filter((uid) => uid !== user.uid));
      });

      setClient(agoraClient);

      // Join channel
      await agoraClient.join(AGORA_APP_ID, channelName, null, null);
      setJoined(true);
      console.log("✅ Joined channel:", channelName);
    } catch (error) {
      console.error("❌ Agora initialization error:", error);
    }
  };

  const cleanupAgora = async () => {
    if (client) {
      try {
        await client.leave();
        console.log("🧹 Left Agora channel");
      } catch (error) {
        console.error("Cleanup error:", error);
      }
    }
  };

  const handleLeave = async () => {
    await cleanupAgora();
    onLeave?.();
  };

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      {/* Video Container */}
      <div
        ref={videoContainerRef}
        className="w-full h-full flex items-center justify-center"
      >
        {joined && remoteUsers.length === 0 && (
          <div className="text-center">
            <div className="text-6xl mb-4">📹</div>
            <p className="text-white text-xl font-semibold">
              Waiting for Broadcaster...
            </p>
            <p className="text-gray-400 mt-2">Channel: {channelName}</p>
          </div>
        )}
      </div>

      {/* Controls Overlay */}
      {joined && remoteUsers.length > 0 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
          <button
            onClick={handleLeave}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors"
          >
            Leave Stream
          </button>
        </div>
      )}

      {/* Viewer Count */}
      {joined && remoteUsers.length > 0 && (
        <div className="absolute top-4 right-4 bg-black/60 px-4 py-2 rounded-lg">
          <p className="text-white text-sm">
            👥 {remoteUsers.length} broadcaster
            {remoteUsers.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
