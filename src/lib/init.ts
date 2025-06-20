import * as anime from "$lib/anime";
import { isAddEmptyLayer, isSimpleImport, opacity } from "$lib/store";
import * as oekaki from "@onjmin/oekaki";
import { get } from "svelte/store";

export const importImage = (image: HTMLImageElement) => {
	const dotSize = oekaki.getDotSize();
	const { width, height, frames, ways } = anime;

	const canvas = document.createElement("canvas");
	canvas.width = get(isSimpleImport) ? width : width * frames;
	canvas.height = get(isSimpleImport) ? height : height * ways;
	const ctx = canvas.getContext("2d", {
		willReadFrequently: true,
	});
	if (!ctx) return;
	// アンチエイリアス無効化（ドット絵向け）
	ctx.imageSmoothingEnabled = false;

	if (get(isSimpleImport)) {
		const srcW = image.naturalWidth;
		const srcH = image.naturalHeight;
		const ratio = Math.min(width / srcW, height / srcH);
		const dstW = srcW * ratio;
		const dstH = srcH * ratio;
		const offsetX = (width - dstW) / 2;
		const offsetY = (height - dstH) / 2;
		ctx.drawImage(image, offsetX, offsetY, dstW, dstH);
	} else {
		ctx.drawImage(image, 0, 0);
	}
	const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

	const yEnd = get(isSimpleImport) ? 1 : ways;
	const xEnd = get(isSimpleImport) ? 1 : frames;
	for (let y = 0; y < yEnd; y++) {
		for (let x = 0; x < xEnd; x++) {
			const layerTran = new oekaki.LayeredCanvas("半透明");
			const layerOpa = new oekaki.LayeredCanvas("不透明");
			let tranSum = 0;
			let tranCount = 0;

			// 全体シートの横幅ピクセル数
			const sheetWidth = width * xEnd; // 例: width=48, frames=8 なら 48*8 = 384px

			// 描画
			for (let o = 0; o < height; o++) {
				for (let p = 0; p < width; p++) {
					// ───────────────────────────────────────────────────────
					// (1) ローカル座標 (p, o) → グローバル座標 (globalX, globalY)
					// ───────────────────────────────────────────────────────
					// フレーム (x, y) は左上から
					//   X 軸方向に x * width だけずれている
					//   Y 軸方向に y * height だけずれている
					//
					// したがって：
					const globalX = x * width + p;
					const globalY = y * height + o;
					// globalX ∈ [0, sheetWidth - 1]
					// globalY ∈ [0, (height * ways) - 1]

					// ───────────────────────────────────────────────────────
					// (2) (globalX, globalY) → data 配列上のインデックスに変換
					// ───────────────────────────────────────────────────────
					// ImageData.data は 1 行あたり「sheetWidth 個のピクセル × 4 要素(RGBA)」で並んでいるので、
					//  - 1 行先頭のインデックスは globalY * (sheetWidth * 4)
					//  - そこから globalX 分だけ、1 ピクセルあたり 4 要素ずつオフセット
					//
					// よって：
					const index = (globalY * sheetWidth + globalX) * 4;

					const [r, g, b, a] = data.subarray(index, index + 4);
					if (!a) continue;
					if (a === 255) {
						oekaki.color.value = `rgb(${r}, ${g}, ${b})`;
						layerOpa.drawByDot(p * dotSize, o * dotSize);
						layerOpa.used = true;
					} else {
						oekaki.color.value = `rgb(${r}, ${g}, ${b})`;
						layerTran.drawByDot(p * dotSize, o * dotSize);
						layerTran.used = true;
						tranSum += a;
						tranCount++;
					}
				}
			}
			layerOpa.trace();
			layerTran.trace();
			layerOpa.opacity = get(opacity);
			if (tranCount)
				layerTran.opacity = ((get(opacity) * tranSum) / tranCount / 255) | 0;

			// 反映
			const i = anime.toI(x, y);
			const layers = [
				layerTran.used ? layerTran : [],
				layerOpa,
				get(isAddEmptyLayer) ? new oekaki.LayeredCanvas("トレース台") : [],
			].flat();
			anime.layersByI.set(i, layers);
			const canvas = oekaki.render();
			anime.canvasByI.set(i, canvas);
			const dataURL = canvas.toDataURL("image/png");
			anime.dataURLByI.set(i, dataURL);
			oekaki.setLayers([]);
		}
	}
};
