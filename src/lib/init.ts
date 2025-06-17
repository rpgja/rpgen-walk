import * as anime from "$lib/anime";
import * as oekaki from "@onjmin/oekaki";

export const importImage = (
	image: HTMLImageElement,
	opacity = 100,
	isAddEmptyLayer = false,
) => {
	const dotSize = oekaki.getDotSize();
	const { width, height, frames, ways } = anime;

	const canvas = document.createElement("canvas");
	canvas.width = width * frames;
	canvas.height = height * ways;
	const ctx = canvas.getContext("2d", {
		willReadFrequently: true,
	});
	if (!ctx) return;
	ctx.drawImage(image, 0, 0);
	const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

	for (let y = 0; y < ways; y++) {
		for (let x = 0; x < frames; x++) {
			const layer = new oekaki.LayeredCanvas("素材の味");
			layer.opacity = opacity;

			// 全体シートの横幅ピクセル数
			const sheetWidth = width * frames; // 例: width=48, frames=8 なら 48*8 = 384px

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
					oekaki.color.value = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
					layer.drawByDot(p * dotSize, o * dotSize);
					layer.used = true;
				}
			}
			layer.trace();

			// 反映
			const i = anime.toI(x, y);
			const layers = [layer];
			if (isAddEmptyLayer) layers.push(new oekaki.LayeredCanvas("トレース台"));
			anime.layersByI.set(i, layers);
			const canvas = oekaki.render();
			anime.canvasByI.set(i, canvas);
			const dataURL = canvas.toDataURL("image/png");
			anime.dataURLByI.set(i, dataURL);
			oekaki.setLayers([]);
		}
	}
};
