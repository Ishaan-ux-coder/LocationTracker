const socket = io();
console.log("Socket.io client connected");

const map = L.map('map').setView([20.5937, 78.9629], 5); // India default

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

const markers = {};

// Track and send my location
if (navigator.geolocation) {
    navigator.geolocation.watchPosition((position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        console.log(`My position: ${lat}, ${lon}`);
        socket.emit('locationUpdate', { lat, lon });
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
