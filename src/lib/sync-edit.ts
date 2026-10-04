import * as anime from "$lib/anime";
import { activeIndex } from "$lib/store";
import * as oekaki from "@onjmin/oekaki";
import { get, writable } from "svelte/store";

/**
 * 同じ方向（同じ行）のコマへ操作を一括で適用する
 */
export const isSyncWay = writable(false);
/**
 * 同じ番目（同じ列）のコマへ操作を一括で適用する
 */
export const isSyncFrame = writable(false);

/**
 * 一括適用先のコマ番号（編集中のコマは含まない）
 */
export const syncTargets = (index: number): number[] => {
	if (!anime.ready) return [];
	const [x, y] = anime.toXY(index);
	const targets = new Set<number>();
	if (get(isSyncWay))
		for (let xx = 0; xx < anime.frames; xx++) targets.add(anime.toI(xx, y));
	if (get(isSyncFrame))
		for (let yy = 0; yy < anime.ways; yy++) targets.add(anime.toI(x, yy));
	targets.delete(index);
	return [...targets];
};

/**
 * 直前に確定した時点の画素（差分を取るための基準）
 */
let base: { layer: oekaki.LayeredCanvas; data: Uint8ClampedArray } | null =
	null;

/**
 * 差分の基準を今の画素で取り直す
 *
 * レイヤーやコマを切り替えたときに呼ぶ
 */
export const resetSyncBase = (layer: oekaki.LayeredCanvas | undefined) => {
	base = layer ? { layer, data: layer.data.slice() } : null;
};

/**
 * 編集中のレイヤーで変わった画素を、一括適用先のコマにも書き込む
 *
 * 書き込み先は各コマの「同じ重ね順のレイヤー」。足りなければ一番上、
 * レイヤーが無いコマには新しく作る。
 * 操作そのものではなく結果の画素を写すので、ペン・消しゴム・塗りつぶし・全消し・Undo/Redoが対象。
 * 移動系（ハンド・選択範囲）は絵がずれてしまうので呼び出し側で対象外にする
 */
export const syncEdit = (layer: oekaki.LayeredCanvas | undefined) => {
	if (!layer) return;
	if (!base || base.layer !== layer) {
		resetSyncBase(layer);
		return;
	}
	const before = base.data;
	const after = layer.data;
	resetSyncBase(layer);

	const index = get(activeIndex);
	const targets = syncTargets(index);
	if (!targets.length) return;

	const changed: number[] = [];
	for (let i = 0; i < after.length; i += 4) {
		if (
			before[i] !== after[i] ||
			before[i + 1] !== after[i + 1] ||
			before[i + 2] !== after[i + 2] ||
			before[i + 3] !== after[i + 3]
		)
			changed.push(i);
	}
	if (!changed.length) return;

	const current = oekaki.getLayers();
	const order = Math.max(0, current.indexOf(layer));
	for (const t of targets) {
		let layers = anime.layersByI.get(t);
		if (!layers?.length) {
			oekaki.setLayers([]);
			layers = [new oekaki.LayeredCanvas("レイヤー #1")];
			anime.layersByI.set(t, layers);
		}
		const target = layers[Math.min(order, layers.length - 1)];
		const data = target.data;
		for (const i of changed) {
			data[i] = after[i];
			data[i + 1] = after[i + 1];
			data[i + 2] = after[i + 2];
			data[i + 3] = after[i + 3];
		}
		target.data = data;
		target.trace();
		target.used = true;

		oekaki.setLayers(layers);
		const canvas = oekaki.render();
		anime.canvasByI.set(t, canvas);
		anime.dataURLByI.set(t, canvas.toDataURL("image/png"));
	}
	oekaki.setLayers(current);
};
