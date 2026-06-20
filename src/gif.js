const GLOBAL_COLOR_TABLE_SIZE = 256;
const LZW_MIN_CODE_SIZE = 8;
const RGB332_PALETTE = createRgb332Palette();

export function createGifEncoder(width, height, { delayCs = 6, repeat = 0 } = {}) {
  const writer = new GifWriter();
  const frameDelay = clampInteger(delayCs, 2, 65535);

  writer.string('GIF89a');
  writer.u16(width);
  writer.u16(height);
  writer.byte(0xf7);
  writer.byte(0);
  writer.byte(0);
  writer.bytes(RGB332_PALETTE);
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

      writer.bytes([0x21, 0xf9, 0x04, 0x08]);
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

export function imageDataToRgb332Indices(imageData) {
  const indices = new Uint8Array(imageData.length / 4);
  let outputIndex = 0;

  for (let index = 0; index < imageData.length; index += 4) {
    const alpha = imageData[index + 3];
    let red = imageData[index];
    let green = imageData[index + 1];
    let blue = imageData[index + 2];

    if (alpha < 255) {
      red = compositeOnStudioBlack(red, alpha);
      green = compositeOnStudioBlack(green, alpha);
      blue = compositeOnStudioBlack(blue, alpha);
    }

    indices[outputIndex] = ((red >> 5) << 5) | ((green >> 5) << 2) | (blue >> 6);
    outputIndex += 1;
  }

  return indices;
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
  const dictionary = new Map();
  let nextCode = endCode + 1;
  let codeSize = LZW_MIN_CODE_SIZE + 1;
  let bitBuffer = 0;
  let bitCount = 0;

  const writeCode = (code) => {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;

    while (bitCount >= 8) {
      output.push(bitBuffer & 0xff);
      bitBuffer >>= 8;
      bitCount -= 8;
    }
  };

  const resetDictionary = () => {
    dictionary.clear();
    nextCode = endCode + 1;
    codeSize = LZW_MIN_CODE_SIZE + 1;
  };

  resetDictionary();
  writeCode(clearCode);

  let prefix = indices[0] ?? 0;
  for (let index = 1; index < indices.length; index += 1) {
    const current = indices[index];
    const key = (prefix << 8) | current;
    const existingCode = dictionary.get(key);

    if (existingCode !== undefined) {
      prefix = existingCode;
      continue;
    }

    writeCode(prefix);

    if (nextCode < 4096) {
      dictionary.set(key, nextCode);
      nextCode += 1;
      if (nextCode === 1 << codeSize && codeSize < 12) {
        codeSize += 1;
      }
    } else {
      writeCode(clearCode);
      resetDictionary();
    }

    prefix = current;
  }

  writeCode(prefix);
  writeCode(endCode);

  if (bitCount > 0) {
    output.push(bitBuffer & 0xff);
  }

  return Uint8Array.from(output);
}

function createRgb332Palette() {
  const palette = new Uint8Array(GLOBAL_COLOR_TABLE_SIZE * 3);

  for (let red = 0; red < 8; red += 1) {
    for (let green = 0; green < 8; green += 1) {
      for (let blue = 0; blue < 4; blue += 1) {
        const index = (red << 5) | (green << 2) | blue;
        palette[index * 3] = Math.round((red / 7) * 255);
        palette[index * 3 + 1] = Math.round((green / 7) * 255);
        palette[index * 3 + 2] = Math.round((blue / 3) * 255);
      }
    }
  }

  return palette;
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

function clampInteger(value, min, max) {
  const numeric = Math.round(Number(value));
  if (Number.isNaN(numeric)) return min;
  return Math.min(max, Math.max(min, numeric));
}
