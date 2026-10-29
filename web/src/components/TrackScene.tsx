'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface TrackSceneProps {
  bookingId: string;
  workerName: string;
  skillKey: string;
  area: string;
  onEtaUpdate?: (etaMinutes: number, distanceKm: number, status: string) => void;
}

export default function TrackScene({
  bookingId,
  workerName,
  skillKey,
  area,
  onEtaUpdate,
}: TrackSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);
  const [currentEta, setCurrentEta] = useState<number>(12);
  const [currentDistance, setCurrentDistance] = useState<number>(3.4);
  const [liveStatus, setLiveStatus] = useState<string>('ON_THE_WAY');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check WebGL
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      setHasWebGL(false);
      return;
    }

    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(22, 26, 26);
    camera.lookAt(0, 0, 0);

    // Ambient and Directional Light
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffc21a, 1.2);
    sun.position.set(15, 30, 20);
    sun.castShadow = true;
    scene.add(sun);

    // Grid Floor
    const grid = new THREE.GridHelper(30, 15, 0xffc21a, 0xd9dfdd);
    grid.position.y = 0.05;
    scene.add(grid);

    // Low-poly City Blocks along Road Grid
    const cityGroup = new THREE.Group();
    const buildingCoords = [
      { x: -8, z: -8, h: 6, c: 0x1d4e89 },
      { x: -8, z: -2, h: 4, c: 0x2b3d45 },
      { x: -2, z: -8, h: 8, c: 0x5b6b72 },
      { x: 6, z: -8, h: 5, c: 0x1d4e89 },
      { x: -8, z: 6, h: 7, c: 0x2b3d45 },
      { x: 6, z: 6, h: 4, c: 0x5b6b72 },
      { x: 2, z: -2, h: 9, c: 0x1d4e89 },
    ];

    buildingCoords.forEach((b) => {
      const geo = new THREE.BoxGeometry(3.5, b.h, 3.5);
      const mat = new THREE.MeshLambertMaterial({ color: b.c });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(b.x, b.h / 2, b.z);
      m.castShadow = true;
      m.receiveShadow = true;
      cityGroup.add(m);
    });

    // Landmark 1: Customer Home (Destination Marker - Yellow Pin)
    const homePinGeo = new THREE.CylinderGeometry(0.8, 0, 2.5, 12);
    const homePinMat = new THREE.MeshStandardMaterial({
      color: 0xffc21a,
      metalness: 0.5,
      roughness: 0.2,
      emissive: 0xffc21a,
      emissiveIntensity: 0.3,
    });
    const homePin = new THREE.Mesh(homePinGeo, homePinMat);
    homePin.position.set(8, 2, 8);
    homePin.rotation.x = Math.PI;
    cityGroup.add(homePin);

    // Pulsing circle under home
    const ringGeo = new THREE.RingGeometry(1, 1.4, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffc21a, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(8, 0.1, 8);
    cityGroup.add(ring);

    // Landmark 2: Worker Marker (Vehicle / Artisan Token)
    const workerGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const workerMat = new THREE.MeshStandardMaterial({
      color: 0x14232b,
      metalness: 0.6,
      roughness: 0.2,
    });
    const workerMarker = new THREE.Mesh(workerGeo, workerMat);
    workerMarker.position.set(-10, 1.2, -10);
    cityGroup.add(workerMarker);

    scene.add(cityGroup);

    // Connecting Waypoint Path Polyline
    const pathPoints = [
      new THREE.Vector3(-10, 0.2, -10),
      new THREE.Vector3(-10, 0.2, -2),
      new THREE.Vector3(-2, 0.2, -2),
      new THREE.Vector3(-2, 0.2, 4),
      new THREE.Vector3(8, 0.2, 4),
      new THREE.Vector3(8, 0.2, 8),
    ];
    const pathCurve = new THREE.CatmullRomCurve3(pathPoints);
    const pathGeo = new THREE.TubeGeometry(pathCurve, 64, 0.12, 8, false);
    const pathMat = new THREE.MeshBasicMaterial({ color: 0x1d4e89 });
    const pathMesh = new THREE.Mesh(pathGeo, pathMat);
    scene.add(pathMesh);

    // Real-Time GPS Stream via SSE (or simulation fallback)
    let sseSource: EventSource | null = null;
    let targetPos = new THREE.Vector3(-10, 1.2, -10);

    try {
      sseSource = new EventSource(`/api/bookings/${bookingId}/track`);
      sseSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.status) {
            setLiveStatus(data.status);
          }
          if (data.lat && data.lng) {
            // Project real lat/lng delta to 3D city grid coordinates [-10..8]
            const targetX = ((data.lng - 75.3) / 0.1) * 18 - 5;
            const targetZ = ((data.lat - 19.85) / 0.1) * 18 - 5;
            targetPos.set(
              Math.max(-11, Math.min(11, targetX)),
              1.2,
              Math.max(-11, Math.min(11, targetZ))
            );
          }
        } catch (e) {
          // ignore parsing error on heartbeats
        }
      };
    } catch (e) {
      console.warn('SSE tracking unavailable, engaging simulation fallback.');
    }

    // Animation & Smooth Interpolation
    let frameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();

      // If no live SSE updates arrived, run smooth realistic simulation along path
      if (!sseSource || targetPos.x === -10) {
        const loopDuration = 35; // 35 seconds journey
        const progress = Math.min(1, (elapsed % loopDuration) / loopDuration);
        const point = pathCurve.getPointAt(progress);
        workerMarker.position.copy(point);
        workerMarker.position.y = 1.2 + Math.sin(elapsed * 4) * 0.1;

        const distanceRemaining = ((1 - progress) * 3.8).toFixed(1);
        const etaMinutes = Math.ceil((1 - progress) * 14);
        setCurrentDistance(Number(distanceRemaining));
        setCurrentEta(etaMinutes);
        if (onEtaUpdate) {
          onEtaUpdate(etaMinutes, Number(distanceRemaining), progress >= 0.95 ? 'ARRIVED' : 'ON_THE_WAY');
        }
      } else {
        // Lerp to live target position smoothly
        workerMarker.position.lerp(targetPos, 0.08);
        const dist = workerMarker.position.distanceTo(homePin.position) * 0.25;
        const eta = Math.ceil(dist * 3.5);
        setCurrentDistance(Number(dist.toFixed(1)));
        setCurrentEta(eta);
        if (onEtaUpdate) {
          onEtaUpdate(eta, Number(dist.toFixed(1)), liveStatus);
        }
      }

      // Gentle camera orbit and pulsating home pin
      ring.scale.setScalar(1 + Math.sin(elapsed * 3) * 0.15);
      homePin.position.y = 2.8 + Math.sin(elapsed * 2.5) * 0.3;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      if (sseSource) sseSource.close();
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [bookingId, onEtaUpdate, liveStatus]);

  return (
    <div className="w-full relative rounded-xl overflow-hidden border border-line bg-card/40">
      <div ref={containerRef} className="w-full h-[260px] md:h-[300px]" />
      <div className="absolute top-3 left-3 bg-card/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-line text-xs flex items-center gap-2 shadow-sm">
        <span className="w-2.5 h-2.5 rounded-full bg-ok animate-pulse" />
        <span className="font-semibold text-ink">Live GPS · {workerName}</span>
      </div>
      <div className="absolute bottom-3 left-3 right-3 bg-card/90 backdrop-blur-md px-4 py-2.5 rounded-lg border border-line flex items-center justify-between text-xs shadow-sm">
        <div>
          <span className="text-mute block">Estimated Arrival</span>
          <span className="font-baloo text-base font-bold text-ink">
            {currentEta <= 0 ? 'Arrived at your doorstep!' : `${currentEta} mins`}
          </span>
        </div>
        <div className="text-right">
          <span className="text-mute block">Distance</span>
          <span className="font-semibold text-blue">{currentDistance} km away</span>
        </div>
      </div>
    </div>
  );
}
