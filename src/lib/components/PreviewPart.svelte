<script lang="ts">
    import { fps, preview } from "$lib/store";
    import * as unjStorage from "$lib/unj-storage.js";
    import PreviewSimplePart from "./PreviewSimplePart.svelte";
    import PreviewWalkPart from "./PreviewWalkPart.svelte";

    let { initTimestamp } = $props();

    const list = [
        { value: 0, label: "歩行グラ" },
        { value: 1, label: "シンプル" },
    ];
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
            value={$preview}
            onchange={(e) => {
                const { value } = e.currentTarget;
                const n = Number(value);
                preview.set(n);
                unjStorage.preview.value = value;
            }}
        >
            {#each list as v}
                <option value={v.value}>{v.label}</option>
            {/each}
        </select>
    </label>

    {#if $preview === 0}
        <PreviewWalkPart {initTimestamp} />
    {:else if $preview === 1}
        <PreviewSimplePart {initTimestamp} />
    {/if}
</div>
