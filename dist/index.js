"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const util_1 = require("./util");
const constants_1 = require("./constants");
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
            res.type("js").send(await util_1.getPatchedGameFile(version));
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
    app.get("/test", (req, res) => res.send(req.ip));
    const addr = app.listen(process.env.PORT ?? 1337, () => console.log(`P-NP has started on :${typeof addr === "string" ? addr : addr?.port ?? ""}!`)).address();
})();
