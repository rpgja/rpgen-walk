import * as schema from "$lib/schema";
import * as oekaki from "@onjmin/oekaki";
import { writable } from "svelte/store";
import * as v from "valibot";
import * as unjStorage from "./unj-storage.js";

export const color = writable(unjStorage.color.value ?? oekaki.color.value);
export const activeIndex = writable(0);

const _fps = v.safeParse(schema.Fps, unjStorage.fps.value);
export const fps = writable(_fps.success ? _fps.output : 2);

const _mode = v.safeParse(schema.Mode, unjStorage.mode.value);
export const mode = writable(_mode.success ? _mode.output : 1);
