// Warszawa 3D — Styl „rysunek”: krawędzie długopisem, powierzchnie kredką.
// Skrypt klasyczny: wspólny zakres globalny z pozostałymi plikami gry (kolejność: js/boot.mjs).
'use strict';
/* ---------- styl pojazdów „rysunek”: krawędzie niebieskim długopisem, powierzchnie kredką kreskowaną po skosie ---------- */
const SK_NOISE = `
  float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }`;
const SK = { on: false, mats: new Map(), lines: [], time: { value: 0 }, pr: { value: 1 }, sun: { value: new THREE.Vector3() } };
function avgColor(m) {   // kolor kredki: kolor materiału razy średni kolor jego tekstury
  const c = (m.color ? m.color.clone() : new THREE.Color(1, 1, 1));
  const img = m.map && m.map.image;
  if (img && img.width) { try { const cv = document.createElement('canvas'); cv.width = cv.height = 8; const g = cv.getContext('2d'); g.drawImage(img, 0, 0, 8, 8); const d = g.getImageData(0, 0, 8, 8).data; let r = 0, gg = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; } c.multiply(new THREE.Color().setRGB(r / 64 / 255, gg / 64 / 255, b / 64 / 255, THREE.SRGBColorSpace)); } catch {} }
  return c;
}
function crayon(m) {
  if (SK.mats.has(m)) return SK.mats.get(m);
  const glassy = m.transparent && m.opacity < 0.7, glow = m.emissive && m.emissiveIntensity > 0.3 && (m.emissive.r + m.emissive.g + m.emissive.b) > 0.3 && !(m.color && m.color.r + m.color.g + m.color.b > 1.2);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: avgColor(m) }, uSun: SK.sun, uPr: SK.pr, uAlpha: { value: glassy ? 0.45 : 1 }, uSeed: { value: Math.random() * 50 } },
    vertexShader: `varying vec3 vN; void main(){ vec4 p = vec4(position, 1.0); vec3 n = normal;
      #ifdef USE_INSTANCING
        p = instanceMatrix * p; n = mat3(instanceMatrix) * n;
      #endif
      vN = normalize(mat3(modelMatrix) * n); gl_Position = projectionMatrix * modelViewMatrix * p; }`,
    fragmentShader: `uniform vec3 uColor; uniform vec3 uSun; uniform float uPr, uAlpha, uSeed; varying vec3 vN; ${SK_NOISE}
      void main(){
        vec2 q = gl_FragCoord.xy / uPr;
        float lit = clamp(dot(normalize(vN), uSun) * 0.5 + 0.55, 0.0, 1.0);
        // kreski kredki po skosie: nierówne odstępy, grubość i nacisk; dwie warstwy (druga gęstsza w cieniu)
        float w = vn(q * 0.03 + uSeed) * 3.0;
        float d1 = (q.x + q.y) * 0.21 + w, s1 = abs(fract(d1) - 0.5) * 2.0;
        float press = 0.55 + 0.45 * vn(vec2(floor(d1) * 3.1, (q.x - q.y) * 0.02));
        float a = smoothstep(0.75, 0.2, s1) * press;
        float d2 = (q.x + q.y * 1.35) * 0.17 + w * 1.3 + 0.37, s2 = abs(fract(d2) - 0.5) * 2.0;
        a = max(a, smoothstep(0.7, 0.25, s2) * (0.4 + 0.6 * vn(q * 0.05 + 7.0)) * smoothstep(0.75, 0.35, lit));
        // niedokładnie: plamy, w które kredka nie trafiła, ziarno papieru
        float gap = smoothstep(0.12, 0.45, vn(q * 0.012 + uSeed * 0.3) + 0.2);
        a *= 0.8 + 0.2 * h21(floor(q * 0.7));
        float cover = clamp((0.42 + a * 0.75) * mix(0.55, 1.0, gap) * mix(0.9, 1.15, 1.0 - lit), 0.0, 1.0);
        vec3 paper = vec3(0.93, 0.92, 0.87); float L = dot(uColor, vec3(0.3, 0.59, 0.11)); vec3 cc = max(mix(vec3(L), uColor, 1.6), 0.0) * (1.0 + 0.6 * smoothstep(0.15, 0.0, L)); vec3 ink = cc * mix(0.6, 1.05, lit);
        gl_FragColor = vec4(mix(paper, ink, cover), uAlpha);
        #include <colorspace_fragment>
      }`,
    transparent: glassy, depthWrite: !glassy, side: m.side,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  });
  if (glow) { mat.uniforms.uColor.value = m.emissive.clone().multiplyScalar(1.2); }
  SK.mats.set(m, mat); return mat;
}
// linie długopisu: zagięcia (EdgesGeometry) i obrys (siatka odwrócona, wypchnięta wzdłuż normalnych), drżące
const penLine = new THREE.ShaderMaterial({
  uniforms: { uT: SK.time },
  vertexShader: `uniform float uT; ${SK_NOISE} void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vec4 c = projectionMatrix * viewMatrix * w;
    c.xy += (vec2(vn(w.xz * 4.0 + w.y), vn(w.zy * 4.0 + 3.0)) - 0.5) * 0.006 * c.w; c.z -= 0.0004 * c.w; gl_Position = c; }`,
  fragmentShader: `void main(){ gl_FragColor = vec4(0.11, 0.2, 0.62, 1.0); }`,
});
const penOutline = new THREE.ShaderMaterial({
  uniforms: { uPr: SK.pr },
  vertexShader: `${SK_NOISE} void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vec4 c = projectionMatrix * viewMatrix * w;
    vec3 n = normalize(mat3(viewMatrix) * mat3(modelMatrix) * normal); vec2 dir = normalize((projectionMatrix * vec4(n, 0.0)).xy + 1e-5);
    float width = (0.6 + 1.1 * vn(w.xz * 2.5 + w.y * 3.0)) * 0.0028; c.xy += dir * width * c.w; gl_Position = c; }`,
  fragmentShader: `void main(){ gl_FragColor = vec4(0.12, 0.22, 0.66, 1.0); }`,
  side: THREE.BackSide,
});
function setSketch(on) {
  SK.on = on;
  for (const V of FLEET) V.v.group.traverse(o => {
    if (!o.isMesh || o.userData.pen) return;
    if (!o.userData.realMat) o.userData.realMat = o.material;
    o.material = on ? (Array.isArray(o.userData.realMat) ? o.userData.realMat.map(crayon) : crayon(o.userData.realMat)) : o.userData.realMat;
    if (on && !o.userData.penDone && !o.isInstancedMesh && !o.isSkinnedMesh) {
      o.userData.penDone = true;
      const g = o.geometry; if (!g.attributes.position || g.attributes.position.count < 3) return;
      if (o.name !== 'articulation bellows') { const e = new THREE.LineSegments(new THREE.EdgesGeometry(g, 28), penLine); e.userData.pen = true; e.raycast = () => {}; o.add(e); SK.lines.push(e); }
      if (!g.boundingSphere) g.computeBoundingSphere();
      if (g.boundingSphere.radius > 0.12 && g.attributes.normal) { const ol = new THREE.Mesh(g, penOutline); ol.userData.pen = true; ol.castShadow = false; ol.raycast = () => {}; o.add(ol); SK.lines.push(ol); }
    }
  });
  for (const L of SK.lines) L.visible = on;
}
function sketchFrame() { if (!SK.on) return; SK.pr.value = renderer.getPixelRatio(); SK.sun.value.copy(SUN_DIR); }
