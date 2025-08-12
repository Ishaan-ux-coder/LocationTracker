const express = require('express');
const app = express();

const http = require('http');
const server = http.createServer(app);

const socketio = require('socket.io');
const io = socketio(server);

const clients = {}; // socket.id -> {lat, lon}

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Send all existing clients' locations to the new client
    for (const [id, loc] of Object.entries(clients)) {
        socket.emit('receive', {
            id,
            latitude: loc.lat,
            longitude: loc.lon
        });
    }

    // Listen location updates
    socket.on("locationUpdate", (data) => {
        clients[socket.id] = data; // store new location

        // Broadcast to everyone (including sender)
        io.emit("receive", {
            id: socket.id,
            latitude: data.lat,
            longitude: data.lon
        });
    });

    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        delete clients[socket.id];
        io.emit("removeMarker", { id: socket.id });
    });
});

const path = require('path');
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('index');
});

server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
