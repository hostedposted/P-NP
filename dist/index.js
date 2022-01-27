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
        let validate = (a, b, type) => {
            switch (type) {
                case "day":
                    return a.getFullYear() === b.getFullYear() &&
                        a.getMonth() === b.getMonth() &&
                        a.getDate() === b.getDate();
                    break;
                case "week":
                    return a.getFullYear() === b.getFullYear() &&
                        a.getMonth() === b.getMonth() &&
                        Math.ceil((a.getDate() - 1 - a.getDay()) / 7) === Math.ceil((b.getDate() - 1 - b.getDay()) / 7);
                    break;
                case "month":
                    return a.getFullYear() === b.getFullYear() &&
                        a.getMonth() === b.getMonth();
                    break;
            }
        };
        res.send({
            total: data.length,
            uniques: [...new Set(data.flatMap(({ ip }) => ip))].sort().length,
            timeData: {
                // @ts-ignore
                recent: ["day", "week", "month"].map((y) => { return [y, { count: data.map((x) => { if (validate(new Date(), new Date(x.timestamp), y)) {
                            return x;
                        } }).filter(Boolean).length, uniques: [...(data.map((x) => { if (validate(new Date(), new Date(x.timestamp), y)) {
                                return x;
                            } }).filter(Boolean)).map(x => x.ip).reduce((acc, e) => acc.set(e, (acc.get(e) || 0) + 1), new Map()).keys()].length },]; }).reduce((o, v, i) => { return (o[v[0]] = v.slice(1)[0]), o; }, {}),
                analysis: {
                    // @ts-ignore
                    day: new Array(new Date(new Date().getYear(), new Date().getMonth(), 0).getDate()).fill().slice(0, new Date().getDate()).map((a, index) => index + 1).map((x, index) => { return [`${new Date().getMonth() + 1}/${index + 1}`, data.filter(y => { return new Date(y.timestamp).getFullYear() === new Date().getFullYear() && new Date(y.timestamp).getMonth() === new Date().getMonth() && new Date(y.timestamp).getDate() === x; }).length]; }),
                    //@ts-ignore
                    month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].slice(0, new Date().getMonth() + 1).map((x, m) => { return [x, data.filter((y) => { return new Date(y.timestamp).getYear() === new Date().getYear() && new Date(y.timestamp).getMonth() === m; }).length]; })
                }
            }
        });
    });
    const addr = app.listen(process.env.PORT ?? 1337, () => console.log(`P-NP has started on :${typeof addr === "string" ? addr : addr?.port ?? ""}!`)).address();
})();
