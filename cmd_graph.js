// Declare the chart dimensions and margins.
function D3ForceGraph() {
  const width = 1296;
  const height = width / 3;

  const groupsColors = ["#7018d3", "#6c4f00", "#f98517", "#00603d", "#680000", "#002f64"];

  var canvas = document.createElement("canvas");
  canvas.style.background = "#eee"; // a valid CSS colour.

  var dpi = window.devicePixelRatio;
  canvas.width = width * dpi;
  canvas.height = height * dpi;
  canvas.style.width = width + "px";
  const context = canvas.getContext("2d");
  context.scale(dpi, dpi);
  context.font = "bold 13px sans-serif";

  function getColorForEUIS(EUISID) {
    if (groupsColors.length > EUISID) {
      return groupsColors[EUISID];
    } else {
      return "black";
    }
  }

  this.graphThis = function (data) {
    const links = data.links.map((d) => Object.create(d));
    const nodes = data.nodes.map((d) => Object.create(d));

    function l(d3link) {
      return data.links[d3link.index];
    }
    function n(d3node) {
      return data.nodes[d3node.index];
    }
    //data is a global variable in d3 world...
    function ticked() {
      context.clearRect(0, 0, width, height);
      context.save();
      context.translate(width / 2, height / 2);

      for (const d of links) {
        var linkData = l(d);
        context.beginPath();
        context.lineWidth = 6;
        if (linkData.numberOfLinksInRelation == 1) {
          //1 link, straigth
          context.moveTo(d.source.x, d.source.y);
          context.lineTo(d.target.x, d.target.y);
        } else if (linkData.numberOfLinksInRelation == 2) {
          //2 links, let's arc from source to target and then from target to source
          //to differenciate
          var startFrom = d.source;
          var finishAt = d.target;
          if (linkData.positionInRelation > 0) {
            startFrom = d.target;
            finishAt = d.source;
          }
          var startAt = [startFrom.x, startFrom.y];
          twoArcs(startFrom, finishAt).forEach(function (samplePoint) {
            context.moveTo(startAt[0], startAt[1]);
            context.lineTo(samplePoint[0], samplePoint[1]);
            startAt = samplePoint;
          });
          context.moveTo(startAt[0], startAt[1]);
          context.lineTo(finishAt.x, finishAt.y);
        } else {
          //3 links, shouldn't be more but all links above the third will overlap
          //anyhow
          if (linkData.positionInRelation == 0) {
            context.moveTo(d.source.x, d.source.y);
            context.lineTo(d.target.x, d.target.y);
          } else {
            var startFrom = d.source;
            var finishAt = d.target;
            if (linkData.positionInRelation > 1) {
              startFrom = d.target;
              finishAt = d.source;
            }

            var startAt = [startFrom.x, startFrom.y];
            twoArcs(startFrom, finishAt).forEach(function (samplePoint) {
              context.moveTo(startAt[0], startAt[1]);
              context.lineTo(samplePoint[0], samplePoint[1]);
              startAt = samplePoint;
            });
            context.moveTo(startAt[0], startAt[1]);
            context.lineTo(finishAt.x, finishAt.y);
          }
        }

        if (linkData.colour == "YL") {
          //more contrasty yellow
          context.strokeStyle = "#fefe33";
        } else if (linkData.colour == "WL") {
          context.strokeStyle = "white";
        } else if (linkData.colour == "GL") {
          context.strokeStyle = "green";
        } else if (linkData.colour == "MRL" || linkData.colour == "NMRL") {
          context.strokeStyle = "red";
        } else {
          context.strokeStyle = "#aaa";
        }
        context.stroke();
      }

      //will collect the coordinates of each group in the same IF so as to draw
      //bounding circle
      var individualFiles = new Map();

      for (const d of nodes) {
        var nodeData = n(d);

        context.lineWidth = 1;
        context.beginPath();
        //context.moveTo(d.x + 3, d.y);
        context.arc(d.x, d.y, 12, 0, 2 * Math.PI);
        var color = getColorForEUIS(nodeData.EUISID);
        context.fillStyle = color;
        context.fill();
        context.strokeStyle = color;
        context.stroke();

        //context.strokeStyle = "white";

        context.fillStyle = "white";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(nodeData.IGID, d.x, d.y);

        if (individualFiles.has(nodeData.file)) {
          individualFiles.get(nodeData.file).push({ x: d.x, y: d.y });
        } else {
          individualFiles.set(nodeData.file, [{ x: d.x, y: d.y }]);
        }
      }

      //compute smallest enclosing circle to describe IFs

      context.globalCompositeOperation = "destination-over";
      individualFiles.forEach(function (coordsOfGroupsOfFile) {
        var circle = makeCircle(coordsOfGroupsOfFile);
        context.lineWidth = 1;
        context.beginPath();
        context.arc(circle.x, circle.y, circle.r + 20, 0, 2 * Math.PI);
        //context.strokeStyle = "#3ca1c3";
        //context.stroke();
        context.fillStyle = "#ADD8E6";
        context.fill();
      });

      context.restore();
    }
    const simulation = d3
      .forceSimulation(nodes)
      .force("charge", d3.forceManyBody().strength(-90))
      //center is not working yet
      .force(
        "link",
        d3
          .forceLink(links)
          //.strength(1)
          .strength(function (link) {
            if (l(link).colour != "YL") {
              return 1;
            } else {
              return 0.1;
            }
          })
          .distance(function (link) {
            //using the link.index we can go back to the data and check the type of
            //link to see the distance to set
            //return 20 is the default
            var linkData = l(link);
            if (linkData.colour == "WL" || linkData.colour == "MRL") {
              return 50;
            } else {
              return 90;
            }
          })
          .iterations(10),
      )
      // .force("center", d3.forceCenter(0, 0).strength(1))
      //    .force( "collision", d3.forceCollide().radius(function (d) { return d.radius; }),)
      .on("tick", ticked);

    const drag = d3
      .drag()
      .subject(({ x, y }) => simulation.find(x - width / 2, y - height / 2, 40))
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);

    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    d3.select(context.canvas).call(drag).node();
  };

  // Append the SVG element.
  //container.append(svg.node());
  //document.getElementById("container").append(svg.node());
  document.getElementById("graph-container").append(canvas);

  //computing arc between 2 points
  function twoArcs(a, b) {
    //we are talking about 2 arcs, position is either 0 or 1
    //0 indicate normal slope, 1 reverse slope direction
    return arcPoints([a.x, a.y], [b.x, b.y], 0.3, 5);
  }
  function arcPoints(a, b, r_frac, n) {
    // a: origin point
    // b: destination point
    // r_frac: arc radius as a fraction of half the distance between a and b
    // -- 1 results in a semicircle arc, the arc flattens out the closer to 0 the number is set, 0 is invalid
    // n: number of points to sample from arc
    let c = getCenter(a, b, r_frac);
    let r = dist(c, a);

    let aAngle = Math.atan2(a[1] - c[1], a[0] - c[0]),
      bAngle = Math.atan2(b[1] - c[1], b[0] - c[0]);
    //console.log(aAngle, bAngle);

    if (aAngle > bAngle) {
      bAngle += 2 * Math.PI;
    }

    let sampledPoints = d3.range(aAngle, bAngle, (bAngle - aAngle) / n).map((d) => [Math.cos(d) * r + c[0], Math.sin(d) * r + c[1]]);
    //console.log(sampledPoints, b);
    return sampledPoints;
  }

  function midpoint(a, b) {
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  }

  function dist(a, b) {
    return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
  }

  function getP3(a, b, frac) {
    let mid = midpoint(a, b);
    let m = inverseSlope(a, b);
    // check if B is below A
    let bLower = b[1] < a[1] ? -1 : 1;
    //let bLower = 1;

    // distance from midpoint along slope: between 0 and half the distance between the two points
    let d = 0.5 * dist(a, b) * frac;

    let x = d / Math.sqrt(1 + Math.pow(m, 2));
    let y = m * x;
    return [bLower * x + mid[0], bLower * y + mid[1]];
    // return [mid[0] + d, mid[1] - (d * (b[0] - a[0])) / (b[1] - a[1])];
  }

  function slope(a, b) {
    // returns the slope of the line from point A to B
    return (b[1] - a[1]) / (b[0] - a[0]);
  }

  function inverseSlope(a, b) {
    // returns the inverse of the slope of the line from point A to B
    // which is the slope of the perpendicular bisector
    return -1 * (1 / slope(a, b));
  }

  function yIntercept(a, b) {
    // returns the y intercept of the perpendicular bisector of the line from point A to B
    let m = inverseSlope(a, b);
    let p = midpoint(a, b);
    let x = p[0];
    let y = p[1];
    return y - m * x;
  }

  function getCenter(a, b, frac) {
    let c = getP3(a, b, frac);
    let b1 = yIntercept(a, b);
    let b2 = yIntercept(a, c);
    let m1 = inverseSlope(a, b);
    let m2 = inverseSlope(a, c);

    // find the intersection of the two perpendicular bisectors
    // i.e. solve m1 * x + b2 = m2 * x + b2 for x
    let x = (b2 - b1) / (m1 - m2);
    // sub x back into one of the linear equations to get y
    let y = m1 * x + b1;

    return [x, y];
  }
}
