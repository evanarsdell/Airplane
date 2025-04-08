let scene, camera, renderer;
let plane = null;
let clock = new THREE.Clock();

let pitch = 0;
let roll = 0;
let speed = 0.1;

function init() {
  console.log("Initializing scene...");
  // Create the scene and set a background color
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB);

  // Setup camera: Field of view, aspect ratio, near/far planes
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 2, 10);

  // Get the canvas element
  const canvas = document.getElementById("gameCanvas");
  if (!canvas) {
    console.error("Canvas element (gameCanvas) not found.");
    return;
  }

  // Create the renderer and attach it to the canvas
  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Add ambient and directional lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(10, 10, 5);
  scene.add(directionalLight);

  // Load the GLB model using GLTFLoader
  const loader = new THREE.GLTFLoader();
  loader.load(
    'models/plane.glb', 
    function (gltf) {
      console.log("GLB model loaded successfully.");
      plane = gltf.scene;
      plane.scale.set(0.5, 0.5, 0.5);
      scene.add(plane);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
      console.error("Error loading plane.glb:", error);
      // Fallback: Create a red cube
      const geometry = new THREE.BoxGeometry(1, 0.2, 1.5);
      const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
      plane = new THREE.Mesh(geometry, material);
      scene.add(plane);
    }
  );

  // Handle window resizing
  window.addEventListener('resize', onWindowResize, false);
  // Setup keyboard controls
  document.addEventListener('keydown', onKeyDown, false);
  document.addEventListener('keyup', onKeyUp, false);

  // Start the animation loop
  animate();
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

let keys = {};
function onKeyDown(event) {
  keys[event.code] = true;
}
function onKeyUp(event) {
  keys[event.code] = false;
}

function animate() {
  requestAnimationFrame(animate);
  let dt = clock.getDelta();

  if (plane) {
    if (keys['ArrowUp']) { pitch += 0.02; }
    if (keys['ArrowDown']) { pitch -= 0.02; }
    if (keys['ArrowLeft']) { roll += 0.02; }
    if (keys['ArrowRight']) { roll -= 0.02; }

    // Apply rotations
    plane.rotation.x = pitch;
    plane.rotation.z = roll;

    // Move the plane forward in its local -Z direction
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(plane.quaternion);
    plane.position.add(forward.multiplyScalar(speed));

    // Smoothly move the camera to follow the plane
    const targetPos = plane.position.clone().add(new THREE.Vector3(0, 2, 10));
    camera.position.lerp(targetPos, 0.1);
    camera.lookAt(plane.position);
  }

  renderer.render(scene, camera);
}

init();
