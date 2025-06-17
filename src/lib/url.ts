import * as schema from "$lib/schema";
import * as v from "valibot";

export const sanitizeImageURL = (url: string) => {
	const _url = v.safeParse(schema.ImageURL, url);
	if (!_url.success) return "";
	let hostname = "";
	const { output } = _url;
	try {
		hostname = new URL(output).hostname;
	} catch (err) {
		return "";
	}
	if (hostname === "i.imgur.com") return output;
	return `https://api.allorigins.win/raw?url=${output}`;
};
