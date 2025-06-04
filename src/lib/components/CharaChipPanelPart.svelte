<script lang="ts">
	import {
		ArrowDownIcon,
		ArrowLeftIcon,
		ArrowRightIcon,
		ArrowUpIcon,
	} from "@lucide/svelte";
	import * as oekaki from "@onjmin/oekaki";
	import * as anime from "../anime";

	let {
		activeLayer = $bindable(undefined),
		initTimestamp,
		pointerupTimestamp,
	} = $props();

	let activeIndex = $state(0);
	let prevIndex = 0;
	$effect(() => {
		if (!initTimestamp) return;
		activeIndex = 0;
		prevIndex = 0;
	});

	$effect(() => {
		if (!initTimestamp) return;
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

	anime.init(
		anime.RPGEN.w,
		anime.RPGEN.h,
		anime.RPGEN.frames,
		anime.waysToStr(anime.RPGEN.ways),
	);

	let pointerupTimestampAfter = $state(0);
	$effect(() => {
		if (!initTimestamp || !pointerupTimestamp) return;
		const canvas = oekaki.render();
		anime.canvasByI.set(activeIndex, canvas);
		const dataURL = canvas.toDataURL("image/png");
		anime.dataURLByI.set(activeIndex, dataURL);
		pointerupTimestampAfter = performance.now();
	});
</script>

<section class="space-y-4">
	{#key initTimestamp}
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
					{/if}
				</div>
			</div>
		{/each}
	{/key}
</section>
