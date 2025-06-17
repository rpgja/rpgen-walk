<script lang="ts">
    import { fps, mode } from "$lib/store";
    import * as unjStorage from "$lib/unj-storage.js";
    import PreviewSimplePart from "./PreviewSimplePart.svelte";
    import PreviewWalkPart from "./PreviewWalkPart.svelte";

    let { initTimestamp } = $props();

    const list = [
        { value: 0, label: "シンプル" },
        { value: 1, label: "歩行グラ" },
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
            value={$mode}
            onchange={(e) => {
                const { value } = e.currentTarget;
                const n = Number(value);
                mode.set(n);
                unjStorage.mode.value = value;
            }}
        >
            {#each list as v}
                <option value={v.value}>{v.label}</option>
            {/each}
        </select>
    </label>

    {#if $mode === 0}
        <PreviewSimplePart {initTimestamp} />
    {:else if $mode === 1}
        <PreviewWalkPart {initTimestamp} />
    {/if}
</div>
