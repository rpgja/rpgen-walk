import * as schema from "$lib/schema";
import * as oekaki from "@onjmin/oekaki";
import { writable } from "svelte/store";
import * as v from "valibot";
import * as unjStorage from "./unj-storage.js";

export const color = writable(unjStorage.color.value ?? oekaki.color.value);
export const activeIndex = writable(0);

export const fps = writable(
	v.safeParse(schema.Fps, unjStorage.fps.value).output ?? 2,
);
export const mode = writable(
	v.safeParse(schema.Mode, unjStorage.mode.value).output ?? 1,
);
