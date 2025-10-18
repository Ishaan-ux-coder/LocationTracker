const socket = io();
console.log("Socket.io client connected");

const map = L.map('map').setView([20.5937, 78.9629], 5); // India default

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

const markers = {};
let myLocation = null;
let myMarker = null; // To hold the marker for your own location
let routingControl = null;

// Track and send my location
if (navigator.geolocation) {
    navigator.geolocation.watchPosition((position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        myLocation = L.latLng(lat, lon);
        const speed = position.coords.speed ? (position.coords.speed * 3.6).toFixed(2) : 0; // Convert m/s to km/h

        document.getElementById('speed').innerText = speed;

        console.log(`My position: ${lat}, ${lon}`);
        socket.emit('locationUpdate', { lat, lon });

        // **** NEW: Add or update your own marker on the map ****
        if (myMarker) {
            myMarker.setLatLng(myLocation);
        } else {
            myMarker = L.marker(myLocation).addTo(map).bindPopup("Your Location");
        }


        if (routingControl) {
            const waypoints = routingControl.getWaypoints();
            waypoints[0].latLng = myLocation;
            routingControl.setWaypoints(waypoints);

            // Update distance
            routingControl.on('routesfound', function(e) {
                const routes = e.routes;
                const summary = routes[0].summary;
                const distance = (summary.totalDistance / 1000).toFixed(2); // Convert meters to km
                document.getElementById('distance').innerText = distance;
            });
        }

    }, (error) => {
        console.error('Error getting location:', error);
    }, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 8000
    });
} else {
    console.error('Geolocation not supported.');
}

function getRoute() {
    const destination = document.getElementById('destination').value;
    if (myLocation && destination) {
        if (routingControl) {
            map.removeControl(routingControl);
        }

        // **** NEW: Use Nominatim geocoding service ****
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${destination}`)
            .then(response => response.json())
            .then(data => {
                if (data.length > 0) {
                    const destinationCoords = L.latLng(data[0].lat, data[0].lon);

                    routingControl = L.Routing.control({
                        waypoints: [
                            myLocation,
                            destinationCoords
                        ],
                        routeWhileDragging: true
                    }).addTo(map);

                    routingControl.on('routesfound', function(e) {
                        const routes = e.routes;
                        const summary = routes[0].summary;
                        const distance = (summary.totalDistance / 1000).toFixed(2); // Convert meters to km
                        document.getElementById('distance').innerText = distance;
                    });
                } else {
                    alert("Destination not found. Please try being more specific.");
                }
            })
            .catch(error => {
                console.error('Geocoding error:', error);
                alert("There was an error finding the destination.");
            });

    } else {
        alert("Please allow location access and enter a destination.");
    }
}


// When receiving location from server
socket.on('receive', (data) => {
    const { id, latitude, longitude } = data;
    console.log(`Received from ${id}: ${latitude}, ${longitude}`);

    if (markers[id]) {
        markers[id].setLatLng([latitude, longitude]);
    } else {
        markers[id] = L.marker([latitude, longitude]).addTo(map);
    }
});

// When a client disconnects, remove their marker
socket.on('removeMarker', (data) => {
    const { id } = data;
    if (markers[id]) {
        map.removeLayer(markers[id]);
        delete markers[id];
        console.log(`Removed marker for ${id}`);
    }
});