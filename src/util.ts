import fetch from "node-fetch";
import _ from "lodash";
import { VERSION } from "./constants";
import { displayImages } from "./displayImages";
import { transform } from "sucrase";


const es6 = (...args: Parameters<typeof String["raw"]>) => transform(String.raw(...args), { transforms: [ "typescript" ] }).code;


let lastGameStatus: GameStatus | null = null;

export const getGameStatus = async (): Promise<GameStatus | null> => {
	if (lastGameStatus) return lastGameStatus;
	try {
		const json = (await (await fetch("https://play.prodigygame.com/play")).text()).match(
			/(?<=gameStatusDataStr = ').+(?=')/
		);
		if (!json?.length) return null;
		return JSON.parse(json[0]);
	} catch (e: unknown) {
		console.warn(`An error occurred while obtaining the game status.\n${e}`);
		return null;
	}
};

const gameFileCache: Record<string, string> = {};

export const getGameFile = async (version: string): Promise<string> => {
	if (version in gameFileCache) return gameFileCache[version];
	if (!version.match(/^[0-9-]+$/)) throw new Error("Invalid version specified.");
	try {
		return (gameFileCache[version] = await (
			await fetch(`https://code.prodigygame.com/code/${version}/game.min.js?v=${version}`)
		).text());
	} catch (e: unknown) {
		throw new Error(`Could not fetch game file with version ${version}.\nReason: ${e}`);
	}
};

const patches = Object.entries({
	"s),this._game=i}": `s),this._game=i};
		jQuery.temp = _;
		let lodashChecker = setInterval(() => {
			if (jQuery.temp !== _) {
				_ = jQuery.temp;
				delete jQuery.temp;
				clearInterval(lodashChecker);
			}
		});
		Object.defineProperty(_, "instance", { get: () => t.instance });`,
	"t.constants=Object": `_.constants=t,t.constants=Object`,
	"window,function(t){var i={};": `window,function(t){var i={};_.modules=i;`,
	"this._player=t": "this._player=_.player=t",
	"i.prototype.hasMembership=": "i.prototype.hasMembership=_=>true,i.prototype.originalHasMembership=",
});

export const patchGameFile = (str: string): string => `
${es6`
	/** DO NOT TOUCH **/
	const _getBox=(o,t)=>({string:"+",style:"font-size: 1px; padding: 0 "+Math.floor(o/2)+"px; line-height: "+t+"px;"});
	console.image=((o,t=1)=>{const e=new Image;e.onload=(()=>{const n=_getBox(e.width*t,e.height*t);
	console.log("%c"+n.string,n.style+"background: url("+o+"); background-size: "+e.width*t+"px "
	+e.height*t+"px; color: transparent;")}),e.src=o});
	/** ok touch now */
	const oldLog = console.log.bind(console);
	console.log = (...d) => {
		if (d?.[0]?.includes("This is a browser feature for developers only")) return "lol no";
		if (new Error().stack?.split("\n").reverse()[0]?.includes("load-identity")) return "fuck you";
		return oldLog(...d);
	};
	_.variables = Object.create(null);
`}

${patches.reduce((l, c) => l.replace(...c), str)}

${es6`
	_.functions = Object.create(null);
	_.functions.escapeBattle = () => {
		const currentState = _.instance.game.state.current;
		if (currentState === "PVP") _.instance.game.state.states.PVP.endPVP();
		else if (currentState === "CoOp") _.instance.prodigy.world.$(_.player.data.zone);
		else _.instance.game.state.callbackContext.runAwayCallback();
	};
	Object.defineProperty(_, "gameData", { 
		get: () => _.instance.game.state.states.get("Boot")._gameData
	});
	Object.defineProperty(_, "localizer", {
		get: () => _.instance.prodigy.gameContainer.get("LocalizationService")
	});
	Object.defineProperty(_, "network", {
		get: () => _.player.game.input.onDown._bindings[0].context
	});
	Object.defineProperty(_, "hack", {
		get: () => _
	});

	console.log("%cP-NP Patcher", "font-size:40px;color:#540052;font-weight:900;font-family:sans-serif;");
	console.log("%cVersion ${VERSION}", "font-size:20px;color:#000025;font-weight:700;font-family:sans-serif;");
	
	console.image((e => e[Math.floor(Math.random() * e.length)])(${JSON.stringify(displayImages)}));
	SW.Load.onGameLoad();
    setTimeout(() => {
        (async () => {
          eval(
            await (
              await fetch(
                "https://raw.githubusercontent.com/Prodigy-Hacking/ProdigyMathGameHacking/HEAD/willsCheatMenu/dist/bundle.js"
              )
            ).text()
          );
        })();
      }, 10000);
`}
`;

const patchedGameFileCache: Record<string, string> = {};

export const getPatchedGameFile = async (version: string): Promise<string> => {
	if (version in patchedGameFileCache) return patchedGameFileCache[version];
	return (patchedGameFileCache[version] = patchGameFile(await getGameFile(version)));
};

let patchedPublicGameFile: string | null = null;

export const getPatchedPublicGameFile = async (hash: string): Promise<string> => {
	if (patchedPublicGameFile) return patchedPublicGameFile;
	if (!hash.match(/^[a-fA-F0-9]+$/)) throw new Error("Invalid hash.");
	const file = await (await fetch(`https://code.prodigygame.com/js/public-game-${hash}.min.js`)).text();
	return (patchedPublicGameFile = `
	(() => {
		const console = new Proxy({}, { get: () => () => {} });
		${file}
	})();
	`);
};
