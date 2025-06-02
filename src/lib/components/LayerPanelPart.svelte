<script lang="ts">
	import {
		ArrowDownIcon,
		ArrowUpIcon,
		EyeClosedIcon,
		EyeIcon,
		LockIcon,
		LockOpenIcon,
		PlusIcon,
	} from "@lucide/svelte";
	import * as oekaki from "@onjmin/oekaki";

	let { activeLayer = $bindable(undefined) } = $props();

	let layers: oekaki.LayeredCanvas[] = $state([]);
	$effect(() => {
		if (!activeLayer) return;
		layers = oekaki.getLayers();
	});

	const moveLayerUp = (layer: oekaki.LayeredCanvas) => {
		const { prev } = layer;
		if (prev) {
			layer.swap(prev.index);
			layers = oekaki.getLayers();
		}
	};

	const moveLayerDown = (layer: oekaki.LayeredCanvas) => {
		const { next } = layer;
		if (next) {
			layer.swap(next.index);
			layers = oekaki.getLayers();
		}
	};

	const addLayer = () => {
		activeLayer = new oekaki.LayeredCanvas(
			`レイヤー #${layers.length + 1}`,
		);
	};

	let clickedTimestamp = $state(0);
	const updateClickedTimestamp = () => {
		setTimeout(() => {
			clickedTimestamp = performance.now();
		});
	};
	$effect(() => {
		document.addEventListener("click", updateClickedTimestamp);
		return () =>
			document.removeEventListener("click", updateClickedTimestamp);
	});
</script>

<div
	class="p-4 bg-white rounded shadow-md w-full max-w-md mx-auto max-h-[50vh] flex flex-col"
>
	<div class="flex items-center text-xs text-gray-500">
		<ArrowUpIcon class="w-4 h-4 mr-1" />
		最背面
	</div>

	<!-- レイヤーリスト（スクロール可能部分） -->
	<ul class="divide-y divide-gray-200 overflow-auto flex-1 min-h-0">
		{#each layers as layer}
			{#key activeLayer === layer ? clickedTimestamp : "noop"}
				<li
					class="flex items-center justify-between p-2 cursor-pointer {activeLayer ===
					layer
						? 'bg-blue-100'
						: 'hover:bg-gray-100'}"
				>
					<div
						tabindex="0"
						role="button"
						onkeydown={() => {}}
						class="flex items-center space-x-2"
						onclick={() => {
							activeLayer = layer;
						}}
					>
						<div
							class="gimp-checkered-background relative w-8 h-8 rounded overflow-hidden"
						>
							<div
								class="w-full h-full bg-center bg-cover"
								style="background-image: url({layer.used
									? layer.canvas.toDataURL('image/png')
									: 'https://placehold.co/32x32?text=new'});"
							></div>
						</div>
						<div>
							<p
								class="text-sm font-medium truncate max-w-[128px]"
							>
								{layer.name}
							</p>
							<div
								class="flex items-center text-xs text-gray-500 space-x-1"
							>
								{#if layer.locked}
									<LockIcon class="w-3 h-3" />
								{:else}
									<LockOpenIcon class="w-3 h-3" />
								{/if}
								{#if layer.visible}
									<EyeIcon class="w-3 h-3" />
								{:else}
									<EyeClosedIcon class="w-3 h-3" />
								{/if}
								<span>{layer.opacity}%</span>
							</div>
						</div>
					</div>
					<div class="flex space-x-1">
						<button
							class="p-1 text-gray-500 hover:text-blue-500"
							onclick={() => moveLayerUp(layer)}
						>
							<ArrowUpIcon class="w-4 h-4" />
						</button>
						<button
							class="p-1 text-gray-500 hover:text-blue-500"
							onclick={() => moveLayerDown(layer)}
						>
							<ArrowDownIcon class="w-4 h-4" />
						</button>
					</div>
				</li>
			{/key}
		{/each}
	</ul>

	<div class="flex items-center text-xs text-gray-500">
		<ArrowDownIcon class="w-4 h-4 mr-1" />
		最前面
	</div>

	<button
		class="flex items-center justify-center py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
		onclick={addLayer}
	>
		<PlusIcon class="w-4 h-4 mr-2" />
		レイヤー追加
	</button>
</div>
