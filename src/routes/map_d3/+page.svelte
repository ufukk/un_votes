<script>
    import { onMount } from 'svelte';
    import * as d3 from 'd3';
  
    let svg;
  
    onMount(() => {
      // Set up the SVG container
      const width = 960;
      const height = 480;
  
      svg = d3.select(svg)
        .attr("width", width)
        .attr("height", height);
  
      // Create a projection
      const projection = d3.geoMercator()
        .scale((width - 3) / (2 * Math.PI))
        .translate([width / 2, height / 1.5]);
  
      // Create a path generator
      const path = d3.geoPath().projection(projection);
  
      // Load GeoJSON data
      d3.json("https://raw.githubusercontent.com/johan/world.geo.json/refs/heads/master/countries.geo.json").then(data => {
        // Draw the map
        svg.selectAll("path")
          .data(data.features)
          .enter().append("path")
          .attr("class", "country")
          .attr("d", path)
          .style("stroke", d => {
            return "#000000";
          })
          .style("stroke-width", "0.5")
          .style("fill", d => {
            // Determine the color based on the country name
            const countryName = d.properties.name;
            if (["United States of America", "Canada", "United Kingdom"].includes(countryName)) {
              return "blue";
            } else if (["Russia", "China"].includes(countryName)) {
              return "red";
            } else {
              return "#ffffff";
            }
          });
      }).catch(error => {
        console.error("Error loading GeoJSON data:", error);
      });
    });
  </script>
  
  <style>
    .country {
      fill: green;
      stroke: #fff;
      stroke-width: 0.5px;
    }
  </style>
  
  <svg bind:this={svg}></svg>
  