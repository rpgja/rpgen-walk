<script lang="ts">
	import {
		ArrowDownIcon,
		ArrowLeftIcon,
		ArrowRightIcon,
		ArrowUpIcon,
	} from "@lucide/svelte";
	import * as oekaki from "@onjmin/oekaki";

	let activeIndex = 0;
	const directions = [
		{
			label: "前",
			icon: ArrowDownIcon,
		},
		{
			label: "後",
			icon: ArrowUpIcon,
		},
		{
			label: "左",
			icon: ArrowLeftIcon,
		},
		{
			label: "右",
			icon: ArrowRightIcon,
		},
	];

	const ways = 4;
	const frames = 3;

	const layersByIndex = new Map();
	const imageByIndex = new Map();
	const toIndex = (rowIndex: number, colIndex: number) =>
		rowIndex * frames + colIndex;
</script>

<section class="space-y-4">
	{#each Array(ways) as _, rowIndex}
		<div class="flex items-center gap-4">
			<!-- 行ラベル -->
			<div class="w-6 text-sm font-semibold">
				<svelte:component this={directions[rowIndex].icon} />
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
							onclick={() =>
								(activeIndex = toIndex(rowIndex, colIndex))}
						>
							<!-- 左上バッジ -->
							<div
								class="absolute top-1 left-1 bg-primary-600/40 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center"
							>
								{toIndex(rowIndex, colIndex) + 1}
							</div>
							<img
								alt="frame"
								src={imageByIndex.get(
									toIndex(rowIndex, colIndex),
								) ?? "https://placehold.co/32x32?text=new"}
								class="w-full h-full object-cover bg-surface-500"
							/>
						</div>
					{/key}
				{/each}
			</div>
		</div>
	{/each}
</section>
