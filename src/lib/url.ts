import * as schema from "$lib/schema";
import * as v from "valibot";

export const sanitizeImageURL = (url: string) => {
	const _url = v.safeParse(schema.ImageURL, url);
	if (!_url.success) return "";
	const { output } = _url;
	try {
		const url = new URL(output);
		if (url.protocol === "data:") return output;
		if (url.hostname === "i.imgur.com") return output;
	} catch (err) {
		return "";
	}
	return `https://api.allorigins.win/raw?url=${output}`;
};
