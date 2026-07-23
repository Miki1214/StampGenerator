import { useEffect, useRef } from "react";
import type { Mesh } from "@stamp-generator/geometry-core";
import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh as ThreeMesh,
  MeshPhongMaterial,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { PreviewStatus } from "../hooks/useStampPipeline";
import { meshToThreeGeometry } from "../lib/mesh-to-three-geometry";

export interface StampPreviewProps {
  mesh: Mesh | null;
  status: PreviewStatus;
}

/** Design face (low Z) — dark rubber. */
const COLOR_DESIGN = new Color("#121826");
/** Base plate — light so it separates from handle + background. */
const COLOR_BASE = new Color("#f0f3ee");
/** Handle — medium cool grey. */
const COLOR_HANDLE = new Color("#6b7c8f");

/**
 * Exact default camera pose (world space, Z-up). Paste new values from the
 * console `[StampPreview camera]` log — set 1:1, no remapping.
 * Used for Reset on the main view and as the locked inset pose.
 */
const DEFAULT_CAMERA = {
  position: { x: 73.75, y: -238.066, z: 110.649 },
  target: { x: 30.388, y: -56.134, z: 51.388 },
  up: { x: 0, y: 0, z: 1 },
} as const;

/**
 * Color by absolute height from the print bed. Design (~2mm) + base (~5mm)
 * are a small band at the bottom; the rest is the handle.
 */
function applyHeightContrastColors(geometry: BufferGeometry) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) {
    return;
  }

  const minZ = box.min.z;
  const position = geometry.getAttribute("position");
  const colors = new Float32Array(position.count * 3);
  const mixed = new Color();

  for (let i = 0; i < position.count; i += 1) {
    const zFromBed = position.getZ(i) - minZ;
    if (zFromBed < 2.5) {
      mixed.copy(COLOR_DESIGN);
    } else if (zFromBed < 8.5) {
      if (zFromBed < 4) {
        mixed.copy(COLOR_DESIGN).lerp(COLOR_BASE, (zFromBed - 2.5) / 1.5);
      } else if (zFromBed < 7) {
        mixed.copy(COLOR_BASE);
      } else {
        mixed.copy(COLOR_BASE).lerp(COLOR_HANDLE, (zFromBed - 7) / 1.5);
      }
    } else {
      mixed.copy(COLOR_HANDLE);
    }
    colors[i * 3] = mixed.r;
    colors[i * 3 + 1] = mixed.g;
    colors[i * 3 + 2] = mixed.b;
  }

  geometry.setAttribute("color", new BufferAttribute(colors, 3));
}

function createStampMaterial(): MeshPhongMaterial {
  return new MeshPhongMaterial({
    color: 0xffffff,
    vertexColors: true,
    shininess: 28,
    specular: new Color(0x334455),
    emissive: new Color(0x0c121c),
    emissiveIntensity: 0.35,
  });
}

function addStampLights(scene: Scene) {
  const hemi = new HemisphereLight(0xffffff, 0x334155, 1.6);
  const ambient = new AmbientLight(0xffffff, 1.1);
  const key = new DirectionalLight(0xffffff, 1.4);
  key.position.set(40, -120, 90);
  const fill = new DirectionalLight(0xe8f0ff, 1.2);
  fill.position.set(-100, -20, 70);
  const top = new DirectionalLight(0xffffff, 0.9);
  top.position.set(0, 40, 160);
  const front = new DirectionalLight(0xffffff, 0.85);
  front.position.set(0, -150, 30);
  scene.add(hemi, ambient, key, fill, top, front);
}

function createRenderer(container: HTMLElement): WebGLRenderer | null {
  try {
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
    if (!gl) {
      return null;
    }
    const renderer = new WebGLRenderer({ antialias: true, canvas: probe });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    return renderer;
  } catch {
    return null;
  }
}

function applyFixedCameraPose(
  camera: PerspectiveCamera,
  pose: typeof DEFAULT_CAMERA,
) {
  camera.up.set(pose.up.x, pose.up.y, pose.up.z);
  camera.position.set(pose.position.x, pose.position.y, pose.position.z);
  camera.lookAt(pose.target.x, pose.target.y, pose.target.z);

  const radius = camera.position.distanceTo(
    new Vector3(pose.target.x, pose.target.y, pose.target.z),
  );
  camera.near = Math.max(radius / 100, 0.1);
  camera.far = Math.max(radius * 20, 2000);
  camera.updateProjectionMatrix();
}

function applyOrbitCameraPose(
  camera: PerspectiveCamera,
  controls: OrbitControls,
  pose: typeof DEFAULT_CAMERA,
) {
  camera.up.set(pose.up.x, pose.up.y, pose.up.z);
  camera.position.set(pose.position.x, pose.position.y, pose.position.z);
  controls.target.set(pose.target.x, pose.target.y, pose.target.z);

  const radius = camera.position.distanceTo(controls.target);
  camera.near = Math.max(radius / 100, 0.1);
  camera.far = Math.max(radius * 20, 2000);
  camera.updateProjectionMatrix();
  controls.update();
}

function buildStampObject(mesh: Mesh, material: MeshPhongMaterial): ThreeMesh {
  const geometry = meshToThreeGeometry(mesh);
  applyHeightContrastColors(geometry);
  return new ThreeMesh(geometry, material);
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Logs the exact fields stored in DEFAULT_CAMERA — copy/paste 1:1. */
function logCameraPose(
  camera: PerspectiveCamera,
  controls: OrbitControls,
  reason: string,
) {
  console.log(`[StampPreview camera:${reason}] paste into DEFAULT_CAMERA:`, {
    position: {
      x: round3(camera.position.x),
      y: round3(camera.position.y),
      z: round3(camera.position.z),
    },
    target: {
      x: round3(controls.target.x),
      y: round3(controls.target.y),
      z: round3(controls.target.z),
    },
    up: {
      x: round3(camera.up.x),
      y: round3(camera.up.y),
      z: round3(camera.up.z),
    },
  });
}

export function StampPreview({ mesh, status }: StampPreviewProps) {
  const mainRef = useRef<HTMLDivElement | null>(null);
  const insetRef = useRef<HTMLDivElement | null>(null);
  const replaceMeshRef = useRef<((next: Mesh | null) => void) | null>(null);
  const resetCameraRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const mainContainer = mainRef.current;
    const insetContainer = insetRef.current;
    if (!mainContainer || !insetContainer) {
      return;
    }

    const mainScene = new Scene();
    mainScene.background = new Color("#0a192f");
    const insetScene = new Scene();
    insetScene.background = new Color("#020c1b");

    const mainCamera = new PerspectiveCamera(35, 1, 0.1, 2000);
    mainCamera.up.set(0, 0, 1);
    const insetCamera = new PerspectiveCamera(35, 1, 0.1, 2000);
    insetCamera.up.set(0, 0, 1);

    const mainRenderer = createRenderer(mainContainer);
    const insetRenderer = createRenderer(insetContainer);
    if (!mainRenderer || !insetRenderer) {
      mainRenderer?.dispose();
      insetRenderer?.dispose();
      return;
    }

    const controls = new OrbitControls(mainCamera, mainRenderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = false;

    const onControlsEnd = () => logCameraPose(mainCamera, controls, "end");
    controls.addEventListener("end", onControlsEnd);

    addStampLights(mainScene);
    addStampLights(insetScene);

    const mainMaterial = createStampMaterial();
    const insetMaterial = createStampMaterial();

    let mainStamp: ThreeMesh | null = null;
    let insetStamp: ThreeMesh | null = null;
    let frameId = 0;
    let disposed = false;

    const resetCamera = () => {
      applyOrbitCameraPose(mainCamera, controls, DEFAULT_CAMERA);
      logCameraPose(mainCamera, controls, "reset");
    };
    resetCameraRef.current = resetCamera;

    const replaceStampMesh = (next: Mesh | null) => {
      if (mainStamp) {
        mainScene.remove(mainStamp);
        mainStamp.geometry.dispose();
        mainStamp = null;
      }
      if (insetStamp) {
        insetScene.remove(insetStamp);
        insetStamp.geometry.dispose();
        insetStamp = null;
      }
      if (!next) {
        return;
      }

      mainStamp = buildStampObject(next, mainMaterial);
      insetStamp = buildStampObject(next, insetMaterial);
      mainScene.add(mainStamp);
      insetScene.add(insetStamp);

      applyOrbitCameraPose(mainCamera, controls, DEFAULT_CAMERA);
      applyFixedCameraPose(insetCamera, DEFAULT_CAMERA);
      logCameraPose(mainCamera, controls, "fit");
    };

    replaceMeshRef.current = replaceStampMesh;

    const setSize = () => {
      const mainW = mainContainer.clientWidth || 1;
      const mainH = mainContainer.clientHeight || 1;
      mainCamera.aspect = mainW / mainH;
      mainCamera.updateProjectionMatrix();
      mainRenderer.setSize(mainW, mainH, false);

      const insetW = insetContainer.clientWidth || 1;
      const insetH = insetContainer.clientHeight || 1;
      insetCamera.aspect = insetW / insetH;
      insetCamera.updateProjectionMatrix();
      insetRenderer.setSize(insetW, insetH, false);
    };
    setSize();

    const resizeObserver = new ResizeObserver(setSize);
    resizeObserver.observe(mainContainer);
    resizeObserver.observe(insetContainer);

    const animate = () => {
      if (disposed) {
        return;
      }
      frameId = requestAnimationFrame(animate);
      controls.update();
      mainRenderer.render(mainScene, mainCamera);
      insetRenderer.render(insetScene, insetCamera);
    };
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      controls.removeEventListener("end", onControlsEnd);
      resizeObserver.disconnect();
      controls.dispose();
      if (mainStamp) {
        mainStamp.geometry.dispose();
      }
      if (insetStamp) {
        insetStamp.geometry.dispose();
      }
      mainMaterial.dispose();
      insetMaterial.dispose();
      mainRenderer.dispose();
      insetRenderer.dispose();
      mainRenderer.domElement.remove();
      insetRenderer.domElement.remove();
      replaceMeshRef.current = null;
      resetCameraRef.current = null;
    };
  }, []);

  useEffect(() => {
    replaceMeshRef.current?.(mesh);
  }, [mesh]);

  const showPlaceholder = !mesh || status !== "ready";
  const placeholderText =
    status === "building"
      ? "Building preview…"
      : status === "error"
        ? "Preview failed"
        : "Draw or import a design to preview the stamp";

  return (
    <div className="relative aspect-square w-full min-h-[16rem] overflow-hidden rounded-lg border border-slate/20 bg-navy-darkest">
      <div
        ref={mainRef}
        className="absolute inset-0"
        aria-hidden={showPlaceholder}
      />
      <div
        ref={insetRef}
        className={`absolute top-3 left-3 z-10 w-[28%] min-w-[5.5rem] aspect-square overflow-hidden rounded border border-slate/35 bg-navy-darkest shadow-lg shadow-navy-darkest/50 pointer-events-none ${
          showPlaceholder ? "invisible" : ""
        }`}
        aria-hidden
        data-testid="stamp-preview-inset"
      />
      {!showPlaceholder ? (
        <button
          type="button"
          className="absolute top-3 right-3 z-10 rounded border border-slate/30 bg-navy-light/90 px-2.5 py-1.5 font-mono text-xs text-slate-light hover:border-accent hover:text-accent transition-colors"
          onClick={() => resetCameraRef.current?.()}
        >
          Reset camera
        </button>
      ) : null}
      {showPlaceholder ? (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-navy-darkest/90 px-6 text-center"
          aria-live="polite"
        >
          <p className="font-mono text-xs text-slate">{placeholderText}</p>
        </div>
      ) : null}
    </div>
  );
}
