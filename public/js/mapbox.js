/* eslint-disable */
export const displayMap = (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoibWlzcmFuMzgiLCJhIjoiY2trMm4xYWszMTJuZjJxdGdlOW80b2d1ZiJ9.FOZHAqeTo1lFABzI4Vhqlw';

  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/misran38/ckk2o19c43n0d17nydjb2lc9v',
    scrollZoom: false,
    //   center: [-118.2437, 34.0522],
    //   zoom: 10,
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    // Create marker
    const el = document.createElement('div');
    el.className = 'marker';

    // Add marker, set coordinates, and add to map
    new mapboxgl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // Add popup
    new mapboxgl.Popup({ offset: 30 })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}`)
      .addTo(map);

    // Extend map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: { top: 200, bottom: 100, left: 100, right: 100 },
  });
};
