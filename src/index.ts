import type { Server } from "http";
import express from "express";
import cors from "cors";
import { getGameStatus, getPatchedGameFile, getPatchedPublicGameFile } from "./util";
import { DOWNLOAD_LINK, VERSION } from "./constants";
import beautify from "js-beautify";
import fs from 'fs';
const unminifySource = false;

(async () => {
	const app = express();
	app.set('trust proxy', true)
	const gs = await getGameStatus();

	if (!gs) throw new Error("The game status request failed.");

	app.use(cors());
	app.use((req, res, next) => {
		res.set('Cache-Control', 'no-store')
		next()
	})

	app.get(/\/(api\/)?game.min.js/, async (req, res) => {
		if (req.query.version && typeof req.query.version !== "string")
			return res.status(400).send("Invalid version specified.");
		const version = req.query.version ?? gs.gameClientVersion;
		try {
			res.type("js").send(
				(unminifySource ? beautify : (_: any) => _)
					(await getPatchedGameFile(version))
			);
		} catch (e: unknown) {
			if (!(e instanceof Error)) throw e;
			return res.status(400).send(e.message);
		}
	});
	app.get(/\/(api\/)?public-game.min.js/, async (req, res) => {
		if (typeof req.query.hash !== "string")
			return res.status(400).send("No hash specified.");
		try {
			res.type("js").send(await getPatchedPublicGameFile(req.query.hash));
		} catch (e: unknown) {
			if (!(e instanceof Error)) throw e;
			return res.status(400).send(e.message);
		}
	});

	app.get("/version", (req, res) => res.send(VERSION));
	app.get("/download", (req, res) => res.redirect(DOWNLOAD_LINK));
	app.post("/hit", (req, res) => {
		let current = { "ip": req.ip, timestamp: Date.now() }
		let data = JSON.parse(fs.readFileSync('../hits.json', 'utf8'))
		data.push(current)
		fs.writeFileSync('../hits.json', JSON.stringify(data))
		res.status(200)
		res.send({ "status": "success", "data": current })
	});
	app.get("/stats", (req, res) => {
		let data = JSON.parse(fs.readFileSync('../hits.json', 'utf8'))

		let validate = (a: any, b: any) => {


			return a.getFullYear() === b.getFullYear() &&
				a.getMonth() === b.getMonth() &&
				a.getDate() === b.getDate();

		}

		res.send({

			total: data.length,
			uniques: [...new Set(data.flatMap(({ ip }: { ip: any }) => ip))].sort().length,
			timeData: {

				today: {

					count: (data.map((x: any) => {
						if (validate(new Date(), new Date(x.timestamp))) {

							return x

						}
					}).filter(Boolean)).length,
					uniques:
						[...new Set((data.map((x: any) => {
							if (validate(new Date(), new Date(x.timestamp))) {

								return x

							}
						}).filter(Boolean)).flatMap(({ ip }: { ip: any }) => ip))].sort().length

				}



			}
		})
	});

	const addr: ReturnType<Server["address"]> = app.listen(process.env.PORT ?? 1337, () =>
		console.log(`P-NP has started on :${typeof addr === "string" ? addr : addr?.port ?? ""}!`)).address();
})();
