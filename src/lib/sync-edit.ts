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
 * 操作そのものではなく結果の画素を写すので、ペン・消しゴム・塗りつぶし・全消しが対象。
 * 移動系（ハンド・選択範囲）は絵がずれてしまうので、操作を記録して再生する（recordOp）。
 * Undo/Redoは写した先の履歴をたどる（linkHistory）
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
		linkHistory(layer, target, t);

		oekaki.setLayers(layers);
		const canvas = oekaki.render();
		anime.canvasByI.set(t, canvas);
		anime.dataURLByI.set(t, canvas.toDataURL("image/png"));
	}
	oekaki.setLayers(current);
};

/**
 * 一括適用先のコマにも同じ名前のレイヤーを一番上に追加する
 *
 * 追加したレイヤーをそのコマの選択レイヤーにもしておく
 */
export const syncAddLayer = (name: string) => {
	const targets = syncTargets(get(activeIndex));
	if (!targets.length) return;
	const current = oekaki.getLayers();
	for (const t of targets) {
		oekaki.setLayers([...(anime.layersByI.get(t) ?? [])]);
		const layer = new oekaki.LayeredCanvas(name);
		anime.layersByI.set(t, oekaki.getLayers());
		anime.activatedByI.set(t, layer);
	}
	oekaki.setLayers(current);
};

/**
 * 一括適用先のコマの同じ重ね順のレイヤーにも、表示・非表示や不透明度を反映する
 *
 * 書き込み先の選び方はsyncEdit()と同じ（足りなければ一番上）
 */
export const syncLayerProps = (
	layer: oekaki.LayeredCanvas | undefined,
	props: { visible?: boolean; opacity?: number },
) => {
	if (!layer) return;
	const targets = syncTargets(get(activeIndex));
	if (!targets.length) return;
	const current = oekaki.getLayers();
	const order = Math.max(0, current.indexOf(layer));
	for (const t of targets) {
		const layers = anime.layersByI.get(t);
		if (!layers?.length) continue;
		const target = layers[Math.min(order, layers.length - 1)];
		if (props.visible !== undefined) target.visible = props.visible;
		if (props.opacity !== undefined) target.opacity = props.opacity;

		oekaki.setLayers(layers);
		const canvas = oekaki.render();
		anime.canvasByI.set(t, canvas);
		anime.dataURLByI.set(t, canvas.toDataURL("image/png"));
	}
	oekaki.setLayers(current);
};

/**
 * 一括適用先のコマでも、同じ重ね順のレイヤーを1つ上（1）か下（-1）へ入れ替える
 *
 * 編集中のコマで入れ替える前に呼ぶこと。
 * そのコマに同じ重ね順のレイヤーが無い、または端で動かせないときは何もしない
 */
export const syncMoveLayer = (
	layer: oekaki.LayeredCanvas | undefined,
	dir: 1 | -1,
) => {
	if (!layer) return;
	const targets = syncTargets(get(activeIndex));
	if (!targets.length) return;
	const current = oekaki.getLayers();
	const order = current.indexOf(layer);
	if (order === -1) return;
	for (const t of targets) {
		const layers = anime.layersByI.get(t);
		if (!layers || order >= layers.length) continue;
		oekaki.setLayers([...layers]);
		const target = layers[order];
		const that = dir === 1 ? target.above : target.below;
		if (!that) continue;
		target.swap(that.index);
		anime.layersByI.set(t, oekaki.getLayers());

		const canvas = oekaki.render();
		anime.canvasByI.set(t, canvas);
		anime.dataURLByI.set(t, canvas.toDataURL("image/png"));
	}
	oekaki.setLayers(current);
};

/**
 * コマの合成画像（サムネイル）を描き直す
 */
const renderFrame = (index: number) => {
	if (index === get(activeIndex)) return; // 編集中のコマは描画後に更新される
	const layers = anime.layersByI.get(index);
	if (!layers) return;
	const current = oekaki.getLayers();
	oekaki.setLayers(layers);
	const canvas = oekaki.render();
	anime.canvasByI.set(index, canvas);
	anime.dataURLByI.set(index, canvas.toDataURL("image/png"));
	oekaki.setLayers(current);
};

// ───────────────────────────────────────────────────────
// Undo/Redo の連動
// ───────────────────────────────────────────────────────
// 各レイヤーの履歴（trace()の回数とUndo/Redoの位置）を写し取り、
// 一括適用で書き込んだ先のレイヤーを、書き込みの元になった履歴に紐づけておく。
// 元のレイヤーでUndo/Redoすると、紐づいたレイヤーも自分の履歴を1つたどる。
// 画素を写すのではないので、写した先にもともとあった絵がきちんと戻る

type Link = { layer: oekaki.LayeredCanvas; index: number };
type History = { entries: Link[][]; pos: number };
const histories = new WeakMap<oekaki.LayeredCanvas, History>();
const historyOf = (layer: oekaki.LayeredCanvas) => {
	let h = histories.get(layer);
	if (!h) {
		h = { entries: [], pos: 0 };
		histories.set(layer, h);
	}
	return h;
};

/**
 * 元のレイヤーの最新の履歴に、書き込んだ先のレイヤーを紐づける
 */
const linkHistory = (
	from: oekaki.LayeredCanvas,
	to: oekaki.LayeredCanvas,
	index: number,
) => {
	const h = historyOf(from);
	h.entries[h.pos - 1]?.push({ layer: to, index });
};

let propagating = false;
const proto = oekaki.LayeredCanvas.prototype as unknown as Record<
	string,
	(this: oekaki.LayeredCanvas, ...args: unknown[]) => unknown
>;
{
	const { trace, undo, redo } = proto;
	proto.trace = function () {
		trace.call(this);
		const h = historyOf(this);
		h.entries.length = h.pos;
		h.entries.push([]);
		h.pos++;
	};
	proto.undo = function () {
		const h = historyOf(this);
		const movable = this.editable && h.pos > 1;
		undo.call(this);
		if (!movable) return;
		h.pos--;
		follow(h.entries[h.pos], "undo");
	};
	proto.redo = function () {
		const h = historyOf(this);
		const movable = this.editable && h.pos < h.entries.length;
		redo.call(this);
		if (!movable) return;
		follow(h.entries[h.pos], "redo");
		h.pos++;
	};
}
const follow = (links: Link[], method: "undo" | "redo") => {
	if (propagating || !links.length) return;
	propagating = true;
	try {
		for (const { layer } of links) layer[method]();
	} finally {
		propagating = false;
	}
	for (const index of new Set(links.map((v) => v.index))) renderFrame(index);
};

// ───────────────────────────────────────────────────────
// 範囲選択・移動の連動
// ───────────────────────────────────────────────────────
// 移動系は結果の画素を写すと絵がずれるので、操作そのものを記録しておき、
// 選択が終わった時（解除・新しい選択・コマ切り替え）に一括適用先のレイヤーで再生する。
// 選択範囲はライブラリ全体で1つしか持てないため、選択中に再生すると今の選択が壊れてしまう。
// ドット単位の移動・回転は累積値を持つので、ライブラリが累積を戻すタイミング（ドラッグ開始）を
// "reset"として記録し、再生時も同じ所で戻す。そうすれば全く同じ結果になる

type Op = { method: string; args: unknown[] } | "reset";
type Session = {
	layer: oekaki.LayeredCanvas;
	index: number;
	order: number;
	ops: Op[];
};
let session: Session | null = null;
let replaying = false;
let depth = 0;

/**
 * 新しい選択を始めるメソッド（前の選択は解除される）
 */
const STARTERS = new Set([
	"select",
	"selectByDot",
	"selectFreehand",
	"selectFreehandByDot",
	"paste",
]);
/**
 * 絵を変えるメソッド（これを含まない記録は再生しても何も変わらない）
 */
const MUTATORS = new Set([
	"paste",
	"moveSelection",
	"moveSelectionByDot",
	"resizeSelection",
	"resizeSelectionByDot",
	"rotateSelection",
	"rotateSelectionByDot",
	"deleteSelection",
	"translate",
	"translateByDot",
]);

/**
 * ライブラリの累積値（ドット単位の移動・回転）を戻す
 *
 * resetTranslation()は公開されていないが、setDotSize()が中で呼ぶ。
 * 同じ値で呼び直すのでドットの大きさは変わらない
 */
const resetAccumulation = () => {
	if (anime.ready) oekaki.setDotSize(1, anime.height);
};

for (const method of [...STARTERS, ...MUTATORS, "deselect"]) {
	const original = proto[method];
	proto[method] = function (...args: unknown[]) {
		// 再生中や、メソッドの中から呼ばれた分（selectByDot→select等）は記録しない
		if (replaying || depth > 0) {
			depth++;
			try {
				return original.apply(this, args);
			} finally {
				depth--;
			}
		}
		if (STARTERS.has(method) || session?.layer !== this) flushSelectionSync();
		if (!session && method !== "deselect") {
			session = {
				layer: this,
				index: get(activeIndex),
				order: Math.max(0, oekaki.getLayers().indexOf(this)),
				ops: [],
			};
		}
		session?.ops.push({ method, args });
		depth++;
		try {
			return original.apply(this, args);
		} finally {
			depth--;
			if (method === "deselect") flushSelectionSync();
		}
	};
}

/**
 * ドラッグ開始（ライブラリが累積値を戻す時）を記録する
 */
export const markDragStart = () => {
	session?.ops.push("reset");
};

/**
 * 絵を変える操作（移動・貼り付けなど）を記録したまま、まだ再生していないか
 */
export const hasPendingSelectionMove = () =>
	!!session?.ops.some((op) => op !== "reset" && MUTATORS.has(op.method));

/**
 * 記録が選択範囲を含まない（ハンドツールだけ）なら、すぐ再生する
 */
export const flushTranslateSync = () => {
	if (!session) return;
	const hasSelection = session.ops.some(
		(op) => op !== "reset" && !op.method.startsWith("translate"),
	);
	if (!hasSelection) flushSelectionSync();
};

/**
 * 記録した操作を一括適用先のレイヤーで再生し、記録を終える
 */
export const flushSelectionSync = () => {
	const s = session;
	session = null;
	if (!s || replaying) return;
	if (!s.ops.some((op) => op !== "reset" && MUTATORS.has(op.method))) return;
	const targets = syncTargets(s.index);
	if (!targets.length) return;

	const current = oekaki.getLayers();
	replaying = true;
	try {
		for (const t of targets) {
			const layers = anime.layersByI.get(t);
			if (!layers?.length) continue;
			const target = layers[Math.min(s.order, layers.length - 1)];
			const before = target.data.slice();
			oekaki.setLayers([...layers]);
			resetAccumulation();
			for (const op of s.ops) {
				if (op === "reset") resetAccumulation();
				else proto[op.method].apply(target, op.args);
			}
			target.deselect();
			const after = target.data;
			if (after.some((v, i) => v !== before[i])) {
				target.trace();
				target.used = true;
				linkHistory(s.layer, target, t);
			}
			const canvas = oekaki.render();
			anime.canvasByI.set(t, canvas);
			anime.dataURLByI.set(t, canvas.toDataURL("image/png"));
		}
	} finally {
		resetAccumulation();
		oekaki.setLayers(current);
		replaying = false;
	}
};

// ───────────────────────────────────────────────────────
// レイヤーの統合
// ───────────────────────────────────────────────────────

/**
 * レイヤーを見た目どおり（表示中のものを不透明度込みで）1枚に統合する
 *
 * 呼んだ後は oekaki に統合したレイヤー1枚だけが載った状態になる
 */
const flatten = (layers: oekaki.LayeredCanvas[]) => {
	oekaki.setLayers([...layers]);
	const merged = oekaki.render();
	oekaki.setLayers([]);
	const layer = new oekaki.LayeredCanvas("レイヤー #1");
	layer.ctx.drawImage(merged, 0, 0);
	layer.trace();
	layer.used = true;
	return layer;
};

/**
 * 編集中のコマのレイヤーを1枚に統合する。一括適用のトグルが有効なら、一括適用先のコマも統合する
 *
 * レイヤーの構成が変わる操作なのでUndoは効かない
 *
 * @returns 編集中のコマの統合後のレイヤー
 */
export const flattenWithSync = (): oekaki.LayeredCanvas => {
	// 選択範囲の記録が残っていれば先に再生して終える（消えるレイヤーに紐づいているため）
	flushSelectionSync();
	const index = get(activeIndex);
	const current = oekaki.getLayers();
	for (const t of syncTargets(index)) {
		const layers = anime.layersByI.get(t);
		if (!layers?.length) continue;
		const layer = flatten(layers);
		anime.layersByI.set(t, [layer]);
		anime.activatedByI.set(t, layer);
		const canvas = oekaki.render();
		anime.canvasByI.set(t, canvas);
		anime.dataURLByI.set(t, canvas.toDataURL("image/png"));
	}
	const layer = flatten(current);
	anime.layersByI.set(index, [layer]);
	anime.activatedByI.set(index, layer);
	return layer;
};
