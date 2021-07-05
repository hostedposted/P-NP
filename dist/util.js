"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPatchedPublicGameFile = exports.getPatchedGameFile = exports.patchGameFile = exports.logtraffic = exports.getGameFile = exports.getGameStatus = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const constants_1 = require("./constants");
const displayImages_1 = require("./displayImages");
const sucrase_1 = require("sucrase");
const es6 = (...args) => sucrase_1.transform(String.raw(...args), { transforms: ["typescript"] }).code;
let lastGameStatus = null;
exports.getGameStatus = async () => {
    if (lastGameStatus)
        return lastGameStatus;
    try {
        const json = (await (await node_fetch_1.default("https://play.prodigygame.com/play")).text()).match(/(?<=gameStatusDataStr = ').+(?=')/);
        if (!json?.length)
            return null;
        return JSON.parse(json[0]);
    }
    catch (e) {
        console.warn(`An error occurred while obtaining the game status.\n${e}`);
        return null;
    }
};
const gameFileCache = {};
exports.getGameFile = async (version) => {
    if (version in gameFileCache)
        return gameFileCache[version];
    if (!version.match(/^[0-9-]+$/))
        throw new Error("Invalid version specified.");
    try {
        return (gameFileCache[version] = await (await node_fetch_1.default(`https://code.prodigygame.com/code/${version}/game.min.js?v=${version}`)).text());
    }
    catch (e) {
        throw new Error(`Could not fetch game file with version ${version}.\nReason: ${e}`);
    }
};
exports.logtraffic = () => {
};
const patches = Object.entries({
    "s),this._game=p}": `s),this._game=p};
		jQuery.temp = _;
		let lodashChecker = setInterval(() => {
			if (jQuery.temp !== _) {
				_ = jQuery.temp;
				delete jQuery.temp;
				clearInterval(lodashChecker);
			}
		});
		Object.defineProperty(_, "instance", { 
			get: () => O.instance,
	enumerable: true,
configurable: true
		});`,
    "O.constants=Object": `_.constants=O,O.constants=Object`,
    "window,function(O){var p={};": `window,function(O){var p={};_.modules=p;`,
    "p.prototype.hasMembership=": "p.prototype.hasMembership=_=>true,p.prototype.originalHasMembership=",
});
exports.patchGameFile = (str) => `
${es6 `
	/** DO NOT TOUCH **/
	const _getBox=(o,t)=>({string:"+",style:"font-size: 1px; padding: 0 "+Math.floor(o/2)+"px; line-height: "+t+"px;"});
	console.image=((o,t=1)=>{const e=new Image;e.onload=(()=>{const n=_getBox(e.width*t,e.height*t);
	console.log("%c"+n.string,n.style+"background: url("+o+"); background-size: "+e.width*t+"px "
	+e.height*t+"px; color: transparent;")}),e.src=o});
	/** ok touch now */
	const oldLog = console.log.bind(console);
	console.log = (...d) => {
		if (d && d.length && typeof d[0] === "string" && d[0].includes("This is a browser feature for developers only")) return "lol no";
		if (new Error().stack?.split("\n").reverse()[0]?.includes("load-identity")) return "fuck you";
		return oldLog(...d);
	};
	_.variables = Object.create(null);
`}

${patches.reduce((l, c) => l.replace(...c), str)}

${es6 `
	_.functions = Object.create(null);
	_.functions.escapeBattle = () => {
		const currentState = _.instance.game.state.current;
		if (currentState === "PVP") _.instance.game.state.states.PVP.endPVP();
		else if (currentState === "CoOp") _.instance.prodigy.world.$(_.player.data.zone);
		else _.instance.game.state.callbackContext.runAwayCallback();
	};
	Object.defineProperty(_, "player", {
		get: () => _.${str.match(new RegExp("instance.prodigy.gameContainer.get\\(\"...-....\"\\).player"))?.[0]},
		enumerable: true,
configurable: true
	});
	Object.defineProperty(_, "gameData", { 
		get: () => _.instance.game.state.states.get("Boot")._gameData,
enumerable: true,
configurable: true
	});
	Object.defineProperty(_, "localizer", {
		get: () => _.instance.prodigy.gameContainer.get("LocalizationService"),
enumerable: true,
configurable: true
	});
	Object.defineProperty(_, "network", {
		get: () => _.player.game.input.onDown._bindings[0].context,
enumerable: true,
configurable: true
	});
	Object.defineProperty(_, "hack", {
enumerable: true,
configurable: true,
		get: () => _
	});

	console.log("%cP-NP Patcher", "font-size:40px;color:#540052;font-weight:900;font-family:sans-serif;");
	console.log("%cVersion ${constants_1.VERSION}", "font-size:20px;color:#000025;font-weight:700;font-family:sans-serif;");
	
	console.image((e => e[Math.floor(Math.random() * e.length)])(${JSON.stringify(displayImages_1.displayImages)}));
	SW.Load.onGameLoad();
	setTimeout(() =>
		(async () =>
			eval(
				await (
					await fetch(
						"https://raw.githubusercontent.com/Prodigy-Hacking/ProdigyMathGameHacking/HEAD/willsCheatMenu/dist/bundle.js"
					)
				).text()
			)
		)(), 10000);
`}
`;
const patchedGameFileCache = {};
exports.getPatchedGameFile = async (version) => {
    if (version in patchedGameFileCache)
        return patchedGameFileCache[version];
    return (patchedGameFileCache[version] = exports.patchGameFile(await exports.getGameFile(version)));
};
let patchedPublicGameFile = null;
exports.getPatchedPublicGameFile = async (hash) => {
    if (patchedPublicGameFile)
        return patchedPublicGameFile;
    if (!hash.match(/^[a-fA-F0-9]+$/))
        throw new Error("Invalid hash.");
    const file = await (await node_fetch_1.default(`https://code.prodigygame.com/js/public-game-${hash}.min.js`)).text();
    return (patchedPublicGameFile = `
	(() => {
		const console = new Proxy({}, { get: () => () => {} });
		${file}
	})();
	`);
};
