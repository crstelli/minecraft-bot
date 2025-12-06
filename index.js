"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var net = require("net");
// =====================
// VARINT & STRING
// =====================
function writeVarInt(value) {
    var bytes = [];
    do {
        var temp = value & 0x7f;
        value >>>= 7;
        if (value !== 0)
            temp |= 0x80;
        bytes.push(temp);
    } while (value !== 0);
    return Buffer.from(bytes);
}
function readVarInt(buffer, offset) {
    if (offset === void 0) { offset = 0; }
    var num = 0;
    var shift = 0;
    var pos = offset;
    while (true) {
        if (pos >= buffer.length)
            return null;
        var byte = buffer[pos++];
        num |= (byte & 0x7f) << shift;
        if ((byte & 0x80) === 0)
            break;
        shift += 7;
    }
    return { value: num, size: pos - offset };
}
function writeString(str) {
    var buf = Buffer.from(str, "utf8");
    return Buffer.concat([writeVarInt(buf.length), buf]);
}
// =====================
// PACCHETTO SEMPLICE
// =====================
function sendPacket(socket, id, data) {
    var packet = Buffer.concat([writeVarInt(id), data]);
    var length = writeVarInt(packet.length);
    socket.write(Buffer.concat([length, packet]));
}
// =====================
// CONFIG BOT
// =====================
var HOST = "localhost"; // Server IP
var PORT = 25565; // LAN Port
var PROTOCOL_VERSION = 754; // Minecraft Version 1.16.5
var botNames = ["Bot 1", "Bot 2", "Bot 3", "Bot 4", "Bot 5", "Bot 6", "Bot 7", "Bot 8", "Bot 9", "Bot 10"];
var buffer = Buffer.alloc(0);
var sockets = botNames.map(function (s, i) {
    return net.connect(PORT, HOST, function () {
        console.log("Connesso al server");
        // --- HANDSHAKE ---
        var handshake = Buffer.concat([
            writeVarInt(PROTOCOL_VERSION),
            writeString(HOST),
            Buffer.from([(PORT >> 8) & 0xff, PORT & 0xff]),
            writeVarInt(2), // next state = login
        ]);
        sendPacket(sockets[i], 0x00, handshake);
        // --- LOGIN START ---
        sendPacket(sockets[i], 0x00, writeString(s));
    });
});
sockets.map(function (s) {
    s.on("data", function (data) {
        buffer = Buffer.concat([buffer, data]);
        while (true) {
            var lengthInfo = readVarInt(buffer);
            if (!lengthInfo)
                return;
            var packetLength = lengthInfo.value;
            var start = lengthInfo.size;
            if (buffer.length < start + packetLength)
                return;
            var packetData = buffer.slice(start, start + packetLength);
            buffer = buffer.slice(start + packetLength);
            var idInfo = readVarInt(packetData);
            var packetId = idInfo === null || idInfo === void 0 ? void 0 : idInfo.value;
            var payload = packetData.slice(idInfo === null || idInfo === void 0 ? void 0 : idInfo.size);
            if (packetId)
                handlePacket(packetId, payload, s);
        }
    });
    s.on("error", console.error);
    s.on("close", function () { return console.log("Connessione chiusa"); });
});
function handlePacket(id, data, socket) {
    // --- LOGIN SUCCESS ---
    if (id === 0x02) {
        console.log("Login avvenuto con successo!");
        return;
    }
    // --- JOIN GAME ---
    if (id === 0x26) {
        // ID Join Game 1.16.5
        console.log("Bot entrato nel mondo!");
        return;
    }
    // --- KEEP ALIVE ---
    if (id === 0x0f) {
        // ID KeepAlive 1.16.5
        // Rispondi con lo stesso KeepAlive
        sendPacket(socket, 0x0f, data);
        return;
    }
    console.log("Pacchetto ricevuto ID:", id);
}
