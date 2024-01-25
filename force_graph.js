// Declare the chart dimensions and margins.
const width = 800;
const height = width;
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

// Create the SVG container.
//const svg = d3.create("svg").attr("width", width).attr("height", height);
/*
// Add the x-axis.
svg
  .append("g")
  .attr("transform", `translate(0,${height - marginBottom})`)
  .call(d3.axisBottom(x));

// Add the y-axis.
svg
  .append("g")
  .attr("transform", `translate(${marginLeft},0)`)
  .call(d3.axisLeft(y));
  */

function buildData() {
  const n = 20;
  const nodes = Array.from({ length: n * n }, (_, i) => ({ index: i }));
  const links = [];
  for (let y = 0; y < n; ++y) {
    for (let x = 0; x < n; ++x) {
      if (y > 0) links.push({ source: (y - 1) * n + x, target: y * n + x });
      if (x > 0) links.push({ source: y * n + (x - 1), target: y * n + x });
    }
  }
  return { nodes, links };
}
var data = buildData();
//const height = width;
const links = data.links.map((d) => Object.create(d));
const nodes = data.nodes.map((d) => Object.create(d));

var canvas = document.createElement("canvas");
var dpi = window.devicePixelRatio;
canvas.width = width * dpi;
canvas.height = height * dpi;
canvas.style.width = width + "px";
const context = canvas.getContext("2d");
context.scale(dpi, dpi);

function ticked() {
  context.clearRect(0, 0, width, height);
  context.save();
  context.translate(width / 2, height / 2);
  context.beginPath();
  for (const d of links) {
    context.moveTo(d.source.x, d.source.y);
    context.lineTo(d.target.x, d.target.y);
  }
  context.strokeStyle = "#aaa";
  context.stroke();
  context.beginPath();
  for (const d of nodes) {
    context.moveTo(d.x + 3, d.y);
    context.arc(d.x, d.y, 3, 0, 2 * Math.PI);
  }
  context.fill();
  context.strokeStyle = "#fff";
  context.stroke();
  context.restore();
}

const simulation = d3
  .forceSimulation(nodes)
  .force("charge", d3.forceManyBody().strength(-30))
  .force("link", d3.forceLink(links).strength(1).distance(20).iterations(10))
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
// Append the SVG element.
//container.append(svg.node());
//document.getElementById("container").append(svg.node());
document.getElementById("container").append(canvas);
