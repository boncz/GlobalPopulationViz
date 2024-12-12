// Load the data
d3.csv("WorldPopulationGrowth.csv").then(function(data) {
  // Parse numerical values for easier use
  data.forEach(d => {
    d.Year = +d.Year;
    d.Population = +d.Population;
    d["Yearly Growth %"] = +d["Yearly Growth %"];
    d.Number = +d.Number; // Parse Population Growth (Number)
    d["Density (Pop/km2)"] = +d["Density (Pop/km2)"]; // Parse Density
  });

  const margin = { top: 50, right: 75, bottom: 50, left: 85 };
  const width = Math.min(window.innerWidth * 0.95, 1600) - margin.left - margin.right; // 98% of screen width or max 1600px
  const height = Math.min(window.innerHeight * 0.8, 900) - margin.top - margin.bottom; // 85% of screen height or max 900px

    
  const chartContainer = document.getElementById("chart");
  console.log("Container dimensions:", chartContainer.offsetWidth, chartContainer.offsetHeight);

  // Append an SVG element to the #chart div
  const svg = d3.select("#chart")
    .append("svg")
    .attr("viewBox", `0 0 ${window.innerWidth} ${window.innerHeight}`) // Set full page size
    .attr("preserveAspectRatio", "xMidYMid meet") // Maintain aspect ratio
    .style("width", "100vw") // Full viewport width
    .style("height", "100vh"); // Full viewport height
  const chartGroup = svg.append("g")
    .attr("transform", `translate(${(window.innerWidth - width) / 2}, ${(window.innerHeight - height) / 2})`);

  // Add a tooltip
  const tooltip = d3.select("body")
      .append("div")
      .classed("tooltip", true)
      .style("position", "absolute")
      .style("background", "#fff")
      .style("border", "1px solid #ccc")
      .style("padding", "5px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("opacity", 0);

  // Define scales
  const xScale = d3.scaleLinear()
    .domain([d3.min(data, d => d.Year), d3.max(data, d => d.Year)])
    .range([0, width]);

  const yScale = d3.scaleLinear()
    .domain([0, Math.max(12, d3.max(data, d => d.Population))]) // Ensure the maximum is at least 12
    .range([height, 0]);



  // Add background shading for actual and predicted data
chartGroup.append("rect")
.attr("x", 0)
.attr("y", 0)
.attr("width", xScale(2023)) // Up to 2023
.attr("height", height)
.attr("fill", "#fdfdfd"); // Light gray for actual data

chartGroup.append("rect")
.attr("x", xScale(2023))
.attr("y", 0)
.attr("width", width - xScale(2023)) // After 2023
.attr("height", height)
.attr("fill", "#e0e0e0"); // Darker gray for predictions



const yScaleRate = d3.scaleLinear()
    .domain([0, Math.max(4, d3.max(data, d => d["Yearly Growth %"]))]) // Ensure the maximum is at least 4
    .range([height, 0]);

  // Add Chart Labels
  chartGroup.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width * .06) 
      .attr("y", margin.top / 1.85) 
      .text("Historic Data")
      .style("fill", "#43a2ca")
      .style("font-size", "16px")
      .style("font-weight", "bold");

  chartGroup.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width * .8)
      .attr("y", margin.top / 1.85) 
      .text("Future Predictions")
      .style("fill", "#43a2ca")
      .style("font-size", "16px")
      .style("font-weight", "bold");

  // Add Title
  chartGroup.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width/2)
      .attr("y", margin.top * -.5) 
      .text("Is the Global Population Growth Rate Slowing Down?")
      .style("fill", "#555")
      .style("font-size", "24px")
      .style("font-weight", "bold"); 
  
  // Add axes
  chartGroup.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

  chartGroup.append("g")
      .attr("class", "y-axis-rate")
      .call(d3.axisLeft(yScaleRate));

  chartGroup.append("g")
      .attr("transform", `translate(${width}, 0)`)
      .call(d3.axisRight(yScale));

  // Create the Y-axis label on the right
  chartGroup.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", `translate(${width + margin.right - 35}, ${height / 2}) rotate(90)`) // Translate to the right and rotate clockwise
      .style("font-size", "18px")
      .style("fill", "#333")
      .text("Population in Billions");

    // Add the label for the left axis
    chartGroup.append("text")
    .attr("class", "y-axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2) // Center the label vertically
    .attr("y", -margin.left + 15) // Push it out from the axis, adjust as needed
    .attr("text-anchor", "middle")
    .style("font-size", "18px") // Ensure the text is visible
    .text("Yearly Growth (%)");
  

  // Create and append the area chart
  const gradient = chartGroup.append("defs")
    .append("linearGradient")
    .attr("id", "area-gradient")
    .attr("x1", "0%")
    .attr("x2", "100%")
    .attr("y1", "0%")
    .attr("y2", "0%");

  gradient.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "#e0e0e0"); 

  gradient.append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "#36454F");

  const area = d3.area()
    .x(d => xScale(d.Year))
    .y0(height)
    .y1(d => yScale(d.Population));

  chartGroup.append("path")
      .datum(data)
      .attr("fill", "url(#area-gradient)")
      .attr("stroke", "none")
      .attr("d", area);

  const areaTopLine = d3.line()
    .x(d => xScale(d.Year))
    .y(d => yScale(d.Population));


  chartGroup.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#333") // Dark charcoal for the top line
      .attr("stroke-width", 1)
      .attr("d", areaTopLine);

  // X-Axis Label
  chartGroup.append("text")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 10)
      .style("font-size", "18px")
      .text("Year (1951-2050)");

  // Remaining chart elements (e.g., line chart, tooltips, etc.)
  const line = d3.line()
      .x(d => xScale(d.Year))
      .y(d => yScaleRate(d["Yearly Growth %"]));

  chartGroup.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#43a2ca")
      .attr("stroke-width", 3.5)
      .attr("d", line);

    // Add a label for the rate line
  chartGroup.append("text")
      .attr("x", xScale(1975)) // Adjust the x-position for better placement
      .attr("y", yScaleRate(2.15)) // Adjust the y-position based on the scale
      .attr("text-anchor", "start")
      .style("font-size", "18px")
      .style("font-weight", "bold")
      .style("fill", "#43a2ca")
      .text("Yearly Growth Rate %");

  // Add an arrow line pointing to the rate line
  chartGroup.append("line")
      .attr("x1", xScale(1978)) // Same x as the label
      .attr("y1", yScaleRate(2.1)) // Same y as the label
      .attr("x2", xScale(1980)) // Adjust to point to the line
      .attr("y2", yScaleRate(1.9)) // Adjust to match the line
      .attr("stroke", "#43a2ca")
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrow)"); // Add arrow marker

      // Add arrow marker for the pointer line
  chartGroup.append("defs")
      .append("marker")
      .attr("id", "arrow")
      .attr("viewBox", [0, 0, 10, 10])
      .attr("refX", 10)
      .attr("refY", 5)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto-start-reverse")
      .append("path")
      .attr("d", "M0,0L10,5L0,10")
      .attr("fill", "#43a2ca");

  const overlay = chartGroup.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "none")
      .attr("pointer-events", "all");

  const hoverLine = chartGroup.append("line")
      .attr("stroke", "#43a2ca") 
      .attr("stroke-width", 0.75)
      .attr("y1", 0)
      .attr("y2", height)
      .style("opacity", 0);

  const populationDot = chartGroup.append("circle")
      .attr("r", 2.5)
      .attr("fill", "#333")
      .style("opacity", 0);

  const growthRateDot = chartGroup.append("circle")
      .attr("r", 4)
      .attr("fill", "#43a2ca")
      .style("opacity", 0);

  const yearDisplay = chartGroup.append("text")
      .attr("text-anchor", "middle")
      .attr("y", height + 30)
      .attr("x", 0)
      .style("font-size", "12px")
      .style("opacity", 0);
  // Add a vertical line at 2023
  chartGroup.append("line")
      .attr("x1", xScale(2023))
      .attr("y1", 0)
      .attr("x2", xScale(2023))
      .attr("y2", height)
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4,4"); // Dashed line for emphasis
  overlay.on("mousemove", function(event) {
    const [mouseX] = d3.pointer(event);
    const year = xScale.invert(mouseX);
    const closestData = data.reduce((a, b) =>
        Math.abs(a.Year - year) < Math.abs(b.Year - year) ? a : b
    );

    if (closestData) {
      hoverLine
          .attr("x1", xScale(closestData.Year))
          .attr("x2", xScale(closestData.Year))
          .style("opacity", 1);

      populationDot
          .attr("cx", xScale(closestData.Year))
          .attr("cy", yScale(closestData.Population))
          .style("opacity", 1);

      growthRateDot
          .attr("cx", xScale(closestData.Year))
          .attr("cy", yScaleRate(closestData["Yearly Growth %"]))
          .style("opacity", 1);

      tooltip
          .style("left", `${event.pageX + 10}px`)
          .style("top", `${event.pageY - 20}px`)
          .style("opacity", 1)
          .html(`
              <strong>Year:</strong> ${closestData.Year}<br>
              <strong>Population:</strong> ${closestData.Population.toLocaleString()} Billion<br>
              <strong>Growth Rate:</strong> ${closestData["Yearly Growth %"].toFixed(2)}%<br>
              <strong>Population Growth:</strong> ${closestData.Number.toLocaleString()}<br>
              <strong>Density:</strong> ${closestData["Density (Pop/km2)"].toLocaleString()} per km²
          `);
    }
  }).on("mouseleave", function() {
    hoverLine.style("opacity", 0);
    populationDot.style("opacity", 0);
    growthRateDot.style("opacity", 0);
    tooltip.style("opacity", 0);
  });
});
