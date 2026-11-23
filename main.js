/* ORBIT ATLAS — CINEMATIC EDITION
   Self-contained, offline WebGL planet renderer and animated orbital carousel.
   Uses real 3D spherical texture mapping, custom GLSL lighting, independent drag rotation.
   No frameworks, CDN dependencies, API keys or internet needed after download. */

const PLANETS = [
  { id:'mercury', name:'Mercury', line:'The little world closest to the Sun.', insight:'Cratered and sun-scorched, this swift little planet circles the Sun in just 88 Earth days.', tint:[.73,.68,.64], yaw:.3, pitch:.07, accent:'#c0b1a3', glow:'rgba(168,143,123,.42)' },
  { id:'venus', name:'Venus', line:'A golden world behind a veil of clouds.', insight:'Beyond its glowing cloud veil lies the hottest planetary surface in the solar system.', tint:[.94,.66,.38], yaw:1.3, pitch:-.04, accent:'#e4b586', glow:'rgba(194,116,68,.40)' },
  { id:'earth', name:'Earth', line:'Our beautiful blue home, suspended in the dark.', insight:'Oceans, continents, and a protective atmosphere make this the only known world to harbor life.', tint:[.33,.65,1], yaw:-1.5, pitch:.17, accent:'#95c6ff', glow:'rgba(54,113,215,.42)' },
  { id:'mars', name:'Mars', line:'Rust-red deserts on the edge of discovery.', insight:'Ancient riverbeds, red deserts, and enormous volcanoes trace the story of a changing world.', tint:[1,.44,.29], yaw:-1.05, pitch:.12, accent:'#ed9878', glow:'rgba(182,68,45,.44)' },
  { id:'jupiter', name:'Jupiter', line:'A giant world of swirling storms.', insight:'Immense cloud belts wrap the largest planet, where giant storms have raged for centuries.', tint:[.91,.66,.43], yaw:1.9, pitch:-.06, accent:'#dcb89b', glow:'rgba(165,108,73,.38)' },
  { id:'saturn', name:'Saturn', line:'A magnificent giant dressed in rings.', insight:'Countless fragments of ice and rock form the dazzling rings of this distant gas giant.', tint:[.91,.78,.54], yaw:.8, pitch:.07, accent:'#dbc79b', glow:'rgba(168,140,87,.32)' },
  { id:'uranus', name:'Uranus', line:'The quiet, pale-blue world tipped on its side.', insight:'This pale cyan ice giant rotates almost on its side beneath a frigid, methane-rich sky.', tint:[.43,.8,.87], yaw:-.9, pitch:-.05, accent:'#96dde2', glow:'rgba(67,170,177,.38)' },
  { id:'neptune', name:'Neptune', line:'Deep-blue skies and the wildest winds.', insight:'Far beyond the inner worlds, fierce winds sweep across this deep-blue ice giant.', tint:[.33,.57,1], yaw:.7, pitch:.05, accent:'#7ca8fa', glow:'rgba(59,100,226,.42)' },
].map((p,index) => ({ ...p,index,lastTouched:0,spinSpeed:.018 + index*.002 }));

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const views = [];
const scene = document.getElementById('scene');
const track = document.getElementById('planet-track');
const nav = document.getElementById('planet-nav');
const nameEl = document.getElementById('planet-name');
const lineEl = document.getElementById('planet-description');
const copyEl = document.getElementById('planet-copy');
const insightEl = document.getElementById('planet-insight');
const insightTextEl = document.getElementById('insight-description');
const sceneNodes = [];
let selectedIndex = 2;
let wheelLock = 0;
let warpTimer;
let titleTimer;

const VERTEX_SHADER = `
attribute vec2 aPosition;
varying vec2 vPosition;
void main() { vPosition = aPosition; gl_Position = vec4(aPosition, 0.0, 1.0); }
`;

const FRAGMENT_SHADER = `
precision highp float;
varying vec2 vPosition;
uniform vec2 uResolution;
uniform vec2 uAngle;
uniform float uRadius;
uniform float uRing;
uniform float uCloud;
uniform float uTime;
uniform vec3 uTint;
uniform sampler2D uMap;
uniform sampler2D uCloudMap;
const float PI = 3.141592653589793;
vec3 rotateSurface(vec3 p, vec2 angle) {
  float cy = cos(angle.x), sy = sin(angle.x);
  p = vec3(cy * p.x - sy * p.z, p.y, sy * p.x + cy * p.z);
  float cx = cos(angle.y), sx = sin(angle.y);
  p = vec3(p.x, cx * p.y + sx * p.z, -sx * p.y + cx * p.z);
  return normalize(p);
}
void main() {
  float shortest = min(uResolution.x, uResolution.y);
  vec2 p = (vPosition * uResolution / shortest) / uRadius;
  float r = length(p);
  float edge = 3.0 / max(120.0, shortest * uRadius);
  float planetAlpha = 1.0 - smoothstep(1.0 - edge, 1.0 + edge, r);
  float surfaceZ = sqrt(max(0.0, 1.0 - r * r));
  vec3 rgb = vec3(0.0);
  float alpha = 0.0;

  if (planetAlpha > 0.001) {
    vec3 normal = vec3(p.x, p.y, surfaceZ);
    vec3 surf = rotateSurface(normal, uAngle);
    float lon = atan(surf.z, surf.x);
    float uu = fract(lon / (2.0 * PI) + 0.5);
    float vv = asin(clamp(surf.y, -1.0, 1.0)) / PI + 0.5;
    vec3 albedo = texture2D(uMap, vec2(uu, vv)).rgb;

    if (uCloud > 0.5) {
      float cloud = texture2D(uCloudMap, vec2(fract(uu + uTime * 0.000003), vv)).r;
      float density = clamp((cloud - 0.12) * 1.4, 0.0, 0.83);
      albedo = mix(albedo, vec3(0.97, 0.98, 1.0), density);
    }
    vec3 sun = normalize(vec3(-0.56, 0.47, 0.84));
    float diffusion = max(dot(normal, sun), 0.0);
    float day = 0.20 + 0.90 * pow(diffusion, 1.15);
    // Soft but real sphere terminator and a thin atmospheric rim.
    rgb = albedo * day;
    float rim = pow(1.0 - surfaceZ, 5.5);
    rgb += uTint * rim * (uCloud > 0.5 ? 0.27 : 0.075);
    alpha = planetAlpha;
  }

  if (uRing > 0.5) {
    // Saturn's rings are an inclined 3D plane, with depth-correct occlusion.
    float angle = -0.39;
    vec3 axisU = vec3(cos(angle), sin(angle), 0.0);
    vec3 axisV = vec3(-sin(angle) * 0.37, cos(angle) * 0.37, 0.929);
    vec3 planeNormal = normalize(cross(axisU, axisV));
    float ringZ = -(planeNormal.x * p.x + planeNormal.y * p.y) / planeNormal.z;
    vec3 intersection = vec3(p.x, p.y, ringZ);
    float ringRadius = length(intersection);
    float ringAlpha = smoothstep(1.14, 1.19, ringRadius) * (1.0 - smoothstep(1.80, 1.85, ringRadius));
    float bands = 0.62 + 0.17 * sin(ringRadius * 160.0) + 0.10 * sin(ringRadius * 480.0);
    float cassiniGap = 1.0 - 0.87 * exp(-pow((ringRadius - 1.57) / 0.023, 2.0));
    float faintGap = 1.0 - 0.50 * exp(-pow((ringRadius - 1.31) / 0.014, 2.0));
    float ringOpacity = ringAlpha * clamp(bands, 0.25, 0.9) * cassiniGap * faintGap;
    vec3 ringColor = mix(vec3(0.42, 0.36, 0.29), vec3(0.88, 0.82, 0.70), clamp((ringRadius - 1.14) * 0.85, 0.0, 1.0));
    ringColor *= 0.90 + 0.10 * dot(planeNormal, normalize(vec3(-0.3, 0.7, 0.9)));
    // Ring is visible behind the planet only when it is outside the silhouette.
    if (r >= 1.0 || ringZ > surfaceZ) {
      rgb = alpha < 0.001 ? ringColor : mix(rgb, ringColor, ringOpacity);
      alpha = alpha + (1.0 - alpha) * ringOpacity;
    }
  }

  // Very subtle atmospheric bloom beyond the limb, not painted-on flat circles.
  float outerGlow = (1.0 - smoothstep(1.00, 1.13, r)) * (1.0 - smoothstep(0.975, 1.0, r));
  rgb = mix(rgb, uTint * 0.12, outerGlow * (1.0 - alpha));
  alpha = max(alpha, outerGlow * 0.10);
  gl_FragColor = vec4(rgb, alpha);
}
`;
const SHADER = FRAGMENT_SHADER;

function createShader(gl, type, src) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error('WebGL shader error: ' + gl.getShaderInfoLog(shader));
  }
  return shader;
}

function createProgram(gl) {
  const program = gl.createProgram();
  gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, SHADER));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error('WebGL program error: ' + gl.getProgramInfoLog(program));
  }
  return program;
}

function createTexture(gl) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  const neutral = new Uint8Array([150, 160, 180, 255]);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, neutral);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return texture;
}

function uploadImage(gl, texture, image) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
}

function loadTexture(view, key, target) {
  const image = new Image();
  image.onload = () => {
    try { uploadImage(view.gl, view[target], image); }
    catch (error) { console.warn('Planet texture unavailable:', key, error); }
  };
  image.onerror = () => console.warn('Unable to load texture:', key);
  image.src = window.ORBIT_TEXTURES[key];
}

function createView(canvas, planet, large = false) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false, preserveDrawingBuffer: false });
  if (!gl) {
    const view = createCPUView(canvas, planet, large);
    views.push(view);
    bindInteraction(view);
    return view;
  }
  const program = createProgram(gl);
  gl.useProgram(program);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
  const vertex = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uniform = {};
  for (const name of ['uResolution', 'uAngle', 'uRadius', 'uRing', 'uCloud', 'uTime', 'uTint', 'uMap', 'uCloudMap']) {
    uniform[name] = gl.getUniformLocation(program, name);
  }
  gl.uniform1i(uniform.uMap, 0);
  gl.uniform1i(uniform.uCloudMap, 1);
  const view = { gl, program, canvas, planet, large, uniform, texture: createTexture(gl), cloudTexture: createTexture(gl) };
  loadTexture(view, planet.id, 'texture');
  if (planet.id === 'earth') loadTexture(view, 'earth-clouds', 'cloudTexture');
  views.push(view);
  bindInteraction(view);
  return view;
}


// CPU fallback keeps dragging and individual planet movement functional on
// devices where WebGL is disabled (including some remote/virtual browsers).
function createCPUView(canvas, planet, large) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const view = { cpu: true, ctx, canvas, planet, large, textureData: null, cloudData: null };
  function load(key, field) {
    const image = new Image();
    image.onload = () => {
      const scratch = document.createElement('canvas');
      scratch.width = image.naturalWidth;
      scratch.height = image.naturalHeight;
      const c = scratch.getContext('2d', { willReadFrequently: true });
      c.drawImage(image, 0, 0);
      const raw = c.getImageData(0, 0, scratch.width, scratch.height);
      view[field] = { data: raw.data, width: scratch.width, height: scratch.height };
    };
    image.src = window.ORBIT_TEXTURES[key];
  }
  view.load = (key) => { load(key, 'textureData'); if (key === 'earth') load('earth-clouds', 'cloudData'); };
  view.load(planet.id);
  return view;
}

function renderCPU(view) {
  const rect = view.canvas.getBoundingClientRect();
  if (!rect.width || !rect.height || !view.textureData) return;
  const size = view.large ? 0.82 : 0.83;
  const w = Math.max(1, Math.round(rect.width * size));
  const h = Math.max(1, Math.round(rect.height * size));
  if (view.canvas.width !== w || view.canvas.height !== h) {
    view.canvas.width = w; view.canvas.height = h;
  }
  const image = view.ctx.createImageData(w, h);
  const output = image.data;
  const { planet, textureData } = view;
  const tw = textureData.width, th = textureData.height, source = textureData.data;
  const cloudData = planet.id === 'earth' ? view.cloudData : null;
  const radius = Math.min(w, h) * (planet.id === 'saturn' ? (view.large ? .48 : .50) : (view.large ? .72 : .81)) * .5;
  const cyaw = Math.cos(planet.yaw), syaw = Math.sin(planet.yaw);
  const cp = Math.cos(planet.pitch), sp = Math.sin(planet.pitch);
  const angle = -.39, ca = Math.cos(angle), sa = Math.sin(angle);
  const normal = { x: sa * .929, y: -ca * .929, z: .37 };
  for (let y=0; y<h; y++) {
    const ny=(h*.5-y-.5)/radius;
    for (let x=0; x<w; x++) {
      const nx=(x+.5-w*.5)/radius;
      const r2=nx*nx+ny*ny;
      const out=(y*w+x)*4;
      const onSphere=r2 <= 1;
      const zz=onSphere?Math.sqrt(Math.max(0,1-r2)):0;
      let alpha=0, red=0, green=0, blue=0;
      if(onSphere) {
        let sx=cyaw*nx-syaw*zz, sy=ny, sz=syaw*nx+cyaw*zz;
        const sy2=cp*sy+sp*sz;
        sx = sx; sz=-sp*sy+cp*sz; sy=sy2;
        const uu=((Math.atan2(sz,sx)/(Math.PI*2)+.5)%1+1)%1;
        const vv=Math.max(0,Math.min(1,Math.asin(Math.max(-1,Math.min(1,sy)))/Math.PI+.5));
        const tx=Math.min(tw-1,Math.floor(uu*tw)), ty=Math.max(0,Math.min(th-1,Math.floor((1-vv)*th)));
        const off=(ty*tw+tx)*4;
        red=source[off]; green=source[off+1]; blue=source[off+2];
        if(cloudData) {
          const cx=Math.min(cloudData.width-1,Math.floor(uu*cloudData.width));
          const cy=Math.max(0,Math.min(cloudData.height-1,Math.floor((1-vv)*cloudData.height)));
          const cloud=cloudData.data[(cy*cloudData.width+cx)*4]/255;
          const density=Math.min(.83,Math.max(0,(cloud-.12)*1.4));
          red=red*(1-density)+249*density;green=green*(1-density)+250*density;blue=blue*(1-density)+255*density;
        }
        const diffuse=Math.max(0,nx*(-.56)+ny*.47+zz*.84)/Math.hypot(-.56,.47,.84);
        const light=.20+.90*Math.pow(diffuse,1.15);
        const rim=Math.pow(1-zz,5.5)*(cloudData?.27:.075);
        red=red*light+255*planet.tint[0]*rim;
        green=green*light+255*planet.tint[1]*rim;
        blue=blue*light+255*planet.tint[2]*rim;
        const edge=Math.max(0,Math.min(1,(1-Math.sqrt(r2))*radius/1.5));
        alpha=edge*255;
      }
      if(planet.id==='saturn') {
        const zring=-(normal.x*nx+normal.y*ny)/normal.z;
        const rad=Math.hypot(nx,ny,zring);
        if(rad>1.14&&rad<1.85&&(!onSphere||zring>zz)) {
          let band=.62+.17*Math.sin(rad*160)+.10*Math.sin(rad*480);
          band*=1-.87*Math.exp(-Math.pow((rad-1.57)/.023,2));
          band*=1-.50*Math.exp(-Math.pow((rad-1.31)/.014,2));
          const inner=Math.min(1,Math.max(0,(rad-1.14)/.06));
          const outer=Math.min(1,Math.max(0,(1.85-rad)/.06));
          const opacity=Math.min(1,Math.max(0,band*inner*outer));
          const t=Math.min(1,Math.max(0,(rad-1.14)*.85));
          const rr=(.42+( .88-.42)*t)*255;
          const gg=(.36+( .82-.36)*t)*255;
          const bb=(.29+( .70-.29)*t)*255;
          red=red*(1-opacity)+rr*opacity;
          green=green*(1-opacity)+gg*opacity;
          blue=blue*(1-opacity)+bb*opacity;
          alpha=alpha+(255-alpha)*opacity;
        }
      }
      const r=Math.sqrt(r2);
      if(r>1&&r<1.13) {
        const glow=(1-(r-1)/.13)*.10;
        red=planet.tint[0]*255*.12*glow;
        green=planet.tint[1]*255*.12*glow;
        blue=planet.tint[2]*255*.12*glow;
        alpha=Math.max(alpha,glow*255);
      }
      output[out]=red; output[out+1]=green; output[out+2]=blue; output[out+3]=alpha;
    }
  }
  view.ctx.putImageData(image,0,0);
}


function render(view, elapsedSeconds) {
  if (view.cpu) { renderCPU(view); return; }
  const { gl, canvas, uniform, planet } = view;
  // Cap resolution to keep eight simultaneous WebGL canvases fluid on laptops.
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const maxPixelRatio = view.large ? 1.8 : 1.35;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
  const width = Math.max(1, Math.round(rect.width * pixelRatio));
  const height = Math.max(1, Math.round(rect.height * pixelRatio));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  gl.viewport(0, 0, width, height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(view.program);
  gl.uniform2f(uniform.uResolution, width, height);
  gl.uniform2f(uniform.uAngle, planet.yaw, planet.pitch);
  gl.uniform1f(uniform.uRadius, planet.id === 'saturn' ? (view.large ? 0.48 : 0.50) : (view.large ? 0.72 : 0.81));
  gl.uniform1f(uniform.uRing, planet.id === 'saturn' ? 1.0 : 0.0);
  gl.uniform1f(uniform.uCloud, planet.id === 'earth' ? 1.0 : 0.0);
  gl.uniform1f(uniform.uTime, elapsedSeconds);
  gl.uniform3fv(uniform.uTint, planet.tint);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, view.texture);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, view.cloudTexture);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}



function bindInteraction(view) {
  const canvas = view.canvas;
  const node = canvas.closest('.planet-object');
  let down = null;
  let moved = false;

  canvas.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    down = { id: event.pointerId, x: event.clientX, y: event.clientY, originX: event.clientX, originY: event.clientY };
    moved = false;
    canvas.setPointerCapture(event.pointerId);
    node.classList.add('is-dragging');
    view.planet.lastTouched = performance.now();
  });
  canvas.addEventListener('pointermove', event => {
    if (!down || down.id !== event.pointerId) return;
    const dx = event.clientX - down.x;
    const dy = event.clientY - down.y;
    if (Math.hypot(event.clientX - down.originX,event.clientY - down.originY)>6) moved = true;
    if (moved) {
      view.planet.yaw += dx * .0105;
      view.planet.pitch = Math.max(-1.22,Math.min(1.22, view.planet.pitch + dy*.0075));
      view.planet.lastTouched = performance.now();
    }
    down.x = event.clientX; down.y = event.clientY;
  });
  function release(event,cancelled=false) {
    if (!down || event.pointerId !== down.id) return;
    const index = view.planet.index;
    node.classList.remove('is-dragging');
    down = null;
    if (!moved && !cancelled && index !== selectedIndex) selectPlanet(index);
  }
  canvas.addEventListener('pointerup',event=>release(event));
  canvas.addEventListener('pointercancel',event=>release(event,true));
}

function getSlot(relative,width,height) {
  const mobile = width < 650;
  const medium = width < 950;
  const side = Math.sign(relative);
  const ab = Math.abs(relative);
  const w = width;
  const h = height;
  if (ab===0) return {x:0,y:0,scale:mobile?.98:.90,alpha:1,blur:0,brightness:1,z:9};
  if (ab===1) return {x:side*Math.min(w*(mobile?.455:medium?.33:.305),410),y: mobile?-36:Math.min(h*.14,102),scale:mobile?.32:.355,alpha:.93,blur:0,brightness:.86,z:7};
  if (ab===2) return {x:side*Math.min(w*(mobile?.44:.405),590),y:mobile?-148:-Math.min(h*.10,82),scale:mobile?.20:.245,alpha:.69,blur:.3,brightness:.71,z:5};
  if (ab===3) return {x:side*Math.min(w*(mobile?.30:.325),480),y:mobile?-206:-Math.min(h*.31,236),scale:mobile?.135:.17,alpha:.46,blur:.6,brightness:.64,z:3};
  return {x:mobile?-32:Math.min(w*.18,250),y:mobile?-220:-Math.min(h*.37,275),scale:mobile?.115:.145,alpha:.35,blur:1,brightness:.58,z:2};
}

function signedDistance(i,center) {
  let delta = (i-center+PLANETS.length)%PLANETS.length;
  if (delta>4) delta-=PLANETS.length;
  return delta;
}

function layoutPlanets() {
  const width = scene.clientWidth;
  const height = scene.clientHeight;
  for (const planet of PLANETS) {
    const node = sceneNodes[planet.index];
    const rel = signedDistance(planet.index,selectedIndex);
    const slot = getSlot(rel,width,height);
    node.style.setProperty('--dx',slot.x+'px');
    node.style.setProperty('--dy',slot.y+'px');
    node.style.setProperty('--scale',slot.scale);
    node.style.setProperty('--opacity',slot.alpha);
    node.style.setProperty('--blur',slot.blur+'px');
    node.style.setProperty('--brightness',slot.brightness);
    node.style.setProperty('--stack',slot.z);
    node.classList.toggle('is-selected',rel===0);
    node.classList.toggle('is-far',Math.abs(rel)>=2);
    node.setAttribute('aria-label',rel===0?`${planet.name}, selected. Drag to rotate.`:`Explore ${planet.name}. Click to bring it forward.`);
    const button = nav.querySelector(`[data-planet="${planet.id}"]`);
    button?.setAttribute('aria-current',String(rel===0));
    if (rel===0) button?.scrollIntoView({block:'nearest',inline:'nearest',behavior:reducedMotion.matches?'instant':'smooth'});
  }
}

function applyTheme(planet) {
  document.documentElement.style.setProperty('--accent',planet.accent);
  document.documentElement.style.setProperty('--accent-glow',planet.glow);
}

function updateCaption(planet) {
  clearTimeout(titleTimer);
  copyEl.classList.remove('is-switching');
  void copyEl.offsetWidth;
  nameEl.textContent = planet.name.toUpperCase();
  lineEl.textContent = planet.line;
  insightTextEl.textContent = planet.insight;
  insightEl.classList.remove('is-switching');
  void insightEl.offsetWidth;
  copyEl.classList.add('is-switching');
  insightEl.classList.add('is-switching');
}

function selectPlanet(index, animate=true) {
  const next = (index+PLANETS.length)%PLANETS.length;
  if (next === selectedIndex && animate) return;
  selectedIndex = next;
  const planet = PLANETS[next];
  applyTheme(planet);
  layoutPlanets();
  updateCaption(planet);
  if (animate && !reducedMotion.matches) {
    clearTimeout(warpTimer);
    scene.classList.remove('is-warping');
    void scene.offsetWidth;
    scene.classList.add('is-warping');
    warpTimer = setTimeout(()=>scene.classList.remove('is-warping'),1050);
  }
}

for (const planet of PLANETS) {
  const node = document.createElement('div');
  node.className='planet-object';
  node.style.setProperty('--orb-color',planet.glow);
  node.dataset.planet=planet.id;
  node.innerHTML = `<span class="planet-halo" aria-hidden="true"></span><canvas aria-label="Interactive 3D ${planet.name}"></canvas><span class="orb-label" aria-hidden="true">${planet.name}</span>`;
  sceneNodes.push(node);
  track.appendChild(node);
  createView(node.querySelector('canvas'),planet,false);
  const button = document.createElement('button');
  button.type='button';
  button.textContent=planet.name;
  button.dataset.planet=planet.id;
  button.addEventListener('click',()=>selectPlanet(planet.index));
  nav.appendChild(button);
}

function travel(delta) { selectPlanet(selectedIndex+delta); }
document.getElementById('previous').addEventListener('click',()=>travel(-1));
document.getElementById('next').addEventListener('click',()=>travel(1));
document.addEventListener('keydown',event=>{
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;
  if(event.key==='ArrowRight'){event.preventDefault();travel(1);}
  if(event.key==='ArrowLeft'){event.preventDefault();travel(-1);}
});
scene.addEventListener('wheel',event=>{
  if(Math.abs(event.deltaY) < 5 && Math.abs(event.deltaX) < 5) return;
  event.preventDefault();
  const now=performance.now();
  if(now-wheelLock<850) return;
  wheelLock=now;
  travel(Math.abs(event.deltaX)>Math.abs(event.deltaY)?Math.sign(event.deltaX):Math.sign(event.deltaY));
},{passive:false});
let sceneSwipe=null;
scene.addEventListener('pointerdown', event=>{
  if(event.target.closest('.planet-object'))return;
  sceneSwipe={id:event.pointerId,x:event.clientX,y:event.clientY};
});
scene.addEventListener('pointerup',event=>{
  if(!sceneSwipe||event.pointerId!==sceneSwipe.id)return;
  const delta=event.clientX-sceneSwipe.x;
  if(Math.abs(delta)>45) travel(delta>0?-1:1);
  sceneSwipe=null;
});
scene.addEventListener('pointercancel',()=>sceneSwipe=null);
window.addEventListener('resize',layoutPlanets);
selectPlanet(2,false);

let previous=performance.now();
let frameNumber=0;
function frame(now) {
  const delta=Math.min((now-previous)/1000,.06);
  previous=now;
  if(!document.hidden) {
    for(const planet of PLANETS){
      if(now-planet.lastTouched>2800&&!reducedMotion.matches){
        planet.yaw += delta*planet.spinSpeed;
      }
    }
    // Frame cadence adapted to the visible globe's size. GPU renders at ~30fps.
    // Canvas 2D fallback is throttled to avoid locking slower machines.
    if(frameNumber++%(views[0]?.cpu?10:2)===0){
      for(const view of views) render(view,now*.001);
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
