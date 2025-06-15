import * as unjStorage from "$lib/unj-storage.js";
import type * as oekaki from "@onjmin/oekaki";

export let width: number;
export let height: number;
export let frames: number;
export let ways: number;
export let waysOrder: Way[];
export const toI = (x: number, y: number) => x + y * frames;
export const toXY = (i: number) => [i % frames, Math.floor(i / frames)];
export const init = (
	_width: number,
	_height: number,
	_frames: number,
	_waysStr: string,
) => {
	width = _width;
	height = _height;
	const _ways = strToWays(_waysStr);
	ways = _ways.length;
	frames = _frames;
	waysOrder = _ways;
	iByWay.clear();
	for (const [i, v] of _ways.entries()) {
		iByWay.set(v, i * frames);
	}
	layersByI.clear();
	canvasByI.clear();
	dataURLByI.clear();
};

export const iByWay = new Map<Way, number>();
export const layersByI = new Map<number, oekaki.LayeredCanvas[]>();
export const canvasByI = new Map<number, HTMLCanvasElement>();
export const dataURLByI = new Map<number, string>();

type Way = {
	key: string;
	label: string;
};

export const way = {
	w: { key: "w", label: "後" },
	a: { key: "a", label: "左" },
	s: { key: "s", label: "前" },
	d: { key: "d", label: "右" },
	q: { key: "q", label: "左後" },
	e: { key: "e", label: "右後" },
	z: { key: "z", label: "左前" },
	c: { key: "c", label: "右前" },
} as const;
type WayKey = keyof typeof way;

export const waysToStr = (ways: Way[]) => ways.map((v) => v.key).join("");
export const strToWays = (str: string): Way[] =>
	str
		.split("")
		.map((v) => (v in way ? way[v as WayKey] : { key: v, label: "" }));

export const RPGEN = {
	label: "RPGEN",
	w: 16,
	h: 16,
	frames: 2,
	ways: [way.w, way.d, way.s, way.a],
};

export const RPGMaker2000 = {
	label: "RPGツクール2000",
	w: 24,
	h: 32,
	frames: 3,
	ways: [way.w, way.d, way.s, way.a],
};

export const RPGMakerXP = {
	label: "RPGツクールXP",
	w: 32,
	h: 48,
	frames: 4,
	ways: [way.s, way.a, way.d, way.w],
};

export const RPGMakerVX = {
	label: "RPGツクールVX",
	w: 32,
	h: 32,
	frames: 3,
	ways: [way.s, way.a, way.d, way.w],
};

export const RPGMakerMV = {
	label: "RPGツクールMV",
	w: 48,
	h: 48,
	frames: 3,
	ways: [way.s, way.a, way.d, way.w],
};

/**
 * 業界規格
 */
export const standards = [
	RPGEN,
	RPGMaker2000,
	RPGMakerXP,
	RPGMakerVX,
	RPGMakerMV,
];

export const defaultStandard =
	standards.find((v) => v.label === unjStorage.standard.value) ?? RPGEN;
