const canvas2d = document.getElementById("canvas2d");
const ctx = canvas2d.getContext("2d");

// State Global & Transformasi
let selectedShape = "X";
let currentDefaultShape = "X"; // Bentuk default aktif kustom (X, semicircle, donut) agar persisten!
let angle = 0;
let offsetX = 0;
let offsetY = 0;
let scale = 1;

let fillColor = "#ff0000"; // Warna aktif brush saat ini (untuk garis & fill kustom baru)
let defaultShapeColor = "#ff0000"; // Warna persisten khusus untuk bentuk bawaan aktif
let outlineColor = "#000000"; // Warna outline bawaan default hitam
let defaultShapeOutlineColor = "#000000"; // Warna outline khusus untuk bentuk bawaan aktif
let showOutline = false; // Status outline (aktif/non-aktif)
let outlineWidth = 2; // Ketebalan outline default

// Input ukuran sisi (Backward Compatibility)
let input1 = 100; // lebar huruf X / radius
let input2 = 50;  // tinggi huruf X / radius dalam
let input3 = 60;  // ketebalan garis / sudut

// Mouse control mode state
let mouseMode = "translate"; // Default mode: 'translate', 'rotate', or 'scale'
let lastMousePos2d = { x: 0, y: 0 };
let pendingTextToPlace = null;
let activeDrawnObject = null;

// --- Fitur Baru Proyek Akhir (Hybrid Upgrade) ---
let drawnObjects = []; // Menyimpan objek-objek vektor kustom (garis, kurva, teks, dan flood fill)
let startDragMousePos = null;
let currentDragMousePos = null;
let isDragging2d = false;

// State Kurva Bezier Kubik (4 Titik Kontrol Interaktif)
let bezierPoints = [
  { x: 100, y: 350 }, // P0: Start
  { x: 150, y: 100 }, // P1: Control 1
  { x: 350, y: 100 }, // P2: Control 2
  { x: 400, y: 350 }  // P3: End
];
let activeBezierHandle = -1; // -1 berarti tidak ada yang sedang digeser

// State Animasi Dinamis
let isPlayingAnimation = false;
let activeAnimations = {
  bouncing: false,
  rotating: false,
  pulsing: false
};
let animationId = null;
let bounceVelX = 3;  // Kecepatan horizontal animasi pantul
let bounceVelY = 2.5; // Kecepatan vertikal animasi pantul

// State Audio Synthesizer
let audioContext = null;
let isAudioEnabled = false;

// State Gambar Latar Multimedia
let bgImage = null;

// Helper mouse position calculation
let initialMousePos = { x: 0, y: 0 };
let canvasCenter = { x: 0, y: 0 };

// --- 1. Fungsi Utilitas & Logger ---

// Mendapatkan posisi mouse relatif terhadap Canvas
function getCanvasMousePos(e) {
  const rect = canvas2d.getBoundingClientRect();
  const scaleX = canvas2d.width / rect.width;
  const scaleY = canvas2d.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

// Konversi Hex Color ke RGB Array
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
}

// Cetak log ke panel Live Math Visualizer
function updateVisualizerLog(text) {
  const logDiv = document.getElementById("visualizer-log");
  if (logDiv) {
    logDiv.innerHTML = text;
  }
}

// --- 2. Fitur Audio Synthesizer (Web Audio API) ---
function toggleAudio() {
  const toggle = document.getElementById("audioToggle");
  const slider = document.getElementById("audioSlider");
  
  isAudioEnabled = toggle.checked;
  if (isAudioEnabled) {
    slider.style.backgroundColor = "var(--primary)";
    playSynthSound(440, 0.15); // Suara konfirmasi ON
  } else {
    slider.style.backgroundColor = "#334155";
  }
}

function playSynthSound(freq, duration) {
  if (!isAudioEnabled) return;
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
    
    let osc = audioContext.createOscillator();
    let gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, audioContext.currentTime);
    
    gain.gain.setValueAtTime(0.12, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    
    osc.start();
    osc.stop(audioContext.currentTime + duration);
  } catch (err) {
    console.warn("Synthesizer error:", err);
  }
}

// --- 3. Implementasi Manual Algoritma Grafika 2D ---

// Fungsi fundamental: Menggambar piksel tunggal manual
function plotPixel(x, y, color, size = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x - size/2), Math.floor(y - size/2), size, size);
}

// Algoritma Garis DDA
function drawDDALine(x1, y1, x2, y2, color, thickness = 1, style = "solid", enableLog = true) {
  let logText = `<b>[DDA Line Algorithm]</b><br/>Start: (${Math.round(x1)}, ${Math.round(y1)}) -> End: (${Math.round(x2)}, ${Math.round(y2)})<br/>`;
  
  let dx = x2 - x1;
  let dy = y2 - y1;
  let steps = Math.max(Math.abs(dx), Math.abs(dy));
  
  if (steps === 0) {
    plotPixel(x1, y1, color, thickness);
    return;
  }
  
  let xInc = dx / steps;
  let yInc = dy / steps;
  
  if (enableLog) {
    logText += `dx: ${dx.toFixed(1)}, dy: ${dy.toFixed(1)} | steps: ${steps}<br/>`;
    logText += `x-increment: ${xInc.toFixed(3)}, y-increment: ${yInc.toFixed(3)}<br/>`;
  }
  
  let x = x1;
  let y = y1;
  
  for (let i = 0; i <= steps; i++) {
    let shouldPlot = true;
    if (style === "dashed" && Math.floor(i / 10) % 2 === 0) shouldPlot = false;
    if (style === "dotted" && i % 4 !== 0) shouldPlot = false;
    
    if (shouldPlot) {
      plotPixel(x, y, color, thickness);
    }
    
    if (enableLog && i < 6) {
      logText += `Piksel ${i}: (x: ${x.toFixed(1)}, y: ${y.toFixed(1)}) -> Plot(${Math.round(x)}, ${Math.round(y)})<br/>`;
    } else if (enableLog && i === 6) {
      logText += `... (lebih banyak piksel dihitung)<br/>`;
    }
    
    x += xInc;
    y += yInc;
  }
  
  if (enableLog) {
    logText += `<span style="color:var(--primary)">✔ Sukses menggambar DDA Line!</span>`;
    updateVisualizerLog(logText);
  }
}

// Algoritma Garis Bresenham
function drawBresenhamLine(x1, y1, x2, y2, color, thickness = 1, style = "solid", enableLog = true) {
  let logText = `<b>[Bresenham Line Algorithm]</b><br/>Start: (${Math.round(x1)}, ${Math.round(y1)}) -> End: (${Math.round(x2)}, ${Math.round(y2)})<br/>`;
  
  let x = Math.round(x1);
  let y = Math.round(y1);
  let targetX = Math.round(x2);
  let targetY = Math.round(y2);
  
  let dx = Math.abs(targetX - x);
  let dy = Math.abs(targetY - y);
  
  let sx = (x < targetX) ? 1 : -1;
  let sy = (y < targetY) ? 1 : -1;
  let err = dx - dy;
  
  if (enableLog) {
    logText += `dx: ${dx}, dy: ${dy} | sx: ${sx}, sy: ${sy}<br/>`;
  }
  
  let step = 0;
  
  while (true) {
    let shouldPlot = true;
    if (style === "dashed" && Math.floor(step / 10) % 2 === 0) shouldPlot = false;
    if (style === "dotted" && step % 4 !== 0) shouldPlot = false;
    
    if (shouldPlot) {
      plotPixel(x, y, color, thickness);
    }
    
    if (enableLog && step < 6) {
      logText += `Langkah ${step}: Plot(${x}, ${y}) | Parameter Error: ${err}<br/>`;
    } else if (enableLog && step === 6) {
      logText += `... (lebih banyak koordinat dihitung)<br/>`;
    }
    
    if (x === targetX && y === targetY) break;
    
    let e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
    step++;
  }
  
  if (enableLog) {
    logText += `<span style="color:var(--primary)">✔ Sukses menggambar Bresenham Line!</span>`;
    updateVisualizerLog(logText);
  }
}

// Algoritma Kurva Bezier Kubik
function drawBezierCurve(p0, p1, p2, p3, color, thickness = 1, style = "solid", enableLog = true) {
  let logText = `<b>[Bezier Cubic Curve Algorithm]</b><br/>`;
  logText += `Formula: P(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3<br/>`;
  
  let steps = 60;
  let prevX = p0.x;
  let prevY = p0.y;
  
  for (let i = 1; i <= steps; i++) {
    let t = i / steps;
    let u = 1 - t;
    let uu = u * u;
    let uuu = uu * u;
    let tt = t * t;
    let ttt = tt * t;
    
    let currX = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
    let currY = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;
    
    drawBresenhamLine(prevX, prevY, currX, currY, color, thickness, style, false);
    
    if (enableLog && i % 12 === 0 && i / 12 <= 4) {
      logText += `t = ${t.toFixed(2)}: Koordinat (${Math.round(currX)}, ${Math.round(currY)})<br/>`;
    }
    
    prevX = currX;
    prevY = currY;
  }
  
  if (enableLog) {
    logText += `<span style="color:var(--accent)">✔ Sukses merender Kurva Bezier (60 Segmen)!</span>`;
    updateVisualizerLog(logText);
  }
}

// Algoritma Area Fill: Flood Fill BFS (Queue-based + visited Tracking)
// 100% AMAN DARI PERULANGAN TAK TERBATAS (INFINITE LOOP)
function manualFloodFill(startX, startY, fillColorHex, enableLog = true) {
  let logText = `<b>[Flood Fill Algorithm - BFS]</b><br/>`;
  logText += `Koordinat Awal: (${startX}, ${startY})<br/>`;
  
  let imgData = ctx.getImageData(0, 0, canvas2d.width, canvas2d.height);
  let data = imgData.data;
  let w = canvas2d.width;
  let h = canvas2d.height;
  
  let startIdx = (startY * w + startX) * 4;
  let startR = data[startIdx];
  let startG = data[startIdx + 1];
  let startB = data[startIdx + 2];
  
  let fillRGB = hexToRgb(fillColorHex);
  let fillR = fillRGB[0];
  let fillG = fillRGB[1];
  let fillB = fillRGB[2];
  
  if (enableLog) {
    logText += `Warna Target: RGB(${startR}, ${startG}, ${startB})<br/>`;
    logText += `Warna Pengganti: RGB(${fillR}, ${fillG}, ${fillB})<br/>`;
  }
  
  // Jika warna piksel klik awal mirip dengan warna fill, batalkan
  if (Math.abs(startR - fillR) < 5 && Math.abs(startG - fillG) < 5 && Math.abs(startB - fillB) < 5) {
    if (enableLog) {
      logText += `<span style="color:#ff007f">Batal! Warna area sudah sama dengan warna pilihan.</span>`;
      updateVisualizerLog(logText);
    }
    return;
  }
  
  // Menggunakan visited array pelacak untuk menjamin perulangan pasti berhenti!
  let visited = new Uint8Array(w * h);
  let queue = [[startX, startY]];
  visited[startY * w + startX] = 1; // Ditandai dikunjungi sebelum antrean
  let pixelsColored = 0;
  
  while (queue.length > 0) {
    let [cx, cy] = queue.shift();
    let idx = (cy * w + cx) * 4;
    
    // Warnai piksel saat ini
    data[idx] = fillR;
    data[idx + 1] = fillG;
    data[idx + 2] = fillB;
    data[idx + 3] = 255;
    pixelsColored++;
    
    // 4 Arah tetangga (Kanan, Kiri, Bawah, Atas)
    let neighbors = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1]
    ];
    
    for (let i = 0; i < neighbors.length; i++) {
      let [nx, ny] = neighbors[i];
      
      // Pastikan di dalam batas kanvas
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        let nPos = ny * w + nx;
        
        // Periksa jika belum pernah dikunjungi
        if (visited[nPos] === 0) {
          let nIdx = nPos * 4;
          let nr = data[nIdx];
          let ng = data[nIdx + 1];
          let nb = data[nIdx + 2];
          
          // Bandingkan dengan warna target awal
          if (Math.abs(nr - startR) < 20 && Math.abs(ng - startG) < 20 && Math.abs(nb - startB) < 20) {
            visited[nPos] = 1; // Tandai dikunjungi segera agar tidak dimasukkan antrean lagi!
            queue.push([nx, ny]);
          }
        }
      }
    }
  }
  
  ctx.putImageData(imgData, 0, 0);
  
  if (enableLog) {
    logText += `<span style="color:var(--primary)">✔ Mewarnai selesai! Total ${pixelsColored} piksel berhasil diwarnai secara manual di memori.</span>`;
    updateVisualizerLog(logText);
  }
}

// --- 4. Menggambar Titik Kontrol Bezier & Preview ---

function drawBezierHandles() {
  bezierPoints.forEach((pt, index) => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
    if (index === 0 || index === 3) {
      ctx.fillStyle = "#ff007f";
    } else {
      ctx.fillStyle = "#00f0ff";
    }
    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.fillStyle = "#000";
    ctx.font = "bold 10px Inter";
    ctx.fillText(`P${index}`, pt.x - 5, pt.y - 12);
  });
  
  ctx.save();
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(bezierPoints[0].x, bezierPoints[0].y);
  ctx.lineTo(bezierPoints[1].x, bezierPoints[1].y);
  ctx.moveTo(bezierPoints[2].x, bezierPoints[2].y);
  ctx.lineTo(bezierPoints[3].x, bezierPoints[3].y);
  ctx.stroke();
  ctx.restore();
}

// --- 5. Fungsi Render Utama Kanvas 2D ---

function draw() {
  ctx.clearRect(0, 0, canvas2d.width, canvas2d.height);
  
  // 1. Gambar Gambar Latar (Wallpaper)
  if (bgImage) {
    ctx.drawImage(bgImage, 0, 0, canvas2d.width, canvas2d.height);
  }
  
  // 2. Render Bentuk Bawaan Aktif (Persisten!)
  if (currentDefaultShape) {
    ctx.save();
    ctx.translate(canvas2d.width / 2 + offsetX, canvas2d.height / 2 + offsetY);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    
    drawDefaultShape(currentDefaultShape);
    
    ctx.restore();
  }
  
  // 3. Render Semua Vektor dan Flood Fill yang Disimpan Sebelumnya
  drawnObjects.forEach(obj => {
    const styleVal = obj.style || "solid";
    if (obj.type === "line-dda") {
      drawDDALine(obj.p1.x, obj.p1.y, obj.p2.x, obj.p2.y, obj.color, obj.thickness, styleVal, false);
    } else if (obj.type === "line-bresenham") {
      drawBresenhamLine(obj.p1.x, obj.p1.y, obj.p2.x, obj.p2.y, obj.color, obj.thickness, styleVal, false);
    } else if (obj.type === "bezier") {
      drawBezierCurve(obj.pts[0], obj.pts[1], obj.pts[2], obj.pts[3], obj.color, obj.thickness, styleVal, false);
    } else if (obj.type === "text") {
      ctx.save();
      ctx.font = "bold 20px Inter";
      ctx.fillStyle = obj.color;
      ctx.fillText(obj.text, obj.x, obj.y);
      
      // Jika terpilih, beri outline indikator
      if (activeDrawnObject === obj) {
        const textWidth = ctx.measureText(obj.text).width || (obj.text.length * 12);
        ctx.strokeStyle = "var(--accent)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(obj.x - 5, obj.y - 20, textWidth + 10, 25);
      }
      ctx.restore();
    } else if (obj.type === "image") {
      ctx.drawImage(obj.img, obj.x, obj.y, obj.w, obj.h);
      
      // Jika terpilih, beri outline indikator
      if (activeDrawnObject === obj) {
        ctx.strokeStyle = "var(--accent)";
        ctx.lineWidth = 2;
        ctx.strokeRect(obj.x - 2, obj.y - 2, obj.w + 4, obj.h + 4);
      }
    } else if (obj.type === "flood-fill") {
      manualFloodFill(obj.x, obj.y, obj.color, false);
    }
  });
  
  // 4. Render Garis Preview saat drag-and-draw aktif
  if (isDragging2d && (selectedShape === "line-dda" || selectedShape === "line-bresenham")) {
    const start = startDragMousePos;
    const curr = currentDragMousePos;
    const styleVal = getLineStyle();
    if (selectedShape === "line-dda") {
      drawDDALine(start.x, start.y, curr.x, curr.y, fillColor, outlineWidth, styleVal, true);
    } else {
      drawBresenhamLine(start.x, start.y, curr.x, curr.y, fillColor, outlineWidth, styleVal, true);
    }
  }
  
  // 5. Render Kurva Bezier Interaktif beserta Titik Kontrol
  if (selectedShape === "bezier") {
    drawBezierCurve(bezierPoints[0], bezierPoints[1], bezierPoints[2], bezierPoints[3], fillColor, outlineWidth, getLineStyle(), true);
    drawBezierHandles();
  }
}

// Fungsi internal merender bentuk default yang aktif (menggunakan defaultShapeColor agar warna tidak berubah sendiri!)
function drawDefaultShape(shape) {
  ctx.beginPath();
  const width = input1;
  const height = input2;
  const lineThick = input3 / 10;
  
  if (shape === "X") {
    drawBresenhamLine(-width / 2, -height / 2, width / 2, height / 2, defaultShapeColor, lineThick, "solid", false);
    drawBresenhamLine(width / 2, -height / 2, -width / 2, height / 2, defaultShapeColor, lineThick, "solid", false);
    
    if (showOutline) {
      drawBresenhamLine(-width / 2, -height / 2, width / 2, height / 2, defaultShapeOutlineColor, lineThick + outlineWidth, "solid", false);
      drawBresenhamLine(width / 2, -height / 2, -width / 2, height / 2, defaultShapeOutlineColor, lineThick + outlineWidth, "solid", false);
      drawBresenhamLine(-width / 2, -height / 2, width / 2, height / 2, defaultShapeColor, lineThick, "solid", false);
      drawBresenhamLine(width / 2, -height / 2, -width / 2, height / 2, defaultShapeColor, lineThick, "solid", false);
    }
  } else if (shape === "semicircle") {
    const radius = input1;
    const thick = input2 / 10; // Ketebalan garis bentuk utama
    const ang = (input3 * Math.PI) / 180;
    
    ctx.arc(0, 0, radius, 0, ang, false);
    if (ang >= Math.PI) {
      ctx.closePath();
    } else {
      ctx.lineTo(0, 0);
      ctx.closePath();
    }
    
    // 1. LANGKAH PERTAMA: Gambar outline hitam tebal di belakang
    if (showOutline) {
      ctx.lineWidth = thick + outlineWidth * 2;
      ctx.strokeStyle = defaultShapeOutlineColor;
      ctx.stroke();
    }
    
    // 2. LANGKAH KEDUA: Gambar isi merah (ini menutupi outline hitam sisi dalam!)
    ctx.fillStyle = defaultShapeColor;
    ctx.fill();
    
    // 3. LANGKAH KETIGA: Gambar tepi merah utama di atas isi
    ctx.lineWidth = thick;
    ctx.strokeStyle = defaultShapeColor;
    ctx.stroke();
  } else if (shape === "donut") {
    const rOuter = input1;
    const rInner = input2;
    const thick = input3 / 10; // Ketebalan garis donut
    
    ctx.arc(0, 0, rOuter, 0, Math.PI * 2);
    ctx.moveTo(rInner, 0);
    ctx.arc(0, 0, rInner, 0, Math.PI * 2, true);
    
    // 1. LANGKAH PERTAMA: Gambar outline hitam tebal di belakang
    if (showOutline) {
      ctx.lineWidth = thick + outlineWidth * 2;
      ctx.strokeStyle = defaultShapeOutlineColor;
      ctx.stroke();
    }
    
    // 2. LANGKAH KEDUA: Gambar isi
    ctx.fillStyle = defaultShapeColor;
    ctx.fill();
    
    // 3. LANGKAH KETIGA: Gambar tepi utama
    ctx.lineWidth = thick;
    ctx.strokeStyle = defaultShapeColor;
    ctx.stroke();
  }
}

function getLineStyle() {
  return outlineWidth > 3 ? "solid" : (outlineWidth === 3 ? "dashed" : "solid");
}

// --- 6. Event Handling Mouse & Keyboard ---

canvas2d.addEventListener("mousedown", (e) => {
  const mousePos = getCanvasMousePos(e);
  
  // 1. Jika ada Teks yang Sedang Menunggu Ditempatkan
  if (pendingTextToPlace) {
    drawnObjects.push({
      type: "text",
      text: pendingTextToPlace,
      x: Math.round(mousePos.x),
      y: Math.round(mousePos.y),
      color: fillColor
    });
    pendingTextToPlace = null;
    updateCanvasCursor();
    updateVisualizerLog("<b>[Sistem]</b> Teks berhasil ditempatkan pada koordinat klik!");
    playSynthSound(523, 0.15);
    draw();
    return;
  }
  
  // 2. Cek Klik pada Objek Floating/Melayang (Text & Image) untuk Drag & Drop
  activeDrawnObject = null;
  for (let i = drawnObjects.length - 1; i >= 0; i--) {
    let obj = drawnObjects[i];
    if (obj.type === "image") {
      if (mousePos.x >= obj.x && mousePos.x <= obj.x + obj.w &&
          mousePos.y >= obj.y && mousePos.y <= obj.y + obj.h) {
        activeDrawnObject = obj;
        isDragging2d = true;
        lastMousePos2d = { x: e.clientX, y: e.clientY };
        initialMousePos = mousePos;
        playSynthSound(440, 0.08);
        updateVisualizerLog(`<b>[Objek Terpilih]</b> Gambar melayang terpilih. Seret untuk Translasi, ubah ke Mode Skala untuk ukuran.`);
        draw();
        return;
      }
    } else if (obj.type === "text") {
      const textWidth = ctx.measureText(obj.text).width || (obj.text.length * 12);
      if (mousePos.x >= obj.x - 5 && mousePos.x <= obj.x + textWidth + 5 &&
          mousePos.y >= obj.y - 20 && mousePos.y <= obj.y + 5) {
        activeDrawnObject = obj;
        isDragging2d = true;
        lastMousePos2d = { x: e.clientX, y: e.clientY };
        initialMousePos = mousePos;
        playSynthSound(440, 0.08);
        updateVisualizerLog(`<b>[Objek Terpilih]</b> Teks "${obj.text}" terpilih. Seret untuk mengubah posisinya.`);
        draw();
        return;
      }
    }
  }
  
  // A. Jika Mode Ember Cat / Flood Fill aktif
  if (selectedShape === "flood-fill") {
    drawnObjects.push({
      type: "flood-fill",
      x: Math.round(mousePos.x),
      y: Math.round(mousePos.y),
      color: fillColor
    });
    playSynthSound(660, 0.25);
    draw();
    return;
  }
  
  // B. Jika Mode Kurva Bezier aktif (Geser titik kontrol)
  if (selectedShape === "bezier") {
    activeBezierHandle = -1;
    for (let i = 0; i < bezierPoints.length; i++) {
      let pt = bezierPoints[i];
      let dist = Math.hypot(mousePos.x - pt.x, mousePos.y - pt.y);
      if (dist < 12) {
        activeBezierHandle = i;
        playSynthSound(440 + i * 50, 0.1);
        break;
      }
    }
    if (activeBezierHandle !== -1) return;
  }
  
  // C. Jika menggambar garis kustom (DDA / Bresenham)
  if (selectedShape === "line-dda" || selectedShape === "line-bresenham") {
    isDragging2d = true;
    startDragMousePos = mousePos;
    currentDragMousePos = mousePos;
    playSynthSound(330, 0.1);
    return;
  }
  
  // D. Dragging untuk Translasi/Rotasi/Skala Bentuk Bawaan
  isDragging2d = true;
  lastMousePos2d = { x: e.clientX, y: e.clientY };
  initialMousePos = mousePos;
  canvasCenter = { x: canvas2d.width / 2, y: canvas2d.height / 2 };
});

canvas2d.addEventListener("mousemove", (e) => {
  const mousePos = getCanvasMousePos(e);
  
  // Jika sedang men-drag objek floating/melayang terpilih (Gambar atau Teks)
  if (isDragging2d && activeDrawnObject) {
    const deltaX = e.clientX - lastMousePos2d.x;
    const deltaY = e.clientY - lastMousePos2d.y;
    
    if (mouseMode === "translate") {
      activeDrawnObject.x += deltaX;
      activeDrawnObject.y += deltaY;
    } else if (mouseMode === "scale") {
      if (activeDrawnObject.type === "image") {
        const centerX = activeDrawnObject.x + activeDrawnObject.w / 2;
        const centerY = activeDrawnObject.y + activeDrawnObject.h / 2;
        const initDist = Math.hypot(initialMousePos.x - centerX, initialMousePos.y - centerY);
        const currDist = Math.hypot(mousePos.x - centerX, mousePos.y - centerY);
        if (initDist > 0) {
          const ratio = currDist / initDist;
          activeDrawnObject.w = Math.max(30, activeDrawnObject.w * ratio);
          activeDrawnObject.h = Math.max(20, activeDrawnObject.h * ratio);
        }
      }
    }
    lastMousePos2d = { x: e.clientX, y: e.clientY };
    initialMousePos = mousePos;
    draw();
    return;
  }
  
  if (selectedShape === "bezier" && activeBezierHandle !== -1) {
    bezierPoints[activeBezierHandle] = mousePos;
    draw();
    return;
  }
  
  if (isDragging2d && (selectedShape === "line-dda" || selectedShape === "line-bresenham")) {
    currentDragMousePos = mousePos;
    draw();
    return;
  }
  
  if (!isDragging2d) return;
  
  const deltaX = e.clientX - lastMousePos2d.x;
  const deltaY = e.clientY - lastMousePos2d.y;
  
  switch (mouseMode) {
    case "translate":
      offsetX += deltaX;
      offsetY += deltaY;
      break;
      
    case "rotate":
      const initAngle = Math.atan2(initialMousePos.y - canvasCenter.y, initialMousePos.x - canvasCenter.x);
      const currAngle = Math.atan2(mousePos.y - canvasCenter.y, mousePos.x - canvasCenter.x);
      angle += currAngle - initAngle;
      initialMousePos = mousePos;
      break;
      
    case "scale":
      const initDist = Math.hypot(initialMousePos.x - canvasCenter.x, initialMousePos.y - canvasCenter.y);
      const currDist = Math.hypot(mousePos.x - canvasCenter.x, mousePos.y - canvasCenter.y);
      if (initDist > 0) {
        scale *= currDist / initDist;
        scale = Math.max(0.1, Math.min(scale, 10));
      }
      initialMousePos = mousePos;
      break;
  }
  
  lastMousePos2d = { x: e.clientX, y: e.clientY };
  draw();
});

canvas2d.addEventListener("mouseup", (e) => {
  const mousePos = getCanvasMousePos(e);
  
  if (isDragging2d && (selectedShape === "line-dda" || selectedShape === "line-bresenham")) {
    drawnObjects.push({
      type: selectedShape,
      p1: { x: startDragMousePos.x, y: startDragMousePos.y },
      p2: { x: mousePos.x, y: mousePos.y },
      color: fillColor,
      thickness: outlineWidth,
      style: getLineStyle()
    });
    playSynthSound(523, 0.15);
  }
  
  isDragging2d = false;
  activeBezierHandle = -1;
  activeDrawnObject = null;
  draw();
});

canvas2d.addEventListener("mouseleave", () => {
  isDragging2d = false;
  activeBezierHandle = -1;
  activeDrawnObject = null;
  draw();
});

// --- 7. Fitur Multimedia Tambahan: Tambah Teks & Gambar Latar ---

window.addTextToCanvas = function() {
  const txtInput = document.getElementById("textInput");
  const text = txtInput.value.trim();
  if (!text) return;
  
  pendingTextToPlace = text;
  txtInput.value = "";
  
  canvas2d.style.cursor = "copy"; // Ganti kursor menandakan siap menaruh teks
  updateVisualizerLog("<b>[Sistem]</b> Teks terekam: \"" + text + "\". <u>Klik di mana saja pada kanvas</u> untuk menempatkannya!");
  playSynthSound(440, 0.1);
};

window.loadImageToCanvas = function(event) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      // Masukkan sebagai objek gambar melayang di tengah kanvas agar bisa digeser dan diskalakan!
      drawnObjects.push({
        type: "image",
        img: img,
        x: canvas2d.width / 2 - 150,
        y: canvas2d.height / 2 - 100,
        w: 300,
        h: 200
      });
      updateVisualizerLog("<b>[Multimedia]</b> Gambar berhasil dimuat sebagai <u>objek melayang di tengah kanvas</u>! Seret menggunakan mouse untuk Translasi, ubah ke Mode Skala untuk mengubah ukurannya.");
      playSynthSound(587, 0.2);
      draw();
    };
    img.src = e.target.result;
  };
  if (event.target.files[0]) {
    reader.readAsDataURL(event.target.files[0]);
  }
};

// --- 8. Engine Animasi Dinamis 2D ---

window.toggleAnimation = function(type) {
  activeAnimations[type] = !activeAnimations[type];
  const btn = document.getElementById("btnAnim" + type.charAt(0).toUpperCase() + type.slice(1));
  if (btn) {
    if (activeAnimations[type]) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  }
  playSynthSound(350, 0.1);
};

window.togglePlayAnimation = function() {
  isPlayingAnimation = !isPlayingAnimation;
  const playBtn = document.getElementById("btnPlayAnim");
  
  if (isPlayingAnimation) {
    playBtn.textContent = "Hentikan Animasi";
    playBtn.classList.add("active");
    playBtn.style.backgroundColor = "var(--accent)"; // Neon Hot Pink
    playBtn.style.color = "#ffffff";
    updateVisualizerLog("<b>[Animation Engine]</b> Memulai animasi transformasi dinamis!");
    runAnimationLoop();
  } else {
    playBtn.textContent = "Mulai Animasi";
    playBtn.classList.remove("active");
    playBtn.style.backgroundColor = ""; // Kembali ke Kuning Pastel bawaan
    playBtn.style.color = "";
    cancelAnimationFrame(animationId);
    updateVisualizerLog("<b>[Animation Engine]</b> Animasi dihentikan.");
  }
};

function runAnimationLoop() {
  if (!isPlayingAnimation) return;
  
  if (activeAnimations.bouncing) {
    offsetX += bounceVelX;
    offsetY += bounceVelY;
    
    const halfW = canvas2d.width / 2;
    const halfH = canvas2d.height / 2;
    const shapeW = (typeof input1 === "number" && input1 > 0) ? input1 : 100;
    const shapeH = (typeof input2 === "number" && input2 > 0) ? input2 : 50;
    
    // Hitung batas dinamis dengan memperhitungkan skala aktif agar bentuk tidak keluar kanvas
    const currentScale = typeof scale === "number" ? scale : 1;
    const boundX = Math.max(50, halfW - (shapeW * currentScale / 2 + 20));
    const boundY = Math.max(50, halfH - (shapeH * currentScale / 2 + 20));
    
    if (Math.abs(offsetX) > boundX) {
      offsetX = Math.sign(offsetX) * boundX;
      bounceVelX = -bounceVelX;
      playSynthSound(280, 0.08);
    }
    if (Math.abs(offsetY) > boundY) {
      offsetY = Math.sign(offsetY) * boundY;
      bounceVelY = -bounceVelY;
      playSynthSound(300, 0.08);
    }
  }
  
  if (activeAnimations.rotating) {
    angle += 0.03;
  }
  
  if (activeAnimations.pulsing) {
    scale = 1 + 0.3 * Math.sin(Date.now() / 250);
  }
  
  draw();
  animationId = requestAnimationFrame(runAnimationLoop);
}

// --- 9. Pengendali Bentuk bawaan ---

window.setShape = function(shape) {
  selectedShape = shape;
  
  if (shape === "X" || shape === "semicircle" || shape === "donut") {
    currentDefaultShape = shape;
    offsetX = 0;
    offsetY = 0;
    angle = 0;
    scale = 1;
    
    if (shape === "semicircle") {
      input3 = 180;
    } else if (shape === "X") {
      input3 = 60;
    } else if (shape === "donut") {
      input3 = 20;
    }
  }
  
  updateSelectedButtonStyle();
  updateInputLabels();
  updateCanvasCursor();
  
  let msg = `[Sistem] Beralih ke bentuk <b>${shape.toUpperCase()}</b>. `;
  if (shape.includes("line")) {
    msg += `Tarik garis di canvas menggunakan mouse!`;
  } else if (shape === "bezier") {
    msg += `Geser tuas P0, P1, P2, P3 untuk mengubah lekukan kurva Bezier secara langsung!`;
  } else if (shape === "flood-fill") {
    msg += `Pilih warna, lalu klik bagian tertutup canvas untuk mengaktifkan Ember Cat!`;
  }
  updateVisualizerLog(msg);
  playSynthSound(400, 0.1);
  draw();
};

window.setMouseMode = function(mode) {
  mouseMode = mode;
  
  // If drawing/filling mode is currently active, switch back to the active default shape
  // so dragging the mouse will actually perform the translation/rotation/scale!
  if (selectedShape === "line-dda" || selectedShape === "line-bresenham" || selectedShape === "bezier" || selectedShape === "flood-fill") {
    selectedShape = currentDefaultShape || "X";
    updateSelectedButtonStyle();
    updateInputLabels();
  }
  
  updateMouseModeUI();
  updateCanvasCursor();
  
  let modeLabel = mode === "translate" ? "Translasi" : (mode === "rotate" ? "Rotasi" : "Skala");
  updateVisualizerLog(`[Sistem] Mode interaksi mouse beralih ke <b>${modeLabel}</b>. Tarik mouse di canvas untuk mengubah bentuk.`);
  playSynthSound(440, 0.1);
  draw();
};

function updateMouseModeUI() {
  const translateBtn = document.getElementById("translateMode");
  const rotateBtn = document.getElementById("rotateMode");
  const scaleBtn = document.getElementById("scaleMode");
  
  if (translateBtn) translateBtn.classList.remove("active");
  if (rotateBtn) rotateBtn.classList.remove("active");
  if (scaleBtn) scaleBtn.classList.remove("active");
  
  if (mouseMode === "translate" && translateBtn) {
    translateBtn.classList.add("active");
  } else if (mouseMode === "rotate" && rotateBtn) {
    rotateBtn.classList.add("active");
  } else if (mouseMode === "scale" && scaleBtn) {
    scaleBtn.classList.add("active");
  }
}

function updateCanvasCursor() {
  if (!canvas2d) return;
  if (selectedShape === "X" || selectedShape === "semicircle" || selectedShape === "donut") {
    if (mouseMode === "translate") {
      canvas2d.style.cursor = "move";
    } else if (mouseMode === "rotate") {
      canvas2d.style.cursor = "crosshair";
    } else if (mouseMode === "scale") {
      canvas2d.style.cursor = "nwse-resize";
    }
  } else if (selectedShape === "flood-fill") {
    canvas2d.style.cursor = "cell";
  } else if (selectedShape === "bezier") {
    canvas2d.style.cursor = "default";
  } else {
    canvas2d.style.cursor = "crosshair"; // DDA, Bresenham
  }
}

window.applyOutlineThickness = function() {
  const val = parseFloat(document.getElementById("input4").value);
  if (!isNaN(val) && val >= 0) {
    outlineWidth = val;
    draw();
  }
};


function updateSelectedButtonStyle() {
  const buttons = document.querySelectorAll(".tool-section button[onclick^='setShape']");
  buttons.forEach(btn => {
    btn.classList.remove("active");
  });
  
  buttons.forEach(btn => {
    const attr = btn.getAttribute("onclick");
    if (attr && attr.includes(`'${selectedShape}'`)) {
      btn.classList.add("active");
    }
  });
}

function updateInputLabels() {
  const label1 = document.querySelector('label[for="input1"]') || document.querySelector("#controls2d .input-group:nth-child(1) label");
  const label2 = document.querySelector('label[for="input2"]') || document.querySelector("#controls2d .input-group:nth-child(2) label");
  const label3 = document.querySelector('label[for="input3"]') || document.querySelector("#controls2d .input-group:nth-child(3) label");
  const label4 = document.querySelector('label[for="input4"]') || document.querySelector("#controls2d .input-group:nth-child(4) label");
  
  if (!label1 || !label2 || !label3 || !label4) return;
  
  const container3 = label3.parentNode;
  const container4 = label4.parentNode;
  
  const activeLabelShape = (selectedShape === "flood-fill" || selectedShape.includes("line") || selectedShape === "bezier") ? currentDefaultShape : selectedShape;
  
  // Set label input keempat secara dinamis berdasarkan konteks
  if (selectedShape === "X" || selectedShape === "semicircle" || selectedShape === "donut") {
    label4.textContent = "Ketebalan Outline:";
  } else {
    label4.textContent = "Ukuran Kuas / Tebal Garis:";
  }
  
  if (activeLabelShape === "X") {
    label1.textContent = "Lebar X:";
    label2.textContent = "Tinggi X:";
    label3.textContent = "Ketebalan Garis:";
    container3.style.display = "block";
    container4.style.display = "block";
  } else if (activeLabelShape === "semicircle") {
    label1.textContent = "Radius:";
    label2.textContent = "Ketebalan Garis:";
    label3.textContent = "Sudut (derajat):";
    container3.style.display = "block";
    container4.style.display = "block";
  } else if (activeLabelShape === "donut") {
    label1.textContent = "Radius Luar:";
    label2.textContent = "Radius Dalam:";
    label3.textContent = "Ketebalan Garis:";
    container3.style.display = "block";
    container4.style.display = "block";
  } else {
    label1.textContent = "N/A:";
    label2.textContent = "N/A:";
    label3.textContent = "N/A:";
    container3.style.display = "none";
  }
}

window.rotate = function(dir) {
  if (!currentDefaultShape) {
    currentDefaultShape = "X";
    selectedShape = "X";
    updateSelectedButtonStyle();
    updateInputLabels();
    updateCanvasCursor();
  }
  angle += dir * (Math.PI / 18);
  updateVisualizerLog(`[Transformasi] Rotasi bentuk bawaan: <b>${Math.round(angle * 180 / Math.PI)}°</b>`);
  playSynthSound(440 + dir * 50, 0.08);
  draw();
};

window.move = function(dx, dy) {
  if (!currentDefaultShape) {
    currentDefaultShape = "X";
    selectedShape = "X";
    updateSelectedButtonStyle();
    updateInputLabels();
    updateCanvasCursor();
  }
  offsetX += dx;
  offsetY += dy;
  updateVisualizerLog(`[Transformasi] Translasi bentuk bawaan ke offset: <b>(X: ${offsetX}, Y: ${offsetY})</b>`);
  playSynthSound(400, 0.08);
  draw();
};

window.changeScale = function(delta) {
  if (!currentDefaultShape) {
    currentDefaultShape = "X";
    selectedShape = "X";
    updateSelectedButtonStyle();
    updateInputLabels();
    updateCanvasCursor();
  }
  scale = Math.max(0.1, scale + delta);
  updateVisualizerLog(`[Transformasi] Skala bentuk bawaan: <b>${scale.toFixed(1)}x</b>`);
  playSynthSound(480, 0.08);
  draw();
};

window.updateInput = function() {
  const val1 = parseFloat(document.getElementById("input1").value);
  const val2 = parseFloat(document.getElementById("input2").value);
  const val3 = parseFloat(document.getElementById("input3").value);
  const val4 = parseFloat(document.getElementById("input4").value);
  
  input1 = val1;
  input2 = val2;
  input3 = val3;
  outlineWidth = val4;
  
  draw();
};

// Hanya mengubah variabel warna aktif (untuk menggambar kustom baru & fill kustom baru)
// Tanpa mengubah warna objek bawaan secara paksa!
window.updateActiveColor = function() {
  fillColor = document.getElementById("color2d").value;
};

// Menerapkan warna dari picker secara khusus ke bentuk bawaan aktif
window.applyColor2d = function() {
  fillColor = document.getElementById("color2d").value;
  defaultShapeColor = fillColor; // Terapkan warna hanya saat tombol ditekan!
  draw();
};

window.applyOutlineColor = function() {
  outlineColor = document.getElementById("outlineColor").value;
  defaultShapeOutlineColor = outlineColor; // Terapkan outline warna bawaan aktif!
  draw();
};

window.toggleOutline = function() {
  showOutline = !showOutline;
  const toggleBtn = document.getElementById("toggleOutline");
  if (showOutline) {
    toggleBtn.textContent = "Nonaktifkan Outline";
    toggleBtn.classList.add("active");
  } else {
    toggleBtn.textContent = "Aktifkan Outline";
    toggleBtn.classList.remove("active");
  }
  draw();
};

// Menghapus total kanvas
window.clearCanvas = function() {
  drawnObjects = [];
  bgImage = null;
  currentDefaultShape = null; // Menghapus bentuk default
  pendingTextToPlace = null;
  activeDrawnObject = null;
  ctx.clearRect(0, 0, canvas2d.width, canvas2d.height);
  updateVisualizerLog("[Sistem] Kanvas berhasil dikosongkan.");
  playSynthSound(220, 0.15);
  draw();
};

// Reset Transformasi
window.resetTransform = function() {
  angle = 0;
  offsetX = 0;
  offsetY = 0;
  scale = 1;
  drawnObjects = [];
  bgImage = null;
  currentDefaultShape = "X";
  selectedShape = "X";
  pendingTextToPlace = null;
  activeDrawnObject = null;
  
  bezierPoints = [
    { x: 100, y: 350 },
    { x: 150, y: 100 },
    { x: 350, y: 100 },
    { x: 400, y: 350 }
  ];
  
  input1 = 100;
  input2 = 50;
  input3 = 60;
  outlineWidth = 2;
  showOutline = false;
  
  document.getElementById("input1").value = 100;
  document.getElementById("input2").value = 50;
  document.getElementById("input3").value = 60;
  document.getElementById("input4").value = 2;
  
  fillColor = "#ff0000";
  defaultShapeColor = "#ff0000";
  document.getElementById("color2d").value = fillColor;
  
  updateInputLabels();
  updateVisualizerLog("[Sistem] Seluruh pengaturan & kanvas disetel ulang.");
  draw();
};

document.addEventListener("DOMContentLoaded", () => {
  updateInputLabels();
  updateSelectedButtonStyle();
  setShape("X");
  updateMouseModeUI();
  updateCanvasCursor();
  draw();
  console.log("Upgraded 2D vector-raster hybrid engine fully initialized!");
});
