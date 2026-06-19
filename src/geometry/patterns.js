const SQRT3 = Math.sqrt(3);

export function renderPattern(patternId, context, options) {
  switch (patternId) {
    case 'seed-of-life':
      return renderSeedOfLife(context, options);
    case 'metatrons-cube':
      return renderMetatronsCube(context, options);
    case 'vesica-piscis':
      return renderVesicaPiscis(context, options);
    case 'sri-yantra':
      return renderSriYantra(context, options);
    case 'radial-mandala':
      return renderRadialMandala(context, options);
    case 'star-grid':
      return renderStarGrid(context, options);
    case 'flower-of-life':
    default:
      return renderFlowerOfLife(context, options);
  }
}

export function renderCenterSymbol(context, options) {
  const { cx, cy, maxRadius } = context;
  const size = maxRadius * 0.115 * (options.scale / 100);
  const stroke = commonAttrs(options);
  const small = size * 0.5;
  const triangle = polygon(
    [
      polar(cx, cy, size * 1.2, -90),
      polar(cx, cy, size * 1.2, 30),
      polar(cx, cy, size * 1.2, 150),
    ],
    stroke,
  );

  return `<g opacity="${number(options.opacity ?? 1)}">
    ${circle(cx, cy, size, stroke)}
    ${circle(cx, cy, small, { ...stroke, stroke: options.secondaryColor, strokeOpacity: 0.72, fill: 'none' })}
    ${triangle}
    ${circle(cx, cy, Math.max(2, size * 0.12), {
      stroke: 'none',
      fill: options.strokeColor,
      fillOpacity: Math.min(1, options.strokeOpacity + 0.08),
    })}
  </g>`;
}

function renderFlowerOfLife(context, options) {
  const { cx, cy, maxRadius } = context;
  const rings = Math.round(options.complexity);
  const circleRadius = (maxRadius * (options.scale / 100)) / (rings + 1.15);
  const centers = hexCenters(rings, circleRadius, cx, cy);
  const attrs = commonAttrs(options);
  const cells = centers.map((point) => circle(point.x, point.y, circleRadius, attrs)).join('');

  return patternGroup(context, options, `${cells}${centerEmphasis(context, options, circleRadius * 0.28)}`);
}

function renderSeedOfLife(context, options) {
  const { cx, cy, maxRadius } = context;
  const radius = maxRadius * (options.scale / 100) * 0.42;
  const attrs = commonAttrs(options);
  const circles = [circle(cx, cy, radius, attrs)];

  for (let index = 0; index < 6; index += 1) {
    const point = polar(cx, cy, radius, index * 60);
    circles.push(circle(point.x, point.y, radius, attrs));
  }

  if (options.complexity > 2) {
    const ringAttrs = { ...attrs, stroke: options.secondaryColor, strokeOpacity: options.strokeOpacity * 0.58, fill: 'none' };
    circles.push(polygon(Array.from({ length: 6 }, (_, index) => polar(cx, cy, radius, index * 60)), ringAttrs));
    circles.push(circle(cx, cy, radius * 2, ringAttrs));
  }

  if (options.complexity > 4) {
    for (let index = 0; index < 12; index += 1) {
      const point = polar(cx, cy, radius * 1.48, index * 30);
      circles.push(circle(point.x, point.y, radius * 0.48, { ...attrs, strokeOpacity: options.strokeOpacity * 0.45 }));
    }
  }

  return patternGroup(context, options, `${circles.join('')}${centerEmphasis(context, options, radius * 0.09)}`);
}

function renderMetatronsCube(context, options) {
  const { cx, cy, maxRadius } = context;
  const complexity = Math.max(1, Math.min(7, Math.round(options.complexity)));
  const designRadius = maxRadius * (options.scale / 100);
  const circleRadius = designRadius * 0.18;
  const inner = designRadius * 0.23;
  const outer = designRadius * 0.46;
  const middle = designRadius * 0.36;
  const halo = designRadius * 0.68;
  const centerPoint = { id: 'center', x: cx, y: cy, radius: circleRadius };
  const innerPoints = Array.from({ length: 6 }, (_, index) => ({
    ...polar(cx, cy, inner, index * 60),
    id: `inner-${index}`,
    radius: circleRadius,
  }));
  const outerPoints =
    complexity >= 3
      ? Array.from({ length: 6 }, (_, index) => ({
          ...polar(cx, cy, outer, index * 60 + 30),
          id: `outer-${index}`,
          radius: circleRadius,
        }))
      : [];
  const middlePoints =
    complexity >= 5
      ? Array.from({ length: 6 }, (_, index) => ({
          ...polar(cx, cy, middle, index * 60),
          id: `middle-${index}`,
          radius: circleRadius * 0.42,
        }))
      : [];
  const haloPoints =
    complexity >= 6
      ? Array.from({ length: 12 }, (_, index) => ({
          ...polar(cx, cy, halo, index * 30 + 15),
          id: `halo-${index}`,
          radius: circleRadius * 0.32,
        }))
      : [];
  const points = [centerPoint, ...innerPoints, ...outerPoints, ...middlePoints, ...haloPoints];

  const attrs = commonAttrs(options);
  const lineAttrs = {
    stroke: options.secondaryColor,
    strokeWidth: options.strokeWidth * 0.72,
    strokeOpacity: options.strokeOpacity * 0.46,
    fill: 'none',
  };
  const guideAttrs = {
    ...lineAttrs,
    stroke: options.strokeColor,
    strokeWidth: options.strokeWidth * 0.58,
    strokeOpacity: options.strokeOpacity * 0.34,
  };
  const lines = [];
  const guides = [];
  const lineKeys = new Set();

  const connect = (a, b, attrsForLine = lineAttrs) => {
    const key = [a.id, b.id].sort().join(':');
    if (lineKeys.has(key)) return;
    lineKeys.add(key);
    lines.push(line(a, b, attrsForLine));
  };
  const connectRing = (group, attrsForLine = lineAttrs) => {
    for (let index = 0; index < group.length; index += 1) {
      connect(group[index], group[(index + 1) % group.length], attrsForLine);
    }
  };
  const connectStep = (group, step, attrsForLine = lineAttrs) => {
    for (let index = 0; index < group.length; index += 1) {
      connect(group[index], group[(index + step) % group.length], attrsForLine);
    }
  };
  const connectByDistance = (groupA, groupB, limit, attrsForLine = lineAttrs) => {
    groupA.forEach((a) => {
      groupB.forEach((b) => {
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (distance <= limit) connect(a, b, attrsForLine);
      });
    });
  };

  innerPoints.forEach((point) => connect(centerPoint, point));

  if (complexity >= 2) {
    connectRing(innerPoints);
    connectStep(innerPoints, 2, guideAttrs);
    guides.push(polygon(innerPoints, guideAttrs));
  }
  if (complexity >= 3) {
    connectByDistance(innerPoints, outerPoints, inner * 1.24);
    outerPoints.forEach((point) => connect(centerPoint, point, guideAttrs));
    guides.push(polygon(outerPoints, guideAttrs));
  }
  if (complexity >= 4) {
    connectRing(outerPoints, guideAttrs);
    connectStep(outerPoints, 2);
    guides.push(polygon([outerPoints[0], outerPoints[2], outerPoints[4]], guideAttrs));
    guides.push(polygon([outerPoints[1], outerPoints[3], outerPoints[5]], guideAttrs));
  }
  if (complexity >= 5) {
    middlePoints.forEach((point, index) => {
      connect(innerPoints[index], point);
      connect(point, outerPoints[index]);
      connect(point, outerPoints[(index + 5) % outerPoints.length]);
    });
    guides.push(circle(cx, cy, middle, { ...guideAttrs, fill: 'none' }));
  }
  if (complexity >= 6) {
    connectRing(haloPoints, { ...lineAttrs, strokeOpacity: options.strokeOpacity * 0.28 });
    connectByDistance(haloPoints, outerPoints, designRadius * 0.35, { ...lineAttrs, strokeOpacity: options.strokeOpacity * 0.28 });
    guides.push(polygon(haloPoints, { ...guideAttrs, stroke: options.secondaryColor, strokeOpacity: options.strokeOpacity * 0.24 }));
  }
  if (complexity >= 7) {
    connectStep(haloPoints, 5, { ...guideAttrs, strokeOpacity: options.strokeOpacity * 0.26 });
    connectStep(outerPoints, 3, { ...lineAttrs, strokeOpacity: options.strokeOpacity * 0.36 });
    guides.push(circle(cx, cy, halo, { ...guideAttrs, stroke: options.secondaryColor, fill: 'none', strokeOpacity: options.strokeOpacity * 0.2 }));
  }

  const circles = points.map((point) => circle(point.x, point.y, point.radius, attrs));
  const core = circle(cx, cy, Math.max(3, circleRadius * 0.08), {
    stroke: 'none',
    fill: options.strokeColor,
    fillOpacity: options.strokeOpacity,
  });

  return patternGroup(context, options, `${lines.join('')}${guides.join('')}${circles.join('')}${options.centerEmphasis ? core : ''}`);
}

function renderVesicaPiscis(context, options) {
  const { cx, cy, maxRadius } = context;
  const radius = maxRadius * (options.scale / 100) * 0.43;
  const offset = radius * 0.58;
  const repetitions = Math.max(1, Math.min(12, Math.round(options.complexity + 1)));
  const attrs = commonAttrs(options);
  const pieces = [];

  for (let index = 0; index < repetitions; index += 1) {
    const angle = (360 / repetitions) * index;
    const left = polar(cx, cy, offset, angle - 90);
    const right = polar(cx, cy, offset, angle + 90);
    pieces.push(circle(left.x, left.y, radius, attrs));
    pieces.push(circle(right.x, right.y, radius, { ...attrs, stroke: options.secondaryColor, strokeOpacity: options.strokeOpacity * 0.72 }));
  }

  pieces.push(circle(cx, cy, radius * 1.15, { ...attrs, fill: 'none', strokeOpacity: options.strokeOpacity * 0.38 }));

  return patternGroup(context, options, `${pieces.join('')}${centerEmphasis(context, options, radius * 0.1)}`);
}

function renderSriYantra(context, options) {
  const { cx, cy, maxRadius } = context;
  const radius = maxRadius * (options.scale / 100) * 0.88;
  const attrs = commonAttrs(options);
  const secondary = {
    ...attrs,
    stroke: options.secondaryColor,
    strokeOpacity: options.strokeOpacity * 0.76,
  };
  const triangles = [];
  const up = [
    [0.78, -0.015],
    [0.6, 0.085],
    [0.43, -0.08],
    [0.28, 0.055],
  ];
  const down = [
    [0.72, 0.045],
    [0.56, -0.075],
    [0.4, 0.085],
    [0.29, -0.045],
    [0.17, 0.02],
  ];

  up.slice(0, Math.min(up.length, Math.max(2, options.complexity))).forEach(([scale, offset]) => {
    triangles.push(polygon(trianglePoints(cx, cy + radius * offset, radius * scale, -90), attrs));
  });
  down.slice(0, Math.min(down.length, Math.max(2, options.complexity + 1))).forEach(([scale, offset]) => {
    triangles.push(polygon(trianglePoints(cx, cy + radius * offset, radius * scale, 90), secondary));
  });

  const rings = [
    circle(cx, cy, radius * 0.86, { ...secondary, fill: 'none', strokeOpacity: options.strokeOpacity * 0.42 }),
    circle(cx, cy, radius * 0.64, { ...attrs, fill: 'none', strokeOpacity: options.strokeOpacity * 0.38 }),
  ];

  if (options.complexity > 3) {
    const petals = [];
    const count = Math.max(5, Math.round(options.symmetry));
    for (let index = 0; index < count; index += 1) {
      petals.push(ellipse(cx, cy - radius * 0.72, radius * 0.075, radius * 0.18, {
        ...secondary,
        fillOpacity: options.fillOpacity * 0.75,
        transform: `rotate(${number((360 / count) * index)} ${number(cx)} ${number(cy)})`,
      }));
    }
    rings.push(...petals);
  }

  const bindu = circle(cx, cy, Math.max(3, radius * 0.018), {
    stroke: 'none',
    fill: options.strokeColor,
    fillOpacity: options.strokeOpacity,
  });

  return patternGroup(context, options, `${rings.join('')}${triangles.join('')}${options.centerEmphasis ? bindu : ''}`);
}

function renderRadialMandala(context, options) {
  const { cx, cy, maxRadius } = context;
  const radius = maxRadius * (options.scale / 100) * 0.9;
  const count = Math.round(options.symmetry);
  const layers = Math.round(options.complexity);
  const attrs = commonAttrs(options);
  const secondary = { ...attrs, stroke: options.secondaryColor, strokeOpacity: options.strokeOpacity * 0.68 };
  const pieces = [];

  for (let layer = 1; layer <= layers; layer += 1) {
    const layerRadius = (radius / (layers + 0.7)) * layer;
    const petalLength = radius / (layers + 2.2);
    const petalWidth = petalLength * (0.24 + layer * 0.025);
    const layerAttrs = layer % 2 === 0 ? secondary : attrs;

    for (let index = 0; index < count; index += 1) {
      pieces.push(ellipse(cx, cy - layerRadius, petalWidth, petalLength, {
        ...layerAttrs,
        fillOpacity: options.fillOpacity * 0.9,
        transform: `rotate(${number((360 / count) * index)} ${number(cx)} ${number(cy)})`,
      }));
    }

    pieces.push(circle(cx, cy, layerRadius, { ...layerAttrs, fill: 'none', strokeOpacity: options.strokeOpacity * 0.26 }));
  }

  return patternGroup(context, options, `${pieces.join('')}${centerEmphasis(context, options, radius * 0.028)}`);
}

function renderStarGrid(context, options) {
  const { cx, cy, maxRadius } = context;
  const radius = maxRadius * (options.scale / 100) * 0.9;
  const count = Math.round(options.symmetry);
  const rings = Math.round(options.complexity);
  const attrs = commonAttrs(options);
  const secondary = {
    ...attrs,
    stroke: options.secondaryColor,
    strokeOpacity: options.strokeOpacity * 0.58,
    fill: 'none',
  };
  const pieces = [];

  for (let ringIndex = 1; ringIndex <= rings; ringIndex += 1) {
    const ringRadius = (radius / rings) * ringIndex;
    const vertices = Array.from({ length: count }, (_, index) => polar(cx, cy, ringRadius, (360 / count) * index));
    const step = Math.max(2, Math.floor(count / 2) - (ringIndex % 3));

    pieces.push(polygon(vertices, ringIndex % 2 === 0 ? secondary : { ...attrs, fill: 'none' }));

    for (let index = 0; index < count; index += 1) {
      pieces.push(line(vertices[index], vertices[(index + step) % count], ringIndex % 2 === 0 ? secondary : attrs));
    }
  }

  return patternGroup(context, options, `${pieces.join('')}${centerEmphasis(context, options, radius * 0.028)}`);
}

function patternGroup(context, options, content) {
  const { cx, cy } = context;
  const filter = options.glowStrength > 0 ? ` filter="url(#${options.glowId})"` : '';
  return `<g opacity="${number(options.opacity ?? 1)}" transform="rotate(${number(options.rotation)} ${number(cx)} ${number(cy)})"${filter}>${content}</g>`;
}

function commonAttrs(options) {
  return {
    stroke: options.strokeColor,
    strokeWidth: options.strokeWidth,
    strokeOpacity: options.strokeOpacity,
    fill: options.fillEnabled ? options.secondaryColor : 'none',
    fillOpacity: options.fillEnabled ? options.fillOpacity : 0,
  };
}

function centerEmphasis(context, options, radius) {
  if (!options.centerEmphasis) return '';
  return circle(context.cx, context.cy, radius, {
    stroke: options.secondaryColor,
    strokeWidth: Math.max(0.75, options.strokeWidth * 0.65),
    strokeOpacity: options.strokeOpacity * 0.9,
    fill: options.strokeColor,
    fillOpacity: Math.min(0.22, options.fillOpacity + 0.06),
  });
}

function hexCenters(rings, spacing, cx, cy) {
  const points = [];
  for (let q = -rings; q <= rings; q += 1) {
    for (let r = -rings; r <= rings; r += 1) {
      const s = -q - r;
      if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= rings) {
        points.push({
          x: cx + spacing * (q + r / 2),
          y: cy + spacing * ((SQRT3 / 2) * r),
        });
      }
    }
  }
  return points;
}

function trianglePoints(cx, cy, radius, startAngle) {
  return [0, 120, 240].map((angle) => polar(cx, cy, radius, startAngle + angle));
}

function polar(cx, cy, radius, degrees) {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return {
    x: cx + Math.cos(radians) * radius,
    y: cy + Math.sin(radians) * radius,
  };
}

function circle(cx, cy, radius, attrs) {
  return `<circle cx="${number(cx)}" cy="${number(cy)}" r="${number(radius)}"${attrsToString(attrs)} />`;
}

function ellipse(cx, cy, rx, ry, attrs) {
  return `<ellipse cx="${number(cx)}" cy="${number(cy)}" rx="${number(rx)}" ry="${number(ry)}"${attrsToString(attrs)} />`;
}

function line(a, b, attrs) {
  return `<line x1="${number(a.x)}" y1="${number(a.y)}" x2="${number(b.x)}" y2="${number(b.y)}"${attrsToString({
    ...attrs,
    fill: 'none',
  })} />`;
}

function polygon(points, attrs) {
  const serialized = points.map((point) => `${number(point.x)},${number(point.y)}`).join(' ');
  return `<polygon points="${serialized}"${attrsToString(attrs)} />`;
}

function attrsToString(attrs) {
  return Object.entries(attrs)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      const attr = key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
      return ` ${attr}="${String(value)}"`;
    })
    .join('');
}

function number(value) {
  return Number(value).toFixed(3).replace(/\.?0+$/, '');
}
