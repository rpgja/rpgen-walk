import localforage from "localforage";

localforage.config({
	name: "rpg-walk.v25.5.30",
	storeName: "cache.objects",
});

export class ObjectStorage<T> {
	constructor(private key: string) {}
	async get(): Promise<T | null> {
		return (await localforage.getItem<T>(this.key)) ?? null;
	}
	set(value: T | null): void {
		try {
			localforage.setItem(this.key, JSON.parse(JSON.stringify(value)));
		} catch (err) {}
	}
}
