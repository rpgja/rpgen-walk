import * as schema from "$lib/schema";
import * as v from "valibot";
import { randArray } from "./util";

const CORS_FREE_HOSTS = [
	(h: string) => h === "i.imgur.com", // imgur画像はCORS許可あり
	(h: string) => h.endsWith("github.io"), // GitHub PagesはCORS対応
	(h: string) => h.endsWith("raw.githubusercontent.com"), // GitHub rawもCORSあり
	(h: string) => h === "cdn.jsdelivr.net", // JSDelivrはCORS対応CDN
	(h: string) => h === "upload.wikimedia.org", // Wikipedia画像CDN
	(h: string) => h === "images.unsplash.com", // Unsplash画像はCORS許可
	(h: string) => h.endsWith("googleusercontent.com"), // Google系画像CDN（Blogger等）
	(h: string) => h.endsWith("picsum.photos"), // Lorem Picsum（CORSあり）
	(h: string) => h === "placehold.co", // プレースホルダー画像（CORS対応）
	(h: string) => h === "dummyimage.com", // プレースホルダー画像（古典的）
];

/**
 * 指定された画像URLを、安全かつCanvasなどで使用できる形に整形する
 */
export const sanitizeImageURL = (url: string) => {
	// スキーマバリデーション（不正なURLは空文字を返す）
	const _url = v.safeParse(schema.ImageURL, url);
	if (!_url.success) return "";
	const { output } = _url;
	try {
		// URLオブジェクト化できなければ無効な形式として扱う
		const u = new URL(output);

		// data URI（Base64埋め込み形式）はそのまま使用
		if (u.protocol === "data:") return output;

		// CORS制限のないホワイトリストに含まれていればプロキシ不要
		if (CORS_FREE_HOSTS.some((fn) => fn(u.hostname))) return output;
	} catch (err) {
		// パースエラー時は無効なURLとみなして空文字を返す
		return "";
	}

	// 上記以外はCORS制限がある可能性が高いため、プロキシをランダムに使用して回避
	// プロキシは全て公開・無認証サービス（障害時に備えて複数用意）
	return randArray([
		`https://api.allorigins.win/raw?url=${output}`, // オープンな汎用プロキシ（やや不安定）
		`https://corsproxy.io/?${output}`, // AllOrigins互換の軽量プロキシ
		`https://api.codetabs.com/v1/proxy?quest=${output}`, // 古くからあるCORS対応プロキシ
	]);
};
