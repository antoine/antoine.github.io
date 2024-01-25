// Declare the chart dimensions and margins.
const width = 1296;
const height = width / 2;
const marginTop = 20;
const marginRight = 20;
const marginBottom = 30;
const marginLeft = 40;

// Declare the x (horizontal position) scale.
const x = d3
  .scaleUtc()
  .domain([new Date("2023-01-01"), new Date("2024-01-01")])
  .range([marginLeft, width - marginRight]);

// Declare the y (vertical position) scale.
const y = d3
  .scaleLinear()
  .domain([0, 100])
  .range([height - marginBottom, marginTop]);

var canvas = document.createElement("canvas");
canvas.style.background = "#bbb"; // a valid CSS colour.

var dpi = window.devicePixelRatio;
canvas.width = width * dpi;
canvas.height = height * dpi;
canvas.style.width = width + "px";
const context = canvas.getContext("2d");
context.scale(dpi, dpi);
context.font = "bold 13px sans-serif";

function graphThis(data) {
  const links = data.links.map((d) => Object.create(d));
  const nodes = data.nodes.map((d) => Object.create(d));

  function l(d3link) {
    return data.links[d3link.index];
  }
  function n(d3node) {
    return data.nodes[d3node.index];
  }
  //this is fugly, everything is global variable in d3 world.
  function ticked() {
    context.clearRect(0, 0, width, height);
    context.save();
    context.translate(width / 2, height / 2);

    for (const d of links) {
      context.beginPath();
      context.lineWidth = 6;
      context.moveTo(d.source.x, d.source.y);
      //TODO use arcs to show multiple links
      context.lineTo(d.target.x, d.target.y);

      var linkData = l(d);
      if (linkData.colour == "YL") {
        context.strokeStyle = "yellow";
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

    var individualFiles = new Map();

    for (const d of nodes) {
      var nodeData = n(d);

      context.lineWidth = 1;
      context.beginPath();
      //context.moveTo(d.x + 3, d.y);
      context.arc(d.x, d.y, 12, 0, 2 * Math.PI);
      //TODO manage per-system colour
      context.fillStyle = "#000";
      context.fill();
      context.strokeStyle = "#000";
      context.stroke();

      //context.strokeStyle = "white";

      context.fillStyle = "white";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(nodeData.index, d.x, d.y);

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
      //context.moveTo(d.x + 3, d.y);
      context.arc(circle.x, circle.y, circle.r + 20, 0, 2 * Math.PI);
      //TODO manage per-system colour
      context.strokeStyle = "#3ca1c3";
      context.stroke();
      context.fillStyle = "#ADD8E6";
      context.fill();
    });

    context.restore();
  }
  const simulation = d3
    .forceSimulation(nodes)
    .force("charge", d3.forceManyBody().strength(-30))
    //center is not working yet
    // .force("center", d3.forceCenter(width / 4, height / 4).strength(0.05))
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
}

// Append the SVG element.
//container.append(svg.node());
//document.getElementById("container").append(svg.node());
document.getElementById("graph-container").append(canvas);
