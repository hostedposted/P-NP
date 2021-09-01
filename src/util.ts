import fetch from "node-fetch";
import _ from "lodash";
import { VERSION } from "./constants";
import { displayImages } from "./displayImages";
import { transform } from "sucrase";


const es6 = (...args: Parameters<typeof String["raw"]>) => transform(String.raw(...args), { transforms: ["typescript"] }).code;

// insert your own developer cheat menu here, if not it'll default to WCM
// CAUTION: only use cheat menus you completely trust. cheat menus have complete access
const cheatMenuLink = ""
	|| "https://raw.githubusercontent.com/Prodigy-Hacking/ProdigyMathGameHacking/HEAD/willsCheatMenu/dist/bundle.js";

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

setInterval(() => {
	lastGameStatus = null;
}, 30*60*1000); // 30 minutes

const gameFileCache: Record<string, string> = {};

export const getGameFile = async (version: string): Promise<string> => {
	if (version in gameFileCache) return gameFileCache[version];
	if (!version.match(/^[0-9-.]+$/)) throw new Error("Invalid version specified.");
	try {
		return (gameFileCache[version] = await (
			await fetch(`https://code.prodigygame.com/code/${version}/game.min.js?v=${version}`)
		).text());
	} catch (e: unknown) {
		throw new Error(`Could not fetch game file with version ${version}.\nReason: ${e}`);
	}
};

export const logtraffic = () => {
	
}

export const patchGameFile = (str: string): string => {
	const variables = [str.match(/window,function\((.)/)![1], str.match(/var (.)={}/)![1]] as string[];
	const patches: [string | RegExp, string][] = Object.entries({
		[`s),this._game=${variables![1]}`]: `s),this._game=${variables![1]};
			jQuery.temp = window._;
			let lodashChecker = setInterval(() => {
				if (jQuery.temp !== window._) {
					window._ = jQuery.temp;
					delete jQuery.temp;
					clearInterval(lodashChecker);
				}
			});
			Object.defineProperty(window._, "instance", { 
				get: () => ${variables![0]}.instance,
		enumerable: true,
	configurable: true
			});`,
		[`${variables![0]}.constants=Object`]: `window._.constants=${variables![0]},${variables![0]}.constants=Object`,
		[`window,function(${variables![0]}){var ${variables![1]}={};`]: `window,function(${variables![0]}){var ${variables![1]}={};window._.modules=${variables![1]};`,
		[`${variables![0]}.prototype.hasMembership=`]: `${variables![1]}.prototype.hasMembership=_=>true,${variables![1]}.prototype.originalHasMembership=`,
		"answerQuestion=function(){": `answerQuestion=function(){
			if (!_.constants.get('GameConstants.Debug.EDUCATION_ENABLED')) {
				const wasCorrect = Math.random() < _.constants.get('GameConstants.Debug.AUTO_ANSWER_CORRECT_PERCENT');
                this.onQuestionAnswered.dispatch(wasCorrect, 0, null);
                if (wasCorrect) {
                    this.onQuestionAnsweredCorrectly.dispatch(0, null);
                } else {
                    this.onQuestionAnsweredIncorrectly.dispatch(0, null);
                }
                return;
			}
		`
	});
	patches.push([/type\.sendEvent=function\((.), (.), (.)\) \{/, `type.sendEvent=function($1, $2, $3) {
			if (!_.constants.get('GameConstants.Debug.EDUCATION_ENABLED')) {
				return
			}
		`])
	patches.push([/(var .=this.findParameter("externalFactory"))/, `
	if (!_.constants.get('GameConstants.Debug.EDUCATION_ENABLED')) {
		const wasCorrect: boolean = Math.random() < _.constants.get('GameConstants.Debug.AUTO_ANSWER_CORRECT_PERCENT');
		this.finish({ answerCorrect: wasCorrect, responseTime: 0 });
		return;
	}
	$1`]);
	patches.push([/openQuestionInterfaceThenEmitNotifications=function\((.), (.), (.), (.), (.)\) \{/, `openQuestionInterfaceThenEmitNotifications=function($1, $2, $3, $4, $5) {
	if (!_.constants.get('GameConstants.Debug.EDUCATION_ENABLED')) {
		const wasCorrect = true;
		const skill = {}
		const questionAnswerResponse = { eventType, skill, wasCorrect };
		this.fireEvent(MathTowerNotificationType.TOWER_TOWN_QUESTION_ANSWERED, questionAnswerResponse);
		if (callback) {
			callback(wasCorrect, 10, 1, false, false, skill);
		}
		return;
	}
	`]);
	patches.push([/.\.setContentVisible\(!1\)\}\)/, "})"]);
	return `
${es6`
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

${es6`
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
	console.log("%cVersion ${VERSION}", "font-size:20px;color:#000025;font-weight:700;font-family:sans-serif;");
	
	console.image((e => e[Math.floor(Math.random() * e.length)])(${JSON.stringify(displayImages)}));
	SW.Load.onGameLoad();
	setTimeout(() =>
		(async () =>
			eval(
				await (
					await fetch(
						"${cheatMenuLink}"
					)
				).text()
			)
		)(), 15000);
	console.trace = () => {};
`}
`;
}

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
