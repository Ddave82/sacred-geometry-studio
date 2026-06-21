const GLOBAL_COLOR_TABLE_SIZE = 256;
const LZW_MIN_CODE_SIZE = 8;

export function createGifEncoder(width, height, { delayCs = 6, repeat = 0, palette = createFallbackPalette() } = {}) {
  const writer = new GifWriter();
  const frameDelay = clampInteger(delayCs, 2, 65535);
  const colorTable = normalizePalette(palette);

  writer.string('GIF89a');
  writer.u16(width);
  writer.u16(height);
  writer.byte(0xf7);
  writer.byte(0);
  writer.byte(0);
  writer.bytes(colorTable);
  writer.bytes([0x21, 0xff, 0x0b]);
  writer.string('NETSCAPE2.0');
  writer.bytes([0x03, 0x01]);
  writer.u16(repeat);
  writer.byte(0);

  return {
    addFrame(indices) {
      if (indices.length !== width * height) {
        throw new Error('GIF frame size does not match the encoder dimensions.');
      }

      writer.bytes([0x21, 0xf9, 0x04, 0x00]);
      writer.u16(frameDelay);
      writer.bytes([0x00, 0x00]);
      writer.byte(0x2c);
      writer.u16(0);
      writer.u16(0);
      writer.u16(width);
      writer.u16(height);
      writer.byte(0);
      writeImageData(writer, indices);
    },
    finish() {
      writer.byte(0x3b);
      return new Blob(writer.parts, { type: 'image/gif' });
    },
  };
}

export function collectPaletteSamples(imageData, histogram, { stride = 1 } = {}) {
  const step = Math.max(1, Math.round(stride));

  for (let index = 0; index < imageData.length; index += 4 * step) {
    const { red, green, blue } = normalizedPixel(imageData, index);
    const key = ((red >> 3) << 10) | ((green >> 3) << 5) | (blue >> 3);
    const bucket = histogram.get(key) ?? { count: 0, red: 0, green: 0, blue: 0 };
    bucket.count += 1;
    bucket.red += red;
    bucket.green += green;
    bucket.blue += blue;
    histogram.set(key, bucket);
  }
}

export function createAdaptivePalette(histogram, maxColors = GLOBAL_COLOR_TABLE_SIZE) {
  const colors = Array.from(histogram.values())
    .filter((color) => color.count > 0)
    .map((color) => ({
      count: color.count,
      red: color.red / color.count,
      green: color.green / color.count,
      blue: color.blue / color.count,
      redSum: color.red,
      greenSum: color.green,
      blueSum: color.blue,
    }));

  if (!colors.length) return createFallbackPalette();

  const boxes = [createColorBox(colors)];
  while (boxes.length < maxColors) {
    let splitIndex = -1;
    let splitScore = -1;

    boxes.forEach((box, index) => {
      const score = Math.max(box.redRange, box.greenRange, box.blueRange) * Math.log2(box.count + 1);
      if (box.colors.length > 1 && score > splitScore) {
        splitIndex = index;
        splitScore = score;
      }
    });

    if (splitIndex === -1) break;
    const [left, right] = splitColorBox(boxes[splitIndex]);
    boxes.splice(splitIndex, 1, left, right);
  }

  const palette = new Uint8Array(GLOBAL_COLOR_TABLE_SIZE * 3);
  boxes.slice(0, maxColors).forEach((box, index) => {
    const offset = index * 3;
    palette[offset] = clampByte(box.redSum / box.count);
    palette[offset + 1] = clampByte(box.greenSum / box.count);
    palette[offset + 2] = clampByte(box.blueSum / box.count);
  });

  const lastOffset = Math.max(0, Math.min(boxes.length - 1, maxColors - 1)) * 3;
  for (let index = boxes.length; index < GLOBAL_COLOR_TABLE_SIZE; index += 1) {
    const offset = index * 3;
    palette[offset] = palette[lastOffset];
    palette[offset + 1] = palette[lastOffset + 1];
    palette[offset + 2] = palette[lastOffset + 2];
  }

  return palette;
}

export function createPaletteMapper(palette) {
  const colorTable = normalizePalette(palette);
  const colors = Array.from({ length: GLOBAL_COLOR_TABLE_SIZE }, (_, index) => ({
    red: colorTable[index * 3],
    green: colorTable[index * 3 + 1],
    blue: colorTable[index * 3 + 2],
  }));
  const cache = new Int16Array(32768);
  cache.fill(-1);

  return function mapImageData(imageData) {
    const indices = new Uint8Array(imageData.length / 4);
    let outputIndex = 0;

    for (let index = 0; index < imageData.length; index += 4) {
      const { red, green, blue } = normalizedPixel(imageData, index);
      const key = ((red >> 3) << 10) | ((green >> 3) << 5) | (blue >> 3);
      let paletteIndex = cache[key];

      if (paletteIndex < 0) {
        paletteIndex = nearestPaletteIndex(colors, red, green, blue);
        cache[key] = paletteIndex;
      }

      indices[outputIndex] = paletteIndex;
      outputIndex += 1;
    }

    return indices;
  };
}

function normalizedPixel(imageData, index) {
  const alpha = imageData[index + 3];
  let red = imageData[index];
  let green = imageData[index + 1];
  let blue = imageData[index + 2];

  if (alpha < 255) {
    red = compositeOnStudioBlack(red, alpha);
    green = compositeOnStudioBlack(green, alpha);
    blue = compositeOnStudioBlack(blue, alpha);
  }

  return { red, green, blue };
}

function nearestPaletteIndex(colors, red, green, blue) {
  let bestIndex = 0;
  let bestDistance = Infinity;

  for (let index = 0; index < colors.length; index += 1) {
    const color = colors[index];
    const redDelta = red - color.red;
    const greenDelta = green - color.green;
    const blueDelta = blue - color.blue;
    const distance = redDelta * redDelta * 0.3 + greenDelta * greenDelta * 0.59 + blueDelta * blueDelta * 0.11;

    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  return bestIndex;
}

function writeImageData(writer, indices) {
  const compressed = lzwEncode(indices);
  writer.byte(LZW_MIN_CODE_SIZE);

  for (let offset = 0; offset < compressed.length; offset += 255) {
    const block = compressed.subarray(offset, offset + 255);
    writer.byte(block.length);
    writer.bytes(block);
  }

  writer.byte(0);
}

function lzwEncode(indices) {
  const clearCode = 1 << LZW_MIN_CODE_SIZE;
  const endCode = clearCode + 1;
  const output = [];
  let codeSize = LZW_MIN_CODE_SIZE + 1;
  let bitBuffer = 0;
  let bitCount = 0;
  let runLength = 0;

  const writeCode = (code) => {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;

    while (bitCount >= 8) {
      output.push(bitBuffer & 0xff);
      bitBuffer >>= 8;
      bitCount -= 8;
    }
  };

  const writeClearCode = () => {
    codeSize = LZW_MIN_CODE_SIZE + 1;
    runLength = 0;
    writeCode(clearCode);
  };

  writeClearCode();

  for (let index = 0; index < indices.length; index += 1) {
    if (runLength >= 240) {
      writeClearCode();
    }

    writeCode(indices[index]);
    runLength += 1;
  }

  writeCode(clearCode);
  writeCode(endCode);

  if (bitCount > 0) {
    output.push(bitBuffer & 0xff);
  }

  return Uint8Array.from(output);
}

function createColorBox(colors) {
  const box = {
    colors,
    count: 0,
    redSum: 0,
    greenSum: 0,
    blueSum: 0,
    redMin: Infinity,
    redMax: -Infinity,
    greenMin: Infinity,
    greenMax: -Infinity,
    blueMin: Infinity,
    blueMax: -Infinity,
  };

  colors.forEach((color) => {
    box.count += color.count;
    box.redSum += color.redSum;
    box.greenSum += color.greenSum;
    box.blueSum += color.blueSum;
    box.redMin = Math.min(box.redMin, color.red);
    box.redMax = Math.max(box.redMax, color.red);
    box.greenMin = Math.min(box.greenMin, color.green);
    box.greenMax = Math.max(box.greenMax, color.green);
    box.blueMin = Math.min(box.blueMin, color.blue);
    box.blueMax = Math.max(box.blueMax, color.blue);
  });

  box.redRange = box.redMax - box.redMin;
  box.greenRange = box.greenMax - box.greenMin;
  box.blueRange = box.blueMax - box.blueMin;
  return box;
}

function splitColorBox(box) {
  const channel =
    box.redRange >= box.greenRange && box.redRange >= box.blueRange ? 'red' : box.greenRange >= box.blueRange ? 'green' : 'blue';
  const sorted = [...box.colors].sort((a, b) => a[channel] - b[channel]);
  const half = box.count / 2;
  let running = 0;
  let splitIndex = 1;

  for (let index = 0; index < sorted.length - 1; index += 1) {
    running += sorted[index].count;
    if (running >= half) {
      splitIndex = index + 1;
      break;
    }
  }

  return [createColorBox(sorted.slice(0, splitIndex)), createColorBox(sorted.slice(splitIndex))];
}

function createFallbackPalette() {
  const palette = new Uint8Array(GLOBAL_COLOR_TABLE_SIZE * 3);

  for (let index = 0; index < GLOBAL_COLOR_TABLE_SIZE; index += 1) {
    const offset = index * 3;
    palette[offset] = index;
    palette[offset + 1] = index;
    palette[offset + 2] = index;
  }

  return palette;
}

function normalizePalette(palette) {
  const normalized = new Uint8Array(GLOBAL_COLOR_TABLE_SIZE * 3);
  const source = palette instanceof Uint8Array ? palette : Uint8Array.from(palette);
  normalized.set(source.subarray(0, normalized.length));

  const lastSourceOffset = Math.max(0, Math.min(source.length - 3, normalized.length - 3));
  for (let index = Math.ceil(source.length / 3); index < GLOBAL_COLOR_TABLE_SIZE; index += 1) {
    const offset = index * 3;
    normalized[offset] = source[lastSourceOffset] ?? 0;
    normalized[offset + 1] = source[lastSourceOffset + 1] ?? 0;
    normalized[offset + 2] = source[lastSourceOffset + 2] ?? 0;
  }

  return normalized;
}

class GifWriter {
  parts = [];

  byte(value) {
    this.parts.push(Uint8Array.of(value & 0xff));
  }

  bytes(values) {
    this.parts.push(values instanceof Uint8Array ? values : Uint8Array.from(values));
  }

  string(value) {
    const bytes = new Uint8Array(value.length);
    for (let index = 0; index < value.length; index += 1) {
      bytes[index] = value.charCodeAt(index);
    }
    this.bytes(bytes);
  }

  u16(value) {
    this.bytes([value & 0xff, (value >> 8) & 0xff]);
  }
}

function compositeOnStudioBlack(value, alpha) {
  return Math.round((value * alpha + 5 * (255 - alpha)) / 255);
}

function clampByte(value) {
  const numeric = Math.round(Number(value));
  if (Number.isNaN(numeric)) return 0;
  return Math.min(255, Math.max(0, numeric));
}

function clampInteger(value, min, max) {
  const numeric = Math.round(Number(value));
  if (Number.isNaN(numeric)) return min;
  return Math.min(max, Math.max(min, numeric));
}
