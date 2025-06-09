<script lang="ts">
    import { fps } from "$lib/store";
    import PreviewSimplePart from "./PreviewSimplePart.svelte";
    import PreviewWalkPart from "./PreviewWalkPart.svelte";

    let { initTimestamp } = $props();

    const list = ["歩行グラ", "シンプル"];
    let previewMode = $state("歩行グラ");
</script>

<div class="max-w-xs mx-auto flex flex-col gap-4">
    <label class="flex flex-col">
        <select
            class="select select-bordered w-full bg-white"
            onchange={(e) => {
                const { value } = e.currentTarget;
                const n = Number(value);
                fps.set(n);
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
            onchange={(e) => {
                const { value } = e.currentTarget;
                previewMode = value;
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
