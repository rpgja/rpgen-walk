<script lang="ts">
    import { fps } from "$lib/store";
    import * as unjStorage from "$lib/unj-storage.js";
    import PreviewSimplePart from "./PreviewSimplePart.svelte";
    import PreviewWalkPart from "./PreviewWalkPart.svelte";

    let { initTimestamp } = $props();

    const list = ["歩行グラ", "シンプル"];
    let previewMode = $state(unjStorage.previewMode.value ?? "歩行グラ");
</script>

<div class="max-w-xs flex flex-col gap-4">
    <label class="flex flex-col">
        <select
            class="select select-bordered w-full bg-white"
            value={$fps}
            onchange={(e) => {
                const { value } = e.currentTarget;
                const n = Number(value);
                fps.set(n);
                unjStorage.fps.value = String(n);
            }}
        >
            {#each [2, 3, 4, 5, 6, 7, 8] as v}
                <option value={v}>{v}fps</option>
            {/each}
        </select>
    </label>

    <label class="flex flex-col">
        <select
            class="select select-bordered w-full bg-white"
            value={previewMode}
            onchange={(e) => {
                const { value } = e.currentTarget;
                previewMode = value;
                unjStorage.previewMode.value = value;
            }}
        >
            {#each list as v}
                <option value={v}>{v}</option>
            {/each}
        </select>
    </label>

    {#if previewMode === "歩行グラ"}
        <PreviewWalkPart {initTimestamp} />
    {:else if previewMode === "シンプル"}
        <PreviewSimplePart {initTimestamp} />
    {/if}
</div>
