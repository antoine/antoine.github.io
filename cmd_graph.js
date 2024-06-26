// Declare the chart dimensions and margins.
function D3ForceGraph(graphContainerId, ratio, zoomFactor) {
  const width = 1296;
  const height = width / ratio;

  //changes here should also be reflected in the custom.css
  const groupsColors = ["#7018d3", "#6c4f00", "#f98517", "#00603d", "#680000", "#0053b2"];
  const individualFileColor = "#ADD8E6";


  const measureText = (ctx, text) => {
    let metrics = ctx.measureText(text)
    return {
      width: Math.floor(metrics.width),
      height: Math.floor(metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent),
      actualHeight: Math.floor(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent)
    }
  }

  const underline = (ctx, text, x, y) => {
    let metrics = measureText(ctx, text)
    let fontSize = Math.floor(metrics.actualHeight * 1.4) // 140% the height 
    switch (ctx.textAlign) {
      case "center": x -= (metrics.width / 2); break
      case "right": x -= metrics.width; break
    }
    switch (ctx.textBaseline) {
      case "top": y += (fontSize); break
      case "middle": y += (fontSize / 2); break
    }
    ctx.save()
    ctx.beginPath()
    ctx.strokeStyle = ctx.fillStyle
    ctx.lineWidth = Math.ceil(fontSize * 0.08)
    ctx.moveTo(x, y)
    ctx.lineTo(x + metrics.width, y)
    ctx.stroke()
    ctx.restore()
  }

  var canvas = document.createElement("canvas");
  canvas.style.background = "white"; // a valid CSS colour.

  var dpi = window.devicePixelRatio;
  canvas.width = width * dpi;
  canvas.height = height * dpi;
  canvas.style.width = width + "px";
  const context = canvas.getContext("2d");
  context.scale(dpi, dpi);
  const fontsize = 13 * zoomFactor;
  context.font = "bold " + fontsize + "px sans-serif";
  function gWidth() {
    return context.canvas.getBoundingClientRect().width;
  }
  function gHeight() {
    return context.canvas.getBoundingClientRect().height;
  }

  this.getColorForEUIS = function (EUISID) {
    return getColorForEUIS(EUISID);
  };

  function getColorForEUIS(EUISID) {
    if (groupsColors.length > EUISID) {
      return groupsColors[EUISID];
    } else {
      return "black";
    }
  }

  this.reset = function () {
    document.getElementById(graphContainerId).style.cssText = "visibility:hidden";
  };

  this.graphThis = function (data) {
    document.getElementById(graphContainerId).style.cssText = "visibility:visible";
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
      //will collect the coordinates of each group in the same IF so as to draw
      //bounding circle
      var individualFiles = new Map();
      //compute smallest enclosing circle to describe IFs
      for (const d of nodes) {

        var nodeData = n(d);
        if (individualFiles.has(nodeData.file)) {
          individualFiles.get(nodeData.file).push({ x: d.x, y: d.y });
        } else {
          individualFiles.set(nodeData.file, [{ x: d.x, y: d.y }]);
        }
      }

      //draw individual files below all other items by drawing them before
      //using someting context.globalCompositeOperation = "destination-over"; messes up the shadows
      context.shadowOffsetX = 6 * zoomFactor;
      context.shadowOffsetY = 6 * zoomFactor;
      context.shadowBlur = 15 * zoomFactor;
      context.shadowColor = '#5f777f';

      //draw the smallest (compare(a,b)=> b-a) individual files first to ensure they are always visible (we are drawing in reverse Z order)
      Array.from(individualFiles.entries())
        .toSorted((f1, f2) => f2[1].length - f1[1].length)
        .map((f) => f[1])
        .forEach(function (coordsOfGroupsOfFile) {
          var circle = makeCircle(coordsOfGroupsOfFile);
          context.beginPath();
          context.arc(circle.x, circle.y, circle.r + 20 * zoomFactor, 0, 2 * Math.PI);
          context.fillStyle = individualFileColor;
          context.fill();
        });

      context.shadowOffsetX = 2 * zoomFactor;
      context.shadowOffsetY = 2 * zoomFactor;
      context.shadowBlur = 5 * zoomFactor;
      context.shadowColor = 'grey';

      for (const d of links) {
        var linkData = l(d);
        context.beginPath();
        context.lineWidth = 6 * zoomFactor;
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
          context.moveTo(startFrom.x, startFrom.y);
          twoArcs(startFrom, finishAt).forEach(function (samplePoint) {
            context.lineTo(samplePoint[0], samplePoint[1]);
          });
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

            context.moveTo(startFrom.x, startFrom.y);
            twoArcs(startFrom, finishAt).forEach(function (samplePoint) {
              context.lineTo(samplePoint[0], samplePoint[1]);
            });
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

      context.shadowOffsetX = 0;
      context.shadowOffsetY = 0;
      context.shadowColor = 0;
      context.shadowBlur = 0;

      for (const d of nodes) {
        var nodeData = n(d);

        context.beginPath();
        //circle
        var arcOfSize = (size) => { context.arc(d.x, d.y, size * zoomFactor, 0, 2 * Math.PI); }
        var color = getColorForEUIS(nodeData.EUISID);
        if (nodeData.informationLevel == "r") {
          //reference only groups, 'r', are empty (meaning color of IFs)
          arcOfSize(10.5); //10.5 = 12-3/2
          context.lineWidth = 3 * zoomFactor;
          //color them from the individual file color to make them look 'empty'
          context.fillStyle = individualFileColor;
          context.fill();
          context.strokeStyle = color;
          context.stroke();
        } else {
          arcOfSize(12);
          context.fillStyle = color;
          context.fill();
        }

        if (nodeData.informationLevel == "rib") {
          context.beginPath();
          context.arc(d.x, d.y, 16 * zoomFactor, 0, 2 * Math.PI);
          context.lineWidth = 3 * zoomFactor;
          context.strokeStyle = color;
          context.stroke();
        }

        //context.strokeStyle = "white";

        if (nodeData.informationLevel == "r") {
        context.fillStyle = color;
        } else {
        context.fillStyle = "white";
        }
        context.textAlign = "center";
        context.textBaseline = "middle";
        //+1.5 to y to center the text lower on the circles, but that's only on
        //firefox, safari does it centered already.... oh joy, well, using 0 for
        //now
        context.fillText(nodeData.IGID, d.x, d.y + 0 * zoomFactor);
        if (nodeData.matchType == 'linked') {
          underline(context, nodeData.IGID, d.x, d.y + 0 * zoomFactor);
        }

        if (individualFiles.has(nodeData.file)) {
          individualFiles.get(nodeData.file).push({ x: d.x, y: d.y });
        } else {
          individualFiles.set(nodeData.file, [{ x: d.x, y: d.y }]);
        }
      }


      context.restore();
    }
    const forceX = d3.forceX(0).strength(0.015);
    const forceY = d3.forceY(0).strength(0.015);
    const simulation = d3
      .forceSimulation(nodes)
      .force("charge", d3.forceManyBody().strength(-40 * zoomFactor))
      //center is not working yet
      .force(
        "link",
        d3
          .forceLink(links)
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
              return 50 * zoomFactor;
            } else {
              return 90 * zoomFactor;
            }
          })
          .iterations(10),
      )

      /*
      .force(
        "center", //center is not a force, it shift the viewport (well, it shifts all the items positions, same same) to keep it centered on all the nodes
        d3
          .forceCenter(
            0,
            0,
            //context.canvas.getBoundingClientRect.width / 2,
            //context.canvas.getBoundingClientRect.height / 2,
          )
          .strength(1),
      )
      */

      //.force( "collision", d3.forceCollide().radius(function (d) { return d.radius; }),)
      //using height as the radius
      //.force("radial", d3.forceRadial(context.canvas.getBoundingClientRect().height, context.canvas.getBoundingClientRect().width / 2, context.canvas.getBoundingClientRect().height / 2))
      .force("x", forceX)
      .force("y", forceY)
      .on("tick", ticked);

    function dragfind(event, y) {
      //settingt the radius of the find to null implies infinity, making the
      //search always hit a node since a set radius doesn't always work
      //event is using canvas coordinates (top left is 0,0) but the find need to
      //happen using simulation coordinates (center is 0,0) and the real dimension of the canvas
      //as the original one might not have been erspected
      var subject = simulation.find(event.x - gWidth() / 2, event.y - gHeight() / 2, null);
      /*
      var subject = simulation.find(
        event.x - width / 2,
        event.y - height / 2,
        null,
      );
      */
      return subject;
    }

    const drag = d3.drag().subject(dragfind).on("start", dragstarted).on("drag", dragged).on("end", dragended);

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

  // Append the canvas element.
  document.getElementById(graphContainerId).append(canvas);

  //HELPERS section below

  //ARC computation

  //computing arc between 2 points
  function twoArcs(a, b) {
    //we are talking about 2 arcs, position is either 0 or 1
    //0 indicate normal slope, 1 reverse slope direction
    return arcPoints([a.x, a.y], [b.x, b.y], 0.3, 10);
  }

  //taken from https://observablehq.com/@sarah37/arcs-between-two-points
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

  //translate CMDSystem dataset into graph structure
  //pure function
  this.buildGraphData = function (gFiles, gLinks) {
    const graphNodes = [];
    const graphLinks = [];

    var nodeI = 0;
    gFiles.forEach(function (file, ifid) {
      file.groups.forEach(function (group) {
        //we are further categorizing nodes in 2 ways:
        //- amount of data returned for a node :
        //  - ref -> number in empty circle)
        //  - ref+identity -> number in full circle)
        //  - ref+identity+business -> number in full circle + another circle)
        //  - identity (art 20) -> number in gray circle
        //  - EUSID (art 22) -> no number in colored circle, one per EUISID
        //- how this node was matched:
        //  - direct : white number
        //  - linked : underscore number (if possible, otherwise change color might be easier)
        graphNodes.push({
          index: nodeI++,
          IGID: group.IGID,
          EUISID: group.EUISID,
          matchType: group.matchType,
          informationLevel: group.informationLevel,
          file: ifid,
        });
      });
    });

    function getIndexOfIG(IGID, nodes) {
      var indexFound;
      nodes.every(function (node, index) {
        if (node.IGID == IGID) {
          indexFound = index;
          return false;
        } else {
          return true;
        }
      });
      return indexFound;
    }

    //need to differenciate between cases of 1,2 or 3 (the max once prevalence
    //of YL over YL is implemented) links between 2 groups as the arcs to use
    //should differ

    var linksOfARelation = new Map();

    //establishing how many links per relation
    gLinks.forEach(function (link) {
      var relationKey = link.lower + " " + link.higher;
      if (linksOfARelation.has(relationKey)) {
        var linkNumber = linksOfARelation.get(relationKey).totalNbLink;
        linksOfARelation.get(relationKey).totalNbLink = linkNumber + 1;
      } else {
        linksOfARelation.set(relationKey, {
          totalNbLink: 1,
          currentPosition: 0,
        });
      }
    });

    gLinks.forEach(function (link) {
      var relationKey = link.lower + " " + link.higher;
      var relationInfos = linksOfARelation.get(relationKey);
      var currentPosition = linksOfARelation.get(relationKey).currentPosition;
      graphLinks.push({
        source: getIndexOfIG(link.lower, graphNodes),
        target: getIndexOfIG(link.higher, graphNodes),
        colour: link.colour,
        positionInRelation: currentPosition,
        numberOfLinksInRelation: relationInfos.totalNbLink,
      });
      linksOfARelation.get(relationKey).currentPosition = currentPosition + 1;
    });

    return { nodes: graphNodes, links: graphLinks };
  };
}
