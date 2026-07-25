import { useEffect, useRef } from "react";
import type { Mesh } from "@stamp-generator/geometry-core";
import {
  AmbientLight,
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh as ThreeMesh,
  MeshPhongMaterial,
  PerspectiveCamera,
  Scene,
  Sphere,
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

/** Print face / design relief — dark ink at the bed. */
const COLOR_INK = new Color("#140805");
/** Base + handle body. */
const COLOR_BODY = new Color("#ea580c");

/** Design extrusion band from the print bed (mm) used for the ink fade. */
const INK_BAND_MM = 2.5;

/**
 * Default views are direction-only (Z-up). Distance is derived from mesh
 * bounds + current FOV/aspect so framing stays consistent across viewport
 * size and browser zoom.
 *
 * Main: print-face view from below. Tiny Y bias keeps lookAt stable with
 * world +Z up (must not be parallel to the view axis).
 * Inset: 3/4 product view of the full stamp.
 */
const MAIN_VIEW_DIRECTION = new Vector3(0, -0.06, -1).normalize();
const INSET_VIEW_DIRECTION = new Vector3(0.221, -0.928, 0.302).normalize();
/** Extra margin around the fitted radius (1 = tight fit). */
const FIT_PADDING = 1.35;

/**
 * Ink simulation on the design relief only: darkest at the print bed,
 * fading to body orange through the design height; base + handle stay flat.
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
    if (zFromBed < INK_BAND_MM) {
      const t = zFromBed / INK_BAND_MM;
      mixed.copy(COLOR_INK).lerp(COLOR_BODY, t);
    } else {
      mixed.copy(COLOR_BODY);
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
    shininess: 36,
    specular: new Color(0x7c2d12),
    emissive: new Color(0x7c2d12),
    emissiveIntensity: 0.2,
  });
}

type Vec3Config = { x: number; y: number; z: number };

type StampLightingConfig = {
  hemi: { sky: number; ground: number; intensity: number };
  ambient: { color: number; intensity: number };
  key: { color: number; intensity: number; position: Vec3Config };
  fill: { color: number; intensity: number; position: Vec3Config };
  top: { color: number; intensity: number; position: Vec3Config };
  front: { color: number; intensity: number; position: Vec3Config };
};

const DEFAULT_LIGHTING: StampLightingConfig = {
  hemi: { sky: 0xffffff, ground: 0x334155, intensity: 1.6 },
  ambient: { color: 0xffffff, intensity: 2.4 },
  key: {
    color: 0xffffff,
    intensity: 1.4,
    position: { x: 40, y: -120, z: 90 },
  },
  fill: {
    color: 0xe8f0ff,
    intensity: 1.2,
    position: { x: -100, y: -20, z: 70 },
  },
  top: {
    color: 0xffffff,
    intensity: 0.9,
    position: { x: 0, y: 40, z: 160 },
  },
  front: {
    color: 0xffffff,
    intensity: 0.85,
    position: { x: 0, y: -150, z: 30 },
  },
};

function addStampLights(scene: Scene, config: StampLightingConfig) {
  const hemi = new HemisphereLight(
    config.hemi.sky,
    config.hemi.ground,
    config.hemi.intensity,
  );
  const ambient = new AmbientLight(config.ambient.color, config.ambient.intensity);
  const key = new DirectionalLight(config.key.color, config.key.intensity);
  key.position.set(config.key.position.x, config.key.position.y, config.key.position.z);
  const fill = new DirectionalLight(config.fill.color, config.fill.intensity);
  fill.position.set(
    config.fill.position.x,
    config.fill.position.y,
    config.fill.position.z,
  );
  const top = new DirectionalLight(config.top.color, config.top.intensity);
  top.position.set(config.top.position.x, config.top.position.y, config.top.position.z);
  const front = new DirectionalLight(config.front.color, config.front.intensity);
  front.position.set(
    config.front.position.x,
    config.front.position.y,
    config.front.position.z,
  );
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
    // Fill the container in CSS pixels. Drawing-buffer size is set via
    // setPixelRatio + setSize(…, false); without this, canvas intrinsic size
    // tracks the backing store (width*dpr) and browser zoom clips the view.
    const canvas = renderer.domElement;
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    container.appendChild(canvas);
    return renderer;
  } catch {
    return null;
  }
}

const _fitBox = new Box3();
const _fitCenter = new Vector3();
const _fitSphere = new Sphere();

/**
 * Place camera along `viewDirection` from the mesh center at a distance that
 * fits the bounding sphere in both FOV axes for the current aspect ratio.
 */
function fitDistanceForSphere(
  camera: PerspectiveCamera,
  radius: number,
  padding: number,
): number {
  const vFov = (camera.fov * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * Math.max(camera.aspect, 1e-6));
  const fitFov = Math.min(vFov, hFov);
  return (Math.max(radius, 1e-3) / Math.sin(fitFov / 2)) * padding;
}

function fitFixedCamera(
  camera: PerspectiveCamera,
  object: ThreeMesh,
  viewDirection: Vector3,
  padding = FIT_PADDING,
) {
  _fitBox.setFromObject(object);
  _fitBox.getCenter(_fitCenter);
  _fitBox.getBoundingSphere(_fitSphere);
  const distance = fitDistanceForSphere(camera, _fitSphere.radius, padding);

  camera.up.set(0, 0, 1);
  camera.position.copy(_fitCenter).addScaledVector(viewDirection, distance);
  camera.lookAt(_fitCenter);
  camera.near = Math.max(distance / 100, 0.1);
  camera.far = Math.max(distance * 20, 2000);
  camera.updateProjectionMatrix();
}

/**
 * Frame the print face: aim at the bed-center of the XY footprint and fit
 * distance to that disc — not the full mesh sphere (handle would pull the
 * target up the +Z axis and shove the face off-center).
 */
function fitOrbitCamera(
  camera: PerspectiveCamera,
  controls: OrbitControls,
  object: ThreeMesh,
  viewDirection: Vector3,
  padding = FIT_PADDING,
) {
  _fitBox.setFromObject(object);
  const { min, max } = _fitBox;
  const radiusXY = Math.max(max.x - min.x, max.y - min.y) * 0.5;
  _fitCenter.set((min.x + max.x) * 0.5, (min.y + max.y) * 0.5, min.z);
  const distance = fitDistanceForSphere(camera, radiusXY, padding);

  camera.up.set(0, 0, 1);
  camera.position.copy(_fitCenter).addScaledVector(viewDirection, distance);
  controls.target.copy(_fitCenter);
  camera.near = Math.max(distance / 100, 0.1);
  camera.far = Math.max(distance * 20, 2000);
  camera.updateProjectionMatrix();
  controls.update();
}

function buildStampObject(mesh: Mesh, material: MeshPhongMaterial): ThreeMesh {
  const geometry = meshToThreeGeometry(mesh);
  applyHeightContrastColors(geometry);
  return new ThreeMesh(geometry, material);
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
    // Z-up + screenSpacePanning=false pans only in XY (world Z feels locked).
    controls.screenSpacePanning = true;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.enableRotate = true;

    addStampLights(mainScene, DEFAULT_LIGHTING);
    addStampLights(insetScene, DEFAULT_LIGHTING);

    const mainMaterial = createStampMaterial();
    const insetMaterial = createStampMaterial();

    let mainStamp: ThreeMesh | null = null;
    let insetStamp: ThreeMesh | null = null;
    let frameId = 0;
    let disposed = false;
    /** Only frame main orbit on first mesh after empty — rebuilds must not fight the user. */
    let mainCameraFramed = false;
    /** Re-fit on resize while still at the default framing. */
    let mainCameraAtDefault = false;

    const frameMainDefault = () => {
      if (!mainStamp) {
        return;
      }
      // Cold load can run before layout; avoid locking in a 1×1 fit.
      if (mainContainer.clientWidth < 2 || mainContainer.clientHeight < 2) {
        return;
      }
      fitOrbitCamera(mainCamera, controls, mainStamp, MAIN_VIEW_DIRECTION);
      mainCameraFramed = true;
      mainCameraAtDefault = true;
    };

    const frameInsetDefault = () => {
      if (!insetStamp) {
        return;
      }
      if (insetContainer.clientWidth < 2 || insetContainer.clientHeight < 2) {
        return;
      }
      fitFixedCamera(insetCamera, insetStamp, INSET_VIEW_DIRECTION);
    };

    const onControlsStart = () => {
      mainCameraAtDefault = false;
    };
    controls.addEventListener("start", onControlsStart);

    const resetCamera = () => {
      frameMainDefault();
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
        mainCameraFramed = false;
        mainCameraAtDefault = false;
        return;
      }

      mainStamp = buildStampObject(next, mainMaterial);
      insetStamp = buildStampObject(next, insetMaterial);
      mainScene.add(mainStamp);
      insetScene.add(insetStamp);

      if (!mainCameraFramed) {
        frameMainDefault();
      }
      frameInsetDefault();
    };

    replaceMeshRef.current = replaceStampMesh;

    const setSize = () => {
      const mainW = mainContainer.clientWidth || 1;
      const mainH = mainContainer.clientHeight || 1;
      // Browser zoom changes devicePixelRatio without a reload — keep in sync.
      const pixelRatio = Math.min(window.devicePixelRatio, 2);
      mainCamera.aspect = mainW / mainH;
      mainCamera.updateProjectionMatrix();
      mainRenderer.setPixelRatio(pixelRatio);
      mainRenderer.setSize(mainW, mainH, false);

      const insetW = insetContainer.clientWidth || 1;
      const insetH = insetContainer.clientHeight || 1;
      insetCamera.aspect = insetW / insetH;
      insetCamera.updateProjectionMatrix();
      insetRenderer.setPixelRatio(pixelRatio);
      insetRenderer.setSize(insetW, insetH, false);

      // Aspect / DPR changes — re-fit defaults; also finish a deferred first fit.
      if (mainCameraAtDefault || (mainStamp !== null && !mainCameraFramed)) {
        frameMainDefault();
      }
      frameInsetDefault();
    };
    setSize();

    const resizeObserver = new ResizeObserver(setSize);
    resizeObserver.observe(mainContainer);
    resizeObserver.observe(insetContainer);
    // Browser zoom can change devicePixelRatio without a box resize.
    window.addEventListener("resize", setSize);

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
      controls.removeEventListener("start", onControlsStart);
      window.removeEventListener("resize", setSize);
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
      ? "Building preview..."
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
