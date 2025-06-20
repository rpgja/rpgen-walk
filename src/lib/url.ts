import * as schema from "$lib/schema";
import * as v from "valibot";

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

export const sanitizeImageURL = (url: string) => {
	const _url = v.safeParse(schema.ImageURL, url);
	if (!_url.success) return "";
	const { output } = _url;
	try {
		const u = new URL(output);
		if (u.protocol === "data:") return output;
		if (CORS_FREE_HOSTS.some((fn) => fn(u.hostname))) return output;
	} catch (err) {
		return "";
	}
	return `https://api.allorigins.win/raw?url=${output}`;
};
