<script>
    import { onMount } from 'svelte';
    import 'leaflet/dist/leaflet.css';
    import { json } from 'd3';
  
    let mapContainer;
    onMount(async () => {
      try {
        const countryPolygons = await ((await fetch('https://raw.githubusercontent.com/johan/world.geo.json/refs/heads/master/countries.geo.json')).json())
        // Dynamically import Leaflet
        const L = await import('leaflet');
  
        // Initialize the map
        const map = L.map(mapContainer).setView([20, 0], 2);
  
        // Add a tile layer to the map
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            className: '{s}',
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
  
        // Example GeoJSON data (replace with actual data)
        
  
        // Log GeoJSON data to check if it's correct
        console.log('GeoJSON Data:', countryPolygons.length);
  
        // Add GeoJSON layer to the map
        L.geoJSON(countryPolygons, {
          onEachFeature: function(feature, layer) {
            layer.on({
              click: (e) => {console.log(feature.id)}
            })
          },
          style: function(feature) {
            // Log the color property for each feature
            if(feature.id == 'USA') {
              return { 
                fillColor: '#222d9e',
                color: ''
              }
            }
            if(['RUS', 'CHN'].includes(feature.id)) {
              return { 
                fillColor: '#d62d1d',
                color: ''
              }
            }
            return { 
                fillColor: '#a6b735',
                color: ''
            }
          }
        }).addTo(map);
  
        // Log success message
        console.log('Map and GeoJSON layer loaded successfully.');
      } catch (error) {
        // Log any errors
        console.error('Error loading map:', error);
      }
    });
  </script>
  
  <style>
    #map {
      height: 600px;
      width: 100%;
    }
  </style>
  
  <div id="map" bind:this={mapContainer}></div>
  