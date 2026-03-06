const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());


app.get("/api/subscription", async (req, res) => {

  try {

    const url = req.query.url;

    if (!url) {
      return res.status(400).json({ error: "Missing URL" });
    }

    const response = await fetch(url);
    const text = await response.text();

    let decoded;

    try {
      decoded = Buffer.from(text.trim(), "base64").toString("utf8");
    } catch {
      decoded = text;
    }

    const links = decoded
      .split(/\r?\n/)
      .filter(l => l.startsWith("vless://"));

    res.json({
      count: links.length,
      links: links
    });

  } catch (err) {
    res.status(500).json({ error: "Subscription fetch failed" });
  }

});

const net = require("net");

/* ================= TCP PING ================= */

function tcpPing(host, port, timeout = 3000) {

  return new Promise((resolve) => {

    const start = Date.now();

    const socket = new net.Socket();

    socket.setTimeout(timeout);

    socket.connect(port, host, () => {
      const latency = Date.now() - start;
      socket.destroy();
      resolve(latency);
    });

    socket.on("error", () => {
      resolve(null);
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve(null);
    });

  });

}

/* ================= API PING ================= */

app.post("/api/ping", async (req, res) => {

  try {

    const { links } = req.body;

    if (!links) {
      return res.status(400).json({ error: "Links required" });
    }

    const results = [];

    for (const link of links) {

      try {

        const addr = link.split("@")[1].split("?")[0];

        const host = addr.split(":")[0];
        const port = addr.split(":")[1];

        const latency = await tcpPing(host, port);

        results.push({
          host,
          port,
          latency
        });

      } catch {
        results.push({
          host: null,
          port: null,
          latency: null
        });
      }

    }

    res.json({ results });

  } catch (e) {

    res.status(500).json({ error: "Ping failed" });

  }

});

app.use(express.static("public"));

app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});
