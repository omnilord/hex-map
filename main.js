var radius = 20,
    width = window.innerWidth,
    height = window.innerHeight,
    mousing = 0,
    fillClasses = ['route', 'dock', 'obstacle', 'threat', 'player', 'quest'],
    topology = hexTopology(radius, width - radius, height - radius),
    projection = hexProjection(radius),
    path = d3.geo.path().projection(projection),
    svg = d3.select('body').append('svg')
      .attr('viewBox', `-20 -15 ${width} ${height}`)
      .attr('width', width)
      .attr('height', height),
    g = svg.append('g'),
    border,
    flight_plan = [];

g.attr('class', 'hexagon')
  .selectAll('path').data(topology.objects.hexagons.geometries)
  .enter().append('path')
    .attr('d', (d) => path(topojson.feature(topology, d)))
    .attr('class', (d) =>  d.fill ? 'highlight' : null)
    .on('mousedown', function (d) {
      if (!captureClick(d, 2)) { return; }
      reset();
      mousing = d.fill ? -1 : +1;
      toggleCell.apply(this, arguments);
      flight_plan.push(this);
    })
    .on('mouseenter', function (d) {
      if (!captureClick(d, 2)) { return; }
      d.glyph.classed('highlight', true);
      if (mousing) {
        toggleCell.apply(this, arguments);
        if (flight_plan[flight_plan.length - 2] === this) {
          flight_plan.pop();
        } else {
          flight_plan.push(this);
        }
      }
    })
    .on('mouseout', function (d) {
      if (!captureClick(d, 2)) { return; }
      d.glyph.classed('highlight', false);
    })
    .on('mouseup', function (d) {
      if (!captureClick(d, 2)) { return; }
      mousing = 0;

      console.log(`path takes your ship through ${flight_plan.length} sectors.`);
      console.log(flight_plan);
    })
    .on("contextmenu", function (d, i) {
      d3.event.preventDefault();
      // TODO: Add Custom Context Menu for interacting with hex cell
    });

svg.append('path')
    .datum(topojson.mesh(topology, topology.objects.hexagons))
    .attr('class', 'mesh')
    .attr('d', path);

border = svg.append('path')
    .attr('class', 'border')
    .call(redraw);

svg.selectAll('path').each(function (d) {
  if (!d || !d.is_hex || d.y == 0) {
    return
  }
  var box = this.getBBox(),
      angle = 60 * Math.floor(Math.random() * 6),
      x = (box.width / 2) + (box.x),
      y = (box.height / 2) + (box.y),
      dx, dy;

  switch (angle) {
    case 60:
      dx = 2;
      dy = 3;
      break;
    case 120:
      dx = 1;
      dy = 3;
      break;
    case 180:
      dx = 0;
      dy = 2.5;
      break;
    case 240:
      dx = -0.5;
      dy = 2.75;
      break;
    case 300:
      dx = -1;
      dy = 3.5;
      break;
    default:
      dx = 0;
      dy = 5;
  }
  d.glyph = g.append('text')
    .attr('text-anchor', 'middle')
    .attr('x', x + dx)
    .attr('y', y + dy)
    .attr('transform', `rotate(${angle} ${x - (dx / 2)} ${y - (dy / 2)})`)
    .text('\uf0fb');
});

function captureClick(d, btnN) {
  return !d || !d.is_hex || d.y == 0 || d3.event.button != btnN;
}

function toggleCell(d) {
  if (mousing) {
    var cls = fillClasses[Math.floor(Math.random() * fillClasses.length)];
    d3.select(this).classed(`highlight ${cls}`, d.fill = mousing > 0);
    border.call(redraw);
  }
}

function redraw(border) {
  border.attr('d', path(topojson.mesh(topology, topology.objects.hexagons, (a, b) => a.fill ^ b.fill)));
}

function hexTopology(radius, width, height) {
  var dx = (radius * 2 * Math.sin(Math.PI / 3)),
      dy = radius * 1.5,
      m = Math.ceil(1.4 * (height + radius) / dy) - 2,
      n = Math.ceil(1.4 * width / dx) - 3,
      geometries = [],
      arcs = [],
      i, j, q, x, y;

  for (j = -1; j <= m; ++j) {
    for (i = -1; i <= n; ++i) {
      y = j * 2,
      x = (i + (j & 1) / 2) * 2;
      arcs.push(
        [ [x, y - 1], [1, 1] ],
        [ [x + 1, y], [0, 1] ],
        [ [x + 1, y + 1], [-1, 1] ]
      );
    }
  }

  for (j = 0, q = 3; j < m; ++j, q += 6) {
    for (i = 0; i < n; ++i, q += 3) {
      geometries.push({
        is_hex: true,
        type: 'Polygon',
        arcs: [
          [
            q,
            q + 1,
            q + 2,
            ~(q + (n + 2 - (j & 1)) * 3),
            ~(q - 2),
            ~(q - (n + 2 + (j & 1)) * 3 + 2)
          ]
        ],
        x: i,
        y: j,
        glyph: null,
        fill: false // Math.random() > i / n * 2,
      });
    }
  }

  return {
    transform: { translate: [0, 0], scale: [1, 1] },
    objects: { hexagons: { type: 'GeometryCollection', geometries: geometries } },
    arcs: arcs
  };
}

function hexProjection(radius) {
  var dx = radius * 2 * Math.sin(Math.PI / 3),
      dy = radius * 1.5;
  return {
    stream: function (stream) {
      return {
        point: (x, y) => { stream.point(x * dx / 3, (y - (2 - (y & 1)) / 3) * dy / 3); },
        lineStart: () => { stream.lineStart(); },
        lineEnd: () => { stream.lineEnd(); },
        polygonStart: () => { stream.polygonStart(); },
        polygonEnd: () => { stream.polygonEnd(); }
      };
    }
  };
}

function reset(ev) {
  d3.selectAll('path.highlight').attr('class', null).each((d) => d.fill = false);
  border.call(redraw);
};
