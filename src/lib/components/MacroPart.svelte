<script lang="ts">
    import IconX from "@lucide/svelte/icons/x";
    import { Popover } from "@skeletonlabs/skeleton-svelte";
    import * as oekaki from "@onjmin/oekaki";
    import * as anime from "$lib/anime";

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
        const ctx = canvas.getContext("2d", {
            willReadFrequently: true,
        });
        if (!ctx) return;
        const { width, height } = anime;
        const dotSize = oekaki.getDotSize();
        const { data } = ctx.getImageData(
            0,
            0,
            width * dotSize,
            height * dotSize,
        );
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (x + width * y * dotSize) * dotSize * 4;
                const [r, g, b, a] = data.subarray(i, i + 4);
                if (a) continue;
                // 周囲8マスを見る
                for (let o = 0; o < 9; o++) {
                    if (o === 4) continue;
                    const xx = x + (o % 3) - 1;
                    const yy = y + ((o / 3) | 0) - 1;
                    if (xx < 0 || xx >= width) continue;
                    if (yy < 0 || yy >= height) continue;
                    const i = (xx + width * yy * dotSize) * dotSize * 4;
                    const [r, g, b, a] = data.subarray(i, i + 4);
                    if (a) {
                        activeLayer.drawByDot(x * dotSize, y * dotSize);
                        break;
                    }
                }
            }
        }
        activeLayer.trace();
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
                    輪郭塗り
                </button>
            </div>
        </article>
    {/snippet}
</Popover>
