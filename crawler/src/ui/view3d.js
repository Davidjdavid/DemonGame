// First-person view: Three.js scene built from a parsed floor, with smooth step/turn tweens.
// World: cell (x, y) is centred at (x*S, y*S) on the XZ plane; north is -z.
import * as THREE from 'three';
import { DX, DY, edgeAt } from '../world/floor.js';
import { edgeState } from '../world/move.js';
import { wallTexture, floorTexture, ceilTexture, doorTexture, signTexture, stripeTexture, arrowFloorTexture } from './textures.js';

export const S = 2; // cell size
const WH = 2.2; // wall height
const EYE = 1.05;
let SETBACK = 0.8; // grid mode: the camera sits behind the cell centre so the walls beside you stay in view
const EPS = 0.03;
const ROT = [0, -Math.PI / 2, Math.PI, Math.PI / 2]; // plane rotation for a face on side d (normal points into the cell)
const DOOR_W = 0.72 * S; // matches freeMove DOOR_HALF
const DOOR_H = 0.8 * WH;

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export function createView(container, { fast = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#050508');
  const fogNormal = new THREE.Fog('#050508', 5, 19);
  const fogDark = new THREE.Fog('#000000', 0.6, 2.6);
  scene.fog = fogNormal;
  const camera = new THREE.PerspectiveCamera(68, 1, 0.05, 60);
  scene.add(new THREE.AmbientLight('#ffffff', 1.1));
  const torch = new THREE.PointLight('#ffe9c8', 2.2, 12, 1);
  camera.add(torch);
  scene.add(camera);

  let root = null; // group holding the current floor
  let floor = null;
  let flags = null;
  const doors = new Map(); // edgeId -> { slabs: [mesh], open: 0, target: 0 }
  const spinners = [];
  const signs = [];
  const pose = { x: 0, z: 0, yaw: 0 };
  const lookOff = { yaw: 0, pitch: 0 }; // mouse-look offset from the facing direction
  const tweens = [];

  function resize() {
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 600;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  function lambert(map, color = '#ffffff', extra = {}) {
    return new THREE.MeshLambertMaterial({ map, color, ...extra });
  }

  function faceTransform(obj, x, y, d, inset = EPS) {
    obj.position.set(x * S + DX[d] * (S / 2 - inset), 0, y * S + DY[d] * (S / 2 - inset));
    obj.rotation.y = ROT[d];
  }

  function doorVariant(edge, d) {
    const st = edgeState(edge, flags);
    if (st === 'door') return 'door';
    if (st === 'lock') return 'lock';
    if (st === 'oneway') return d === edge.dir ? 'oneway' : 'noentry';
    if (st === 'shortcut') return d === edge.dir ? 'lift' : 'barred';
    return 'door';
  }

  function buildDoorSide(group, edge, cell, d) {
    const wallMat = lambert(wallTexture(), cell.color);
    const side = new THREE.Group();
    const jw = (S - DOOR_W) / 2;
    const jamb = new THREE.PlaneGeometry(jw, WH);
    for (const sx of [-1, 1]) {
      const m = new THREE.Mesh(jamb, wallMat);
      m.position.set(sx * (S / 2 - jw / 2), WH / 2, 0);
      side.add(m);
    }
    const lintel = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W, WH - DOOR_H), wallMat);
    lintel.position.set(0, DOOR_H + (WH - DOOR_H) / 2, 0);
    side.add(lintel);
    const slab = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W, DOOR_H), lambert(doorTexture(doorVariant(edge, d))));
    slab.position.set(0, DOOR_H / 2, 0);
    slab.userData = { edge, d };
    side.add(slab);
    faceTransform(side, cell.x, cell.y, d);
    group.add(side);
    const entry = doors.get(edge.id) || { slabs: [], open: 0, target: 0, closeAt: 0 };
    entry.slabs.push(slab);
    doors.set(edge.id, entry);
  }

  function sign(text, color, x, y, h = 1.75, scale = 1) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: signTexture(text, color), fog: true }));
    s.scale.set(1.25 * scale, 0.39 * scale, 1);
    s.position.set(x * S, h, y * S);
    signs.push(s);
    return s;
  }

  function box(w, h, d, color, emissive = null) {
    const m = new THREE.MeshLambertMaterial({ color, emissive: emissive || '#000000' });
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  }

  // Which direction a feature should "face": toward the first open side of its cell.
  function openSide(cell) {
    // Prefer an open side facing a wall (a counter against the wall faces into the room).
    for (const d of [2, 1, 3, 0]) {
      if (edgeAt(floor, cell.x, cell.y, d).type !== 'wall' && edgeAt(floor, cell.x, cell.y, (d + 2) % 4).type === 'wall') return d;
    }
    for (const d of [2, 1, 3, 0]) {
      const e = edgeAt(floor, cell.x, cell.y, d);
      if (e.type !== 'wall') return d;
    }
    return 2;
  }

  function buildFeature(group, cell) {
    const f = cell.feature;
    const g = new THREE.Group();
    const cx = cell.x * S;
    const cz = cell.y * S;
    g.position.set(cx, 0, cz);
    const face = openSide(cell);
    switch (f.type) {
      case 'stairs': {
        if (f.dir === 'up') {
          const steps = new THREE.Group();
          for (let i = 0; i < 6; i++) {
            const st = box(S * 0.7, 0.18 * (i + 1), 0.22, i % 2 ? '#d9cfae' : '#c9bf9c');
            st.position.set(0, 0.09 * (i + 1), 0.55 - i * 0.22);
            steps.add(st);
          }
          steps.rotation.y = ROT[face] + Math.PI;
          g.add(steps);
          group.add(sign('UP ▲', '#9fe8ff', cell.x, cell.y, 1.85));
        } else {
          const hole = new THREE.Mesh(new THREE.PlaneGeometry(S * 0.72, S * 0.72), new THREE.MeshBasicMaterial({ color: '#000000' }));
          hole.rotation.x = -Math.PI / 2;
          hole.position.y = 0.012;
          g.add(hole);
          for (let i = 0; i < 4; i++) {
            const rim = box(i % 2 ? 0.08 : S * 0.8, 0.12, i % 2 ? S * 0.8 : 0.08, '#c9bf9c');
            const a = (i * Math.PI) / 2;
            rim.position.set(Math.sin(a) * S * 0.38, 0.06, Math.cos(a) * S * 0.38);
            g.add(rim);
          }
          group.add(sign('DOWN ▼', '#ffb36b', cell.x, cell.y, 1.5));
        }
        break;
      }
      case 'chest': {
        const opened = flags.chests[f.id];
        const isKey = /key/.test(f.item);
        const body = box(0.8, 0.42, 0.5, opened ? '#4a3420' : isKey ? '#b8902a' : '#8a5a2b');
        body.position.y = 0.21;
        g.add(body);
        const lid = box(0.84, 0.12, 0.54, opened ? '#3a2818' : '#e0b040');
        lid.position.y = opened ? 0.5 : 0.48;
        if (opened) { lid.rotation.x = -1.1; lid.position.z = -0.3; }
        g.add(lid);
        g.rotation.y = ROT[face];
        g.userData.chest = f.id;
        break;
      }
      case 'save': {
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.32), new THREE.MeshLambertMaterial({ color: '#4aa8ff', emissive: '#1a4aa0' }));
        gem.position.y = 1.0;
        spinners.push(gem);
        g.add(gem);
        const base = box(0.6, 0.3, 0.6, '#555a66');
        base.position.y = 0.15;
        g.add(base);
        group.add(sign('SAVE', '#7cc4ff', cell.x, cell.y, 1.75));
        break;
      }
      case 'heal': {
        const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.5, 16), new THREE.MeshLambertMaterial({ color: '#6c7a70' }));
        basin.position.y = 0.25;
        const water = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.06, 16), new THREE.MeshLambertMaterial({ color: '#5ff0a0', emissive: '#1f8a50' }));
        water.position.y = 0.5;
        g.add(basin, water);
        group.add(sign('✚ HEAL', '#7dffb0', cell.x, cell.y, 1.6));
        break;
      }
      case 'warp': {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.07, 8, 32), new THREE.MeshBasicMaterial({ color: '#ff5cf0' }));
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.06;
        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.04, 8, 24), new THREE.MeshBasicMaterial({ color: '#ffb0f8' }));
        ring2.rotation.x = Math.PI / 2;
        ring2.position.y = 0.5;
        spinners.push(ring, ring2);
        g.add(ring, ring2);
        group.add(sign('WARP', '#ff8cf4', cell.x, cell.y, 1.6, 0.8));
        break;
      }
      case 'launch': {
        const pad = new THREE.Mesh(new THREE.PlaneGeometry(S * 0.86, S * 0.86), new THREE.MeshBasicMaterial({ map: arrowFloorTexture() }));
        pad.rotation.x = -Math.PI / 2;
        pad.rotation.z = -f.dir * (Math.PI / 2); // texture arrow points north; rotate to the push direction
        pad.position.y = 0.015;
        g.add(pad);
        break;
      }
      case 'warn': {
        const pad = new THREE.Mesh(new THREE.PlaneGeometry(S * 0.9, S * 0.9), new THREE.MeshLambertMaterial({ map: stripeTexture() }));
        pad.rotation.x = -Math.PI / 2;
        pad.position.y = 0.015;
        g.add(pad);
        group.add(sign('! DANGER', '#ffcc33', cell.x, cell.y, 1.7));
        break;
      }
      case 'boss': {
        const ob = box(0.7, 1.9, 0.7, '#3a0d12', '#2a0005');
        ob.position.y = 0.95;
        g.add(ob);
        group.add(sign('BOSS', '#ff4a4a', cell.x, cell.y, 2.0));
        break;
      }
      case 'exit': {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.06, 8, 32), new THREE.MeshBasicMaterial({ color: '#fff4c0' }));
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.05;
        g.add(ring);
        group.add(sign('ENTRANCE', '#fff4c0', cell.x, cell.y, 1.9, 0.9));
        break;
      }
      case 'sign':
      case 'shop':
      case 'service': {
        const counter = box(S * 0.75, 0.9, 0.45, f.color || '#6a4a8a');
        counter.position.set(0, 0.45, -0.35);
        const keeper = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.6, 4, 10), new THREE.MeshLambertMaterial({ color: f.keeperColor || '#d8b890' }));
        keeper.position.set(0, 1.1, -0.65);
        const holder = new THREE.Group();
        holder.add(counter, keeper);
        holder.rotation.y = ROT[face] + Math.PI;
        g.add(holder);
        group.add(sign(f.label || f.type.toUpperCase(), f.signColor || '#ffd84a', cell.x, cell.y, 1.95));
        break;
      }
      default:
        break;
    }
    group.add(g);
  }

  function build(newFloor, newFlags) {
    if (root) {
      scene.remove(root);
      root.traverse((o) => { o.geometry?.dispose?.(); });
    }
    floor = newFloor;
    flags = newFlags;
    doors.clear();
    spinners.length = 0;
    signs.length = 0;
    root = new THREE.Group();
    const open = floor.cells.filter((c) => !c.solid);
    // Floors and ceilings: one instanced mesh each, tinted per area.
    const tile = new THREE.PlaneGeometry(S, S);
    const floorMesh = new THREE.InstancedMesh(tile, lambert(floorTexture()), open.length);
    const ceilMesh = new THREE.InstancedMesh(tile, lambert(ceilTexture()), open.length);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    const col = new THREE.Color();
    open.forEach((c, i) => {
      q.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
      m4.compose(new THREE.Vector3(c.x * S, 0, c.y * S), q, one);
      floorMesh.setMatrixAt(i, m4);
      floorMesh.setColorAt(i, col.set(c.color).multiplyScalar(0.8));
      q.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
      m4.compose(new THREE.Vector3(c.x * S, WH, c.y * S), q, one);
      ceilMesh.setMatrixAt(i, m4);
      ceilMesh.setColorAt(i, col.set(c.color).multiplyScalar(0.9));
    });
    root.add(floorMesh, ceilMesh);
    // Wall faces: one instanced mesh; doors are separate groups so they can open.
    const faces = [];
    for (const c of open) {
      for (let d = 0; d < 4; d++) {
        const e = edgeAt(floor, c.x, c.y, d);
        if (e.type === 'wall') faces.push([c, d]);
        else if (e.type !== 'open') buildDoorSide(root, e, c, d);
      }
    }
    const wallGeo = new THREE.PlaneGeometry(S + 4 * EPS, WH); // overlap at corners: no see-through seams
    wallGeo.translate(0, WH / 2, 0);
    const walls = new THREE.InstancedMesh(wallGeo, lambert(wallTexture()), faces.length);
    const dummy = new THREE.Object3D();
    faces.forEach(([c, d], i) => {
      faceTransform(dummy, c.x, c.y, d);
      dummy.updateMatrix();
      walls.setMatrixAt(i, dummy.matrix);
      // Slight per-direction shading so corners read even in flat light.
      walls.setColorAt(i, col.set(c.color).multiplyScalar(d % 2 ? 0.86 : 1));
    });
    root.add(walls);
    for (const c of open) if (c.feature) buildFeature(root, c);
    scene.add(root);
  }

  // Re-texture doors after a lock/shortcut changes, and redraw opened chests.
  function refresh() {
    for (const entry of doors.values()) {
      for (const slab of entry.slabs) {
        const { edge, d } = slab.userData;
        slab.material.map = doorTexture(doorVariant(edge, d));
        slab.material.needsUpdate = true;
      }
    }
  }

  function setPose(x, y, dir) {
    pose.x = x * S;
    pose.z = y * S;
    pose.yaw = -dir * (Math.PI / 2);
  }

  function tween(dur, fn) {
    if (fast || dur <= 0) { fn(1); return Promise.resolve(); }
    return new Promise((resolve) => tweens.push({ t0: performance.now(), dur, fn, resolve }));
  }

  function moveTo(x, y, ms = 180, easing = ease) {
    const fx = pose.x; const fz = pose.z;
    const tx = x * S; const tz = y * S;
    return tween(ms, (t) => { const k = easing(t); pose.x = fx + (tx - fx) * k; pose.z = fz + (tz - fz) * k; });
  }

  // Free movement: the camera is exactly at the player (no setback) and yaw is the player's heading.
  function setFree(on) { SETBACK = on ? 0 : 0.8; }
  function setPoseExact(fx, fy, yaw, pitch = 0) {
    pose.x = fx * S;
    pose.z = fy * S;
    pose.yaw = yaw;
    lookOff.yaw = 0;
    lookOff.pitch = pitch;
  }

  function look(dYaw, dPitch) {
    lookOff.yaw = Math.max(-Math.PI, Math.min(Math.PI, lookOff.yaw + dYaw));
    lookOff.pitch = Math.max(-1.2, Math.min(1.2, lookOff.pitch + dPitch));
  }

  function resetLook(ms = 200) {
    if (!lookOff.yaw && !lookOff.pitch) return Promise.resolve();
    const fy = lookOff.yaw; const fp = lookOff.pitch;
    return tween(ms, (t) => { const k = 1 - ease(t); lookOff.yaw = fy * k; lookOff.pitch = fp * k; });
  }

  function turn(delta, ms = 170) {
    const from = pose.yaw;
    const to = from - delta * (Math.PI / 2);
    return tween(ms, (t) => { pose.yaw = from + (to - from) * ease(t); });
  }

  function bump(dir, ms = 160) {
    const fx = pose.x; const fz = pose.z;
    return tween(ms, (t) => {
      const k = Math.sin(t * Math.PI) * 0.18;
      pose.x = fx + DX[dir] * k;
      pose.z = fz + DY[dir] * k;
    });
  }

  function openDoor(edgeId) {
    const e = doors.get(edgeId);
    if (!e) return;
    e.target = 1;
    e.closeAt = performance.now() + (fast ? 0 : 520);
    if (fast) e.open = 1;
  }

  let flash = 0;
  function warpFlash() { flash = 1; }

  function setDark(on) { scene.fog = on ? fogDark : fogNormal; torch.distance = on ? 3 : 12; }

  function frame(now) {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      const t = Math.max(0, Math.min(1, (now - tw.t0) / tw.dur));
      tw.fn(t);
      if (t >= 1) { tweens.splice(i, 1); tw.resolve(); }
    }
    for (const e of doors.values()) {
      if (e.target === 1 && now > e.closeAt) e.target = 0;
      const step = fast ? 1 : 0.16;
      e.open += Math.max(-step, Math.min(step, e.target - e.open));
      for (const s of e.slabs) s.position.y = DOOR_H / 2 + e.open * DOOR_H * 0.98;
    }
    for (const s of spinners) s.rotation.z += 0.02;
    camera.position.set(pose.x + Math.sin(pose.yaw) * SETBACK, EYE, pose.z + Math.cos(pose.yaw) * SETBACK);
    camera.rotation.set(lookOff.pitch, pose.yaw + lookOff.yaw, 0, 'YXZ');
    // Signs on the cell you're standing on would hang in your face: hide them up close.
    for (const sg of signs) sg.visible = Math.hypot(sg.position.x - pose.x, sg.position.z - pose.z) > S * 0.6;
    if (flash > 0) {
      scene.background.setRGB(flash, flash * 0.5, flash);
      flash = Math.max(0, flash - 0.06);
      if (flash === 0) scene.background.set('#050508');
    }
    renderer.render(scene, camera);
  }

  let running = true;
  const loop = (now) => { if (!running) return; frame(now); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);

  return {
    build, refresh, setPose, moveTo, turn, bump, openDoor, setDark, warpFlash, resize, look, resetLook, setFree, setPoseExact,
    busy: () => tweens.length > 0,
    renderOnce: () => frame(performance.now()),
    dispose: () => { running = false; renderer.dispose(); },
    canvas: renderer.domElement,
  };
}
