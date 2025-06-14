<script lang="ts">
    import IconX from "@lucide/svelte/icons/x";
    import { Popover } from "@skeletonlabs/skeleton-svelte";
    import * as oekaki from "@onjmin/oekaki";

    let { activeLayer = $bindable() } = $props();

    let open = $state(false);

    const drawFlip = async () => {
        for (const layer of oekaki.getLayers()) {
            const { canvas, ctx } = layer;
            const imageData = ctx.getImageData(
                0,
                0,
                canvas.width,
                canvas.height,
            );
            const bitmap = await createImageBitmap(imageData);
            layer.clear();
            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(bitmap, -canvas.width, 0);
            ctx.restore();
            layer.trace();
        }
    };

    const drawOutline = () => {
        const canvas = oekaki.render();
    };
</script>

<Popover
    {open}
    onOpenChange={(e) => (open = e.open)}
    positioning={{ placement: "top" }}
    triggerBase="btn preset-tonal"
    contentBase="card bg-surface-300 p-4 space-y-4 max-w-[320px]"
    arrow
    arrowBackground="!bg-surface-300 dark:!bg-surface-800"
>
    {#snippet trigger()}マクロ{/snippet}
    {#snippet content()}
        <header class="flex justify-between">
            <p class="font-bold text-xl">自動操作</p>
            <button
                class="btn-icon hover:preset-tonal"
                onclick={() => {
                    open = false;
                }}><IconX /></button
            >
        </header>
        <article class="space-y-4">
            <p class="opacity-60">自動お絵描き</p>
            <div class="pt-2">
                <button
                    type="button"
                    class="w-full px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition"
                    aria-label="submit"
                    onclick={drawFlip}
                >
                    左右反転
                </button>
            </div>
            <div class="pt-2">
                <button
                    type="button"
                    class="w-full px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition"
                    aria-label="submit"
                    onclick={drawOutline}
                >
                    外周1px黒塗り
                </button>
            </div>
        </article>
    {/snippet}
</Popover>
