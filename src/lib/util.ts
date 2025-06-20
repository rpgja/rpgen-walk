/**
 * ランダム整数
 */
export const randInt = (min: number, max: number) =>
	Math.floor(Math.random() * Math.abs(max - min + 1)) + min;

/**
 * ランダム抽出
 */
export const randArray = <T>(array: readonly T[]): T =>
	array[Math.floor(Math.random() * array.length)];
