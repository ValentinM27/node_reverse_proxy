import { log } from "node:console";
import { createServer } from "node:http";
import { argv } from "node:process";
import { parseArgs } from "node:util";
import { Readable } from "stream";
import { readFileSync } from "node:fs";

// Port par défaut
let entryPort = 5520;

// Chargement de la configuration
const rawData = readFileSync("config.json", "utf-8");

const jsonArray = JSON.parse(rawData);
const mapTable = Object.assign({}, jsonArray);

log(mapTable);

// Paramètre du serveur en args
const options = {
  port: {
    type: "string",
    short: "p",
  },
};

const { values } = parseArgs({
  args: argv.slice(2),
  options,
});

if (values.port) {
  entryPort = values.port;
}

// Démarage du serveur
const proxy = createServer((req, res) => handleProxy(req, res));

proxy.listen(entryPort, "127.0.0.1", () => {
  log(`Serveur en écoute sur ${entryPort}`);
});

// Gestion du proxy
const handleProxy = async (req, res) => {
  try {
    const { host } = req.headers;
    const { url, method } = req;

    let body = "";

    req.on("data", (chunk) => {
      if (method === "POST" || method === "PUT") body += chunk;
    });

    req.on("end", async () => {
      const proxyRes =
        method === "POST" || method === "PUT"
          ? await fetch(`http://${mapTable[host]}${url}`, {
              method,
              body: JSON.stringify(body),
            })
          : await fetch(`http://${mapTable[host]}${url}`, {
              method,
            });

      res.writeHead(
        proxyRes.status,
        Object.fromEntries(proxyRes.headers.entries())
      );

      Readable.fromWeb(proxyRes.body).pipe(res);
    });
  } catch (error) {
    console.error("Error in handleProxy:", error);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
};
