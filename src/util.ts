import fetch from "node-fetch";
import _ from "lodash";
import { VERSION } from "./constants";

let lastGameStatus: GameStatus | null = null;

export const getGameStatus = async (): Promise<GameStatus | null> => {
  if (lastGameStatus) return lastGameStatus;
  try {
    const json = (
      await (await fetch("https://play.prodigygame.com/play")).text()
    ).match(/(?<=gameStatusDataStr = ').+(?=')/);
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
  if (!version.match(/^[0-9-]+$/))
    throw new Error("Invalid version specified.");
  try {
    return (gameFileCache[version] = await (
      await fetch(
        `https://code.prodigygame.com/code/${version}/game.min.js?v=${version}`
      )
    ).text());
  } catch (e: unknown) {
    throw new Error(
      `Could not fetch game file with version ${version}.\nReason: ${e}`
    );
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
  "i.prototype.hasMembership=":
    "i.prototype.hasMembership=_=>true,i.prototype.originalHasMembership=",
});

export const patchGameFile = (str: string): string => `
/** DO NOT TOUCH **/
const _getBox=(o,t)=>({string:"+",style:"font-size: 1px; padding: 0 "+Math.floor(o/2)+"px; line-height: "+t+"px;"});
console.image=((o,t=1)=>{const e=new Image;e.onload=(()=>{const n=_getBox(e.width*t,e.height*t);
	console.log("%c"+n.string,n.style+"background: url("+o+"); background-size: "+e.width*t+"px "
	+e.height*t+"px; color: transparent;")}),e.src=o});
/** ok touch now */
	const oldLog = console.log.bind(console);
	console.log = (...d) => {
		if (d[0]?.includes?.("This is a browser feature for developers only")) return "lol no";
		if (new Error().stack.split("\\n").reverse()[0].includes("load-identity")) return "fuck you";
		return oldLog(...d);
	};
	_.variables = Object.create(null);
	${patches.reduce((l, c) => l.replace(...c), str)}

	_.functions = Object.create(null);
	_.functions.escapeBattle = () => {
		const currentState = _.instance.game.state.current;
		if (currentState === "PVP") _.instance.game.state.states.PVP.endPVP();
		else if (currentState === "CoOp") _.instance.prodigy.world.$(_.player.data.zone);
		else _.instance.game.state.callbackContext.runAwayCallback();
	};
	Object.defineProperty(_, "gameData", { 
		get: () => _.instance.game.state.states.get('Boot')._gameData
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
	
	console.image((e => e[Math.floor(Math.random() * e.length)])([
		"https://i.imgur.com/bPtAQ8I.png",
		"https://i.imgur.com/EVbS5zG.png",
		"https://i.imgur.com/ij1DgZi.png",
		"https://i.imgur.com/lJTWDu2.png",
		"https://i.imgur.com/EPAdHYN.png",
		"https://i.imgur.com/5S5Tr1t.png",
		"https://i.imgur.com/d3BGwnZ.png",
		"https://i.imgur.com/Thdxszk.png",
		"https://i.imgur.com/zpyv4TJ.png",
		"https://i.imgur.com/lHztg3K.png",
		"https://i.imgur.com/Odu0WDF.png",
		"https://i.imgur.com/ExRgzlL.png",
		"https://i.imgur.com/2tj8ArT.png",
		"https://i.imgur.com/JMVR4wZ.png",
		"https://i.imgur.com/QhybQ9J.png",
		"https://i.imgur.com/sFdJp9c.png",
		"https://i.imgur.com/N4XnUY6.png",
		"https://i.imgur.com/0ivwtH8.png",
		"https://i.imgur.com/qJJh7nf.png",
		"https://i.imgur.com/BTnE99I.png",
		"https://i.imgur.com/T0LEsCe.png",
		"https://i.imgur.com/Nh20Jwl.png",
		"https://i.imgur.com/MvV56er.png",
		"https://i.imgur.com/Jyd6Uuy.png",
		"https://i.imgur.com/a3Tfych.png",
		"https://i.imgur.com/oNZIEhl.png",
		"https://i.imgur.com/VEJxBcM.png",
		"https://i.imgur.com/5UvWETx.png",
		"https://i.imgur.com/Pt9u23U.png",
		"https://i.imgur.com/Q5nVNus.png",
		"https://i.imgur.com/bDtTVd4.png",
		"https://i.imgur.com/0xAJCAy.png",
		"https://i.imgur.com/2rm0eUH.png",
		"https://i.imgur.com/lrbPvoc.png",
		"https://i.imgur.com/2xz4muk.png",
		"https://i.imgur.com/vURg371.png",
		"https://i.imgur.com/woEnk7L.png",
		"https://i.imgur.com/NX4pThk.png",
		"https://i.imgur.com/qwIznNP.png",
		"https://i.imgur.com/hwPeqbQ.png",
		"https://i.imgur.com/c4kM2cV.png",
		"https://i.imgur.com/k3CTGox.png",
		"https://i.imgur.com/SidLEMT.png",
		"https://i.imgur.com/C7uQ4mr.png",
		"https://i.imgur.com/orHdDCF.png",
		"https://i.imgur.com/caJF6R6.png",
		"https://i.imgur.com/hPZtRjb.png",
		"https://i.imgur.com/rwlTCpQ.png",
		"https://i.imgur.com/r0gIjUt.png",
		"https://i.imgur.com/k4YfiWs.png",
		"https://i.imgur.com/R89VSXH.png",
		"https://i.imgur.com/5X4tgvR.png",
		"https://i.imgur.com/E79ZaFT.png",
		"https://i.imgur.com/rZEGd27.png",
		"https://i.imgur.com/v5pDXsL.png",
		"https://i.imgur.com/VEHoaR9.png",
		"https://i.imgur.com/qyKbB5L.png",
		"https://i.imgur.com/NG0rZgL.png",
		"https://i.imgur.com/l3UODvl.png",
		"https://i.imgur.com/fQFxBi5.png",
		"https://i.imgur.com/dybtFOP.png",
		"https://i.imgur.com/iPua2Dg.png",
		"https://i.imgur.com/pXK2yWH.png",


	]));
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
      


`;

const patchedGameFileCache: Record<string, string> = {};

export const getPatchedGameFile = async (version: string): Promise<string> => {
  if (version in patchedGameFileCache) return patchedGameFileCache[version];
  return (patchedGameFileCache[version] = patchGameFile(
    await getGameFile(version)
  ));
};

let patchedPublicGameFile: string | null = null;

export const getPatchedPublicGameFile = async (
  hash: string
): Promise<string> => {
  if (patchedPublicGameFile) return patchedPublicGameFile;
  if (!hash.match(/^[a-fA-F0-9]+$/)) throw new Error("Invalid hash.");
  const file = await (
    await fetch(`https://code.prodigygame.com/js/public-game-${hash}.min.js`)
  ).text();
  return (patchedPublicGameFile = `
	(() => {
		const console = new Proxy({}, { get: () => () => {} });
		${file}
	})();
	`);
};
