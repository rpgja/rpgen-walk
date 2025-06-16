import JSZip from "jszip";

/*------------------------------------------------
 型定義（anime オブジェクト用）
------------------------------------------------*/
type Anime = {
	width: number;
	height: number;
	frames: number;
	ways: number;
	toI: (x: number, y: number) => number;
	canvasByI: Map<number, HTMLCanvasElement>;
};

/*------------------------------------------------
 ユーティリティ関数
------------------------------------------------*/
const strToBytes = (s: string): Uint8Array =>
	Uint8Array.from(s, (c) => c.charCodeAt(0));

const createCur = (
	png: Uint8Array,
	w: number,
	h: number,
	hotspotX = 0,
	hotspotY = 0,
): Uint8Array => {
	const headerSize = 6 + 16;
	const buf = new ArrayBuffer(headerSize + png.length);
	const dv = new DataView(buf);
	let off = 0;

	dv.setUint16(off, 0, true);
	off += 2; // Reserved
	dv.setUint16(off, 2, true);
	off += 2; // Type: 2 = Cursor
	dv.setUint16(off, 1, true);
	off += 2; // Count

	dv.setUint8(off++, w === 256 ? 0 : w);
	dv.setUint8(off++, h === 256 ? 0 : h);
	dv.setUint8(off++, 0); // Color count
	dv.setUint8(off++, 0); // Reserved
	dv.setUint16(off, hotspotX, true);
	off += 2;
	dv.setUint16(off, hotspotY, true);
	off += 2;
	dv.setUint32(off, png.length, true);
	off += 4;
	dv.setUint32(off, headerSize, true); // Offset

	new Uint8Array(buf, headerSize).set(png);
	return new Uint8Array(buf);
};

/*------------------------------------------------
  icon 配列 → LIST 'fram' チャンクを生成
------------------------------------------------*/
const makeListChunk = (listId: string, parts: Uint8Array[]): Uint8Array => {
	const bodySize = 4 + parts.reduce((s, p) => s + p.length, 0); // listId + parts
	const chunk = new Uint8Array(8 + bodySize); // 'LIST' hdr + body
	chunk.set(strToBytes("LIST"), 0);
	new DataView(chunk.buffer).setUint32(4, bodySize, true);
	chunk.set(strToBytes(listId), 8); // 'fram'
	let pos = 12;
	for (const p of parts) {
		chunk.set(p, pos);
		pos += p.length;
	}
	return chunk;
};

/*------------------------------------------------
  修正版 buildAni
------------------------------------------------*/
const buildAni = (cursors: Uint8Array[], rateMs = 60): Uint8Array => {
	const n = cursors.length;
	const jif = Math.round(rateMs / (1000 / 60));

	/* ---- anih ---- */
	const anih = new ArrayBuffer(36);
	const av = new DataView(anih);
	av.setUint32(0, 36, true);
	av.setUint32(4, n, true); // cFrames
	av.setUint32(8, n, true); // cSteps
	av.setUint32(24, jif, true); // JifRate
	av.setUint32(32, 1, true); // flags: 1 = ANI_HEADER_FLAG

	/* ---- rate & seq ---- */
	const rate = new Uint32Array(n).fill(jif);
	const seq = Uint32Array.from({ length: n }, (_, i) => i);

	/* ---- 下位チャンクを作成 ---- */
	const makeChunk = (
		id: string,
		data: ArrayBuffer | Uint8Array,
	): Uint8Array => {
		const payload = data instanceof Uint8Array ? data : new Uint8Array(data);
		const pad = payload.length & 1 ? 1 : 0; // word アライン
		const chunk = new Uint8Array(8 + payload.length + pad);
		chunk.set(strToBytes(id), 0);
		new DataView(chunk.buffer).setUint32(4, payload.length, true);
		chunk.set(payload, 8);
		return chunk;
	};

	/* icon → LIST 'fram' */
	const iconChunks = cursors.map((c) => makeChunk("icon", c));
	const framList = makeListChunk("fram", iconChunks);

	const chunks = [
		makeChunk("anih", anih),
		makeChunk("rate", rate.buffer),
		makeChunk("seq ", seq.buffer),
		framList, // ← ここにまとめて入れる
	];

	/* ---- RIFF ACON ---- */
	const size = chunks.reduce((s, c) => s + c.length, 4); // "ACON"
	const riff = new Uint8Array(8 + size);
	riff.set(strToBytes("RIFF"), 0);
	new DataView(riff.buffer).setUint32(4, size, true);
	riff.set(strToBytes("ACON"), 8);

	let pos = 12;
	for (const c of chunks) {
		riff.set(c, pos);
		pos += c.length;
	}

	return riff;
};

/*------------------------------------------------
 メイン処理：wayごとに ani を作って zip にまとめてダウンロード
------------------------------------------------*/
export const exportAsAniPerWayZIP = async (anime: Anime): Promise<Blob> => {
	const { width, height, frames, ways } = anime;
	const zip = new JSZip();

	for (let y = 0; y < ways; y++) {
		const cursors: Uint8Array[] = [];

		for (let x = 0; x < frames; x++) {
			const i = anime.toI(x, y);
			const source = anime.canvasByI.get(i);
			if (!source) continue;

			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext("2d", { willReadFrequently: true });
			if (!ctx) continue;

			ctx.imageSmoothingEnabled = false;
			ctx.drawImage(
				source,
				0,
				0,
				source.width,
				source.height,
				0,
				0,
				width,
				height,
			);

			const dataURL = canvas.toDataURL("image/png");
			const base64 = dataURL.split(",")[1];
			const png = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

			cursors.push(createCur(png, width, height));
		}

		const ani = buildAni(cursors, 60);
		zip.file(`cursor_${y + 1}.ani`, ani);
	}

	return zip.generateAsync({ type: "blob" });
};
