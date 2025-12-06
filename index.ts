import * as net from "net";

// =====================
// VARINT & STRING
// =====================
function writeVarInt(value: number) {
  const bytes: number[] = [];
  do {
    let temp = value & 0x7f;
    value >>>= 7;
    if (value !== 0) temp |= 0x80;
    bytes.push(temp);
  } while (value !== 0);
  return Buffer.from(bytes);
}

function readVarInt(buffer: Buffer, offset = 0) {
  let num = 0;
  let shift = 0;
  let pos = offset;

  while (true) {
    if (pos >= buffer.length) return null;
    const byte = buffer[pos++];
    num |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) break;
    shift += 7;
  }
  return { value: num, size: pos - offset };
}

function writeString(str: string) {
  const buf = Buffer.from(str, "utf8");
  return Buffer.concat([writeVarInt(buf.length), buf]);
}

// =====================
// PACCHETTO SEMPLICE
// =====================
function sendPacket(socket: net.Socket, id: number, data: Buffer) {
  const packet = Buffer.concat([writeVarInt(id), data]);
  const length = writeVarInt(packet.length);
  socket.write(Buffer.concat([length, packet]));
}

// =====================
// CONFIG BOT
// =====================
const HOST = "localhost"; // il tuo IP LAN
const PORT = 25565; // porta del server LAN
const USERNAME = "TestBot";
const PROTOCOL_VERSION = 754; // 1.16.5

let buffer = Buffer.alloc(0);

const socket = net.connect(PORT, HOST, () => {
  console.log("Connesso al server");

  // --- HANDSHAKE ---
  const handshake = Buffer.concat([
    writeVarInt(PROTOCOL_VERSION),
    writeString(HOST),
    Buffer.from([(PORT >> 8) & 0xff, PORT & 0xff]),
    writeVarInt(2), // next state = login
  ]);
  sendPacket(socket, 0x00, handshake);

  // --- LOGIN START ---
  sendPacket(socket, 0x00, writeString(USERNAME));
});

// --- RECEIVE DATA ---
socket.on("data", (data) => {
  buffer = Buffer.concat([buffer, data]);

  while (true) {
    const lengthInfo = readVarInt(buffer);
    if (!lengthInfo) return;
    const packetLength = lengthInfo.value;
    const start = lengthInfo.size;
    if (buffer.length < start + packetLength) return;

    let packetData = buffer.slice(start, start + packetLength);
    buffer = buffer.slice(start + packetLength);

    const idInfo = readVarInt(packetData);
    const packetId = idInfo.value;
    const payload = packetData.slice(idInfo.size);

    handlePacket(packetId, payload);
  }
});

function handlePacket(id: number, data: Buffer) {
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

socket.on("error", console.error);
socket.on("close", () => console.log("Connessione chiusa"));
