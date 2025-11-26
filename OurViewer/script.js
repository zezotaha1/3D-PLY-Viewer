//   <!-- import map to resolve the bare "three" specifier used by example modules -->
//   <script type="importmap">
//   {
//     "imports": {
//       "three": "https://unpkg.com/three@0.152.2/build/three.module.js"
//     }
//   }
//   </script>

import * as THREE from "three";
import { OrbitControls } from "https://unpkg.com/three@0.152.2/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "https://unpkg.com/three@0.152.2/examples/jsm/controls/TransformControls.js";
import { PLYLoader } from "https://unpkg.com/three@0.152.2/examples/jsm/loaders/PLYLoader.js";
import { CSS2DRenderer, CSS2DObject } from "https://unpkg.com/three@0.152.2/examples/jsm/renderers/CSS2DRenderer.js";
import GUI from "https://cdn.jsdelivr.net/npm/lil-gui@0.18/+esm";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 1000);
camera.position.set(1.5, 1.2, 1.5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = true;
controls.screenSpacePanning = false; // pan orthogonal to camera-up
controls.minPolarAngle = -1e6; // allow flipping
controls.maxPolarAngle = 1e6; // allow flipping
controls.minDistance = 0.01;        // allow closer zoom-in if needed
controls.maxDistance = 1e6;        // allow zooming out very far (use Infinity or a large number)
controls.zoomSpeed = 1.2;
controls.panSpeed = 1.0;
controls.enableZoom = true;

// Helpers
const grid = new THREE.GridHelper(10, 20, 0x888888, 0xdddddd);
grid.visible = false;
scene.add(grid);

const axes = new THREE.AxesHelper(0.5);
axes.visible = true;
scene.add(axes);

// Lights
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(2, 4, 1);
scene.add(dir);

// Raycaster for selection
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// TransformControls
const transformControls = new TransformControls(camera, renderer.domElement);
transformControls.setSize(1.0);
transformControls.addEventListener('dragging-changed', (event) => {
  controls.enabled = !event.value;
});
scene.add(transformControls);

// CSS2D renderer for labels
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.pointerEvents = 'none'; // allow clicks to pass through except label elements
labelRenderer.domElement.style.zIndex = '20';
document.body.appendChild(labelRenderer.domElement);

// label storage
const labels = [];

function createLabel(text, worldPos) {
  const div = document.createElement('div');
  div.className = 'label';
  div.textContent = text || 'label';
  // allow interacting with label content (dblclick to edit)
  div.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    const newText = prompt('Edit label text', div.textContent);
    if (newText !== null) div.textContent = newText;
  });
  // prevent pointer events from falling through label
  div.style.pointerEvents = 'auto';

  const labelObj = new CSS2DObject(div);
  labelObj.position.copy(worldPos);
  scene.add(labelObj);
  labels.push({ el: div, obj: labelObj });
  return labelObj;
}


// GUI
// const gui = new GUI({ title: 'Controls' });
// const guiState = {
//   autoRotate: false,
//   showGrid: false,
//   showAxes: true,
//   transformMode: 'translate',
//   translateSnap: 0,
//   rotateSnapDeg: 0,
//   scaleSnap: 0,
//   resetView: () => fitCameraToObject(currentObject),
//   centerModel: () => centerCurrent(),
// };
// gui.add(guiState, 'autoRotate').name('Auto rotate');
// gui.add(guiState, 'showGrid').name('Show grid').onChange(v => grid.visible = v);
// gui.add(guiState, 'showAxes').name('Show axes').onChange(v => axes.visible = v);
// gui.add(guiState, 'transformMode', ['translate','rotate','scale']).name('Gizmo mode').onChange(m => {
//   transformControls.setMode(m);
// });
// gui.add(guiState, 'translateSnap', 0, 1, 0.01).name('Translate snap').onChange(v => {
//   transformControls.setTranslationSnap(v > 0 ? v : null);
// });
// gui.add(guiState, 'rotateSnapDeg', 0, 90, 1).name('Rotate snap (deg)').onChange(v => {
//   transformControls.setRotationSnap(v > 0 ? THREE.MathUtils.degToRad(v) : null);
// });
// gui.add(guiState, 'scaleSnap', 0, 1, 0.01).name('Scale snap').onChange(v => {
//   transformControls.setScaleSnap(v > 0 ? v : null);
// });
// gui.add(guiState, 'resetView').name('Fit view');
// gui.add(guiState, 'centerModel').name('Center model');

let currentObject = null;

// Load PLY
const loader = new PLYLoader();
loader.load("./model.ply", (geometry) => {
  geometry.computeVertexNormals();
  geometry.center();

  const material = new THREE.MeshStandardMaterial({ color: 0x8c8c8c, roughness: 0.6, metalness: 0.0 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "model";
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  scene.add(mesh);
  currentObject = mesh;

  // auto-fit camera once
  fitCameraToObject(mesh, { fitOffset: 1.2 });
}, undefined, (err) => {
  console.error('PLY load error', err);
});

// Fit camera to object helper
function fitCameraToObject( object, { fitOffset = 1.2, maxDistance = 100 } = {} ) {
  if (!object) return;
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const maxSize = Math.max(size.x, size.y, size.z);
  const fitHeightDistance = maxSize / (2 * Math.atan(Math.PI * camera.fov / 360));
  const fitWidthDistance = fitHeightDistance / camera.aspect;
  const distance = Math.min(maxDistance, fitOffset * Math.max(fitHeightDistance, fitWidthDistance));

  const direction = controls.target.clone()
    .sub(camera.position)
    .normalize()
    .multiplyScalar(-1);

  camera.position.copy(center).add(new THREE.Vector3(distance, distance, distance));
  camera.near = Math.max(0.001, distance / 1000);
  camera.far = Math.max(1e6, distance * 1000);
  camera.updateProjectionMatrix();

  controls.target.copy(center);
  controls.update();
}

// center geometry for current object
function centerCurrent() {
  if (!currentObject) return;
  const box = new THREE.Box3().setFromObject(currentObject);
  const center = box.getCenter(new THREE.Vector3());
  currentObject.position.sub(center); // move so center becomes origin
  controls.target.set(0,0,0);
}

// pointer selection
function onPointerDown(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(scene.children, true);
  if (intersects.length > 0) {
    const picked = intersects[0].object;
    const intersection = intersects[0];

    // climb until the top-level child under scene
    let sel = picked;
    while (sel && sel.parent && sel.parent !== scene) {
      sel = sel.parent;
    }

    // if climb failed or picked is the scene or transformControls, do nothing
    if (!sel || sel === scene || sel === transformControls) {
      transformControls.detach();
      currentObject = null;
      return;
    }

    // special labeling shortcuts:
    // Ctrl+click -> add label at face centroid
    // Alt+click  -> add label at nearest vertex of the intersected face
    if (event.ctrlKey || event.altKey) {
      // ensure we have a mesh with geometry and a face
      if (intersection && intersection.face && picked.geometry) {
        const geom = picked.geometry;
        const posAttr = geom.getAttribute('position');
        const face = intersection.face;

        // get world-space vertex positions for the intersected face
        const va = new THREE.Vector3().fromBufferAttribute(posAttr, face.a).applyMatrix4(picked.matrixWorld);
        const vb = new THREE.Vector3().fromBufferAttribute(posAttr, face.b).applyMatrix4(picked.matrixWorld);
        const vc = new THREE.Vector3().fromBufferAttribute(posAttr, face.c).applyMatrix4(picked.matrixWorld);

        if (event.ctrlKey) {
          // face centroid label
          const centroid = new THREE.Vector3().addVectors(va, vb).add(vc).multiplyScalar(1 / 3);
          createLabel('face', centroid);
        } else if (event.altKey) {
          // nearest vertex to intersection point
          const ip = intersection.point;
          const da = ip.distanceToSquared(va);
          const db = ip.distanceToSquared(vb);
          const dc = ip.distanceToSquared(vc);
          let nearest = va;
          if (db < da && db <= dc) nearest = vb;
          if (dc < da && dc < db) nearest = vc;
          createLabel('vertex', nearest);
        }
      }
      return; // don't change transform selection when labeling
    }

    // only attach real objects (avoid lights/camera if desired)
    if (sel.isMesh || sel.type === 'Group' || sel.type === 'Object3D') {
      transformControls.attach(sel);
      currentObject = sel;
    } else {
      transformControls.detach();
      currentObject = null;
    }
  } else {
    transformControls.detach();
    currentObject = null;
  }
}
renderer.domElement.addEventListener('pointerdown', onPointerDown);

// double click to fit view to object under cursor or to current object
function onDblClick(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(scene.children, true);
  if (intersects.length > 0) {
    fitCameraToObject(intersects[0].object);
  } else {
    fitCameraToObject(currentObject);
  }
}
renderer.domElement.addEventListener('dblclick', onDblClick);

// keyboard shortcuts
window.addEventListener('keydown', (event) => {
  if (event.key === 't' || event.key === 'T') transformControls.setMode('translate');
  if (event.key === 'r' || event.key === 'R') transformControls.setMode('rotate');
  if (event.key === 's' || event.key === 'S') transformControls.setMode('scale');
  if (event.key === 'Escape') {
    transformControls.detach();
    currentObject = null;
  }
});

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

// Animate
 function animate() {
  requestAnimationFrame(animate);
//   if (guiState.autoRotate) {
//     scene.rotation.y += 0.002;
//   }
   controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
 }
 animate();



 // hint box logic
 (function(){
    const HINT_KEY = 'viewerHintDismissed_v1';
    const hint = document.getElementById('viewer-hint');
    const toggle = document.getElementById('hint-toggle');
    const closeBtn = document.getElementById('hint-close');
    const hideBtn = document.getElementById('hint-hide');

    function showHint() {
      hint.style.display = 'block';
      toggle.style.display = 'none';
    }
    function hideHint() {
      hint.style.display = 'none';
      toggle.style.display = 'block';
    }

    // initial state: hide if dismissed before
    if (localStorage.getItem(HINT_KEY) === 'true') {
      hint.style.display = 'none';
      toggle.style.display = 'block';
    } else {
      showHint();
    }

    closeBtn.addEventListener('click', () => {
      hideHint();
    });

    hideBtn.addEventListener('click', () => {
      localStorage.setItem(HINT_KEY, 'true');
      hideHint();
    });

    toggle.addEventListener('click', () => {
      showHint();
    });

    // accessibility: allow closing with Escape when focused inside
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && hint.style.display !== 'none') {
        hideHint();
      }
    });
  })();