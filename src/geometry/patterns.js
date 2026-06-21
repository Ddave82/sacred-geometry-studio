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
  const size = pulseRadius(maxRadius * 0.115 * (options.scale / 100), options, 0, 8, 1.25);
  const stroke = commonAttrs(options);
  const small = pulseRadius(size * 0.5, options, 1, 9, 1.4);
  const triangleRadius = pulseRadius(size * 1.2, options, 2, 10, 1.1);
  const triangleRotation = motionAngleOffset(options, 0, 9, 1.25);
  const counterRotation = -motionAngleOffset(options, 1, 10, 0.8);
  const coreRadius = pulseRadius(Math.max(2, size * 0.12), options, 3, 11, 1.8);
  const triangle = polygon(
    [
      polar(cx, cy, triangleRadius, -90 + triangleRotation),
      polar(cx, cy, triangleRadius, 30 + triangleRotation),
      polar(cx, cy, triangleRadius, 150 + triangleRotation),
    ],
    stroke,
  );
  const counterTriangle = polygon(
    [
      polar(cx, cy, triangleRadius * 0.72, 90 + counterRotation),
      polar(cx, cy, triangleRadius * 0.72, 210 + counterRotation),
      polar(cx, cy, triangleRadius * 0.72, 330 + counterRotation),
    ],
    {
      ...stroke,
      stroke: options.secondaryColor,
      strokeOpacity: options.strokeOpacity * 0.52,
      fill: 'none',
    },
  );

  return `<g opacity="${number(options.opacity ?? 1)}">
    ${circle(cx, cy, size, stroke)}
    ${circle(cx, cy, small, { ...stroke, stroke: options.secondaryColor, strokeOpacity: 0.72, fill: 'none' })}
    ${triangle}
    ${counterTriangle}
    ${circle(cx, cy, coreRadius, {
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
  const centers = hexCenters(rings, circleRadius, cx, cy).map((point, index) => {
    const layer = Math.round(Math.hypot(point.x - cx, point.y - cy) / Math.max(1, circleRadius));
    return warpPoint(context, options, point, index, layer);
  });
  const attrs = commonAttrs(options);
  const cells = centers
    .map((point, index) => circle(point.x, point.y, pulseRadius(circleRadius, options, index, index % Math.max(1, rings), 0.8), attrs))
    .join('');

  return patternGroup(context, options, `${cells}${centerEmphasis(context, options, circleRadius * 0.28)}`);
}

function renderSeedOfLife(context, options) {
  const { cx, cy, maxRadius } = context;
  const radius = pulseRadius(maxRadius * (options.scale / 100) * 0.42, options, 0, 0, 0.7);
  const orbitRadius = motionRadius(radius, options, 0, 1, 0.7);
  const attrs = commonAttrs(options);
  const circles = [circle(cx, cy, radius, attrs)];

  for (let index = 0; index < 6; index += 1) {
    const point = motionPolar(context, options, orbitRadius, index * 60, index, 1);
    circles.push(circle(point.x, point.y, pulseRadius(radius, options, index, 1, 0.65), attrs));
  }

  if (options.complexity > 2) {
    const ringAttrs = { ...attrs, stroke: options.secondaryColor, strokeOpacity: options.strokeOpacity * 0.58, fill: 'none' };
    circles.push(polygon(Array.from({ length: 6 }, (_, index) => motionPolar(context, options, orbitRadius, index * 60, index, 2)), ringAttrs));
    circles.push(circle(cx, cy, pulseRadius(radius * 2, options, 0, 2, 0.5), ringAttrs));
  }

  if (options.complexity > 4) {
    for (let index = 0; index < 12; index += 1) {
      const point = motionPolar(context, options, radius * 1.48, index * 30, index, 3);
      circles.push(circle(point.x, point.y, pulseRadius(radius * 0.48, options, index, 3, 0.9), { ...attrs, strokeOpacity: options.strokeOpacity * 0.45 }));
    }
  }

  return patternGroup(context, options, `${circles.join('')}${centerEmphasis(context, options, radius * 0.09)}`);
}

function renderMetatronsCube(context, options) {
  const { cx, cy, maxRadius } = context;
  const complexity = Math.max(1, Math.min(7, Math.round(options.complexity)));
  const designRadius = maxRadius * (options.scale / 100);
  const circleRadius = pulseRadius(designRadius * 0.18, options, 0, 0, 0.45);
  const inner = motionRadius(designRadius * 0.23, options, 0, 1, 0.9);
  const outer = motionRadius(designRadius * 0.46, options, 1, 2, 0.75);
  const middle = motionRadius(designRadius * 0.36, options, 2, 3, 0.7);
  const halo = motionRadius(designRadius * 0.68, options, 3, 4, 0.55);
  const centerPoint = { id: 'center', x: cx, y: cy, radius: circleRadius };
  const innerPoints = Array.from({ length: 6 }, (_, index) => ({
    ...motionPolar(context, options, inner, index * 60, index, 1),
    id: `inner-${index}`,
    radius: pulseRadius(circleRadius, options, index, 1, 0.45),
  }));
  const outerPoints =
    complexity >= 3
      ? Array.from({ length: 6 }, (_, index) => ({
          ...motionPolar(context, options, outer, index * 60 + 30, index, 2),
          id: `outer-${index}`,
          radius: pulseRadius(circleRadius, options, index, 2, 0.55),
        }))
      : [];
  const middlePoints =
    complexity >= 5
      ? Array.from({ length: 6 }, (_, index) => ({
          ...motionPolar(context, options, middle, index * 60, index, 3),
          id: `middle-${index}`,
          radius: pulseRadius(circleRadius * 0.42, options, index, 3, 0.85),
        }))
      : [];
  const haloPoints =
    complexity >= 6
      ? Array.from({ length: 12 }, (_, index) => ({
          ...motionPolar(context, options, halo, index * 30 + 15, index, 4),
          id: `halo-${index}`,
          radius: pulseRadius(circleRadius * 0.32, options, index, 4, 1),
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
  const radius = pulseRadius(maxRadius * (options.scale / 100) * 0.43, options, 0, 0, 0.75);
  const offset = motionRadius(radius * 0.58, options, 0, 1, 1);
  const repetitions = Math.max(1, Math.min(12, Math.round(options.complexity + 1)));
  const attrs = commonAttrs(options);
  const pieces = [];

  for (let index = 0; index < repetitions; index += 1) {
    const angle = (360 / repetitions) * index + motionAngleOffset(options, index, 1, 0.55);
    const left = motionPolar(context, options, offset, angle - 90, index, 1);
    const right = motionPolar(context, options, offset, angle + 90, index, 2);
    pieces.push(circle(left.x, left.y, pulseRadius(radius, options, index, 1, 0.65), attrs));
    pieces.push(circle(right.x, right.y, pulseRadius(radius, options, index, 2, 0.65), { ...attrs, stroke: options.secondaryColor, strokeOpacity: options.strokeOpacity * 0.72 }));
  }

  pieces.push(circle(cx, cy, pulseRadius(radius * 1.15, options, 0, 3, 0.5), { ...attrs, fill: 'none', strokeOpacity: options.strokeOpacity * 0.38 }));

  return patternGroup(context, options, `${pieces.join('')}${centerEmphasis(context, options, radius * 0.1)}`);
}

function renderSriYantra(context, options) {
  const { cx, cy, maxRadius } = context;
  const radius = pulseRadius(maxRadius * (options.scale / 100) * 0.88, options, 0, 0, 0.35);
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

  up.slice(0, Math.min(up.length, Math.max(2, options.complexity))).forEach(([scale, offset], index) => {
    const layerRadius = pulseRadius(radius * scale, options, index, 1, 0.65);
    const layerOffset = offset + motionWave(options, index, 1) * 0.018 * motionStrength(options);
    triangles.push(polygon(trianglePoints(cx, cy + radius * layerOffset, layerRadius, -90 + motionAngleOffset(options, index, 1, 0.45)), attrs));
  });
  down.slice(0, Math.min(down.length, Math.max(2, options.complexity + 1))).forEach(([scale, offset], index) => {
    const layerRadius = pulseRadius(radius * scale, options, index, 2, 0.65);
    const layerOffset = offset - motionWave(options, index, 2) * 0.018 * motionStrength(options);
    triangles.push(polygon(trianglePoints(cx, cy + radius * layerOffset, layerRadius, 90 - motionAngleOffset(options, index, 2, 0.45)), secondary));
  });

  const rings = [
    circle(cx, cy, pulseRadius(radius * 0.86, options, 0, 3, 0.45), { ...secondary, fill: 'none', strokeOpacity: options.strokeOpacity * 0.42 }),
    circle(cx, cy, pulseRadius(radius * 0.64, options, 1, 3, 0.5), { ...attrs, fill: 'none', strokeOpacity: options.strokeOpacity * 0.38 }),
  ];

  if (options.complexity > 3) {
    const petals = [];
    const count = Math.max(5, Math.round(options.symmetry));
    for (let index = 0; index < count; index += 1) {
      const petalLength = pulseRadius(radius * 0.18, options, index, 4, 1.1);
      petals.push(ellipse(cx, cy - motionRadius(radius * 0.72, options, index, 4, 0.55), radius * 0.075, petalLength, {
        ...secondary,
        fillOpacity: options.fillOpacity * 0.75,
        transform: `rotate(${number((360 / count) * index + motionAngleOffset(options, index, 4, 0.6))} ${number(cx)} ${number(cy)})`,
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
  const radius = pulseRadius(maxRadius * (options.scale / 100) * 0.9, options, 0, 0, 0.35);
  const count = Math.round(options.symmetry);
  const layers = Math.round(options.complexity);
  const attrs = commonAttrs(options);
  const secondary = { ...attrs, stroke: options.secondaryColor, strokeOpacity: options.strokeOpacity * 0.68 };
  const pieces = [];

  for (let layer = 1; layer <= layers; layer += 1) {
    const layerRadius = motionRadius((radius / (layers + 0.7)) * layer, options, layer, layer, 0.9);
    const petalLength = pulseRadius(radius / (layers + 2.2), options, layer, layer, 1);
    const petalWidth = pulseRadius(petalLength * (0.24 + layer * 0.025), options, layer, layer + 1, 0.7);
    const layerAttrs = layer % 2 === 0 ? secondary : attrs;

    for (let index = 0; index < count; index += 1) {
      const petalRadius = motionRadius(layerRadius, options, index, layer, 0.6);
      pieces.push(ellipse(cx, cy - petalRadius, petalWidth, petalLength, {
        ...layerAttrs,
        fillOpacity: options.fillOpacity * 0.9,
        transform: `rotate(${number((360 / count) * index + motionAngleOffset(options, index, layer, 0.7))} ${number(cx)} ${number(cy)})`,
      }));
    }

    pieces.push(circle(cx, cy, layerRadius, { ...layerAttrs, fill: 'none', strokeOpacity: options.strokeOpacity * 0.26 }));
  }

  return patternGroup(context, options, `${pieces.join('')}${centerEmphasis(context, options, radius * 0.028)}`);
}

function renderStarGrid(context, options) {
  const { cx, cy, maxRadius } = context;
  const radius = pulseRadius(maxRadius * (options.scale / 100) * 0.9, options, 0, 0, 0.45);
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
    const ringRadius = motionRadius((radius / rings) * ringIndex, options, ringIndex, ringIndex, 0.95);
    const vertices = Array.from({ length: count }, (_, index) =>
      motionPolar(context, options, ringRadius, (360 / count) * index, index, ringIndex),
    );
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

function motionPolar(context, options, radius, degrees, index = 0, layer = 0) {
  const animatedRadius = motionRadius(radius, options, index, layer, 0.75);
  const animatedAngle = degrees + motionAngleOffset(options, index, layer, 0.55);
  return polar(context.cx, context.cy, animatedRadius, animatedAngle);
}

function warpPoint(context, options, point, index = 0, layer = 0) {
  const motion = getMotion(options);
  if (!motion) return point;

  const dx = point.x - context.cx;
  const dy = point.y - context.cy;
  const distance = Math.hypot(dx, dy);
  if (distance <= 0.001) return point;

  const normalized = distance / Math.max(1, context.maxRadius);
  const angle = Math.atan2(dy, dx);
  const wave = motionWave(options, index, layer, normalized * 2.1);
  const radial = distance * (1 + motion.nodeWave * wave);
  const twist = ((motion.twistDegrees * normalized * Math.sin(motion.phase + layer * 0.42)) / 180) * Math.PI;
  const nextAngle = angle + twist;

  return {
    x: context.cx + Math.cos(nextAngle) * radial,
    y: context.cy + Math.sin(nextAngle) * radial,
  };
}

function pulseRadius(radius, options, index = 0, layer = 0, amount = 1) {
  const motion = getMotion(options);
  if (!motion) return radius;
  const factor = 1 + motion.radiusWave * amount * motionWave(options, index, layer);
  return Math.max(0.001, radius * factor);
}

function motionRadius(radius, options, index = 0, layer = 0, amount = 1) {
  const motion = getMotion(options);
  if (!motion) return radius;
  const factor = 1 + motion.radialWave * amount * motionWave(options, index, layer, 0.6);
  return Math.max(0.001, radius * factor);
}

function motionAngleOffset(options, index = 0, layer = 0, amount = 1) {
  const motion = getMotion(options);
  if (!motion) return 0;
  return motion.angleWave * amount * Math.sin(motion.phase + index * 0.37 + layer * 0.81);
}

function motionWave(options, index = 0, layer = 0, offset = 0) {
  const motion = getMotion(options);
  if (!motion) return 0;
  return Math.sin(motion.phase + offset + index * 0.73 + layer * 1.11);
}

function motionStrength(options) {
  return getMotion(options)?.strength ?? 0;
}

function getMotion(options) {
  return options.motion?.strength ? options.motion : null;
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
