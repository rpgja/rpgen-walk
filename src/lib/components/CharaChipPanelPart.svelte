<script lang="ts">
	import * as anime from "$lib/anime";
	import { activeIndex } from "$lib/store";
	import {
		ArrowDownIcon,
		ArrowLeftIcon,
		ArrowRightIcon,
		ArrowUpIcon,
		FileQuestion,
	} from "@lucide/svelte";
	import * as oekaki from "@onjmin/oekaki";

	let {
		activeLayer = $bindable(undefined),
		initTimestamp,
		pointerupTimestamp,
	} = $props();

	let prevIndex = 0;
	$effect(() => {
		if (!initTimestamp) return;
		$activeIndex = 0;
		prevIndex = 0;
	});

	$effect(() => {
		if (!initTimestamp) return;
		anime.layersByI.set(prevIndex, oekaki.getLayers());
		const now = anime.layersByI.get($activeIndex);
		if (now) {
			oekaki.setLayers(now);
		} else {
			oekaki.setLayers([]);
			activeLayer = new oekaki.LayeredCanvas("レイヤー #1");
		}
	});

	// キャラチップ切り替え時に元のレイヤーを選び直す実装
	// TODO: レイヤーが1枚しかないときの新規レイヤー追加時にバグあり
	$effect(() => {
		const activatedLayer = anime.activatedByI.get($activeIndex);
		if (!activatedLayer || $activeIndex === prevIndex) {
			anime.activatedByI.set($activeIndex, activeLayer);
		} else {
			activeLayer = activatedLayer;
			prevIndex = $activeIndex;
		}
	});

	let pointerupTimestampAfter = $state(0);
	$effect(() => {
		if (!initTimestamp || !pointerupTimestamp) return;
		const canvas = oekaki.render();
		anime.canvasByI.set($activeIndex, canvas);
		const dataURL = canvas.toDataURL("image/png");
		anime.dataURLByI.set($activeIndex, dataURL);
		pointerupTimestampAfter = performance.now();
	});
</script>

<section
	class="space-y-4 p-4 max-h-[70vh] overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]"
>
	{#key initTimestamp}
		{#if anime.ready}
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
										$activeIndex === anime.toI(x, y)
											? "ring-4 ring-primary-500 ring-offset-2"
											: ""
									}`}
									onclick={() => {
										const i = anime.toI(x, y);
										if ($activeIndex === i) return;
										prevIndex = $activeIndex;
										$activeIndex = i;
									}}
								>
									<!-- 左上バッジ -->
									<div
										class="absolute top-1 left-1 bg-primary-600/80 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center"
									>
										{anime.toI(x, y) + 1}
									</div>
									{#key pointerupTimestampAfter}
										<img
											alt="frame"
											src={anime.dataURLByI.get(
												anime.toI(x, y),
											) ??
												"https://placehold.co/32x32?text=new"}
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
						{:else if anime.waysOrder[y] === anime.way.q}
							<ArrowUpIcon class="rotate-315" />
						{:else if anime.waysOrder[y] === anime.way.e}
							<ArrowUpIcon class="rotate-45" />
						{:else if anime.waysOrder[y] === anime.way.z}
							<ArrowUpIcon class="rotate-225" />
						{:else if anime.waysOrder[y] === anime.way.c}
							<ArrowUpIcon class="rotate-135" />
						{:else}
							<FileQuestion />
						{/if}
					</div>
				</div>
			{/each}
		{/if}
	{/key}
</section>
