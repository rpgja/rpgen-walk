/**
 * 背景付きのシート（AI生成素材など）をコマごとに切り分けて等倍のドット絵にする（画素の計算だけ）
 *
 * 前提にしている素材の癖
 * - 背景が透明でなく、白などの単色で塗られている（JPEGのノイズを含む）
 * - コマが格子に揃っておらず、位置が少しずつずれている
 * - 1ドットが1pxでなく、2.4pxのような非整数で、コマごとに伸縮している
 *
 * なので「外周から背景を塗りつぶして前景を取る」「前景の切れ目でコマを分ける」
 * 「コマごとにドットの周期を測って多数決で縮める」の3段階にしている
 */

import type { Dots, Rect } from "$lib/auto-anime";
import { createDots } from "$lib/auto-anime";

export type Raw = { w: number; h: number; data: Uint8ClampedArray };
export type RGB = [number, number, number];

const dist = (data: Uint8ClampedArray, i: number, c: RGB) =>
	Math.max(
		Math.abs(data[i] - c[0]),
		Math.abs(data[i + 1] - c[1]),
		Math.abs(data[i + 2] - c[2]),
	);

/**
 * 背景色を推定する（外周の画素で一番多い色）
 *
 * 透明な画素があればそれを背景とみなし null を返す
 */
export const detectBackground = (img: Raw): RGB | null => {
	const { w, h, data } = img;
	const bins = new Map<number, { n: number; sum: [number, number, number] }>();
	let transparent = 0;
	let total = 0;
	const visit = (x: number, y: number) => {
		const i = (x + y * w) * 4;
		total++;
		if (data[i + 3] < 128) {
			transparent++;
			return;
		}
		// 16階調に丸めてノイズをまとめる
		const key =
			(data[i] >> 4) | ((data[i + 1] >> 4) << 4) | ((data[i + 2] >> 4) << 8);
		let b = bins.get(key);
		if (!b) {
			b = { n: 0, sum: [0, 0, 0] };
			bins.set(key, b);
		}
		b.n++;
		b.sum[0] += data[i];
		b.sum[1] += data[i + 1];
		b.sum[2] += data[i + 2];
	};
	for (let x = 0; x < w; x++) {
		visit(x, 0);
		visit(x, h - 1);
	}
	for (let y = 1; y < h - 1; y++) {
		visit(0, y);
		visit(w - 1, y);
	}
	if (transparent > total / 2) return null;
	let best: { n: number; sum: [number, number, number] } | null = null;
	for (const b of bins.values()) if (!best || b.n > best.n) best = b;
	if (!best) return null;
	return [
		Math.round(best.sum[0] / best.n),
		Math.round(best.sum[1] / best.n),
		Math.round(best.sum[2] / best.n),
	];
};

/**
 * 前景マスク（1=絵）
 *
 * 背景色に近い画素のうち、画像の外周とつながっているものだけを背景にする。
 * 目の白など、絵に囲まれた背景色は絵のまま残る
 */
export const foregroundMask = (
	img: Raw,
	bg: RGB | null,
	tolerance: number,
): Uint8Array => {
	const { w, h, data } = img;
	const mask = new Uint8Array(w * h).fill(1);
	if (!bg) {
		for (let i = 0; i < w * h; i++) if (data[i * 4 + 3] < 128) mask[i] = 0;
		return mask;
	}
	const near = (i: number) =>
		data[i * 4 + 3] < 128 || dist(data, i * 4, bg) <= tolerance;
	const stack: number[] = [];
	const push = (i: number) => {
		if (mask[i] && near(i)) {
			mask[i] = 0;
			stack.push(i);
		}
	};
	for (let x = 0; x < w; x++) {
		push(x);
		push(x + (h - 1) * w);
	}
	for (let y = 0; y < h; y++) {
		push(y * w);
		push(w - 1 + y * w);
	}
	while (stack.length) {
		const i = stack.pop() as number;
		const x = i % w;
		if (x > 0) push(i - 1);
		if (x < w - 1) push(i + 1);
		if (i >= w) push(i - w);
		if (i + w < w * h) push(i + w);
	}
	return mask;
};

/**
 * 1次元の射影から、絵のある区間を切り出す
 *
 * @param minGap これより狭い切れ目は無視して1つの区間にする（髪飾りなどが離れていても同じコマ）
 */
const segments = (profile: number[], minGap: number): [number, number][] => {
	const out: [number, number][] = [];
	let start = -1;
	for (let i = 0; i <= profile.length; i++) {
		const on = i < profile.length && profile[i] > 0;
		if (on && start === -1) start = i;
		if (!on && start !== -1) {
			const prev = out[out.length - 1];
			if (prev && start - prev[1] < minGap) prev[1] = i;
			else out.push([start, i]);
			start = -1;
		}
	}
	return out;
};

/**
 * 区間の数を expected に合わせる
 *
 * 多いときは、一番狭い隙間が一番広い隙間の3割未満なら（髪飾りなど本体から少し離れた塊）そこをくっつけ、
 * そうでなければ先頭から expected 個だけ使う（隣のコマ同士をくっつけると絵が崩れるため）。
 * 少なければ一番広い区間を等分する（コマ同士が接触して1つに見えている場合の保険）
 */
const fitCount = (
	segs: [number, number][],
	expected: number,
): [number, number][] => {
	let out = segs.map((s) => [...s] as [number, number]);
	while (out.length > expected && out.length > 1) {
		let narrow = 0;
		let wide = 0;
		for (let i = 0; i < out.length - 1; i++) {
			const gap = out[i + 1][0] - out[i][1];
			if (gap < out[narrow + 1][0] - out[narrow][1]) narrow = i;
			if (gap > out[wide + 1][0] - out[wide][1]) wide = i;
		}
		const gapNarrow = out[narrow + 1][0] - out[narrow][1];
		const gapWide = out[wide + 1][0] - out[wide][1];
		if (gapNarrow < gapWide * 0.3) {
			out[narrow][1] = out[narrow + 1][1];
			out.splice(narrow + 1, 1);
		} else {
			out = out.slice(0, expected);
		}
	}
	while (out.length < expected && out.length) {
		let k = 0;
		for (let i = 1; i < out.length; i++)
			if (out[i][1] - out[i][0] > out[k][1] - out[k][0]) k = i;
		const [a, b] = out[k];
		const mid = Math.floor((a + b) / 2);
		out.splice(k, 1, [a, mid], [mid, b]);
	}
	return out;
};

export type Cell = Rect & {
	/** 絵の領域（コマ内の前景の外接矩形） */
	box: Rect;
};

/**
 * 前景マスクをコマに切り分ける
 *
 * 行（方向）→ 行の中の列（コマ）の順に、前景の切れ目で分ける。
 * 数が合わなければ fitCount で合わせる。ゴミ（面積の小さい塊）は捨てる
 *
 * @param rows 期待する行数。0 なら見つかった数のまま
 * @param cols 期待する列数。0 なら見つかった数のまま（行ごとに違ってもよい）
 * @returns cells[行][列]
 */
export const splitCells = (
	mask: Uint8Array,
	w: number,
	h: number,
	rows: number,
	cols: number,
): { cells: Cell[][]; detectedRows: number; detectedCols: number[] } => {
	const rowProfile = new Array<number>(h).fill(0);
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++) rowProfile[y] += mask[x + y * w];
	// 行の切れ目は狭くても信じる（数が合わなければ fitCount が狭い隙間から埋める）。ゴミの行は落とす
	let bands = segments(rowProfile, 1);
	const bandArea = (b: [number, number]) =>
		rowProfile.slice(b[0], b[1]).reduce((s, v) => s + v, 0);
	const maxArea = Math.max(1, ...bands.map(bandArea));
	bands = bands.filter((b) => bandArea(b) > maxArea * 0.02);
	const detectedRows = bands.length;
	if (rows > 0) bands = fitCount(bands, rows);

	const cells: Cell[][] = [];
	const detectedCols: number[] = [];
	for (const [y0, y1] of bands) {
		const colProfile = new Array<number>(w).fill(0);
		for (let y = y0; y < y1; y++)
			for (let x = 0; x < w; x++) colProfile[x] += mask[x + y * w];
		let segs = segments(colProfile, 2);
		const segArea = (s: [number, number]) =>
			colProfile.slice(s[0], s[1]).reduce((a, v) => a + v, 0);
		const maxSeg = Math.max(1, ...segs.map(segArea));
		segs = segs.filter((s) => segArea(s) > maxSeg * 0.02);
		detectedCols.push(segs.length);
		if (cols > 0) segs = fitCount(segs, cols);
		const row: Cell[] = [];
		for (const [x0, x1] of segs) {
			// コマの中の前景の外接矩形
			let bx0 = x1;
			let bx1 = x0;
			let by0 = y1;
			let by1 = y0;
			for (let y = y0; y < y1; y++)
				for (let x = x0; x < x1; x++)
					if (mask[x + y * w]) {
						bx0 = Math.min(bx0, x);
						bx1 = Math.max(bx1, x + 1);
						by0 = Math.min(by0, y);
						by1 = Math.max(by1, y + 1);
					}
			const box =
				bx0 < bx1
					? { x: bx0, y: by0, w: bx1 - bx0, h: by1 - by0 }
					: { x: x0, y: y0, w: 0, h: 0 };
			row.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, box });
		}
		cells.push(row);
	}
	return { cells, detectedRows, detectedCols };
};

export type PitchCandidate = { pitch: number; phase: number; score: number };

/**
 * 周期ごとの、変わり目の集まり具合と位相
 *
 * 色の変わり目はドットの境目にしか無いので、変わり目の位置を周期 p の櫛で見たときの
 * 集まり具合（フーリエ成分の大きさ）が高い p がドットの周期。非整数でもよい。
 * 変わり目の位置は整数なので周期 p と 1/(1-1/p) は区別が付かない（2.4 と 1.71）。
 * 2px 未満のドットは素材としてまず無いので、2 以上だけを探す
 *
 * @param edges 位置ごとの変わり目の強さ
 * @returns 周期の昇順。phase は境目が来る位置（0 <= phase < pitch）
 */
export const pitchSpectrum = (
	edges: number[],
	min = 2,
	max = 8,
	step = 0.02,
): PitchCandidate[] => {
	const total = edges.reduce((s, v) => s + v, 0) || 1;
	const out: PitchCandidate[] = [];
	for (let p = min; p <= max + 1e-9; p += step) {
		let re = 0;
		let im = 0;
		for (let x = 0; x < edges.length; x++) {
			if (!edges[x]) continue;
			const t = (2 * Math.PI * x) / p;
			re += edges[x] * Math.cos(t);
			im += edges[x] * Math.sin(t);
		}
		const phase = (Math.atan2(im, re) / (2 * Math.PI)) * p;
		out.push({
			pitch: p,
			phase: ((phase % p) + p) % p,
			score: Math.hypot(re, im) / total,
		});
	}
	return out;
};

/**
 * 山の頂点だけを、良い順に取り出す
 */
export const peaksOf = (scores: PitchCandidate[]): PitchCandidate[] =>
	scores
		.filter(
			(c, i) =>
				(i === 0 || scores[i - 1].score <= c.score) &&
				(i === scores.length - 1 || scores[i + 1].score < c.score),
		)
		.sort((a, b) => b.score - a.score);

/**
 * 候補から周期を選ぶ
 *
 * 目安（シート全体の中央値や指定値）があれば、その前後 range に入る候補のうち一番良いもの。
 * 無ければ、一番良い候補の6割以上の強さがある候補のうち一番細かい周期。
 * ドット絵は輪郭や模様の間隔（ドットの何倍か）にも山が立つが、ドットの周期はその中で一番細かい
 */
export const choosePitch = (
	candidates: PitchCandidate[],
	prior?: number,
	range = 0.2,
): PitchCandidate => {
	const best = candidates[0] ?? { pitch: prior ?? 2, phase: 0, score: 0 };
	if (prior === undefined) {
		const strong = candidates.filter((c) => c.score >= best.score * 0.6);
		return strong.sort((a, b) => a.pitch - b.pitch)[0] ?? best;
	}
	const near = candidates.filter(
		(c) =>
			Math.abs(c.pitch - prior) <= prior * range && c.score >= best.score * 0.4,
	);
	return near[0] ?? { pitch: prior, phase: best.phase, score: 0 };
};

/**
 * 絵の領域の色の変わり目を横・縦それぞれ集計する
 *
 * JPEGや拡大でぼけた境目は2〜3pxに広がるので、隣との差が極大の1pxだけを変わり目に数える
 */
const edgeProfiles = (img: Raw, mask: Uint8Array, box: Rect, tol: number) => {
	const { w, data } = img;
	const ex = new Array<number>(box.w).fill(0);
	const ey = new Array<number>(box.h).fill(0);
	const diff = (i: number, j: number) =>
		Math.max(
			Math.abs(data[i] - data[j]),
			Math.abs(data[i + 1] - data[j + 1]),
			Math.abs(data[i + 2] - data[j + 2]),
		);
	const on = (x: number, y: number) =>
		x >= box.x &&
		x < box.x + box.w &&
		y >= box.y &&
		y < box.y + box.h &&
		mask[x + y * w] === 1;
	// 横方向の差 d(x) = |c(x) - c(x-1)|
	const dx = (x: number, y: number) =>
		on(x, y) && on(x - 1, y) ? diff((x + y * w) * 4, (x - 1 + y * w) * 4) : 0;
	const dy = (x: number, y: number) =>
		on(x, y) && on(x, y - 1) ? diff((x + y * w) * 4, (x + (y - 1) * w) * 4) : 0;
	for (let y = box.y; y < box.y + box.h; y++)
		for (let x = box.x; x < box.x + box.w; x++) {
			const h = dx(x, y);
			if (h > tol && h >= dx(x - 1, y) && h > dx(x + 1, y)) ex[x - box.x]++;
			const v = dy(x, y);
			if (v > tol && v >= dy(x, y - 1) && v > dy(x, y + 1)) ey[y - box.y]++;
		}
	return { ex, ey };
};

export type CellResult = {
	dots: Dots;
	/** 絵のドット数 */
	cols: number;
	rows: number;
	pitchX: number;
	pitchY: number;
	/** コマに収まらず、格子を粗くしたか */
	coarsened: boolean;
};

/**
 * 1コマを等倍のドット絵にする
 *
 * ドットの格子を周期と位相から引き、格子1マスの中の画素の多数決で色を決める。
 * マスの半分以上が背景なら透明
 *
 * @param maxCols 収めたいドット数。超えるなら格子を粗くして収める
 * @param prior 周期の目安（シート全体の中央値、または指定値）
 * @param range 目安からどれだけ離れた候補まで許すか（割合）
 */
export const sampleCell = (
	img: Raw,
	mask: Uint8Array,
	cell: Cell,
	maxCols: number,
	maxRows: number,
	prior?: number,
	range = 0.2,
	tol = 24,
): CellResult | null => {
	const { box } = cell;
	if (!box.w || !box.h) return null;
	const { ex, ey } = edgeProfiles(img, mask, box, tol);
	// 縦横の周期は同じはずなので、両方の集まり具合を足して1つの周期を選ぶ。位相は縦横べつべつ
	const sx = pitchSpectrum(ex);
	const sy = pitchSpectrum(ey);
	const combined = sx.map((c, i) => ({
		pitch: c.pitch,
		phase: 0,
		score: c.score + sy[i].score,
	}));
	const chosen = choosePitch(peaksOf(combined), prior, range);
	const k = Math.round((chosen.pitch - sx[0].pitch) / 0.02);
	let px = chosen.pitch;
	let py = chosen.pitch;
	const phx = sx[Math.min(k, sx.length - 1)].phase;
	const phy = sy[Math.min(k, sy.length - 1)].phase;
	// 収まらないなら粗くする
	const need = Math.max(box.w / px / maxCols, box.h / py / maxRows);
	if (need > 1) {
		px *= need;
		py *= need;
	}
	// 格子の始まり（絵の左端・上端のすぐ外側の境目）。端のマスが半分も絵に掛からないなら捨てる
	let startX = box.x + phx - Math.ceil(phx / px) * px;
	let startY = box.y + phy - Math.ceil(phy / py) * py;
	if (startX + px - box.x < px / 2) startX += px;
	if (startY + py - box.y < py / 2) startY += py;
	const cols = Math.max(
		1,
		Math.min(maxCols, Math.round((box.x + box.w - startX) / px)),
	);
	const rows = Math.max(
		1,
		Math.min(maxRows, Math.round((box.y + box.h - startY) / py)),
	);
	const dots = createDots(cols, rows);
	const { w, data } = img;
	for (let r = 0; r < rows; r++)
		for (let c = 0; c < cols; c++) {
			const x0 = Math.max(box.x, Math.round(startX + c * px));
			const x1 = Math.min(box.x + box.w, Math.round(startX + (c + 1) * px));
			const y0 = Math.max(box.y, Math.round(startY + r * py));
			const y1 = Math.min(box.y + box.h, Math.round(startY + (r + 1) * py));
			// 多数決（32階調に丸めた色ごとに数え、勝った色の平均を使う）
			const bins = new Map<number, [number, number, number, number]>();
			let bg = 0;
			let fg = 0;
			for (let y = y0; y < y1; y++)
				for (let x = x0; x < x1; x++) {
					if (!mask[x + y * w]) {
						bg++;
						continue;
					}
					fg++;
					const i = (x + y * w) * 4;
					const key =
						(data[i] >> 3) |
						((data[i + 1] >> 3) << 5) |
						((data[i + 2] >> 3) << 10);
					const b = bins.get(key) ?? [0, 0, 0, 0];
					b[0] += data[i];
					b[1] += data[i + 1];
					b[2] += data[i + 2];
					b[3]++;
					bins.set(key, b);
				}
			if (!fg || bg >= fg) continue;
			let best: [number, number, number, number] | null = null;
			for (const b of bins.values()) if (!best || b[3] > best[3]) best = b;
			if (!best) continue;
			const o = (c + r * cols) * 4;
			dots.data[o] = Math.round(best[0] / best[3]);
			dots.data[o + 1] = Math.round(best[1] / best[3]);
			dots.data[o + 2] = Math.round(best[2] / best[3]);
			dots.data[o + 3] = 255;
		}
	return { dots, cols, rows, pitchX: px, pitchY: py, coarsened: need > 1 };
};

export type SheetResult = {
	/** コマごとの等倍の絵（width×height に配置済み）。絵が無いコマは null */
	frames: (Dots | null)[][];
	/** 一番大きい絵のドット数 */
	maxCols: number;
	maxRows: number;
	/** コマに収まらず粗くしたコマの数 */
	coarsened: number;
	background: RGB | null;
	detectedRows: number;
	detectedCols: number[];
	pitches: number[];
};

/**
 * シート全体を切り分けて、各コマを width×height に配置する
 *
 * 横は各コマの絵の中心を合わせ、縦は全コマ共通の足元の線に揃える（コマごとに高さが違っても足が跳ねない）
 *
 * @param rows 方向の数。0 なら見つかった行数のまま
 * @param cols コマの数。0 なら見つかった列数のまま（frames の各行の長さが変わる）
 * @param pitchHint 1ドットが何pxかの指定。あればその前後1割でコマごとに合わせ、無ければ測った中央値を目安にする
 */
export const importSheet = (
	img: Raw,
	rows: number,
	cols: number,
	width: number,
	height: number,
	tolerance = 40,
	pitchHint?: number,
): SheetResult => {
	const background = detectBackground(img);
	const mask = foregroundMask(img, background, tolerance);
	const { cells, detectedRows, detectedCols } = splitCells(
		mask,
		img.w,
		img.h,
		rows,
		cols,
	);
	// 1回目はコマごとに測り、その中央値を目安にして2回目で揃える
	const first = cells
		.flat()
		.map((cell) => sampleCell(img, mask, cell, width, height))
		.filter((s) => s !== null)
		.map((s) => (s.pitchX + s.pitchY) / 2)
		.sort((a, b) => a - b);
	const prior =
		pitchHint ??
		(first.length ? first[Math.floor(first.length / 2)] : undefined);
	const range = pitchHint ? 0.1 : 0.2;
	const sampled = cells.map((row) =>
		row.map((cell) => sampleCell(img, mask, cell, width, height, prior, range)),
	);
	const pitches: number[] = [];
	let maxRows = 0;
	let maxCols = 0;
	let coarsened = 0;
	for (const row of sampled)
		for (const s of row)
			if (s) {
				pitches.push((s.pitchX + s.pitchY) / 2);
				maxRows = Math.max(maxRows, s.rows);
				maxCols = Math.max(maxCols, s.cols);
				if (s.coarsened) coarsened++;
			}
	// 足元の線：一番背の高いコマが上下中央に来る高さ
	const baseline = height - Math.floor((height - maxRows) / 2);
	const frames = sampled.map((row) =>
		row.map((s) => {
			if (!s) return null;
			const out = createDots(width, height);
			const ox = Math.floor((width - s.cols) / 2);
			const oy = baseline - s.rows;
			for (let r = 0; r < s.rows; r++) {
				const y = oy + r;
				if (y < 0 || y >= height) continue;
				for (let c = 0; c < s.cols; c++) {
					const x = ox + c;
					if (x < 0 || x >= width) continue;
					const i = (c + r * s.cols) * 4;
					if (!s.dots.data[i + 3]) continue;
					out.data.set(s.dots.data.subarray(i, i + 4), (x + y * width) * 4);
				}
			}
			return out;
		}),
	);
	return {
		frames,
		background,
		detectedRows,
		detectedCols,
		pitches,
		maxCols,
		maxRows,
		coarsened,
	};
};
