import * as v from "valibot";

export const Width = v.pipe(
	v.string(),
	v.transform((input) => Number(input)),
	v.number(),
	v.integer(),
	v.minValue(16),
	v.maxValue(256),
);

export const Height = v.pipe(
	v.string(),
	v.transform((input) => Number(input)),
	v.number(),
	v.integer(),
	v.minValue(16),
	v.maxValue(256),
);

export const Frames = v.pipe(
	v.string(),
	v.transform((input) => Number(input)),
	v.number(),
	v.integer(),
	v.minValue(1),
	v.maxValue(8),
);

export const Ways = v.pipe(
	v.string(),
	v.trim(),
	v.regex(/^[a-z]+$/),
	v.check((input) => input.length === new Set(input).size),
);

export const Fps = v.pipe(
	v.string(),
	v.transform((input) => Number(input)),
	v.number(),
	v.integer(),
	v.minValue(2),
	v.maxValue(8),
);

export const Mode = v.pipe(
	v.string(),
	v.transform((input) => Number(input)),
	v.number(),
	v.integer(),
	v.minValue(0),
	v.maxValue(1),
);
