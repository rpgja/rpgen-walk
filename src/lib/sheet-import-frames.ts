import * as anime from "$lib/anime";
import type { Dots } from "$lib/auto-anime";
import { writeFrameDots } from "$lib/auto-anime-frames";
import { type Raw, type SheetResult, importSheet } from "$lib/sheet-import";
import { thumbnailsVersion } from "$lib/store";
import * as oekaki from "@onjmin/oekaki";

/**
 * 背景付きシートの切り分け取り込みを、画面とコマに当てはめる
 *
 * 画素の計算は sheet-import.ts。ここは画像の読み出し、プレビュー用の縮小、コマへの書き込み
 */

/**
 * 画像の画素をそのまま読む
 */
export const imageToRaw = (image: HTMLImageElement): Raw => {
	const w = image.naturalWidth;
	const h = image.naturalHeight;
	const canvas = document.createElement("canvas");
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) throw new Error("Failed to get 2D rendering context");
	ctx.drawImage(image, 0, 0);
	return { w, h, data: ctx.getImageData(0, 0, w, h).data };
};

/**
 * シートを今のコマ数・方向数・コマの大きさで切り分ける
 *
 * @param simple 1枚絵として読む（シート全体を1コマとみなす）
 * @param pitchHint 1ドットが何pxかの指定（0なら自動）
 */
export const analyzeSheet = (
	raw: Raw,
	tolerance: number,
	simple: boolean,
	pitchHint = 0,
): SheetResult => {
	const { width, height, frames, ways } = anime;
	return importSheet(
		raw,
		simple ? 1 : ways,
		simple ? 1 : frames,
		width,
		height,
		tolerance,
		pitchHint > 0 ? pitchHint : undefined,
	);
};

export type AutoLayout = {
	frames: number;
	ways: string;
	width: number;
	height: number;
	result: SheetResult;
};

/**
 * 方向のキーの候補。4方向なら sadw、それ以上は斜めを足し、足りなければ余りの文字
 */
const WAY_KEYS = "sadwqezcbfghijklmnoprtuvxy";

/**
 * コマ数・方向数・コマの大きさもシートから決めて切り分ける
 *
 * 行数を方向数、一番多い行の列数をコマ数にし、コマの大きさは一番大きい絵に少し余白を足して8の倍数にする。
 * 方向の並びは、行数と同じ長さの指定があればそれ、無ければ sadw から順に当てる
 *
 * @param orderHint 方向の並びの指定（例 "sadw"）
 */
export const analyzeSheetAuto = (
	raw: Raw,
	tolerance: number,
	pitchHint = 0,
	orderHint = "",
): AutoLayout => {
	const hint = pitchHint > 0 ? pitchHint : undefined;
	// まず大きさの制限なしに測る（256 はコマの大きさの上限）
	const probe = importSheet(raw, 0, 0, 256, 256, tolerance, hint);
	const rows = Math.max(1, Math.min(WAY_KEYS.length, probe.detectedRows));
	const frames = Math.max(1, Math.min(8, ...probe.detectedCols));
	const fit = (dots: number) =>
		Math.max(16, Math.min(256, Math.ceil((dots + 2) / 8) * 8));
	const width = fit(probe.maxCols);
	const height = fit(probe.maxRows);
	const ways =
		orderHint.length === rows && new Set(orderHint).size === rows
			? orderHint
			: WAY_KEYS.slice(0, rows);
	const result = importSheet(raw, rows, frames, width, height, tolerance, hint);
	return { frames, ways, width, height, result };
};

/**
 * プレビュー用に等倍の絵を拡大した画像
 */
export const dotsToDataURL = (dots: Dots, scale: number): string => {
	const src = document.createElement("canvas");
	src.width = dots.w;
	src.height = dots.h;
	const sctx = src.getContext("2d");
	if (!sctx) throw new Error("Failed to get 2D rendering context");
	sctx.putImageData(new ImageData(dots.data, dots.w, dots.h), 0, 0);
	const dst = document.createElement("canvas");
	dst.width = dots.w * scale;
	dst.height = dots.h * scale;
	const dctx = dst.getContext("2d");
	if (!dctx) throw new Error("Failed to get 2D rendering context");
	dctx.imageSmoothingEnabled = false;
	dctx.drawImage(src, 0, 0, dst.width, dst.height);
	return dst.toDataURL("image/png");
};

/**
 * シートの行の並び（方向のキーの列）を、今の方向の行番号に引き当てる
 *
 * @returns シートの行ごとの行番号。今の方向に無いキーは -1
 */
export const rowMapping = (order: string): number[] =>
	anime
		.strToWays(order)
		.map((way) => anime.waysOrder.findIndex((v) => v.key === way.key));

/**
 * 切り分けた絵を全コマに書き込む
 *
 * anime.init() とキャンバスの初期化を済ませてから呼ぶこと。
 * 絵の無いコマは空のまま
 *
 * @param order シートの行の並び（例 "sadw"）。省略すれば今の方向の並びと同じとみなす
 */
export const applySheet = (result: SheetResult, order?: string) => {
	const { frames, ways } = anime;
	const mapping = order
		? rowMapping(order)
		: Array.from({ length: ways }, (_, y) => y);
	for (const [sheetY, y] of mapping.entries()) {
		if (y < 0 || y >= ways) continue;
		for (let x = 0; x < frames; x++) {
			const dots = result.frames[sheetY]?.[x];
			if (dots) writeFrameDots(anime.toI(x, y), dots);
		}
	}
	oekaki.setLayers([]);
	thumbnailsVersion.update((v) => v + 1);
};
