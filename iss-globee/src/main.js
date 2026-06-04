// src/main.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as satellite from 'satellite.js';
import earthTexture from './assets/earth-bw.jpg';
import './style.css';

// ----------------------
// Scene setup
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('globe').appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// ----------------------
// SAFE CAMERA START
camera.position.set(0, 0, 3.2);
controls.target.set(0, 0, 0);
controls.update();

// ----------------------
// Globe
const globeTexture = new THREE.TextureLoader().load(earthTexture);
const globeGeometry = new THREE.SphereGeometry(1, 64, 64);
const globeMaterial = new THREE.MeshStandardMaterial({
  map: globeTexture,
  color: 0xffffff,
  metalness: 0.1,
  roughness: 0.8
});
const globeMesh = new THREE.Mesh(globeGeometry, globeMaterial);
scene.add(globeMesh);

// ----------------------
// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 3, 5);
scene.add(directionalLight);

// ----------------------
// ISS Marker
const markerGeometry = new THREE.SphereGeometry(0.02, 16, 16);
const markerMaterial = new THREE.MeshBasicMaterial({ color: 0x508dde });
const issMarker = new THREE.Mesh(markerGeometry, markerMaterial);
scene.add(issMarker);

// ----------------------
// ISS LABEL (3D SPRITE)
function createCleanLabel(text, color = '#ffffff') {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = 512;
  canvas.height = 128;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.font = 'bold 34px Arial';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.transparent = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 1
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.45, 0.125, 1);

  return sprite;
}

// ----------------------
// LABELS
const issLabel = createCleanLabel("International Space Station", "#508dde");
scene.add(issLabel);

const userLabel = createCleanLabel("This Is You", "#ff0000");
scene.add(userLabel);

// ----------------------
// ⭐ ORBIT LABEL (ONLY ADDITION)
const orbitLabel = createCleanLabel("Future Orbit Path", "#66ccff");
scene.add(orbitLabel);

// ----------------------
// USER MARKER
const userGeometry = new THREE.CircleGeometry(0.007, 32);
const userMaterial = new THREE.MeshBasicMaterial({
  color: 0xff0000,
  side: THREE.DoubleSide
});
const userMarker = new THREE.Mesh(userGeometry, userMaterial);
scene.add(userMarker);

// ----------------------
// User Beam
const beamHeight = 0.09;
const beamGeometry = new THREE.CylinderGeometry(0.002, 0.002, beamHeight, 16);
const beamMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const userBeam = new THREE.Mesh(beamGeometry, beamMaterial);
scene.add(userBeam);

// ----------------------
// Ripple
let rippleMesh = null;
let rippleActive = false;

function createRipple() {
  if (rippleActive) return;
  rippleActive = true;

  const geometry = new THREE.RingGeometry(0.05, 0.06, 32);
  const material = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.5,
  });

  rippleMesh = new THREE.Mesh(geometry, material);
  rippleMesh.position.copy(userMarker.position);
  rippleMesh.lookAt(0, 0, 0);
  scene.add(rippleMesh);

  let scale = 1;

  const animateRipple = () => {
    if (!rippleMesh) return;

    scale += 0.03;
    rippleMesh.scale.set(scale, scale, scale);
    rippleMesh.material.opacity -= 0.01;

    if (rippleMesh.material.opacity <= 0) {
      scene.remove(rippleMesh);
      rippleMesh.geometry.dispose();
      rippleMesh.material.dispose();
      rippleMesh = null;
      rippleActive = false;
    } else {
      requestAnimationFrame(animateRipple);
    }
  };

  animateRipple();
}

// ----------------------
// LatLng
function latLngToVector3(lat, lng, radius = 1, altitude = 0.08) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lng + 180) * Math.PI / 180;

  const r = radius + altitude;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  );
}

// ----------------------
// Distance
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = THREE.MathUtils.degToRad(lat2 - lat1);
  const dLon = THREE.MathUtils.degToRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(THREE.MathUtils.degToRad(lat1)) *
    Math.cos(THREE.MathUtils.degToRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ----------------------
// USER LOCATION
let userLat = null;
let userLng = null;

if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userLat = pos.coords.latitude;
      userLng = pos.coords.longitude;

      const userPos = latLngToVector3(userLat, userLng, 1, 0);
      userMarker.position.copy(userPos);

      const normal = userPos.clone().normalize();
      userBeam.position.copy(
        userPos.clone().add(normal.clone().multiplyScalar(beamHeight / 2))
      );
      userBeam.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        normal
      );
    },
    () => {
      console.log('Location permission denied or unavailable.');

      userMarker.visible = false;
      userBeam.visible = false;
      userLabel.visible = false;
    }
  );
} else {
  console.log('Geolocation not supported.');

  userMarker.visible = false;
  userBeam.visible = false;
  userLabel.visible = false;
}

// ----------------------
// TLE
let issSatrec = null;

async function fetchTLE() {
  const res = await fetch('https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=json');
  const data = await res.json();

  const tle = data[0];
  issSatrec = satellite.twoline2satrec(tle.TLE_LINE1, tle.TLE_LINE2);
}
fetchTLE();

// ----------------------
// ORBIT
const orbitMaterial = new THREE.LineBasicMaterial({
  color: 0x508dde,
  transparent: true,
  opacity: 0.6
});

const orbitGeometry = new THREE.BufferGeometry();
const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
scene.add(orbitLine);

function updateOrbitPath() {
  if (!issSatrec) return;

  const points = [];
  const now = new Date();

  for (let i = 0; i < 90; i++) {
    const t = new Date(now.getTime() + i * 60000);

    const pv = satellite.propagate(issSatrec, t);
    if (!pv?.position) continue;

    const gmst = satellite.gstime(t);
    const gd = satellite.eciToGeodetic(pv.position, gmst);

    const lat = satellite.degreesLat(gd.latitude);
    const lng = satellite.degreesLong(gd.longitude);

    points.push(latLngToVector3(lat, lng));
  }

  orbitGeometry.setFromPoints(points);

  if (points.length > 0) {
    const mid = Math.floor(points.length / 2);
    orbitLabel.position.copy(points[mid]);
  }
}

// ----------------------
// ISS FETCH (UPDATED - NO LOCALHOST)
let targetPos = new THREE.Vector3();
let currentPos = new THREE.Vector3();

async function fetchISS() {
  try {
    const res = await fetch("https://api.wheretheiss.at/v1/satellites/25544");
    const data = await res.json();

    targetPos = latLngToVector3(data.latitude, data.longitude);
  } catch {}
}

// ----------------------
// COUNTDOWN UI
function updateCountdown() {
  if (!nextApproachTime) return;

  const diff = nextApproachTime - new Date();
  if (diff < 0) return;

  const s = Math.floor(diff / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2,'0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2,'0');
  const sec = String(s % 60).padStart(2,'0');

  document.getElementById("iss-timer").innerText =
    `Next closest approach: ${h}:${m}:${sec} (${nextApproachDist.toFixed(0)} km)`;
}

// ----------------------
// SCANNER
async function calculateNextApproachUnder500kmOptimized() {
  if (!userLat || !userLng || !issSatrec || calculating) return;
  if (locked) return;

  calculating = true;

  const now = new Date();
  const max = 24 * 60 * 60 * 1000;

  let bestTime = null;
  let bestDist = Infinity;

  for (let t = 0; t <= max; t += 60000) {
    const future = new Date(now.getTime() + t);

    const pv = satellite.propagate(issSatrec, future);
    if (!pv?.position) continue;

    const gmst = satellite.gstime(future);
    const gd = satellite.eciToGeodetic(pv.position, gmst);

    const lat = satellite.degreesLat(gd.latitude);
    const lng = satellite.degreesLong(gd.longitude);

    const dist = getDistanceKm(userLat, userLng, lat, lng);

    if (dist < bestDist) {
      bestDist = dist;
      bestTime = future;
    }
  }

  nextApproachTime = bestTime;
  nextApproachDist = bestDist;

  if (bestDist <= 500) locked = true;

  calculating = false;
}

// ----------------------
// LOOP
setInterval(fetchISS, 2000);
setInterval(updateCountdown, 1000);
setInterval(calculateNextApproachUnder500kmOptimized, 15000);

// ----------------------
// RENDER LOOP
function animate() {
  requestAnimationFrame(animate);

  currentPos.lerp(targetPos, 0.05);
  issMarker.position.copy(currentPos);

  issLabel.position.copy(issMarker.position);
  issLabel.position.y += 0.05;

  userLabel.position.copy(userMarker.position);
  userLabel.position.y += 0.12;

  updateOrbitPath();
  controls.update();
  renderer.render(scene, camera);
}

animate();