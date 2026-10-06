import * as anime from "$lib/anime";
import * as A from "$lib/auto-anime";
import { activeIndex, thumbnailsVersion } from "$lib/store";
import { flushSelectionSync } from "$lib/sync-edit";
import * as oekaki from "@onjmin/oekaki";
import { get } from "svelte/store";

/**
 * アニメ差分の自動生成を、レイヤーとコマに当てはめる
 *
 * 画素の計算は auto-anime.ts。ここはレイヤーとの行き来と、方向の全コマへの書き出し
 */

/**
 * レイヤーの絵を等倍（1ドット=1画素）で読む
 */
export const layerToDots = (layer: oekaki.LayeredCanvas): A.Dots => {
	const { width, height } = anime;
	const dotSize = oekaki.getDotSize();
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) throw new Error("Failed to get 2D rendering context");
	ctx.imageSmoothingEnabled = false;
	ctx.drawImage(
		layer.canvas,
		0,
		0,
		width * dotSize,
		height * dotSize,
		0,
		0,
		width,
		height,
	);
	return {
		w: width,
		h: height,
		data: ctx.getImageData(0, 0, width, height).data,
	};
};

/**
 * 等倍の絵をレイヤーに描く（元の絵は消す）
 */
const drawDots = (layer: oekaki.LayeredCanvas, dots: A.Dots) => {
	const dotSize = oekaki.getDotSize();
	const canvas = document.createElement("canvas");
	canvas.width = dots.w;
	canvas.height = dots.h;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Failed to get 2D rendering context");
	ctx.putImageData(new ImageData(dots.data, dots.w, dots.h), 0, 0);
	layer.ctx.imageSmoothingEnabled = false;
	layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
	layer.ctx.drawImage(
		canvas,
		0,
		0,
		dots.w,
		dots.h,
		0,
		0,
		dots.w * dotSize,
		dots.h * dotSize,
	);
	layer.trace();
	layer.used = true;
};

const visibleDots = () =>
	oekaki
		.getLayers()
		.filter((l) => l.visible)
		.map(layerToDots);

/**
 * 編集中のコマの見た目から頭・胴・脚の境目を推定する
 */
export const estimateParts = (): A.Parts | null => {
	const { width, height } = anime;
	return A.estimateParts(unionMaskOf(visibleDots()), width, height);
};
const unionMaskOf = (list: A.Dots[]) =>
	A.unionMask(list, anime.width, anime.height);

/**
 * 境目の目安を描画検出用レイヤーに引く（赤=首、青=脚。カーソルが動くと消える）
 */
export const drawGuides = (neck: number, legsTop: number) => {
	const upper = oekaki.upperLayer.value;
	if (!upper) return;
	const dotSize = oekaki.getDotSize();
	const w = anime.width * dotSize;
	const t = Math.max(1, Math.floor(dotSize / 4));
	upper.clear();
	const { ctx } = upper;
	ctx.fillStyle = "#f00";
	ctx.fillRect(0, neck * dotSize - t / 2, w, t);
	ctx.fillStyle = "#00f";
	ctx.fillRect(0, legsTop * dotSize - t / 2, w, t);
};

/**
 * 選択中のレイヤーを頭・胴・脚のレイヤーに分ける（脚が一番下、頭が一番上）
 *
 * 絵の無い部位は作らない。レイヤーの構成が変わる操作なのでUndoは効かない
 *
 * @returns 新しい選択レイヤー。分けるものが無ければ null
 */
export const splitParts = (
	layer: oekaki.LayeredCanvas,
	neck: number,
	legsTop: number,
): oekaki.LayeredCanvas | null => {
	flushSelectionSync();
	const dots = layerToDots(layer);
	const parts = (
		[
			["脚", A.cropRows(dots, legsTop, dots.h)],
			["胴", A.cropRows(dots, neck, legsTop)],
			["頭", A.cropRows(dots, 0, neck)],
		] as const
	).filter(([, d]) => !A.isEmpty(d));
	if (parts.length < 2) return null;

	const all = oekaki.getLayers();
	const i = all.indexOf(layer);
	const before = all.slice(0, i);
	const after = all.slice(i + 1);
	oekaki.setLayers(before);
	const made = parts.map(([name, d]) => {
		const l = new oekaki.LayeredCanvas(name);
		drawDots(l, d);
		l.visible = layer.visible;
		l.opacity = layer.opacity;
		return l;
	});
	oekaki.setLayers([...before, ...made, ...after]);
	return made[made.length - 1];
};

export type Preset = "bounce" | "sway" | "breath" | "walk" | "blink";
export const presets: { key: Preset; label: string; hint: string }[] = [
	{
		key: "bounce",
		label: "上下バウンス",
		hint: "動かすレイヤーを振れ幅ぶん沈めて戻す。脚は動かさないと足が地に着いたままになる",
	},
	{
		key: "sway",
		label: "左右スウェイ",
		hint: "動かすレイヤーを右へ、左へと揺らす",
	},
	{
		key: "breath",
		label: "呼吸",
		hint: "動かすレイヤーを持ち上げ、空いた分は下端を伸ばして埋める",
	},
	{
		key: "walk",
		label: "汎用歩行",
		hint: "左右の脚を交互に持ち上げ、体を1ドット沈める。脚は描き直す前提の叩き台",
	},
	{
		key: "blink",
		label: "瞬き",
		hint: "最後のコマだけ目を閉じる。範囲選択で目を囲ってあればその範囲、無ければ自動で探す",
	},
];

export type LayerOption = {
	layer: oekaki.LayeredCanvas;
	/** 動かすか */
	move: boolean;
	/** 何コマ遅らせるか（髪やマントの追従） */
	delay: number;
};

export type GenerateOptions = {
	preset: Preset;
	/** 振れ幅（ドット） */
	amp: number;
	layers: LayerOption[];
	/** 歩行で持ち上げる脚のレイヤー。無ければ全レイヤーの下の帯を脚とみなす */
	legsLayer: oekaki.LayeredCanvas | null;
	/** 瞬きで閉じる目の範囲（等倍）。無ければ自動で探す */
	eyes: A.Rect | null;
};

type Item = {
	name: string;
	dots: A.Dots;
	visible: boolean;
	opacity: number;
	locked: boolean;
	alphaLocked: boolean;
};

/**
 * コマのレイヤーを作り直し、サムネイルも描き直す
 */
const writeFrame = (index: number, items: Item[]) => {
	oekaki.setLayers([]);
	for (const item of items) {
		const l = new oekaki.LayeredCanvas(item.name);
		drawDots(l, item.dots);
		l.visible = item.visible;
		l.opacity = item.opacity;
		l.locked = item.locked;
		l.alphaLocked = item.alphaLocked;
	}
	const layers = oekaki.getLayers();
	anime.layersByI.set(index, layers);
	anime.activatedByI.delete(index);
	const canvas = oekaki.render();
	anime.canvasByI.set(index, canvas);
	anime.dataURLByI.set(index, canvas.toDataURL("image/png"));
};

/**
 * 編集中のコマを元に、同じ方向の全コマを生成する
 *
 * 編集中のコマが動きの起点（0コマ目）になる。歩行だけは編集中のコマも書き換わる。
 * コマ単位の操作なのでUndoは効かない
 *
 * @returns 編集中のコマの新しい選択レイヤー。失敗したら理由
 */
export const generateWay = (
	opts: GenerateOptions,
): { activeLayer?: oekaki.LayeredCanvas; error?: string } => {
	flushSelectionSync();
	const { width, height, frames } = anime;
	const index = get(activeIndex);
	const [curX, y] = anime.toXY(index);
	const current = oekaki.getLayers();
	anime.layersByI.set(index, current);
	if (!current.length) return { error: "レイヤーがありません" };

	const base = current.map((layer) => ({
		layer,
		dots: layerToDots(layer),
		opt: opts.layers.find((o) => o.layer === layer) ?? {
			layer,
			move: true,
			delay: 0,
		},
	}));
	const visible = base.filter((b) => b.layer.visible).map((b) => b.dots);
	const mask = unionMaskOf(visible);
	const parts = A.estimateParts(mask, width, height);
	if (!parts) return { error: "絵がありません" };

	// 歩行: 脚の列と、持ち上げる範囲
	let legs: [A.Run, A.Run] | null = null;
	let zoneTop = 0;
	if (opts.preset === "walk") {
		const legsBase = base.find((b) => b.layer === opts.legsLayer);
		if (legsBase) {
			const m = unionMaskOf([legsBase.dots]);
			const p = A.estimateParts(m, width, height);
			legs = p && A.findLegs(m, width, p.top, p.bottom);
		} else {
			zoneTop = A.walkZoneTop(parts);
			legs = A.findLegs(mask, width, zoneTop, parts.bottom);
		}
		if (!legs) return { error: "脚が見つかりません" };
	}

	// 瞬き: 目の範囲と、閉じた絵
	const closed = new Map<oekaki.LayeredCanvas, A.Dots>();
	if (opts.preset === "blink") {
		let merged = A.createDots(width, height);
		for (const d of visible) merged = A.over(merged, d);
		const eyes = opts.eyes ?? A.findEyes(merged, parts.top, parts.neck);
		if (!eyes)
			return {
				error: "目が見つかりません。範囲選択で目を囲ってから実行してください",
			};
		for (const b of base) {
			const d = A.cloneDots(b.dots);
			if (A.closeEyes(d, merged, eyes)) closed.set(b.layer, d);
		}
		if (!closed.size)
			return {
				error:
					"目を閉じられません。目が1行しか無いか、周りに肌の色がありません",
			};
	}

	const bounce = A.bouncePattern(frames, opts.amp);
	const sway = A.swayPattern(frames, opts.amp);
	const walk = A.walkPattern(frames);
	const blink = A.blinkPattern(frames);

	for (let x = 0; x < frames; x++) {
		const k = (x - curX + frames) % frames;
		let changed = false;
		const items: Item[] = base.map(({ layer, dots, opt }) => {
			let d = dots;
			switch (opts.preset) {
				case "bounce": {
					const v = opt.move ? A.delayed(bounce, k, opt.delay) : 0;
					if (v) d = A.shift(dots, 0, v);
					break;
				}
				case "sway": {
					const v = opt.move ? A.delayed(sway, k, opt.delay) : 0;
					if (v) d = A.shift(dots, v, 0);
					break;
				}
				case "breath": {
					const v = opt.move ? A.delayed(bounce, k, opt.delay) : 0;
					if (v) d = A.shift(dots, 0, -v, true);
					break;
				}
				case "walk": {
					const step = walk[k];
					if (step === "S" || !legs) break;
					const run = step === "L" ? legs[0] : legs[1];
					if (opts.legsLayer) {
						d =
							layer === opts.legsLayer
								? A.liftLeg(dots, run, opts.amp, 0)
								: opt.move
									? A.shift(dots, 0, 1)
									: dots;
					} else {
						const lower = A.liftLeg(
							A.cropRows(dots, zoneTop, height),
							run,
							opts.amp,
							zoneTop,
						);
						const upper = A.cropRows(dots, 0, zoneTop);
						d = A.over(lower, opt.move ? A.shift(upper, 0, 1) : upper);
					}
					break;
				}
				case "blink": {
					if (blink[k]) d = closed.get(layer) ?? dots;
					break;
				}
			}
			if (d !== dots) changed = true;
			return {
				name: layer.name,
				dots: d,
				visible: layer.visible,
				opacity: layer.opacity,
				locked: layer.locked,
				alphaLocked: layer.alphaLocked,
			};
		});
		// 編集中のコマが変わらないなら作り直さない（Undoの履歴が残る）
		if (x === curX && !changed) continue;
		writeFrame(anime.toI(x, y), items);
	}

	const now = anime.layersByI.get(index) ?? [];
	oekaki.setLayers(now);
	thumbnailsVersion.update((v) => v + 1);
	return { activeLayer: now[now.length - 1] };
};
