/**
 * アニメ差分の自動生成（画素の計算だけ。画面やレイヤーには触らない）
 *
 * 1ドット=1画素のRGBA配列を相手にする。レイヤーとの行き来は auto-anime-frames.ts。
 * 部位の推定は16〜64pxのちびキャラ向けの経験則なので、外れることを前提に
 * 結果を初期値として人が直せるようにしておくこと
 */

export type Dots = { w: number; h: number; data: Uint8ClampedArray };
export type Rect = { x: number; y: number; w: number; h: number };
/**
 * 横方向の連続した不透明画素 [始まり, 終わり)
 */
export type Run = [number, number];

export const createDots = (w: number, h: number): Dots => ({
	w,
	h,
	data: new Uint8ClampedArray(w * h * 4),
});
export const cloneDots = (d: Dots): Dots => ({
	w: d.w,
	h: d.h,
	data: d.data.slice(),
});
const at = (d: Dots, x: number, y: number) => (x + y * d.w) * 4;
const opaque = (d: Dots, x: number, y: number) => d.data[at(d, x, y) + 3] > 0;
const copyPixel = (
	src: Dots,
	sx: number,
	sy: number,
	dst: Dots,
	dx: number,
	dy: number,
) => {
	const s = at(src, sx, sy);
	const t = at(dst, dx, dy);
	dst.data[t] = src.data[s];
	dst.data[t + 1] = src.data[s + 1];
	dst.data[t + 2] = src.data[s + 2];
	dst.data[t + 3] = src.data[s + 3];
};
export const isEmpty = (d: Dots) => !d.data.some((v, i) => i % 4 === 3 && v);

/**
 * 全レイヤーを重ねた不透明マスク（長さ w*h、不透明なら1）
 */
export const unionMask = (list: Dots[], w: number, h: number): Uint8Array => {
	const mask = new Uint8Array(w * h);
	for (const d of list)
		for (let i = 0; i < w * h; i++) if (d.data[i * 4 + 3]) mask[i] = 1;
	return mask;
};

/**
 * 指定した行の不透明画素の連なり
 */
const runsOf = (mask: Uint8Array, w: number, y: number): Run[] => {
	const runs: Run[] = [];
	let start = -1;
	for (let x = 0; x <= w; x++) {
		const on = x < w && mask[x + y * w];
		if (on && start === -1) start = x;
		if (!on && start !== -1) {
			runs.push([start, x]);
			start = -1;
		}
	}
	return runs;
};

/**
 * 平行移動
 *
 * @param stretch 空いた側の端の画素を引き伸ばして隙間を埋める（呼吸のように頭だけ持ち上げても首が切れない）
 */
export const shift = (
	d: Dots,
	dx: number,
	dy: number,
	stretch = false,
): Dots => {
	const out = createDots(d.w, d.h);
	for (let y = 0; y < d.h; y++) {
		const sy = y - dy;
		if (sy < 0 || sy >= d.h) continue;
		for (let x = 0; x < d.w; x++) {
			const sx = x - dx;
			if (sx < 0 || sx >= d.w) continue;
			copyPixel(d, sx, sy, out, x, y);
		}
	}
	if (stretch && dy) {
		for (let x = 0; x < d.w; x++) {
			// 元の絵の列の端（上へ動かすなら下端、下へ動かすなら上端）をそのまま伸ばす
			let edge = -1;
			if (dy < 0) {
				for (let y = d.h - 1; y >= 0; y--)
					if (opaque(d, x, y)) {
						edge = y;
						break;
					}
			} else {
				for (let y = 0; y < d.h; y++)
					if (opaque(d, x, y)) {
						edge = y;
						break;
					}
			}
			if (edge === -1) continue;
			// 空いた行（上へ動かしたなら端から下へ |dy| 行）を端の色で埋める
			const step = dy < 0 ? -1 : 1;
			for (let y = edge; y !== edge + dy && y >= 0 && y < d.h; y += step)
				if (!opaque(out, x, y)) copyPixel(d, x, edge, out, x, y);
		}
	}
	return out;
};

export const flipX = (d: Dots): Dots => {
	const out = createDots(d.w, d.h);
	for (let y = 0; y < d.h; y++)
		for (let x = 0; x < d.w; x++) copyPixel(d, x, y, out, d.w - 1 - x, y);
	return out;
};

/**
 * 行の範囲だけを切り出す（それ以外は透明）
 */
export const cropRows = (d: Dots, from: number, to: number): Dots => {
	const out = createDots(d.w, d.h);
	const a = Math.max(0, from) * d.w * 4;
	const b = Math.min(d.h, to) * d.w * 4;
	if (a < b) out.data.set(d.data.subarray(a, b), a);
	return out;
};

/**
 * 上に重ねる（不透明な画素だけ写す）
 */
export const over = (base: Dots, top: Dots): Dots => {
	const out = cloneDots(base);
	for (let y = 0; y < top.h; y++)
		for (let x = 0; x < top.w; x++)
			if (opaque(top, x, y)) copyPixel(top, x, y, out, x, y);
	return out;
};

// ───────────────────────────────────────────────────────
// 部位の推定
// ───────────────────────────────────────────────────────

export type Parts = {
	/** 絵の上端 */
	top: number;
	/** 頭と胴の境目（この行から胴） */
	neck: number;
	/** 胴と脚の境目（この行から脚） */
	legsTop: number;
	/** 絵の下端（この行は含まない） */
	bottom: number;
};

/**
 * 行ごとの不透明画素数から頭・胴・脚の境目を推定する
 *
 * 首は「頭の一番広い行より下で最初に細くなる所」、
 * 脚は「下から見て胴より細い、または左右に分かれている行が続く所」
 */
export const estimateParts = (
	mask: Uint8Array,
	w: number,
	h: number,
): Parts | null => {
	const width = new Array<number>(h).fill(0);
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++) if (mask[x + y * w]) width[y]++;
	let top = -1;
	let bottom = -1;
	for (let y = 0; y < h; y++)
		if (width[y]) {
			if (top === -1) top = y;
			bottom = y + 1;
		}
	if (top === -1) return null;
	const total = bottom - top;
	if (total < 4) return { top, neck: top + 1, legsTop: bottom - 1, bottom };

	// 3行平均でならす
	const smooth = width.map(
		(_, y) => (width[y - 1] ?? 0) + width[y] + (width[y + 1] ?? 0),
	);
	let headMax = top;
	for (let y = top; y < top + Math.max(1, Math.floor(total * 0.5)); y++)
		if (width[y] > width[headMax]) headMax = y;
	let neck = headMax + 1;
	const neckEnd = Math.max(neck + 1, top + Math.floor(total * 0.6));
	for (let y = headMax + 1; y < neckEnd && y < bottom; y++)
		if (smooth[y] < smooth[neck]) neck = y;
	neck = Math.min(neck, bottom - 2);

	let bodyMax = 0;
	for (let y = neck; y < bottom; y++) bodyMax = Math.max(bodyMax, width[y]);
	let legsTop = bottom;
	const legsLimit = bottom - Math.max(1, Math.floor((bottom - neck) * 0.5));
	for (let y = bottom - 1; y >= legsLimit; y--) {
		const split = runsOf(mask, w, y).length >= 2;
		if (split || width[y] <= bodyMax * 0.6) legsTop = y;
		else break;
	}
	legsTop = Math.max(neck + 1, legsTop);
	return { top, neck, legsTop, bottom };
};

/**
 * 脚の列を見つける（左脚, 右脚）
 *
 * 一番下の行の連なりのうち、絵の重心から遠いもの（脇に垂れた飾りなど）を除き、
 * 残った2つを脚とみなす。靴がくっついて1つなら真ん中で割る
 */
export const findLegs = (
	mask: Uint8Array,
	w: number,
	legsTop: number,
	bottom: number,
): [Run, Run] | null => {
	let y = bottom - 1;
	while (y >= legsTop && !runsOf(mask, w, y).length) y--;
	if (y < legsTop) return null;
	// 絵全体の重心と幅
	let sum = 0;
	let count = 0;
	let left = w;
	let right = 0;
	for (let i = 0; i < mask.length; i++) {
		if (!mask[i]) continue;
		const x = i % w;
		sum += x;
		count++;
		left = Math.min(left, x);
		right = Math.max(right, x);
	}
	const center = sum / count;
	const limit = Math.max(2, (right - left + 1) * 0.3);
	const runs = runsOf(mask, w, y)
		.map((r) => ({ r, d: Math.abs((r[0] + r[1] - 1) / 2 - center) }))
		.filter((p) => p.d <= limit)
		.sort((p, q) => p.d - q.d)
		.slice(0, 2)
		.map((p) => p.r)
		.sort((p, q) => p[0] - q[0]);
	if (runs.length === 2) return [runs[0], runs[1]];
	if (runs.length !== 1) return null;
	const [a, b] = runs[0];
	if (b - a < 2) return null;
	const mid = Math.floor((a + b) / 2);
	return [
		[a, mid],
		[mid, b],
	];
};

/**
 * 歩行で持ち上げる範囲の上端
 *
 * 推定した脚が短すぎる（長い服で靴しか見えない等）と持ち上げても分からないので、
 * 少なくとも絵の下から1/4は動かす
 */
export const walkZoneTop = (p: Parts) =>
	Math.min(
		p.legsTop,
		p.bottom - Math.max(2, Math.round((p.bottom - p.top) * 0.25)),
	);

/**
 * 片脚を持ち上げる
 *
 * 脚の列を fromRow から下だけ lift 行ぶん上へずらす。足元が空き、上にはみ出た分は消える
 * （脚のレイヤーが別なら fromRow=0 で列ごと上げ、胴のレイヤーが隠してくれる）
 */
export const liftLeg = (
	d: Dots,
	run: Run,
	lift: number,
	fromRow: number,
): Dots => {
	const out = cloneDots(d);
	for (let x = run[0]; x < run[1]; x++) {
		for (let y = fromRow; y < d.h; y++) {
			const sy = y + lift;
			if (sy < d.h) copyPixel(d, x, sy, out, x, y);
			else out.data.fill(0, at(out, x, y), at(out, x, y) + 4);
		}
	}
	return out;
};

// ───────────────────────────────────────────────────────
// 目の検出と瞬き
// ───────────────────────────────────────────────────────

const luma = (d: Dots, i: number) =>
	0.299 * d.data[i] + 0.587 * d.data[i + 1] + 0.114 * d.data[i + 2];

type Blob = { area: number; x0: number; x1: number; y0: number; y1: number };

/**
 * 頭の中から目（左右対称な暗い小さな塊の対）を探す
 *
 * 暗い髪に埋もれた目は髪とつながって見つからない。その時は範囲選択で指定してもらう
 */
export const findEyes = (
	merged: Dots,
	top: number,
	neck: number,
): Rect | null => {
	const { w } = merged;
	const headH = neck - top;
	if (headH < 3) return null;
	const y0 = top + Math.floor(headH * 0.25);
	const dark = new Uint8Array(w * merged.h);
	for (let y = y0; y < neck; y++)
		for (let x = 0; x < w; x++) {
			const i = at(merged, x, y);
			if (merged.data[i + 3] && luma(merged, i) < 100) dark[x + y * w] = 1;
		}
	// 連結成分
	const label = new Int32Array(w * merged.h).fill(-1);
	const blobs: Blob[] = [];
	for (let y = y0; y < neck; y++)
		for (let x = 0; x < w; x++) {
			const i = x + y * w;
			if (!dark[i] || label[i] !== -1) continue;
			const id = blobs.length;
			const blob: Blob = { area: 0, x0: x, x1: x, y0: y, y1: y };
			const stack = [i];
			label[i] = id;
			while (stack.length) {
				const j = stack.pop() as number;
				const jx = j % w;
				const jy = Math.floor(j / w);
				blob.area++;
				blob.x0 = Math.min(blob.x0, jx);
				blob.x1 = Math.max(blob.x1, jx);
				blob.y0 = Math.min(blob.y0, jy);
				blob.y1 = Math.max(blob.y1, jy);
				for (const [nx, ny] of [
					[jx - 1, jy],
					[jx + 1, jy],
					[jx, jy - 1],
					[jx, jy + 1],
				]) {
					if (nx < 0 || nx >= w || ny < y0 || ny >= neck) continue;
					const k = nx + ny * w;
					if (dark[k] && label[k] === -1) {
						label[k] = id;
						stack.push(k);
					}
				}
			}
			blobs.push(blob);
		}
	// 頭の幅
	let hx0 = w;
	let hx1 = 0;
	for (let y = top; y < neck; y++)
		for (let x = 0; x < w; x++)
			if (merged.data[at(merged, x, y) + 3]) {
				hx0 = Math.min(hx0, x);
				hx1 = Math.max(hx1, x);
			}
	const headW = hx1 - hx0 + 1;
	const center = (hx0 + hx1) / 2;
	// 1行しか無い目は閉じようがないので、2行以上の塊だけ
	const small = blobs.filter(
		(b) =>
			b.y1 - b.y0 + 1 >= 2 &&
			b.area <= headW * headH * 0.08 &&
			b.x1 - b.x0 + 1 <= headW * 0.45 &&
			b.y1 - b.y0 + 1 <= headH * 0.5,
	);
	let best: { score: number; a: Blob; b: Blob } | null = null;
	for (const a of small)
		for (const b of small) {
			if (a === b || a.x1 >= b.x0) continue;
			const cy = Math.abs((a.y0 + a.y1) / 2 - (b.y0 + b.y1) / 2);
			if (cy > Math.max(1, headH * 0.1)) continue;
			const ratio = Math.max(a.area, b.area) / Math.min(a.area, b.area);
			if (ratio > 2.5) continue;
			const sym = Math.abs((a.x0 + a.x1) / 2 + (b.x0 + b.x1) / 2 - center * 2);
			if (sym > Math.max(1, headW * 0.15)) continue;
			const score = sym + cy + ratio;
			if (!best || score < best.score) best = { score, a, b };
		}
	if (!best) return null;
	const x = Math.min(best.a.x0, best.b.x0);
	const y = Math.min(best.a.y0, best.b.y0);
	return {
		x,
		y,
		w: Math.max(best.a.x1, best.b.x1) - x + 1,
		h: Math.max(best.a.y1, best.b.y1) - y + 1,
	};
};

/**
 * 目を閉じる
 *
 * 範囲の中の不透明な画素を目とみなし、列ごとに一番下の画素を目の一番暗い色の線として残し、
 * 残りは範囲のすぐ下（無ければ上）の肌の色で埋める。目が1行しか無い列は変わらない
 *
 * @param d 書き換えるレイヤー
 * @param merged 肌の色を拾うための全レイヤー合成
 * @returns 何か変わったか
 */
export const closeEyes = (d: Dots, merged: Dots, rect: Rect): boolean => {
	let changed = false;
	const y0 = Math.max(0, rect.y);
	const y1 = Math.min(d.h, rect.y + rect.h);
	for (let x = Math.max(0, rect.x); x < Math.min(d.w, rect.x + rect.w); x++) {
		let lowest = -1;
		let darkest = -1;
		for (let y = y0; y < y1; y++) {
			if (!opaque(d, x, y)) continue;
			lowest = y;
			if (darkest === -1 || luma(d, at(d, x, y)) < luma(d, darkest))
				darkest = at(d, x, y);
		}
		if (lowest === -1) continue;
		let skin = -1;
		if (y1 < merged.h && opaque(merged, x, y1)) skin = at(merged, x, y1);
		else if (y0 > 0 && opaque(merged, x, y0 - 1)) skin = at(merged, x, y0 - 1);
		if (skin === -1) continue;
		const line = d.data.slice(darkest, darkest + 4);
		for (let y = y0; y < y1; y++) {
			if (!opaque(d, x, y)) continue;
			const i = at(d, x, y);
			const src = y === lowest ? line : merged.data.subarray(skin, skin + 4);
			for (let k = 0; k < 4; k++) {
				if (d.data[i + k] !== src[k]) changed = true;
				d.data[i + k] = src[k];
			}
		}
	}
	return changed;
};

// ───────────────────────────────────────────────────────
// コマごとの動きの数列
// ───────────────────────────────────────────────────────

/**
 * 四捨五入（.5は切り捨て側。振れ幅1で4コマなら 0,0,1,0 になる）
 */
const round = (v: number) => Math.ceil(v - 0.5);

/**
 * 上下バウンス。0から始まり amp まで沈んで戻る
 */
export const bouncePattern = (n: number, amp: number): number[] =>
	Array.from({ length: n }, (_, k) =>
		round((amp * (1 - Math.cos((2 * Math.PI * k) / n))) / 2),
	);

/**
 * 左右スウェイ。0 → 右 → 0 → 左
 */
export const swayPattern = (n: number, amp: number): number[] =>
	n === 2
		? [0, amp]
		: Array.from({ length: n }, (_, k) =>
				round(amp * Math.sin((2 * Math.PI * k) / n)),
			);

export type Step = "L" | "S" | "R";
/**
 * 歩行。2コマなら左右の足踏みだけ、3コマ以上は「左・立ち・右・立ち」の繰り返し
 */
export const walkPattern = (n: number): Step[] =>
	n === 2
		? ["L", "R"]
		: Array.from(
				{ length: n },
				(_, k) => (["L", "S", "R", "S"] as Step[])[k % 4],
			);

/**
 * 瞬き。最後のコマだけ目を閉じる
 */
export const blinkPattern = (n: number): boolean[] =>
	Array.from({ length: n }, (_, k) => n >= 2 && k === n - 1);

/**
 * 数列を delay コマ遅らせて読む
 */
export const delayed = <T>(pattern: T[], k: number, delay: number): T =>
	pattern[(((k - delay) % pattern.length) + pattern.length) % pattern.length];
