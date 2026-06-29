let items = [];
let dpTable = [];
let steps = [];
let currentStep = -1;
let W = 0, N = 0;
let canvasOverlay = null;

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
  const wrap = document.getElementById('matrix-wrap');
  
  if (!dpTable.length) {
    wrap.innerHTML = '<p class="empty-msg">Resolva o problema para ver a tabela.</p>';
    return;
  }

  // Limpar o container
  wrap.innerHTML = '';
  
  // Criar container para o canvas
  const canvasContainer = document.createElement('div');
  canvasContainer.style.cssText = 'position:relative;display:inline-block;';
  
  // Criar canvas
  const canvas = document.createElement('canvas');
  canvas.id = 'matrixCanvas';
  canvas.style.cssText = 'border:1px solid #e5e7eb;border-radius:4px;';
  canvasContainer.appendChild(canvas);
  wrap.appendChild(canvasContainer);
  
  // Configurar tamanho do canvas com padding extra para setas
  const cellW = 60;
  const cellH = 35;
  const padding = 60; // Aumentado para dar espaço para as setas
  
  canvas.width = (W + 2) * cellW + padding;
  canvas.height = (N + 2) * cellH + padding + 20; // Extra para setas superiores
  
  // Desenhar a matriz
  drawMatrix(canvas, cellW, cellH, padding);
  
  // Desenhar overlay se necessário
  const overlay = document.getElementById('show-overlay').checked;
  if (overlay && currentStep >= 0) {
    drawOverlay(canvas, cellW, cellH, padding);
  }
}

function drawMatrix(canvas, cellW, cellH, padding) {
  const ctx = canvas.getContext('2d');
  const step = steps[currentStep] || null;
  
  // Limpar canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Fundo branco
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Desenhar cabeçalhos
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Cabeçalho de linhas (i)
  for (let i = 0; i <= N; i++) {
    const x = padding - 20;
    const y = padding + i * cellH + cellH / 2;
    ctx.fillStyle = '#6b7280';
    ctx.fillText(i === 0 ? '0' : items[i - 1].name.slice(0, 4), x, y);
  }
  
  // Cabeçalho de colunas (w)
  for (let w = 0; w <= W; w++) {
    const x = padding + w * cellW + cellW / 2;
    const y = padding - 20;
    ctx.fillStyle = '#6b7280';
    ctx.fillText(w, x, y);
  }
  
  // Título "i\\w"
  ctx.fillStyle = '#6b7280';
  ctx.fillText('i\\w', padding - 30, padding - 20);
  
  // Desenhar células
  for (let i = 0; i <= N; i++) {
    for (let w = 0; w <= W; w++) {
      const x = padding + w * cellW;
      const y = padding + i * cellH;
      
      // Determinar cor da célula
      let bgColor = '#ffffff';
      let borderColor = '#e5e7eb';
      let textColor = '#111827';
      
      if (step && step.i === i && step.w === w) {
        bgColor = '#dbeafe';
        borderColor = '#2563eb';
        textColor = '#1e40af';
      } else if (step && (i < step.i || (i === step.i && w < step.w))) {
        bgColor = '#f3f4f6';
        textColor = '#6b7280';
      }
      
      // Desenhar célula
      ctx.fillStyle = bgColor;
      ctx.fillRect(x, y, cellW, cellH);
      
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = (step && step.i === i && step.w === w) ? 2 : 1;
      ctx.strokeRect(x, y, cellW, cellH);
      
      // Desenhar valor
      ctx.fillStyle = textColor;
      ctx.font = '14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(dpTable[i][w], x + cellW / 2, y + cellH / 2);
    }
  }
}

function drawOverlay(canvas, cellW, cellH, padding) {
  const ctx = canvas.getContext('2d');
  const step = steps[currentStep];
  if (!step) return;
  
  // Calcular centro da célula ativa
  const cx = padding + step.w * cellW + cellW / 2;
  const cy = padding + step.i * cellH + cellH / 2;
  
  // Desenhar círculo ao redor da célula ativa
  ctx.beginPath();
  ctx.arc(cx, cy, 13, 0, Math.PI * 2);
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Seta vertical (fromAbove - skip)
  if (step.i > 0) {
    const ay = padding + (step.i - 1) * cellH + cellH / 2;
    const ax = cx;
    drawArrowOnCanvas(ctx, ax, ay, cx, cy, '#2563eb', 'vertical');
  }
  
  // Seta diagonal (fromLeft - take)
  if (step.fromLeft !== null && step.i > 0 && step.w >= items[step.i - 1].weight) {
    const dx = padding + (step.w - items[step.i - 1].weight) * cellW + cellW / 2;
    const dy = padding + (step.i - 1) * cellH + cellH / 2;
    drawArrowOnCanvas(ctx, dx, dy, cx, cy, '#16a34a', 'diagonal');
  }
}

function drawArrowOnCanvas(ctx, fromX, fromY, toX, toY, color, type) {
  // Calcular ângulo e distância
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx);
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Margem para não entrar no círculo
  const margin = 14;
  if (distance < margin * 2) return;
  
  // Para setas verticais, ajustar para não cortar
  let startX = fromX;
  let startY = fromY;
  let endX = toX;
  let endY = toY;
  
  if (type === 'vertical') {
    // Seta vertical: manter no eixo X e ajustar Y
    const halfDist = distance / 2;
    const offset = 10; // Offset extra para não cortar
    
    if (fromY < toY) {
      // Seta para baixo
      startY = fromY + offset;
      endY = toY - margin;
    } else {
      // Seta para cima
      startY = fromY - offset;
      endY = toY + margin;
    }
    startX = fromX;
    endX = toX;
  } else {
    // Seta diagonal: usar cálculo normal com margem
    const ratio = Math.min(1, (distance - margin * 2) / distance);
    startX = fromX + dx * (1 - ratio) / 2;
    startY = fromY + dy * (1 - ratio) / 2;
    endX = toX - dx * (1 - ratio) / 2;
    endY = toY - dy * (1 - ratio) / 2;
  }
  
  // Desenhar linha
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Desenhar ponta da seta
  const arrowSize = 8;
  const headAngle = 0.5;
  
  // Calcular ângulo da seta
  const arrowAngle = Math.atan2(endY - startY, endX - startX);
  
  const headX = endX - 2 * Math.cos(arrowAngle);
  const headY = endY - 2 * Math.sin(arrowAngle);
  
  const p1x = headX - arrowSize * Math.cos(arrowAngle - headAngle);
  const p1y = headY - arrowSize * Math.sin(arrowAngle - headAngle);
  const p2x = headX - arrowSize * Math.cos(arrowAngle + headAngle);
  const p2y = headY - arrowSize * Math.sin(arrowAngle + headAngle);
  
  ctx.beginPath();
  ctx.moveTo(p1x, p1y);
  ctx.lineTo(headX, headY);
  ctx.lineTo(p2x, p2y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
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

// Inicializar
buildItemList();