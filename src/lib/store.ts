import * as oekaki from "@onjmin/oekaki";
import { writable } from "svelte/store";
import * as unjStorage from "./unj-storage.js";

export const color = writable(unjStorage.color.value ?? oekaki.color.value);
export const activeIndex = writable(0);
export const fps = writable(
	unjStorage.fps.value ? Number(unjStorage.fps.value) : 2,
);
