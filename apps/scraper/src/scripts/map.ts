import * as d3 from 'd3';
import * as topojson from 'topojson';

// Load the world map data (TopoJSON format)
const worldMapUrl = 'https://unpkg.com/world-atlas@1.1.4/world/110m.json';

// Define the color scheme
const colorScheme = {
  usa: 'red',
  russia: 'red',
  china: 'red',
  uk: 'green',
  canada: 'green',
  default: 'blue'
};

// Function to get the color for a country based on its name
const getCountryColor = (countryName: string) => {
  switch (countryName) {
    case 'United States':
      return colorScheme.usa;
    case 'Russia':
      return colorScheme.russia;
    case 'China':
      return colorScheme.china;
    case 'United Kingdom':
      return colorScheme.uk;
    case 'Canada':
      return colorScheme.canada;
    default:
      return colorScheme.default;
  }
};

// Load the map data and draw the map
d3.json(worldMapUrl).then((world: any) => {
  const countries = topojson.feature(world, world.objects.countries);

  const width = 960;
  const height = 600;

  const svg = d3.select('body')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  const projection = d3.geoMercator()
    .fitSize([width, height], countries);

  const path = d3.geoPath()
    .projection(projection);

  svg.selectAll('path')
    .data(countries.features)
    .enter()
    .append('path')
    .attr('d', path)
    .attr('fill', (d: any) => getCountryColor(d.properties.name))
    .attr('stroke', '#fff')
    .attr('stroke-width', 0.5);
});