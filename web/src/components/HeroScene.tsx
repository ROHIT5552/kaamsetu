'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function HeroScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Accessibility: Check prefers-reduced-motion
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 2. WebGL Support Test
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

    // Scene & Camera (Isometric Orthographic or low-angle Perspective)
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(18, 22, 28);
    camera.lookAt(0, 0, 0);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffc21a, 1.2);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const blueLight = new THREE.PointLight(0x7fb0ee, 0.9, 50);
    blueLight.position.set(-15, 10, -10);
    scene.add(blueLight);

    // Ground Platform - Hexagonal / Rounded City Base
    const baseGeo = new THREE.CylinderGeometry(14, 15, 1.2, 8);
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x17262d });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -0.6;
    baseMesh.receiveShadow = true;
    scene.add(baseMesh);

    // Grid Roads & Yellow Lane Dividers
    const gridHelper = new THREE.GridHelper(24, 12, 0xffc21a, 0x2b3d45);
    gridHelper.position.y = 0.05;
    scene.add(gridHelper);

    // Low-poly City Buildings & Structures
    const group = new THREE.Group();
    const buildingColors = [0x1d4e89, 0x2b3d45, 0xffc21a, 0x5b6b72, 0x17794f];

    const buildingsData = [
      { x: -5, z: -5, w: 3, h: 7, d: 3, c: 0 },
      { x: 3, z: -6, w: 4, h: 10, d: 3, c: 1 },
      { x: -6, z: 2, w: 3.5, h: 5, d: 3.5, c: 3 },
      { x: 4, z: 3, w: 3, h: 6, d: 4, c: 4 },
      { x: -1, z: -2, w: 2.5, h: 4, d: 2.5, c: 0 },
      { x: 0, z: 5, w: 3, h: 3, d: 3, c: 2 },
    ];

    buildingsData.forEach((b) => {
      const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
      const mat = new THREE.MeshLambertMaterial({
        color: buildingColors[b.c],
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(b.x, b.h / 2, b.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    });

    // 3D Worker Floating Tool Tokens (Wrench, Paint Roller, Brick)
    // 1. Tool: Wrench Representation
    const wrenchGeo = new THREE.TorusGeometry(1, 0.3, 8, 16);
    const wrenchMat = new THREE.MeshStandardMaterial({ color: 0xffc21a, metalness: 0.8, roughness: 0.3 });
    const wrench = new THREE.Mesh(wrenchGeo, wrenchMat);
    wrench.position.set(-3, 10, 2);
    wrench.rotation.x = Math.PI / 4;
    group.add(wrench);

    // 2. Floating Brick
    const brickGeo = new THREE.BoxGeometry(2, 0.8, 1.2);
    const brickMat = new THREE.MeshLambertMaterial({ color: 0xb3261e });
    const brick = new THREE.Mesh(brickGeo, brickMat);
    brick.position.set(3, 12, -2);
    group.add(brick);

    // 3. Floating Power Light Token
    const lightTokenGeo = new THREE.OctahedronGeometry(1.1);
    const lightTokenMat = new THREE.MeshStandardMaterial({
      color: 0xffc21a,
      emissive: 0xffc21a,
      emissiveIntensity: 0.6,
    });
    const lightToken = new THREE.Mesh(lightTokenGeo, lightTokenMat);
    lightToken.position.set(0, 11, -4);
    group.add(lightToken);

    scene.add(group);

    // Animation control with visibility & intersection observer
    let animationFrameId: number;
    let isVisible = true;

    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    });
    observer.observe(container);

    const onVisibilityChange = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    // Interactive subtle mouse tracking
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Render loop
    let clock = new THREE.Clock();
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isVisible || reducedMotion) {
        renderer.render(scene, camera);
        return;
      }

      const elapsed = clock.getElapsedTime();

      // Gentle rotation & floating tool animation
      group.rotation.y = elapsed * 0.15 + mouseX * 0.2;
      camera.position.y = 22 + mouseY * 2;

      wrench.position.y = 9.5 + Math.sin(elapsed * 2) * 0.8;
      wrench.rotation.z = elapsed * 1.2;

      brick.position.y = 11.5 + Math.cos(elapsed * 1.8) * 0.7;
      brick.rotation.y = elapsed * 0.9;

      lightToken.position.y = 10.8 + Math.sin(elapsed * 2.5) * 0.6;
      lightToken.rotation.x = elapsed * 1.5;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  if (!hasWebGL) {
    // 3D Fallback when WebGL is unavailable
    return (
      <div className="w-full h-full flex items-center justify-center bg-card/20 rounded-2xl border border-line p-6 text-center">
        <div className="space-y-3">
          <div className="text-4xl animate-bounce">🏙️ 🔧 💡</div>
          <p className="text-sm text-mute">
            KaamSetu 3D City Visualization active in hardware-accelerated browsers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[340px] md:min-h-[420px] relative pointer-events-none"
      aria-label="3D Interactive Aurangabad City & Skilled Worker Hub"
    />
  );
}
