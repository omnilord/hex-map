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
    g_hex = svg.append('g').attr('class', 'hexagon'),
    g_text = svg.append('g').attr('class', 'sprites'),
    border, last_cell, current_cell,
    flight_plan = [];

g_hex
  .selectAll('path').data(topology.objects.hexagons.geometries)
  .enter().append('path')
    .attr('d', (d) => path(topojson.feature(topology, d)))
    .attr('class', (d) =>  d.fill ? 'highlight' : null)
    .on('click', function (d) {
      console.log(d.x, d.y, d.q);
    })
    .on('mousedown', function (d) {
      if (!captureClick(d, 2)) { return; }
      reset();
      mousing = d.fill ? -1 : +1;
      toggleCell.apply(this, arguments);
      flight_plan.push(this);
    })
    .on('mouseenter', function (d) {
      if (!captureClick(d, 2)) { return; }
      highlight_sprite(d3.select(d.sprite_id), true);
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
      highlight_sprite(d3.select(d.sprite_id), false);
    })
    .on('mouseup', function (d) {
      if (!captureClick(d, 2)) { return; }
      mousing = 0;

      //console.log(`path takes your ship through ${flight_plan.length} sectors.`);
      //console.log(flight_plan);
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

function sprite_rotation_offset(box, angle) {
  var x = (box.width / 2) + (box.x),
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

  return { angle: angle, x: x, y: y, dx: dx, dy: dy };
}

function draw_sprite(text, d, angle) {
  if (!d || !d.is_hex || d.y == 0) {
    return;
  }
  var box = this.getBBox(),
      //angle = 60 * Math.floor(Math.random() * 6),
      offset = sprite_rotation_offset(box, angle),
      rx = offset.x - (offset.dx / 2),
      ry = offset.y - (offset.dy / 2),
      id = `ship-x${d.x}-y${d.y}`;

  d.sprite_id = `#${id}`;
  d.coords = [offset.x, offset.y];
  d.sprite =  g_text.append('text')
    .classed('ship', true)
    .attr('id', id)
    .attr('text-anchor', 'middle')
    .attr('x', offset.x + offset.dx)
    .attr('y', offset.y + offset.dy)
    .attr('transform', `rotate(${angle} ${rx} ${ry})`)
    .text(text); // '\uf0fb'
  return d.sprite;
}

function highlight_sprite(sprite, toggle) {
  if (sprite) {
    sprite.classed('highlight', toggle);
  }
}

function remove_sprite(sprite) {
  if (sprite) {
    d3.select(sprite).remove();
  }
}

function captureClick(d, btnN) {
  return !d || !d.is_hex || d.y == 0 || d3.event.button != btnN;
}

function toggleCell(d) {
  if (mousing) {
    var cls = fillClasses[Math.floor(Math.random() * fillClasses.length)],
        angle = 0, dx, dy, offset, rx, ry, sprite;

    d3.select(this).classed(`highlight ${cls}`, d.fill = mousing > 0);
    border.call(redraw);

    if (last_cell) {
      // Transform based on last cell->new cell vector
      dx = last_cell.d.x - d.x + (d.y % 2);
      dy = last_cell.d.y - d.y;
      if (dx <= 0 && dy == 0) { // should be in else later
        angle = 0;
      } else if (dx > 0 && dy == 0) {
        angle = 180;
      } else if (dx > 0 && dy < 0) {
        angle = 120;
      } else if (dx <= 0 && dy < 0) {
        angle = 60;
      } else if (dx > 0 && dy > 0) {
        angle = 240;
      } else if (dx <= 0 && dy > 0) {
        angle = 300;
      }
      remove_sprite(last_cell.d.sprite_id);
      draw_sprite.call(last_cell.cell, '\uf0fb', last_cell.d, angle);
    }

    if (d.sprite) {
      remove_sprite(d.sprite_id);
    }

    sprite = draw_sprite.call(this, '\uf0fb', d, angle);
    highlight_sprite(sprite, true);
    last_cell = { d: d, cell: this };
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
        q: q,
        sprite: null,
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
  last_cell = null;
  d3.selectAll('path.highlight').attr('class', null).each((d) => { d.fill = false; remove_sprite(d.sprite_id); });
  border.call(redraw);
};
