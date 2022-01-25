"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const util_1 = require("./util");
const constants_1 = require("./constants");
const js_beautify_1 = __importDefault(require("js-beautify"));
const fs_1 = __importDefault(require("fs"));
const unminifySource = false;
(async () => {
    const app = express_1.default();
    app.set('trust proxy', true);
    const gs = await util_1.getGameStatus();
    if (!gs)
        throw new Error("The game status request failed.");
    app.use(cors_1.default());
    app.use((req, res, next) => {
        res.set('Cache-Control', 'no-store');
        next();
    });
    app.get(/\/(api\/)?game.min.js/, async (req, res) => {
        if (req.query.version && typeof req.query.version !== "string")
            return res.status(400).send("Invalid version specified.");
        const version = req.query.version ?? gs.gameClientVersion;
        try {
            res.type("js").send((unminifySource ? js_beautify_1.default : (_) => _)(await util_1.getPatchedGameFile(version)));
        }
        catch (e) {
            if (!(e instanceof Error))
                throw e;
            return res.status(400).send(e.message);
        }
    });
    app.get(/\/(api\/)?public-game.min.js/, async (req, res) => {
        if (typeof req.query.hash !== "string")
            return res.status(400).send("No hash specified.");
        try {
            res.type("js").send(await util_1.getPatchedPublicGameFile(req.query.hash));
        }
        catch (e) {
            if (!(e instanceof Error))
                throw e;
            return res.status(400).send(e.message);
        }
    });
    app.get("/version", (req, res) => res.send(constants_1.VERSION));
    app.get("/download", (req, res) => res.redirect(constants_1.DOWNLOAD_LINK));
    app.post("/hit", (req, res) => {
        let current = { "ip": req.ip, timestamp: Date.now() };
        let data = JSON.parse(fs_1.default.readFileSync('../hits.json', 'utf8'));
        data.push(current);
        fs_1.default.writeFileSync('../hits.json', JSON.stringify(data));
        res.status(200);
        res.send({ "status": "success", "data": current });
    });
    app.get("/stats", (req, res) => {
        let data = JSON.parse(fs_1.default.readFileSync('../hits.json', 'utf8'));
        let validate = (a, b) => {
            return a.getFullYear() === b.getFullYear() &&
                a.getMonth() === b.getMonth() &&
                a.getDate() === b.getDate();
        };
        res.send({
            total: data.length,
            uniques: [...new Set(data.flatMap(({ ip }) => ip))].sort().length,
            timeData: {
                today: {
                    count: (data.map((x) => {
                        if (validate(new Date(), new Date(x.timestamp))) {
                            return x;
                        }
                    }).filter(Boolean)).length,
                    uniques: [...new Set((data.map((x) => {
                            if (validate(new Date(), new Date(x.timestamp))) {
                                return x;
                            }
                        }).filter(Boolean)).flatMap(({ ip }) => ip))].sort().length
                }
            }
        });
    });
    const addr = app.listen(process.env.PORT ?? 1337, () => console.log(`P-NP has started on :${typeof addr === "string" ? addr : addr?.port ?? ""}!`)).address();
})();
