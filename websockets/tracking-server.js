const express = require("express");
const http = require("http");
const { WebSocketServer, WebSocket } = require("ws");
const url = require("url");

const app = express();
app.use(express.json());

const server = http.createServer(app);

// ---------------------------------------------------------------------------
// WebSocket server attached to the same HTTP server
// ---------------------------------------------------------------------------

const wss = new WebSocketServer({ server });

// rooms: Map<orderId, Set<WebSocket>>
// Keeps track of which clients are connected to which order's tracking room.
const rooms = new Map();

// ---------------------------------------------------------------------------
// Helper: get or create the room for an orderId
// ---------------------------------------------------------------------------
function getRoom(orderId) {
  if (!rooms.has(orderId)) {
    rooms.set(orderId, new Set());
  }
  return rooms.get(orderId);
}

// ---------------------------------------------------------------------------
// Helper: broadcast a message to all OTHER clients in the same room
//         (skip the sender so the rider doesn't receive their own position)
// ---------------------------------------------------------------------------
function broadcastToRoom(orderId, senderWs, data) {
  const room = rooms.get(orderId);
  if (!room) return;

  const message = JSON.stringify(data);
  room.forEach((clientWs) => {
    if (clientWs !== senderWs && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(message);
    }
  });
}

// ---------------------------------------------------------------------------
// Helper: send to ALL clients in a room (including sender)
//         Used for system messages like "rider_arrived"
// ---------------------------------------------------------------------------
function broadcastToAll(orderId, data) {
  const room = rooms.get(orderId);
  if (!room) return;

  const message = JSON.stringify(data);
  room.forEach((clientWs) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(message);
    }
  });
}

// ---------------------------------------------------------------------------
// Helper: clean up a client from its room
// ---------------------------------------------------------------------------
function removeFromRoom(orderId, ws) {
  const room = rooms.get(orderId);
  if (!room) return;

  room.delete(ws);

  // Destroy empty rooms to free memory
  if (room.size === 0) {
    rooms.delete(orderId);
    console.log(`[Room ${orderId}] Destroyed (empty)`);
  }
}

// ---------------------------------------------------------------------------
// Connection handler

wss.on("connection", (ws, req) => {
  const parsed = url.parse(req.url, true);

  // Extract orderId from path: /ws/tracking/4821
  const pathParts = parsed.pathname.split("/");
  const orderId = pathParts[pathParts.length - 1];
  const role = parsed.query.role || "unknown";

  if (!orderId || isNaN(Number(orderId))) {
    ws.close(1008, "Invalid orderId");
    return;
  }

  // Join room
  const room = getRoom(orderId);
  room.add(ws);
  ws._orderId = orderId; // store for cleanup on close
  ws._role = role;

  console.log(`[Room ${orderId}] ${role} connected  (room size: ${room.size})`);

  // Acknowledge connection
  ws.send(
    JSON.stringify({
      type: "connected",
      orderId,
      role,
      message: `Connected to tracking room for order ${orderId}`,
    }),
  );

  // ── Incoming message handler ─────────────────────────────────────────────
  ws.on("message", (rawData) => {
    let data;
    try {
      data = JSON.parse(rawData.toString());
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      return;
    }

    switch (data.type) {
      // ── Rider sends live position ────────────────────────────────────────
      case "rider_location": {
        const { lat, lng, heading, timestamp } = data;

        // Basic validation
        if (
          typeof lat !== "number" ||
          typeof lng !== "number" ||
          lat < -90 ||
          lat > 90 ||
          lng < -180 ||
          lng > 180
        ) {
          ws.send(
            JSON.stringify({ type: "error", message: "Invalid coordinates" }),
          );
          return;
        }

        console.log(
          `[Room ${orderId}] rider_location  lat=${lat} lng=${lng} heading=${heading ?? 0}`,
        );

        // Forward to all OTHER clients in the room (i.e. customers)
        broadcastToRoom(orderId, ws, {
          type: "rider_location",
          orderId,
          lat,
          lng,
          heading: heading ?? 0,
          timestamp: timestamp ?? new Date().toISOString(),
        });
        break;
      }

      // ── Rider signals arrival ────────────────────────────────────────────
      case "rider_arrived": {
        console.log(`[Room ${orderId}] rider_arrived`);
        broadcastToAll(orderId, {
          type: "rider_arrived",
          orderId,
          message: "Rider has arrived at the delivery location",
          timestamp: new Date().toISOString(),
        });
        break;
      }

      // ── Rider marks order delivered ──────────────────────────────────────
      case "order_delivered": {
        console.log(`[Room ${orderId}] order_delivered`);
        broadcastToAll(orderId, {
          type: "order_delivered",
          orderId,
          message: "Order has been delivered successfully",
          timestamp: new Date().toISOString(),
        });

        // Close the room — no more tracking needed
        const room = rooms.get(orderId);
        if (room) {
          room.forEach((clientWs) => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.close(1000, "Order delivered");
            }
          });
          rooms.delete(orderId);
          console.log(`[Room ${orderId}] Closed after delivery`);
        }
        break;
      }

      // ── Ping/pong keepalive ──────────────────────────────────────────────
      case "ping": {
        ws.send(JSON.stringify({ type: "pong" }));
        break;
      }

      default:
        ws.send(
          JSON.stringify({
            type: "error",
            message: `Unknown message type: ${data.type}`,
          }),
        );
    }
  });

  // ── Disconnect handler ───────────────────────────────────────────────────
  ws.on("close", (code, reason) => {
    removeFromRoom(ws._orderId, ws);
    console.log(
      `[Room ${orderId}] ${role} disconnected  code=${code}  reason=${reason?.toString() || "none"}`,
    );
  });

  // ── Error handler ────────────────────────────────────────────────────────
  ws.on("error", (err) => {
    console.error(`[Room ${orderId}] ${role} error: ${err.message}`);
    removeFromRoom(ws._orderId, ws);
  });
});

// ---------------------------------------------------------------------------
// REST endpoint: check active rooms (useful for debugging / admin dashboard)
// ---------------------------------------------------------------------------
app.get("/admin/tracking/rooms", (req, res) => {
  const summary = {};
  rooms.forEach((room, orderId) => {
    summary[orderId] = {
      clients: room.size,
      roles: [...room].map((ws) => ws._role),
    };
  });
  res.json(summary);
});

// ---------------------------------------------------------------------------
// REST endpoint: force-close a room (e.g. if order is cancelled by admin)
// ---------------------------------------------------------------------------
app.delete("/admin/tracking/rooms/:orderId", (req, res) => {
  const { orderId } = req.params;
  const room = rooms.get(orderId);
  if (!room) {
    return res.status(404).json({ message: "Room not found" });
  }

  broadcastToAll(orderId, {
    type: "order_cancelled",
    orderId,
    message: "Order was cancelled",
  });

  room.forEach((ws) => ws.close(1000, "Order cancelled"));
  rooms.delete(orderId);

  console.log(`[Room ${orderId}] Force-closed by admin`);
  res.json({ message: `Room ${orderId} closed` });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Tracking server running on port ${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}/ws/tracking/{orderId}`);
  console.log(`Admin:     http://localhost:${PORT}/admin/tracking/rooms`);
});

// ---------------------------------------------------------------------------
// Periodic cleanup: remove stale connections that didn't close cleanly
// ---------------------------------------------------------------------------
setInterval(() => {
  rooms.forEach((room, orderId) => {
    room.forEach((ws) => {
      if (
        ws.readyState === WebSocket.CLOSED ||
        ws.readyState === WebSocket.CLOSING
      ) {
        room.delete(ws);
        console.log(`[Room ${orderId}] Removed stale connection`);
      }
    });
    if (room.size === 0) {
      rooms.delete(orderId);
      console.log(`[Room ${orderId}] Cleaned up (empty after stale check)`);
    }
  });
}, 30_000); // every 30 seconds
