import * as anime from "$lib/anime";
import * as schema from "$lib/schema";
import * as oekaki from "@onjmin/oekaki";
import JSZip from "jszip";
import * as v from "valibot";

/**
 * HGペイントのプロジェクトファイル（.hgp）
 *
 * 中身はZIPで、以下を含む
 * - project.json : キャンバス設定・プレビュー設定・コマごとのレイヤー情報
 * - layers/{コマ番号}/{重ね順}.png : 各レイヤーの絵（1ドット=1px の等倍）
 * - sheet.png : 全コマを合成した歩行グラ（確認用。読み込みには使わない）
 *
 * 絵は等倍で持つので、画面サイズの違う端末（PC/スマホ）でも同じ絵になる
 */
export const FORMAT = "hg-paint-project";
export const VERSION = 1;
export const EXTENSION = ".hgp";

const LayerSchema = v.object({
	name: v.string(),
	file: v.string(),
	visible: v.optional(v.boolean(), true),
	opacity: v.optional(v.pipe(v.number(), v.minValue(0), v.maxValue(100)), 100),
	locked: v.optional(v.boolean(), false),
	alphaLocked: v.optional(v.boolean(), false),
});

const ProjectSchema = v.object({
	format: v.literal(FORMAT),
	version: v.pipe(v.number(), v.integer(), v.maxValue(VERSION)),
	width: schema.Width,
	height: schema.Height,
	frames: schema.Frames,
	ways: schema.Ways,
	fps: v.optional(v.pipe(v.number(), v.transform(String), schema.Fps)),
	preview: v.optional(v.pipe(v.number(), v.transform(String), schema.Preview)),
	chips: v.array(
		v.object({
			index: v.pipe(v.number(), v.integer(), v.minValue(0)),
			layers: v.array(LayerSchema),
		}),
	),
});

export type Project = v.InferOutput<typeof ProjectSchema>;

const toBlob = (canvas: HTMLCanvasElement) =>
	new Promise<Blob>((resolve, reject) =>
		canvas.toBlob((blob) => (blob ? resolve(blob) : reject()), "image/png"),
	);

/**
 * 画面サイズのレイヤーを等倍に縮める
 */
const shrink = (src: HTMLCanvasElement) => {
	const { width, height } = anime;
	const dotSize = oekaki.getDotSize();
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Failed to get 2D rendering context");
	ctx.imageSmoothingEnabled = false;
	ctx.drawImage(
		src,
		0,
		0,
		width * dotSize,
		height * dotSize,
		0,
		0,
		width,
		height,
	);
	return canvas;
};

/**
 * 今の作業内容をプロジェクトファイルにする
 *
 * @param activeIndex 編集中のコマ（このコマのレイヤーはoekaki側にしかないため）
 */
export const exportProject = async (
	activeIndex: number,
	fps: number,
	preview: number,
): Promise<Blob> => {
	const { width, height, frames, ways } = anime;
	const zip = new JSZip();
	const sheet = document.createElement("canvas");
	sheet.width = width * frames;
	sheet.height = height * ways;
	const sheetCtx = sheet.getContext("2d");
	if (!sheetCtx) throw new Error("Failed to get 2D rendering context");
	sheetCtx.imageSmoothingEnabled = false;

	const chips: Project["chips"] = [];
	for (let i = 0; i < frames * ways; i++) {
		const layers =
			i === activeIndex ? oekaki.getLayers() : (anime.layersByI.get(i) ?? []);
		const chip: Project["chips"][number] = { index: i, layers: [] };
		for (const [order, layer] of layers.entries()) {
			const file = `layers/${i}/${order}.png`;
			zip.file(file, await toBlob(shrink(layer.canvas)));
			chip.layers.push({
				name: layer.name,
				file,
				visible: layer.visible,
				opacity: layer.opacity,
				locked: layer.locked,
				alphaLocked: layer.alphaLocked,
			});
		}
		chips.push(chip);

		const composed =
			i === activeIndex ? oekaki.render() : anime.canvasByI.get(i);
		if (composed) {
			const [x, y] = anime.toXY(i);
			sheetCtx.drawImage(shrink(composed), x * width, y * height);
		}
	}
	zip.file("sheet.png", await toBlob(sheet));

	const project = {
		format: FORMAT,
		version: VERSION,
		width,
		height,
		frames,
		ways: anime.waysToStr(anime.waysOrder),
		fps,
		preview,
		chips,
	};
	zip.file("project.json", JSON.stringify(project, null, "\t"));
	return zip.generateAsync({ type: "blob" });
};

export type LoadedProject = {
	project: Project;
	bitmaps: Map<string, ImageBitmap>;
};

/**
 * プロジェクトファイルを読む（まだ画面には反映しない）
 */
export const readProject = async (file: Blob): Promise<LoadedProject> => {
	const zip = await JSZip.loadAsync(file);
	const json = await zip.file("project.json")?.async("string");
	if (!json) throw new Error("project.json がありません");
	const result = v.safeParse(ProjectSchema, JSON.parse(json));
	if (!result.success) {
		const path = result.issues[0].path?.map((v) => v.key).join(".") ?? "";
		throw new Error(`project.json が不正です: ${path}`);
	}
	const project = result.output;
	const bitmaps = new Map<string, ImageBitmap>();
	for (const chip of project.chips) {
		for (const layer of chip.layers) {
			const blob = await zip.file(layer.file)?.async("blob");
			if (!blob) throw new Error(`${layer.file} がありません`);
			bitmaps.set(layer.file, await createImageBitmap(blob));
		}
	}
	return { project, bitmaps };
};

/**
 * 読んだ絵をコマごとのレイヤーに書き込む
 *
 * anime.init()とキャンバスの初期化を済ませてから呼ぶこと
 */
export const applyProjectLayers = ({ project, bitmaps }: LoadedProject) => {
	const { width, height, frames, ways } = anime;
	const dotSize = oekaki.getDotSize();
	for (const chip of project.chips) {
		if (chip.index >= frames * ways) continue;
		oekaki.setLayers([]);
		const layers: oekaki.LayeredCanvas[] = [];
		for (const meta of chip.layers) {
			const bitmap = bitmaps.get(meta.file);
			if (!bitmap) continue;
			const layer = new oekaki.LayeredCanvas(meta.name);
			layer.ctx.imageSmoothingEnabled = false;
			layer.ctx.drawImage(
				bitmap,
				0,
				0,
				width,
				height,
				0,
				0,
				width * dotSize,
				height * dotSize,
			);
			layer.trace();
			layer.visible = meta.visible;
			layer.opacity = meta.opacity;
			layer.locked = meta.locked;
			layer.alphaLocked = meta.alphaLocked;
			layer.used = true;
			layers.push(layer);
		}
		if (!layers.length) continue;
		anime.layersByI.set(chip.index, layers);
		const canvas = oekaki.render();
		anime.canvasByI.set(chip.index, canvas);
		anime.dataURLByI.set(chip.index, canvas.toDataURL("image/png"));
	}
	oekaki.setLayers([]);
};
