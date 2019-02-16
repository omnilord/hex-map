var radius = 20,
    width = window.innerWidth,
    height = window.innerHeight,
    mousing = 0,
    fillClasses = ['route', 'dock', 'obstacle', 'threat', 'player', 'quest'],
    topology = hexTopology(radius, width, height),
    projection = hexProjection(radius),
    path = d3.geo.path().projection(projection),
    svg = d3.select('body').append('svg')
      .attr('viewBox', '40 20 ' + (width - 3 * radius) + ' ' + (height - 3 * radius))
      .attr('width', width)
      .attr('height', height),
    g = svg.append('g'),
    border,
    flight_plan = [], current_cell;

g.attr('class', 'hexagon')
  .selectAll('path')
    .data(topology.objects.hexagons.geometries)
  .enter().append('path')
    .attr('d', function (d) { return path(topojson.feature(topology, d)); })
    .attr('class', function (d) {
      var cls =  d.fill ? 'fill' : null;
      return cls;
    })
    .on('mousedown', function (d) {
      mousing = d.fill ? -1 : +1;
      toggleCell.apply(this, arguments);
      flight_plan.push(this);
    })
    .on('mouseenter', function () {
      if (mousing) {
        toggleCell.apply(this, arguments);
        if (~flight_plan[flight_plan.length - 1] === this) {
          flight_plan.pop();
        } else {
          flight_plan.push(this);
        }
      }
    })
    .on('mouseup', function () {
      mousing = 0;

      console.log(`path takes your ship through ${flight_plan.length} sectors.`);
      console.log(flight_plan);
    });

svg.append('path')
    .datum(topojson.mesh(topology, topology.objects.hexagons))
    .attr('class', 'mesh')
    .attr('d', path);

border = svg.append('path')
    .attr('class', 'border')
    .call(redraw);

svg.selectAll('path').each(function (d) {
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
      dx = 1;
      dy = 3;
      break;
    case 300:
      dx = 0;
      dy = 4;
      break;
    default:
      dx = 0;
      dy = 5;
  }
  g.append('text')
    .attr('text-anchor', 'middle')
    .attr('x', x + dx)
    .attr('y', y + dy)
    .attr('transform', `rotate(${angle} ${x - (dx / 2)} ${y - (dy / 2)})`)
    .text('\uf0fb');
});


function toggleCell(d) {
  if (mousing) {
    var cls = fillClasses[Math.floor(Math.random() * fillClasses.length)];
    d3.select(this).classed(`fill ${cls}`, d.fill = mousing > 0);
    border.call(redraw);
  }
}

function redraw(border) {
  border.attr('d', path(topojson.mesh(topology, topology.objects.hexagons, function (a, b) { return a.fill ^ b.fill; })));
}

function hexTopology(radius, width, height) {
  var dx = (radius * 2 * Math.sin(Math.PI / 3)),
      dy = radius * 1.5,
      m = Math.ceil((height + radius) / dy) - 1,
      n = Math.ceil(width / dx) - 1,
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
        point: function (x, y) { stream.point(x * dx / 2, (y - (2 - (y & 1)) / 3) * dy / 2); },
        lineStart: function () { stream.lineStart(); },
        lineEnd: function () { stream.lineEnd(); },
        polygonStart: function () { stream.polygonStart(); },
        polygonEnd: function () { stream.polygonEnd(); }
      };
    }
  };
}

document.getElementById('reset').onclick = function (ev) {
  d3.selectAll('path.fill').attr('class', null);
  border.call(redraw);
};
