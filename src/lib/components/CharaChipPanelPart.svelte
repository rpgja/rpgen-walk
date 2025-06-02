<script lang="ts">
	import {
		ArrowDownIcon,
		ArrowLeftIcon,
		ArrowRightIcon,
		ArrowUpIcon,
	} from "@lucide/svelte";
	import * as oekaki from "@onjmin/oekaki";

	let { activeLayer = $bindable(undefined), ready } = $props();

	let activeIndex = $state(0);
	let prevIndex = 0;
	$effect(() => {
		if (!ready) return;
		layersByIndex.set(prevIndex, oekaki.getLayers());
		const now = layersByIndex.get(activeIndex);
		if (now) {
			oekaki.setLayers(now);
			activeLayer = now[now.length - 1];
		} else {
			oekaki.setLayers([]);
			activeLayer = new oekaki.LayeredCanvas("レイヤー #1");
		}
	});

	const directions = ["前", "後", "左", "右"];

	const ways = 4;
	const frames = 3;

	const layersByIndex = new Map<number, oekaki.LayeredCanvas[]>();
	const imageByIndex = new Map<number, string>();
	const toIndex = (rowIndex: number, colIndex: number) =>
		rowIndex * frames + colIndex;

	let clickedTimestamp = $state(0);
	const updateClickedTimestamp = () => {
		setTimeout(() => {
			clickedTimestamp = performance.now();
			// const now = layersByIndex.get(activeIndex);
			// if (!now) return;
			const dataURL = oekaki.render().toDataURL("image/png");
			imageByIndex.set(activeIndex, dataURL);
		});
	};
	$effect(() => {
		document.addEventListener("click", updateClickedTimestamp);
		return () =>
			document.removeEventListener("click", updateClickedTimestamp);
	});
</script>

<section class="space-y-4">
	{#each Array(ways) as _, rowIndex}
		<div class="flex items-center gap-4">
			<!-- 行ラベル -->
			<div class="w-6 text-sm font-semibold">
				{#if directions[rowIndex] === "前"}
					<ArrowDownIcon />
				{:else if directions[rowIndex] === "後"}
					<ArrowUpIcon />
				{:else if directions[rowIndex] === "左"}
					<ArrowLeftIcon />
				{:else if directions[rowIndex] === "右"}
					<ArrowRightIcon />
				{/if}
			</div>

			<!-- 画像3枚 -->
			<div class="flex gap-4">
				{#each Array(frames) as __, colIndex}
					{#key toIndex(rowIndex, colIndex)}
						<div
							tabindex="0"
							role="button"
							onkeydown={() => {}}
							class={`relative w-16 h-16 rounded-container overflow-hidden cursor-pointer ${
								activeIndex === toIndex(rowIndex, colIndex)
									? "ring-4 ring-primary-500 ring-offset-2"
									: ""
							}`}
							onclick={() => {
								const i = toIndex(rowIndex, colIndex);
								if (activeIndex === i) return;
								prevIndex = activeIndex;
								activeIndex = i;
							}}
						>
							<!-- 左上バッジ -->
							<div
								class="absolute top-1 left-1 bg-primary-600/40 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center"
							>
								{toIndex(rowIndex, colIndex) + 1}
							</div>
							{#key clickedTimestamp}
								<img
									alt="frame"
									src={imageByIndex.get(
										toIndex(rowIndex, colIndex),
									) ?? "https://placehold.co/32x32?text=new"}
									class="w-full h-full object-cover bg-surface-500 gimp-checkered-background"
								/>
							{/key}
						</div>
					{/key}
				{/each}
			</div>
		</div>
	{/each}
</section>
