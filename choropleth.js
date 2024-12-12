// Set dimensions and margins for the map
const mapMargin = { top: 50, right: 50, bottom: 50, left: 50 };
const mapWidth = window.innerWidth * 0.75 - mapMargin.left - mapMargin.right; // 90% of screen width
const aspectRatio = 16 / 9; // Adjust aspect ratio if needed (16:9 is common)
const mapHeight = mapWidth / aspectRatio - mapMargin.top - mapMargin.bottom; // Height scales dynamically based on width

// Append an SVG element to the #map div
const mapSvg = d3.select("#map")
    .append("svg")
    .attr("viewBox", `0 0 ${mapWidth + mapMargin.left + mapMargin.right} ${mapHeight + mapMargin.top + mapMargin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .classed("map-svg", true);

// Create a group for centering the map content
const mapGroup = mapSvg.append("g")
    .attr("transform", `translate(${mapMargin.left}, ${mapMargin.top})`);

    
// Add zoom behavior to the map
const zoom = d3.zoom()
    .scaleExtent([1, 8]) // Set zoom limits
    .translateExtent([[0, 0], [mapWidth, mapHeight]]) // Pan limits
    .on("zoom", (event) => {
        mapGroup.attr("transform", event.transform); // Apply zoom transform
    });

// Attach zoom to the SVG
mapSvg.call(zoom);

// Load GeoJSON and Population Data
Promise.all([
    d3.json("world.geo.json"), // Load the GeoJSON file
    d3.csv("world_population_by_year_1950_2023.csv") // Load the population data
]).then(([geoData, populationData]) => {
    // Filter out unnecessary regions
    geoData.features = geoData.features.filter(feature => feature.properties.name !== "Antarctica");

    // Prepare population data for easy lookup
    const populationLookup = {};
    populationData.forEach(d => {
        populationLookup[d.country] = d;
    });

    // Add year options to the dropdown
    const yearSelect = d3.select("#year-select");
    const years = populationData.columns.slice(1); // Skip the 'country' column

    yearSelect.selectAll("option")
        .data(years)
        .enter()
        .append("option")
        .attr("value", d => d)
        .text(d => d);
    yearSelect.property("value", years[years.length - 1]); // Default to 2023

    // Set up map projection
    const projection = d3.geoMercator()
        .fitExtent(
            [[mapMargin.left, mapMargin.top], [mapWidth - mapMargin.right, mapHeight - mapMargin.bottom]],
            geoData
        );

    // Set up a path generator
    const path = d3.geoPath().projection(projection);

    // Select the year to display
    let selectedYear = years[years.length - 1]; // Default to the most recent year

    // Add population change and growth rate calculations to GeoJSON
    geoData.features.forEach(feature => {
        const countryName = feature.properties.name;

        years.forEach((year, index) => {
            const currentPop = +populationLookup[countryName]?.[year] || 0;
            const previousPop = index > 0 ? +populationLookup[countryName]?.[years[index - 1]] || 0 : 0;

            feature.properties[year] = {
                population: currentPop,
                populationChange: index > 0 ? currentPop - previousPop : null,
                growthRate: index > 0 && previousPop > 0 ? ((currentPop - previousPop) / previousPop) * 100 : null
            };
        });
    });
    const maxPopulation = d3.max(geoData.features, d => d.properties[selectedYear]?.population || 0);
    const minPopulation = d3.min(geoData.features, d => d.properties[selectedYear]?.population || Infinity);

    const colorRange = [
        "#e0e0e0", // Light gray
        "#a8ddb5", // Pale green
        "#7bccc4", // Teal
        "#43a2ca", // Medium blue
        "#0868ac", // Deep blue
        "#88419d", // Medium purple
        "#810f7c", // Bold purple
        "#4d004b", // Dark purple
        "#1a001a"  // Almost black
    ];
    
    
    
    const numBins = 9; // Set the number of bins
    // Generate thresholds based on max population
    const thresholds = d3.range(0, maxPopulation, (maxPopulation - minPopulation) / numBins);

    const colorScale = d3.scaleThreshold()
    .domain(thresholds) // Match the bins
    .range(colorRange); // Use the provided color scheme


    
    // Tooltip setup
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

    // Draw the map
    const mapPaths = mapGroup.selectAll("path")
        .data(geoData.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", d => {
            const population = d.properties[selectedYear]?.population || 0;
            return population > 0 ? colorScale(population) : "#ccc"; // Default to gray for missing data
        })
        .attr("stroke", "#476e6e")
        .attr("stroke-width", 0.25)
        .on("mouseover", function (event, d) {
            const totalPopulation = d3.sum(geoData.features, f => f.properties[selectedYear]?.population || 0);
            const worldPercentage = (d.properties[selectedYear]?.population / totalPopulation) * 100;
            const populationChange = d.properties[selectedYear]?.populationChange || "N/A";
            const growthRate = d.properties[selectedYear]?.growthRate
                ? `${d.properties[selectedYear]?.growthRate.toFixed(2)}%`
                : "N/A";

            d3.select(this).attr("stroke", "#042e2e").attr("stroke-width", 0.5);

            tooltip
                .style("opacity", 1)
                .html(`
                    <strong>Country:</strong> ${d.properties.name}<br>
                    <strong>Population:</strong> ${(+d.properties[selectedYear]?.population).toLocaleString()}<br>
                    <strong>Population Growth:</strong> ${(+populationChange).toLocaleString()}<br>
                    <strong>Growth Rate:</strong> ${growthRate}<br>
                    <strong>World %:</strong> ${worldPercentage.toFixed(2)}%
                `);
        })
        .on("mousemove", function (event) {
            tooltip
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 20}px`);
        })
        .on("mouseleave", function () {
            d3.select(this)
                .attr("stroke", "#476e6e") // Original stroke color
                .attr("stroke-width", 0.25); // Original stroke width
            tooltip.style("opacity", 0); // Hide tooltip
        });

    // Function to update the slider title
    function updateSliderTitle(startYear, endYear) {
        const sliderTitle = document.getElementById('slider-title');
        if (sliderTitle) {
            sliderTitle.textContent = `Choose Range of Years: ${startYear} - ${endYear}`;
        }
    }

    // Attach event listeners to update the slider title on input
    const sliderInputs = document.querySelectorAll(".range-slider input[type='range']");
    sliderInputs.forEach(slider => {
        slider.addEventListener("input", () => {
            const startYear = Math.min(...Array.from(sliderInputs).map(s => +s.value));
            const endYear = Math.max(...Array.from(sliderInputs).map(s => +s.value));
            updateSliderTitle(startYear, endYear);
        });
    });

    // Handle year selection change from the dropdown
    yearSelect.on("change", function () {
        selectedYear = this.value;
    
        // Update the year display
        d3.select("#current-year-display").text(`${selectedYear}`);
    
        // Update the map data
        mapPaths.transition()
            .duration(500)
            .attr("fill", d => {
                const population = d.properties[selectedYear]?.population || 0;
                return population > 0 ? colorScale(population) : "#ccc";
            });
    });
    

// Attach animation logic to the play button
const playButton = document.getElementById("play-button");
let isPlaying = false;

playButton.addEventListener("click", function () {
    if (isPlaying) {
        isPlaying = false;
        playButton.textContent = "Play";
    } else {
        isPlaying = true;
        playButton.textContent = "Pause";

        const startYear = parseInt(sliderInputs[0].value);
        const endYear = parseInt(sliderInputs[1].value);

        if (startYear < endYear) {
            animateYears(startYear, endYear);
        }
    }
});

function animateYears(startYear, endYear) {
    let currentYear = startYear;

    function step() {
        if (!isPlaying || currentYear > endYear) {
            isPlaying = false;
            playButton.textContent = "Play";
            return;
        }

        updateMap(currentYear);
        currentYear++;
        setTimeout(step, 100); // Adjust delay as needed
    }

    step();
}
const legendBins = thresholds.map((t, i) => ({
    label: `${d3.format(".2s")(t)} - ${d3.format(".2s")(t + (maxPopulation - minPopulation) / numBins)}`,
    color: colorRange[i]
}));
const legendWidth = 600; // Adjust as needed
const legendHeight = 10; // Height of each legend rectangle
const legendPadding = 20; // Padding from the edges
const legendGroup = mapSvg.append("g")
    .attr("transform", `translate(${(mapWidth - legendWidth) / 2 + 50}, ${mapHeight + mapMargin.bottom - legendHeight + 20})`);

    
legendGroup.selectAll("rect")
    .data(legendBins)
    .enter()
    .append("rect")
    .attr("x", (d, i) => i * (legendWidth / legendBins.length)) // Distribute evenly
    .attr("y", 0)
    .attr("width", legendWidth / legendBins.length)
    .attr("height", legendHeight)
    .style("fill", d => d.color);

legendGroup.selectAll("text")
    .data(legendBins)
    .enter()
    .append("text")
    .attr("x", (d, i) => i * (legendWidth / legendBins.length) + (legendWidth / legendBins.length) / 2)
    .attr("y", legendHeight + 15) // Position labels below rectangles
    .attr("text-anchor", "middle")
    .style("font-size", "10px")
    .text(d => d.label);

function updateMap(year) {
    // Update the year display
    d3.select("#current-year-display").text(`${year}`);

    // Ensure the population data for the selected year is valid
    geoData.features.forEach(feature => {
        const countryName = feature.properties.name;
        feature.properties.population = populationLookup[countryName]?.[year] || 0;
    });

    // Transition the map paths to reflect the updated population data
    mapPaths.transition()
        .duration(500)
        .attr("fill", d => {
            const population = d.properties.population; // Ensure this accesses the updated data
            return population > 0 ? colorScale(population) : "#ccc"; // Default to gray for missing data
        });
}

}).catch(error => {
    console.error("Error loading data:", error);
});
