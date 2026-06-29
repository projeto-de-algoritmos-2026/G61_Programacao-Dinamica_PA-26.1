let items = [];
let dpTable = [];
let steps = [];
let currentStep = -1;
let W = 0, N = 0;

function buildItemList() {
  const n = parseInt(document.getElementById('nitems').value) || 3;
  const list = document.getElementById('item-list');
  const old = items.slice();
  items = [];
  list.innerHTML = '';

  const hdr = document.createElement('div');
  hdr.className = 'item-list-header';
  hdr.innerHTML = '<span>#</span><span>Nome</span><span>Peso</span><span>Valor</span>';
  list.appendChild(hdr);

  for (let i = 0; i < n; i++) {
    const nm = old[i] ? old[i].name : 'Item ' + (i + 1);
    const wt = old[i] ? old[i].weight : Math.floor(Math.random() * 4) + 1;
    const vl = old[i] ? old[i].value : Math.floor(Math.random() * 8) + 1;

    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <span>${i + 1}</span>
      <input placeholder="Nome" value="${nm}" oninput="items[${i}].name=this.value">
      <input type="number" placeholder="Peso" value="${wt}" min="1" oninput="items[${i}].weight=+this.value">
      <input type="number" placeholder="Valor" value="${vl}" min="0" oninput="items[${i}].value=+this.value">
    `;
    list.appendChild(row);
    items.push({ name: nm, weight: wt, value: vl });
  }
}

function autoGenerate() {
  const n = parseInt(document.getElementById('nitems').value) || 3;
  const names = ['Livro', 'Laptop', 'Câmera', 'Fone', 'Relógio', 'Garrafa', 'Tablet', 'Chaveiro'];
  items = [];

  const list = document.getElementById('item-list');
  list.innerHTML = '';

  const hdr = document.createElement('div');
  hdr.className = 'item-list-header';
  hdr.innerHTML = '<span>#</span><span>Nome</span><span>Peso</span><span>Valor</span>';
  list.appendChild(hdr);

  for (let i = 0; i < n; i++) {
    const nm = names[i % names.length];
    const wt = Math.floor(Math.random() * 4) + 1;
    const vl = Math.floor(Math.random() * 9) + 2;

    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <span>${i + 1}</span>
      <input placeholder="Nome" value="${nm}" oninput="items[${i}].name=this.value">
      <input type="number" placeholder="Peso" value="${wt}" min="1" oninput="items[${i}].weight=+this.value">
      <input type="number" placeholder="Valor" value="${vl}" min="0" oninput="items[${i}].value=+this.value">
    `;
    list.appendChild(row);
    items.push({ name: nm, weight: wt, value: vl });
  }

  solve();
}

function solve() {
  W = parseInt(document.getElementById('cap').value) || 6;
  N = items.length;
  if (!N) return;

  dpTable = [];
  steps = [];

  for (let i = 0; i <= N; i++) {
    dpTable.push([]);
    for (let w = 0; w <= W; w++) dpTable[i].push(0);
  }

  for (let i = 1; i <= N; i++) {
    for (let w = 0; w <= W; w++) {
      const item = items[i - 1];
      let chosen, val;

      if (item.weight > w) {
        chosen = 'skip';
        val = dpTable[i - 1][w];
      } else {
        const withItem = dpTable[i - 1][w - item.weight] + item.value;
        const without = dpTable[i - 1][w];
        chosen = withItem >= without ? 'take' : 'skip';
        val = Math.max(withItem, without);
      }

      dpTable[i][w] = val;
      steps.push({
        i, w, val, chosen, item,
        fromAbove: dpTable[i - 1][w],
        fromLeft: item.weight <= w ? dpTable[i - 1][w - item.weight] : null
      });
    }
  }

  currentStep = 0;
  renderMatrix();
  renderTree();
  updateLegend();
}

function renderMatrix() {
  const overlay = document.getElementById('show-overlay').checked;
  const wrap = document.getElementById('matrix-wrap');

  if (!dpTable.length) {
    wrap.innerHTML = '<p class="empty-msg">Resolva o problema para ver a tabela.</p>';
    return;
  }

  const step = steps[currentStep] || null;

  let html = '<div style="position:relative;display:inline-block">';
  html += '<table class="dp"><thead><tr><th>i\\w</th>';
  for (let w = 0; w <= W; w++) html += `<th>${w}</th>`;
  html += '</tr></thead><tbody>';

  for (let i = 0; i <= N; i++) {
    html += `<tr><th>${i === 0 ? '0' : items[i - 1].name.slice(0, 4)}</th>`;
    for (let w = 0; w <= W; w++) {
      let cls = '';
      if (step && step.i === i && step.w === w) cls = 'active';
      else if (step && (i < step.i || (i === step.i && w < step.w))) cls = 'visited';
      html += `<td class="${cls}">${dpTable[i][w]}</td>`;
    }
    html += '</tr>';
  }

  html += '</tbody></table>';

  if (overlay && step) {
    const rowH = 35, colW = 39, offTop = 35, offLeft = 48;
    const cx = offLeft + step.w * colW + colW / 2;
    const cy = offTop + step.i * rowH + rowH / 2;

    html += `<svg style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:visible">`;
    html += `<circle cx="${cx}" cy="${cy}" r="13" fill="none" stroke="#2563eb" stroke-width="1.5"/>`;

    if (step.i > 0) {
      const pcy = offTop + (step.i - 1) * rowH + rowH / 2;
      html += `<line x1="${cx}" y1="${pcy + 13}" x2="${cx}" y2="${cy - 13}" stroke="#2563eb" stroke-width="1" stroke-dasharray="3,2"/>`;
    }

    if (step.fromLeft !== null && step.w >= items[step.i - 1].weight) {
      const pcx = offLeft + (step.w - items[step.i - 1].weight) * colW + colW / 2;
      const pcy2 = offTop + (step.i - 1) * rowH + rowH / 2;
      html += `<line x1="${pcx + 13}" y1="${pcy2}" x2="${cx - 13}" y2="${cy}" stroke="#16a34a" stroke-width="1" stroke-dasharray="3,2"/>`;
    }

    html += '</svg>';
  }

  html += '</div>';
  wrap.innerHTML = html;
}

function updateLegend() {
  if (currentStep < 0 || !steps.length) return;

  const s = steps[Math.min(currentStep, steps.length - 1)];
  const badge = document.getElementById('opt-badge');
  const txt = document.getElementById('legend-text');
  const ctr = document.getElementById('step-counter');

  badge.style.display = 'inline-block';
  badge.textContent = `OPT(${s.i}, ${s.w}) = ${s.val}`;
  ctr.textContent = `${currentStep + 1} / ${steps.length}`;

  if (s.chosen === 'skip') {
    txt.textContent = `Item ${s.i} (${s.item.name}, peso ${s.item.weight}) não cabe ou não compensa. OPT(${s.i},${s.w}) = OPT(${s.i - 1},${s.w}) = ${s.fromAbove}.`;
  } else {
    txt.textContent = `Item ${s.i} (${s.item.name}, peso ${s.item.weight}, valor ${s.item.value}) é incluído. OPT(${s.i - 1},${s.w - s.item.weight}) + ${s.item.value} = ${s.val}.`;
  }
}

function stepNav(dir) {
  if (!steps.length) return;
  currentStep = Math.max(0, Math.min(steps.length - 1, currentStep + dir));
  renderMatrix();
  updateLegend();
  renderTree();
}

function renderTree() {
  const wrap = document.getElementById('tree-wrap');

  if (!steps.length || !N) {
    wrap.innerHTML = '<p class="empty-msg">A árvore aparece após resolver.</p>';
    return;
  }

  const maxDepth = Math.min(N, 4);
  const nodeW = 56, nodeH = 24, vGap = 38;
  const curStep = steps[currentStep] || steps[0];

  function buildNodes(i, w, depth, x, spanW) {
    if (depth > maxDepth || w < 0) return [];
    const nodes = [{
      i, w, x, depth,
      val: dpTable[i] ? dpTable[i][Math.min(w, W)] : 0,
      active: (i === curStep.i && w === curStep.w)
    }];
    if (i === 0) return nodes;
    const item = items[i - 1];
    const childSpan = spanW / 2;
    nodes.push(...buildNodes(i - 1, w, depth + 1, x - childSpan / 2, childSpan));
    if (w >= item.weight) nodes.push(...buildNodes(i - 1, w - item.weight, depth + 1, x + childSpan / 2, childSpan));
    return nodes;
  }

  const rootI = Math.min(maxDepth, N);
  const rootW = Math.min(curStep.w, W);
  const treeNodes = buildNodes(rootI, rootW, 0, 300, 280);

  const seen = new Set();
  const uniq = treeNodes.filter(n => {
    const k = `${n.i},${n.w},${n.depth}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const svgH = (maxDepth + 1) * (nodeH + vGap) + 20;

  let svg = `<svg viewBox="0 0 600 ${svgH}" style="width:100%;max-height:${svgH}px">`;

  const byKey = {};
  uniq.forEach(n => byKey[`${n.i},${n.w},${n.depth}`] = n);

  uniq.forEach(n => {
    if (n.depth === 0) return;
    const parentDepth = n.depth - 1;
    const pk1 = `${n.i + 1},${n.w},${parentDepth}`;
    const item = items[n.i] || { weight: 0 };
    const pk2 = `${n.i + 1},${n.w + item.weight},${parentDepth}`;
    const parent = byKey[pk1] || byKey[pk2];
    if (!parent) return;

    const py = parentDepth * (nodeH + vGap) + nodeH / 2 + 10;
    const cy2 = n.depth * (nodeH + vGap) + nodeH / 2 + 10;
    svg += `<line x1="${Math.round(parent.x)}" y1="${Math.round(py)}" x2="${Math.round(n.x)}" y2="${Math.round(cy2 - nodeH / 2)}" class="tree-edge${n.active ? ' active' : ''}"/>`;
  });

  uniq.forEach(n => {
    const cy = n.depth * (nodeH + vGap) + 10;
    const cls = n.active ? 'tree-node active' : 'tree-node';
    svg += `<g class="${cls}" transform="translate(${Math.round(n.x - nodeW / 2)},${Math.round(cy)})">
      <rect width="${nodeW}" height="${nodeH}" rx="4"/>
      <text x="${nodeW / 2}" y="9" text-anchor="middle" style="font-size:9px;fill:#999;font-family:monospace">OPT(${n.i},${n.w})</text>
      <text x="${nodeW / 2}" y="19" text-anchor="middle" style="font-size:12px;font-weight:500;fill:#111;font-family:monospace">${n.val}</text>
    </g>`;
  });

  svg += '</svg>';
  wrap.innerHTML = svg;
}

buildItemList();
