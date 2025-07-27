// renderer.js
const fs = require('fs');
const { ipcRenderer } = require('electron');

console.log('renderer.js loaded'); // Verify script loading

let folderPath = null;
let currentFrame = 0;
let buffer = null;
let palette = [];
let pixels = null;
let width = 0;
let height = 0;
let rowSize = 0;
let selectedColor = null;
let colorMap = {};
let currentFile = '';

const canvas = document.getElementById('image');
const ctx = canvas.getContext('2d');
const paletteContainer = document.getElementById('palette-container');
const status = document.getElementById('status');

function setStatus(message) {
  status.textContent = message;
  console.log(message);
}

document.getElementById('open-folder').addEventListener('click', async () => {
  console.log('Open Folder button clicked');
  setStatus('Opening folder dialog...');
  try {
    folderPath = await ipcRenderer.invoke('open-folder');
    if (folderPath) {
      setStatus(`Selected folder: ${folderPath}`);
      loadFrame(0);
    } else {
      setStatus('No folder selected');
    }
  } catch (err) {
    setStatus(`Error selecting folder: ${err.message}`);
    console.error('Error in open-folder:', err);
  }
});

document.getElementById('prev').addEventListener('click', () => {
  currentFrame = (currentFrame - 1 + 1134) % 1134;
  document.getElementById('frame-input').value = currentFrame;
  loadFrame(currentFrame);
});

document.getElementById('next').addEventListener('click', () => {
  currentFrame = (currentFrame + 1) % 1134;
  document.getElementById('frame-input').value = currentFrame;
  loadFrame(currentFrame);
});

document.getElementById('frame-input').addEventListener('change', (e) => {
  currentFrame = parseInt(e.target.value, 10);
  if (currentFrame < 0) currentFrame = 0;
  if (currentFrame > 1133) currentFrame = 1133;
  loadFrame(currentFrame);
});

document.getElementById('save').addEventListener('click', () => {
  if (!buffer || !currentFile) {
    setStatus('No file loaded to save');
    return;
  }
  try {
    for (let i = 128; i < 256; i++) {
      const off = 54 + i * 4;
      buffer.writeUInt8(palette[i].b, off);
      buffer.writeUInt8(palette[i].g, off + 1);
      buffer.writeUInt8(palette[i].r, off + 2);
      buffer.writeUInt8(0, off + 3);
    }
    fs.writeFileSync(currentFile, buffer);
    setStatus('File saved successfully');
  } catch (err) {
    setStatus(`Error saving file: ${err.message}`);
  }
});

canvas.addEventListener('click', (e) => {
  if (!selectedColor || !pixels) {
    setStatus('No color selected or image not loaded');
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(e.clientX - rect.left);
  const y = Math.floor(e.clientY - rect.top);
  const row = height - 1 - y;
  const rowOff = row * rowSize;
  const idx = pixels.readUInt8(rowOff + x);
  if (idx >= 128 && idx <= 255) {
    palette[idx] = { ...selectedColor };
    setStatus(`Updated pixel at (${x}, ${y}) to color index ${idx}`);
    refreshImage();
    displayPalette();
  } else {
    setStatus(`Pixel at (${x}, ${y}) uses fixed palette index ${idx}`);
  }
});

function loadFrame(num) {
  if (!folderPath) {
    setStatus('No folder selected');
    return;
  }
  currentFile = `${folderPath}/${num.toString().padStart(4, '0')}.bmp`;
  setStatus(`Loading file: ${currentFile}`);

  try {
    buffer = fs.readFileSync(currentFile);
    setStatus(`Loaded file: ${currentFile} (${buffer.length} bytes)`);
  } catch (err) {
    setStatus(`Error loading file: ${err.message}`);
    return;
  }

  // Parse BMP
  if (buffer.toString('utf8', 0, 2) !== 'BM') {
    setStatus('Not a valid BMP file');
    return;
  }

  const dataOffset = buffer.readUInt32LE(10);
  width = buffer.readInt32LE(18);
  height = buffer.readInt32LE(22);
  const bits = buffer.readUInt16LE(28);
  if (bits !== 8) {
    setStatus(`Invalid BMP: Not 8-bit (bits per pixel: ${bits})`);
    return;
  }

  palette = [];
  for (let i = 0; i < 256; i++) {
    const off = 54 + i * 4;
    const b = buffer.readUInt8(off);
    const g = buffer.readUInt8(off + 1);
    const r = buffer.readUInt8(off + 2);
    palette.push({ r, g, b });
  }

  rowSize = Math.ceil(width / 4) * 4;
  pixels = buffer.slice(dataOffset, dataOffset + height * rowSize);

  canvas.width = width;
  canvas.height = height;
  setStatus(`Image loaded: ${width}x${height}`);

  extractUniqueColors();
  refreshImage();
  displayPalette();
}

function extractUniqueColors() {
  colorMap = {};
  const usedIndices = new Set();
  for (let y = 0; y < height; y++) {
    const rowOff = y * rowSize;
    for (let x = 0; x < width; x++) {
      const idx = pixels.readUInt8(rowOff + x);
      if (idx >= 128 && idx <= 255) {
        usedIndices.add(idx);
      }
    }
  }

  for (const idx of usedIndices) {
    const col = palette[idx];
    const key = `${col.r},${col.g},${col.b}`;
    if (!colorMap[key]) {
      colorMap[key] = { color: col, indices: [] };
    }
    colorMap[key].indices.push(idx);
  }
  setStatus(`Found ${Object.keys(colorMap).length} unique colors in team palette`);
}

function refreshImage() {
  const imageData = ctx.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    const rowOff = (height - 1 - y) * rowSize; // bottom-up to top-down
    for (let x = 0; x < width; x++) {
      const idx = pixels.readUInt8(rowOff + x);
      const col = palette[idx];
      const pos = (y * width + x) * 4;
      imageData.data[pos] = col.r;
      imageData.data[pos + 1] = col.g;
      imageData.data[pos + 2] = col.b;
      imageData.data[pos + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  setStatus('Image refreshed');
}

function displayPalette() {
  paletteContainer.innerHTML = '';
  const uniqueGroups = Object.values(colorMap).slice(0, 64);
  if (uniqueGroups.length === 0) {
    paletteContainer.innerHTML = '<div>No team palette colors found</div>';
    setStatus('No unique colors in team palette (indices 128-255)');
    return;
  }

  uniqueGroups.forEach(group => {
    const key = `${group.color.r},${group.color.g},${group.color.b}`;
    const swatch = document.createElement('div');
    swatch.classList.add('swatch');
    swatch.style.backgroundColor = `rgb(${group.color.r},${group.color.g},${group.color.b})`;
    swatch.dataset.key = key;

    swatch.addEventListener('click', () => {
      selectedColor = { ...group.color };
      document.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
      setStatus(`Selected color: rgb(${group.color.r},${group.color.g},${group.color.b})`);
    });

    swatch.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const input = document.createElement('input');
      input.type = 'color';
      input.value = rgbToHex(group.color);
      input.style.position = 'absolute';
      input.style.left = '-9999px';
      document.body.appendChild(input);
      input.addEventListener('change', () => {
        const newColor = hexToRgb(input.value);
        group.indices.forEach(idx => {
          palette[idx] = { ...newColor };
        });
        setStatus(`Updated color to rgb(${newColor.r},${newColor.g},${newColor.b})`);
        refreshImage();
        extractUniqueColors();
        displayPalette();
        document.body.removeChild(input);
      });
      input.click();
    });

    paletteContainer.appendChild(swatch);
  });
  setStatus(`Displayed ${uniqueGroups.length} palette swatches`);
}

function rgbToHex(color) {
  return '#' + [color.r, color.g, color.b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex) {
  const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  return match
    ? {
        r: parseInt(match[1], 16),
        g: parseInt(match[2], 16),
        b: parseInt(match[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}