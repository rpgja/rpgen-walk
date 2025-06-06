import * as anime from "$lib/anime";
import { activeIndex } from "$lib/store";
import * as oekaki from "@onjmin/oekaki";
import { get } from "svelte/store";
import { writable } from "svelte/store";

export const isOnionSkin = writable(false);

const draw = () => {
	const lower = oekaki.lowerLayer.value;
	if (!lower) return;
	lower.clear();
	if (get(isOnionSkin)) {
		const index = get(activeIndex);
		const [x, y] = anime.toXY(index);
		let prevX = x - 1;
		if (prevX === -1) prevX = anime.frames - 1;
		const i = anime.toI(prevX, y);
		const canvas = anime.canvasByI.get(i);
		if (!canvas) return;
		lower.ctx.globalAlpha = 0.4;
		lower.ctx.drawImage(canvas, 0, 0);
	}
};
activeIndex.subscribe(draw);
isOnionSkin.subscribe(draw);
