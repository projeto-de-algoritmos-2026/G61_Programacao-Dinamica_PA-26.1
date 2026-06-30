// ════════════════════════════════════════════════
//  STATE
// ════════════════════════════════════════════════
let vertices = [];   // {id, x, y, label}
let edges    = [];   // {from, to, weight}
let source   = 0;

let bfSteps      = [];
let currentStep  = -1;
let bfDist       = [];  // bfDist[k][v] = distance to v after k iterations
let bfPrev       = [];
let numIterations = 0;
let negCycle     = false;

// Canvas interaction
let editorMode = 'draw';  // 'draw' | 'move'
let pendingFrom = null;
let dragging    = null;
let dragOffset  = { x: 0, y: 0 };

const INF = 1e9;

// ════════════════════════════════════════════════
//  CANVAS SETUP
// ════════════════════════════════════════════════
const canvas = document.getElementById('graph-canvas');
const ctx    = canvas.getContext('2d');

function resizeCanvas() {
  const w = canvas.parentElement.clientWidth - 32;
  canvas.width  = w;
  canvas.height = 280;
  drawEditorCanvas();
}

window.addEventListener('resize', resizeCanvas);

canvas.addEventListener('mousedown', onCanvasDown);
canvas.addEventListener('mousemove', onCanvasMove);
canvas.addEventListener('mouseup',   onCanvasUp);
canvas.addEventListener('mouseleave', () => { dragging = null; });

function getCanvasPos(e) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function getVertexAt(x, y) {
  for (let v of vertices) {
    const dx = v.x - x, dy = v.y - y;
    if (dx*dx + dy*dy <= 18*18) return v;
  }
  return null;
}

function onCanvasDown(e) {
  const pos = getCanvasPos(e);
  const hit = getVertexAt(pos.x, pos.y);

  if (editorMode === 'move') {
    if (hit) {
      dragging   = hit;
      dragOffset = { x: pos.x - hit.x, y: pos.y - hit.y };
    }
    return;
  }

  // draw mode
  if (hit) {
    if (pendingFrom === null) {
      pendingFrom = hit;
    } else if (pendingFrom.id !== hit.id) {
      const w = prompt(`Peso da aresta ${pendingFrom.label} → ${hit.label}:`, '1');
      if (w !== null && w.trim() !== '') {
        const wNum = parseInt(w);
        if (!isNaN(wNum)) {
          edges.push({ from: pendingFrom.id, to: hit.id, weight: wNum });
          renderEdgeList();
          drawGraphSVG();
        }
      }
      pendingFrom = null;
    } else {
      pendingFrom = null;
    }
  } else {
    if (vertices.length < 10) {
      const id = vertices.length;
      vertices.push({ id, x: pos.x, y: pos.y, label: String(id) });
      updateSourceSelect();
    }
    pendingFrom = null;
  }
  drawEditorCanvas();
}

function onCanvasMove(e) {
  if (editorMode === 'move' && dragging) {
    const pos  = getCanvasPos(e);
    dragging.x = Math.max(18, Math.min(canvas.width  - 18, pos.x - dragOffset.x));
    dragging.y = Math.max(18, Math.min(canvas.height - 18, pos.y - dragOffset.y));
    drawEditorCanvas();
    drawGraphSVG();
  }
}

function onCanvasUp() { dragging = null; }

// ════════════════════════════════════════════════
//  DRAW EDITOR CANVAS
// ════════════════════════════════════════════════
function drawEditorCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Edges
  for (let e of edges) {
    const u = vertices[e.from], v = vertices[e.to];
    if (!u || !v) continue;
    drawArrow(ctx, u.x, u.y, v.x, v.y, '#94a3b8', 18);
    const mx = (u.x + v.x) / 2, my = (u.y + v.y) / 2;
    ctx.fillStyle = e.weight < 0 ? '#dc2626' : '#2563eb';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(e.weight, mx + 4, my - 8);
  }

  // Pending highlight
  if (pendingFrom) {
    ctx.beginPath();
    ctx.arc(pendingFrom.x, pendingFrom.y, 21, 0, Math.PI * 2);
    ctx.strokeStyle = '#bfdbfe';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Vertices
  for (let v of vertices) {
    ctx.beginPath();
    ctx.arc(v.x, v.y, 16, 0, Math.PI * 2);
    ctx.fillStyle = (pendingFrom && pendingFrom.id === v.id) ? '#dbeafe' : '#fff';
    ctx.fill();
    ctx.strokeStyle = (pendingFrom && pendingFrom.id === v.id) ? '#2563eb' : '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(v.label, v.x, v.y);
  }
}

function drawArrow(ctx, x1, y1, x2, y2, color, radius) {
  const dx = x2-x1, dy = y2-y1;
  const dist = Math.sqrt(dx*dx + dy*dy);
  if (dist < 1) return;
  const ux = dx/dist, uy = dy/dist;
  const sx = x1 + ux*radius, sy = y1 + uy*radius;
  const ex = x2 - ux*radius, ey = y2 - uy*radius;

  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.stroke();

  const angle = Math.atan2(ey - sy, ex - sx);
  const a = 0.45, s = 9;
  ctx.beginPath();
  ctx.moveTo(ex - s*Math.cos(angle-a), ey - s*Math.sin(angle-a));
  ctx.lineTo(ex, ey);
  ctx.lineTo(ex - s*Math.cos(angle+a), ey - s*Math.sin(angle+a));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

// ════════════════════════════════════════════════
//  SVG GRAPH DISPLAY
// ════════════════════════════════════════════════
function drawGraphSVG(highlightEdge, distState, finalPaths) {
  const svg = document.getElementById('graph-display');
  const W = 600, H = 300, R = 20;

  if (!vertices.length) {
    svg.innerHTML = '<text x="300" y="150" text-anchor="middle" font-size="13" fill="#aaa">Monte o grafo no editor à esquerda.</text>';
    return;
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let v of vertices) {
    minX = Math.min(minX, v.x); minY = Math.min(minY, v.y);
    maxX = Math.max(maxX, v.x); maxY = Math.max(maxY, v.y);
  }
  const pw = maxX - minX || 1, ph = maxY - minY || 1;
  const scale = Math.min((W - 80) / pw, (H - 80) / ph, 1);
  const offX  = (W - pw*scale) / 2 - minX*scale;
  const offY  = (H - ph*scale) / 2 - minY*scale;

  function tx(x) { return x*scale + offX; }
  function ty(y) { return y*scale + offY; }

  const pathEdgeSet = new Set();
  if (finalPaths) {
    for (let vId = 0; vId < vertices.length; vId++) {
      if (finalPaths[vId] !== null && finalPaths[vId] !== undefined && vId !== source) {
        pathEdgeSet.add(`${finalPaths[vId]}-${vId}`);
      }
    }
  }

  let s = `<defs>
    <marker id="arr"      markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 Z" fill="#94a3b8"/></marker>
    <marker id="arr-hi"   markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 Z" fill="#2563eb"/></marker>
    <marker id="arr-imp"  markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 Z" fill="#16a34a"/></marker>
    <marker id="arr-path" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 Z" fill="#8b5cf6"/></marker>
  </defs>`;

  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    const u = vertices[e.from], v = vertices[e.to];
    if (!u || !v) continue;

    const x1 = tx(u.x), y1 = ty(u.y), x2 = tx(v.x), y2 = ty(v.y);
    const dx = x2-x1, dy = y2-y1;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const ux = dx/dist, uy = dy/dist;
    const sx = x1+ux*R, sy = y1+uy*R;
    const ex = x2-ux*(R+8), ey = y2-uy*(R+8);

    let color = '#94a3b8', marker = 'arr', sw = 1.5;
    let isImproved = false;

    if (highlightEdge && highlightEdge.edgeIdx === i) {
      if (highlightEdge.improved) {
        color = '#16a34a'; marker = 'arr-imp'; sw = 2.5; isImproved = true;
      } else {
        color = '#2563eb'; marker = 'arr-hi'; sw = 2.5;
      }
    } else if (pathEdgeSet.has(`${e.from}-${e.to}`)) {
      color = '#8b5cf6'; marker = 'arr-path'; sw = 2;
    }

    s += `<line x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}"
            stroke="${color}" stroke-width="${sw}" marker-end="url(#${marker})"/>`;

    const mx = (sx+ex)/2, my = (sy+ey)/2;
    const nx = -uy*10, ny = ux*10;
    const wColor = e.weight < 0 ? '#dc2626'
      : (highlightEdge && highlightEdge.edgeIdx === i ? (isImproved ? '#16a34a' : '#2563eb') : '#374151');
    s += `<rect x="${(mx+nx-10).toFixed(1)}" y="${(my+ny-9).toFixed(1)}" width="20" height="14" rx="3" fill="white" opacity="0.85"/>`;
    s += `<text x="${(mx+nx).toFixed(1)}" y="${(my+ny+1).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="600" font-family="monospace" fill="${wColor}">${e.weight}</text>`;
  }

  for (let v of vertices) {
    const vx = tx(v.x), vy = ty(v.y);
    const isSource = (v.id === source);
    const dist = distState ? distState[v.id] : null;

    let fill = '#fff', stroke = '#cbd5e1';
    if (isSource) { fill = '#fef3c7'; stroke = '#f59e0b'; }
    if (highlightEdge && highlightEdge.from === v.id) { fill = '#dbeafe'; stroke = '#2563eb'; }
    if (highlightEdge && highlightEdge.to === v.id) {
      fill   = highlightEdge.improved ? '#dcfce7' : '#dbeafe';
      stroke = highlightEdge.improved ? '#16a34a' : '#2563eb';
    }

    s += `<circle cx="${vx.toFixed(1)}" cy="${vy.toFixed(1)}" r="${R}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
    s += `<text x="${vx.toFixed(1)}" y="${(vy-4).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="700" font-family="monospace" fill="#111">${v.label}</text>`;

    const dLabel = (dist === null || dist === undefined) ? '' : (dist >= INF/2 ? '∞' : dist);
    if (dLabel !== '') {
      s += `<text x="${vx.toFixed(1)}" y="${(vy+8).toFixed(1)}" text-anchor="middle" font-size="9" font-family="monospace" fill="#6b7280">${dLabel}</text>`;
    }
  }

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = s;
}

// ════════════════════════════════════════════════
//  EDGE LIST UI
// ════════════════════════════════════════════════
function renderEdgeList() {
  const el = document.getElementById('edge-list');
  if (!edges.length) {
    el.innerHTML = '<p class="empty-msg" style="padding:1rem 0">Nenhuma aresta adicionada.</p>';
    return;
  }
  el.innerHTML = '';
  edges.forEach((e, i) => {
    const row = document.createElement('div');
    row.className = 'edge-row';
    const wClass = e.weight < 0 ? 'edge-neg' : 'edge-weight';
    row.innerHTML = `
      <span>${vertices[e.from]?.label ?? e.from}</span>
      <span>→ ${vertices[e.to]?.label ?? e.to}</span>
      <span class="${wClass}">${e.weight < 0 ? e.weight : '+'+e.weight}</span>
      <button class="edge-delete" onclick="deleteEdge(${i})" title="Remover aresta">
        <i class="ti ti-x"></i>
      </button>`;
    el.appendChild(row);
  });
}

function deleteEdge(i) {
  edges.splice(i, 1);
  renderEdgeList();
  drawEditorCanvas();
  drawGraphSVG();
}

function addEdgeManual() {
  const from   = parseInt(document.getElementById('edge-from').value);
  const to     = parseInt(document.getElementById('edge-to').value);
  const weight = parseInt(document.getElementById('edge-weight').value);
  if (isNaN(from) || isNaN(to) || isNaN(weight)) return;
  if (from < 0 || from >= vertices.length || to < 0 || to >= vertices.length) {
    alert(`Vértices devem estar entre 0 e ${vertices.length - 1}`);
    return;
  }
  edges.push({ from, to, weight });
  renderEdgeList();
  drawEditorCanvas();
  drawGraphSVG();
}

// ════════════════════════════════════════════════
//  SOURCE SELECT
// ════════════════════════════════════════════════
function updateSourceSelect() {
  const sel = document.getElementById('source-vertex');
  const cur = parseInt(sel.value) || 0;
  sel.innerHTML = '';
  for (let v of vertices) {
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.textContent = `Vértice ${v.label}`;
    if (v.id === cur) opt.selected = true;
    sel.appendChild(opt);
  }
  source = parseInt(sel.value) || 0;
  sel.onchange = () => { source = parseInt(sel.value); drawEditorCanvas(); drawGraphSVG(); };
}

// ════════════════════════════════════════════════
//  MODE TOGGLE
// ════════════════════════════════════════════════
function setMode(m) {
  editorMode  = m;
  pendingFrom = null;
  document.getElementById('tab-draw').classList.toggle('active', m === 'draw');
  document.getElementById('tab-move').classList.toggle('active', m === 'move');
  document.getElementById('canvas-hint').textContent = m === 'draw'
    ? 'Clique para adicionar vértice · Clique em dois vértices para criar aresta'
    : 'Clique e arraste vértices para reposicioná-los';
  canvas.style.cursor = m === 'move' ? 'grab' : 'crosshair';
  drawEditorCanvas();
}

// ════════════════════════════════════════════════
//  AUTO-GENERATE
// ════════════════════════════════════════════════
function autoGenerate() {
  const n = Math.max(2, Math.min(10, parseInt(document.getElementById('num-vertices').value) || 5));

  vertices = []; edges = [];
  const cx = canvas.width / 2, cy = 140;
  const r  = Math.min(cx, cy) - 30;

  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i / n) - Math.PI / 2;
    vertices.push({ id: i, x: cx + r*Math.cos(angle), y: cy + r*Math.sin(angle), label: String(i) });
  }

  const numEdges = Math.floor(n * 1.5);
  const used = new Set();
  let attempts = 0;
  while (edges.length < numEdges && attempts < 200) {
    attempts++;
    const f = Math.floor(Math.random() * n);
    const t = Math.floor(Math.random() * n);
    if (f === t) continue;
    const key = `${f}-${t}`;
    if (used.has(key)) continue;
    used.add(key);
    const w = Math.random() < 0.25
      ? -(Math.floor(Math.random()*3)+1)
      :   Math.floor(Math.random()*8)+1;
    edges.push({ from: f, to: t, weight: w });
  }

  source = 0;
  updateSourceSelect();
  renderEdgeList();
  drawEditorCanvas();
  drawGraphSVG();
  resetBF();
}

function clearGraph() {
  vertices = []; edges = [];
  pendingFrom = null;
  updateSourceSelect();
  renderEdgeList();
  drawEditorCanvas();
  drawGraphSVG();
  resetBF();
}

// ════════════════════════════════════════════════
//  BELLMAN-FORD ALGORITHM
// ════════════════════════════════════════════════
function runBellmanFord() {
  if (vertices.length < 2) { alert('Adicione pelo menos 2 vértices.'); return; }
  if (!edges.length)       { alert('Adicione pelo menos 1 aresta.');   return; }

  source = parseInt(document.getElementById('source-vertex').value);
  const N = vertices.length;
  const E = edges.length;

  bfDist  = [];
  bfSteps = [];
  negCycle = false;

  const d0 = Array(N).fill(INF);
  d0[source] = 0;
  bfDist.push(d0.slice());

  let dist = d0.slice();
  let prev = Array(N).fill(null);

  for (let k = 1; k < N; k++) {
    let changed = false;
    for (let ei = 0; ei < E; ei++) {
      const e = edges[ei];
      const u = e.from, v = e.to, w = e.weight;
      const oldDv = dist[v];
      let improved = false;
      if (dist[u] < INF/2 && dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        prev[v] = u;
        improved = true;
        changed  = true;
      }
      bfSteps.push({
        iter: k, edgeIdx: ei,
        from: u, to: v, weight: w,
        oldDv, newDv: dist[v],
        improved,
        distSnapshot: dist.slice()
      });
    }
    bfDist.push(dist.slice());
    if (!changed) break;
  }

  // Negative cycle check
  for (let ei = 0; ei < E; ei++) {
    const e = edges[ei];
    if (dist[e.from] < INF/2 && dist[e.from] + e.weight < dist[e.to]) {
      negCycle = true; break;
    }
  }

  bfPrev        = prev;
  numIterations = bfDist.length - 1;
  currentStep   = -1;

  renderDistTable();
  document.getElementById('neg-cycle-banner').classList.toggle('show', negCycle);
  document.getElementById('btn-prev').disabled = false;
  document.getElementById('btn-next').disabled = false;
  document.getElementById('btn-end').disabled  = false;
  document.getElementById('step-counter').textContent = `0 / ${bfSteps.length}`;
  document.getElementById('legend-text').innerHTML =
    `<strong>${bfSteps.length} relaxamentos</strong> em <strong>${numIterations}</strong> iteração(ões) sobre ${E} arestas. Use os botões para navegar.`;
  document.getElementById('opt-badge').style.display  = 'none';
  document.getElementById('bellman-eq').style.display = 'none';

  drawGraphSVG(null, bfDist[0], null);
}

function resetBF() {
  bfSteps = []; currentStep = -1; bfDist = []; negCycle = false;
  document.getElementById('dist-table-container').innerHTML =
    '<p class="empty-msg">Resolva o problema para ver a tabela de distâncias.</p>';
  document.getElementById('neg-cycle-banner').classList.remove('show');
  document.getElementById('btn-prev').disabled = true;
  document.getElementById('btn-next').disabled = true;
  document.getElementById('btn-end').disabled  = true;
  document.getElementById('step-counter').textContent = '—';
  document.getElementById('legend-text').innerHTML =
    'Monte o grafo e clique em <strong>Resolver</strong> para iniciar a navegação passo a passo.';
  document.getElementById('opt-badge').style.display  = 'none';
  document.getElementById('bellman-eq').style.display = 'none';
}

// ════════════════════════════════════════════════
//  STEP NAVIGATION
// ════════════════════════════════════════════════
function stepNav(dir) {
  if (!bfSteps.length) return;
  currentStep = Math.max(-1, Math.min(bfSteps.length - 1, currentStep + dir));
  renderStep();
}

function jumpToEnd() {
  currentStep = bfSteps.length - 1;
  renderStep();
}

function renderStep() {
  const total = bfSteps.length;
  document.getElementById('step-counter').textContent =
    currentStep < 0 ? `0 / ${total}` : `${currentStep + 1} / ${total}`;

  if (currentStep < 0) {
    document.getElementById('legend-text').textContent =
      `Estado inicial: distância da fonte (vértice ${source}) = 0; todos os outros = ∞.`;
    document.getElementById('opt-badge').style.display  = 'none';
    document.getElementById('bellman-eq').style.display = 'none';
    drawGraphSVG(null, bfDist[0], null);
    highlightDistTable(-1, -1);
    return;
  }

  const s = bfSteps[currentStep];
  const uLabel     = vertices[s.from]?.label ?? s.from;
  const vLabel     = vertices[s.to]?.label   ?? s.to;
  const distU      = bfDist[s.iter - 1][s.from];
  const distU_str  = distU  >= INF/2 ? '∞' : distU;
  const oldDv_str  = s.oldDv >= INF/2 ? '∞' : s.oldDv;
  const newDv_str  = s.newDv >= INF/2 ? '∞' : s.newDv;

  // Legend
  let legendHtml;
  if (s.improved) {
    legendHtml = `<strong>Iteração ${s.iter}, aresta ${uLabel}→${vLabel} (peso ${s.weight})</strong>: ` +
      `distância de ${vLabel} atualizada de <span style="color:#dc2626">${oldDv_str}</span> ` +
      `para <span style="color:#16a34a;font-weight:600">${newDv_str}</span> — relaxamento bem-sucedido.`;
  } else {
    const reason = distU >= INF/2
      ? `${uLabel} ainda não foi alcançado (dist = ∞)`
      : `${distU_str} + ${s.weight} = ${distU + s.weight} ≥ ${oldDv_str}`;
    legendHtml = `<strong>Iteração ${s.iter}, aresta ${uLabel}→${vLabel} (peso ${s.weight})</strong>: ` +
      `sem melhoria — ${reason}.`;
  }
  document.getElementById('legend-text').innerHTML = legendHtml;

  // Badge
  const badge = document.getElementById('opt-badge');
  badge.style.display = 'inline-block';
  badge.textContent   = `OPT[${vLabel}][${s.iter}] = ${newDv_str}`;

  // Bellman equation
  const eq     = document.getElementById('bellman-eq');
  const eqText = document.getElementById('bellman-eq-text');
  eq.style.display = 'block';
  const candidate  = distU >= INF/2 ? '∞' : `${distU_str} + ${s.weight} = ${distU + s.weight}`;
  const chosenColor = s.improved ? '#16a34a' : '#6b7280';
  eqText.innerHTML =
    `<span style="color:#2563eb;font-weight:700">OPT[${vLabel}][${s.iter}]</span>` +
    ` = min( OPT[${vLabel}][${s.iter-1}], OPT[${uLabel}][${s.iter-1}] + w(${uLabel},${vLabel}) )` +
    `<br>= min( ${oldDv_str}, ${candidate} )` +
    ` = <span style="color:${chosenColor};font-weight:700">${newDv_str}</span>`;

  drawGraphSVG({ edgeIdx: s.edgeIdx, from: s.from, to: s.to, improved: s.improved }, s.distSnapshot, null);
  highlightDistTable(s.iter, s.to);
}

// ════════════════════════════════════════════════
//  DIST TABLE
// ════════════════════════════════════════════════
function renderDistTable() {
  const container = document.getElementById('dist-table-container');
  const N = vertices.length;
  const K = bfDist.length;

  let html = '<table class="dist"><thead><tr><th>k \\ v</th>';
  for (let v of vertices) html += `<th class="vertex-header">${v.label}</th>`;
  html += '</tr></thead><tbody>';

  for (let k = 0; k < K; k++) {
    html += `<tr><th>${k}</th>`;
    for (let v = 0; v < N; v++) {
      const d      = bfDist[k][v];
      const dStr   = d >= INF/2 ? '∞' : d;
      const cls    = d >= INF/2 ? 'inf' : 'visited';
      html += `<td class="${cls}" id="dcell-${k}-${v}">${dStr}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  container.innerHTML = html;
}

function highlightDistTable(iter, vertex) {
  document.querySelectorAll('td.active, td.improved').forEach(el => {
    el.classList.remove('active', 'improved');
  });
  if (iter < 0) return;
  const el = document.getElementById(`dcell-${iter}-${vertex}`);
  if (el) {
    el.classList.add('active');
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

// ════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════
window.addEventListener('load', () => {
  resizeCanvas();
  autoGenerate();
});
