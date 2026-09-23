/**
 * お絵描きのクリップボード
 *
 * 選択範囲の複製を内部とOSクリップボードの両方に置く。
 * OSクリップボードには画像と一緒に「このページで複製した」という印を書き、
 * 貼り付け時にその印が自分のものなら内部の複製（無劣化・最新）を使う。
 * OSへの書き込みが失敗しても、古いレイヤー画像が貼られることはない。
 */

const MAGIC_STRING = "レイヤーコピー";
const pageTag = `${MAGIC_STRING}:${Math.random().toString(36).slice(2)}`;
let internal: HTMLCanvasElement | null = null;

/**
 * 複製した画像をクリップボードに置く
 */
export const copyToClipboard = (canvas: HTMLCanvasElement) => {
	internal = canvas;
	try {
		if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined")
			return;
		// Promiseのまま渡すとユーザー操作の猶予内に write() を呼べる（Safari対策）
		const png = new Promise<Blob>((resolve, reject) =>
			canvas.toBlob(
				(blob) => (blob ? resolve(blob) : reject(new Error("toBlob"))),
				"image/png",
			),
		);
		navigator.clipboard
			.write([
				new ClipboardItem({
					"image/png": png,
					"text/plain": new Blob([pageTag], { type: "text/plain" }),
				}),
			])
			.catch(() => {});
	} catch {}
};

/**
 * 貼り付けイベントから貼る画像を決める
 *
 * @param allowExternal お絵描き以外からコピーされた画像も受け付けるか
 */
export const readPasteImage = async (
	e: ClipboardEvent,
	allowExternal: boolean,
): Promise<ImageBitmap | HTMLCanvasElement | null> => {
	let imageItem: DataTransferItem | null = null;
	let textItem: DataTransferItem | null = null;
	for (const v of e.clipboardData?.items ?? []) {
		if (v.kind === "file" && v.type.startsWith("image/")) imageItem ??= v;
		if (v.kind === "string" && v.type === "text/plain") textItem ??= v;
	}
	const text = textItem
		? await new Promise<string>((resolve) => textItem.getAsString(resolve))
		: "";
	// このページで複製したもの。内部の方が新しいか同じなので内部を使う
	if (text === pageTag) return internal;
	const fromOekaki = text.startsWith(MAGIC_STRING);
	if (imageItem && (fromOekaki || allowExternal)) {
		const file = imageItem.getAsFile();
		if (file) return await createImageBitmap(file);
	}
	return internal;
};
