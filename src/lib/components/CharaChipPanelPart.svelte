<script lang="ts">
	import {
		ArrowDownIcon,
		ArrowLeftIcon,
		ArrowRightIcon,
		ArrowUpIcon,
	} from "@lucide/svelte";
	import * as oekaki from "@onjmin/oekaki";
	import * as anime from "../anime";

	let { activeLayer = $bindable(undefined), ready } = $props();

	let activeIndex = $state(0);
	let prevIndex = 0;
	$effect(() => {
		if (!ready) return;
		anime.layersByI.set(prevIndex, oekaki.getLayers());
		const now = anime.layersByI.get(activeIndex);
		if (now) {
			oekaki.setLayers(now);
			activeLayer = now[now.length - 1];
		} else {
			oekaki.setLayers([]);
			activeLayer = new oekaki.LayeredCanvas("レイヤー #1");
		}
	});

	anime.init(4, 3, [anime.way.s, anime.way.w, anime.way.a, anime.way.d]);

	let clickedTimestamp = $state(0);
	const updateClickedTimestamp = () => {
		setTimeout(() => {
			clickedTimestamp = performance.now();
			const canvas = oekaki.render();
			anime.canvasByI.set(activeIndex, canvas);
			const dataURL = canvas.toDataURL("image/png");
			anime.dataURLByI.set(activeIndex, dataURL);
		});
	};
	$effect(() => {
		document.addEventListener("click", updateClickedTimestamp);
		return () =>
			document.removeEventListener("click", updateClickedTimestamp);
	});
</script>

<section class="space-y-4">
	{#each Array(anime.ways) as _, y}
		<div class="flex items-center gap-4">
			<!-- フレーム -->
			<div class="flex gap-4">
				{#each Array(anime.frames) as __, x}
					{#key anime.toI(x, y)}
						<div
							tabindex="0"
							role="button"
							onkeydown={() => {}}
							class={`relative w-16 h-16 rounded-container overflow-hidden cursor-pointer ${
								activeIndex === anime.toI(x, y)
									? "ring-4 ring-primary-500 ring-offset-2"
									: ""
							}`}
							onclick={() => {
								const i = anime.toI(x, y);
								if (activeIndex === i) return;
								prevIndex = activeIndex;
								activeIndex = i;
							}}
						>
							<!-- 左上バッジ -->
							<div
								class="absolute top-1 left-1 bg-primary-600/40 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center"
							>
								{anime.toI(x, y) + 1}
							</div>
							{#key clickedTimestamp}
								<img
									alt="frame"
									src={anime.dataURLByI.get(
										anime.toI(x, y),
									) ?? "https://placehold.co/32x32?text=new"}
									class="gimp-checkered-background w-full h-full object-cover bg-surface-500"
								/>
							{/key}
						</div>
					{/key}
				{/each}
			</div>
			<!-- 行ラベル -->
			<div class="w-6 text-sm font-semibold">
				{#if anime.waysOrder[y] === anime.way.w}
					<ArrowUpIcon />
				{:else if anime.waysOrder[y] === anime.way.a}
					<ArrowLeftIcon />
				{:else if anime.waysOrder[y] === anime.way.s}
					<ArrowDownIcon />
				{:else if anime.waysOrder[y] === anime.way.d}
					<ArrowRightIcon />
				{/if}
			</div>
		</div>
	{/each}
</section>
