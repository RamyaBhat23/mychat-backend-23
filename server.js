const { readFileSync } = require('fs');
// const { element } = require('protractor');
var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var fs = require('fs');
var msgRead = [];
var msgWrite = [];
var msgData = [];
var roomRead = [];
var roomWrite = [];
var roomData = [];
var port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('mychat-backend is running');
    res.end();
});

app.listen(process.env.PORT || 8080, () => {
    console.log("http://localhost:8080");
    //https://localhost:8080 doesn't work
});

function getRooms() {
    roomRead = fs.readFileSync('rooms.json', 'utf-8');
    roomData = JSON.parse(roomRead);
    var rooms = [];
    roomData.rooms.forEach(element => {
        rooms.push(element.r);
    })
    return rooms;
}

io.on('connection', (socket) => {
    socket.on('send-message', (msgDetails) => {
        msgRead = fs.readFileSync('messages.json', 'utf-8');
        msgData = JSON.parse(msgRead);
        msgData.messages.push({ id: msgDetails.id, message: msgDetails.message, username: msgDetails.username });
        msgWrite = JSON.stringify(msgData, null, 4);
        fs.writeFileSync('messages.json', msgWrite);
        socket.to(msgDetails.room).emit('message-to-rooms', msgData.messages[msgData.messages.length - 1]); //only to that room
    });

    socket.on('delete-message', (deleteArray, roomName) => {
        //console.log("deleteArray" + JSON.stringify(deleteArray));
        msgRead = fs.readFileSync('messages.json', 'utf-8');
        msgData = JSON.parse(msgRead);
        deleteArray.forEach(element => {
            msgData.messages.forEach(msg => {
                if ((msg.id == element.id) && (msg.username == element.class)) {
                    msgData.messages = msgData.messages.filter(e => {
                        return (e != msg);
                    });
                }
            });
        })
        msgWrite = JSON.stringify(msgData, null, 4);
        fs.writeFileSync('messages.json', msgWrite);
        socket.to(roomName).emit('delete-from-rooms', deleteArray);
    });

    //handling room updation on new connection(who is new or already existing on login page)
    io.emit("stateinitialize", getRooms());
    //console.log(JSON.stringify(getRooms(room_array)));

    socket.on('join', (data) => {
        if (data.t == 'manager') {
            roomRead = fs.readFileSync('rooms.json', 'utf-8');
            roomData = JSON.parse(roomRead);
            roomData.rooms.push({ r: data.r, p: data.p });
            roomWrite = JSON.stringify(roomData, null, 4);
            fs.writeFileSync('rooms.json', roomWrite);
            socket.emit('join-successful'); //himself
            io.emit("roomupdate", getRooms(roomData.rooms)); //everyone
        }

        if (data.t == 'customer') {
            roomData.rooms.forEach(element => {
                if (data.r == element.r) {
                    if (data.p == element.p) {
                        socket.emit('join-successful', data);
                    } else {
                        socket.emit("wrong-password");
                    }
                }
            });
        }
    })

    socket.on('room-join', (currentroom) => {
        socket.join(currentroom);
    });
});

http.listen(port, () => {
    console.log('listening on *:3000');
});