import type * as oekaki from "@onjmin/oekaki";

export let ways: number;
export let frames: number;
export let waysOrder: Way[];
export const toI = (way: number, frame: number) => way * frames + frame;
export const init = (_ways: number, _frames: number, _waysOrder: Way[]) => {
	ways = _ways;
	frames = _frames;
	waysOrder = _waysOrder;
};

export const layersByI = new Map<number, oekaki.LayeredCanvas[]>();
export const imageByI = new Map<number, string>();

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
