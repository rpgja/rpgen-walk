<script lang="ts">
    import IconX from "@lucide/svelte/icons/x";
    import { Popover } from "@skeletonlabs/skeleton-svelte";
    import * as oekaki from "@onjmin/oekaki";
    import * as anime from "$lib/anime";
    import { activeIndex } from "$lib/store";

    let { activeLayer = $bindable() } = $props();

    let open = $state(false);
    let sourceWayKey = $state("");
    let pasteFlipped = $state(false);

    const wayLabel = (way: { key: string; label: string }) =>
        way.label ? `${way.label}（${way.key}）` : way.key;

    /**
     * 選択中のコマが属する方向の全コマを、指定した方向のコマで上書きする
     *
     * コピー元は全レイヤーを重ね合わせた見た目。貼り先は1枚のレイヤーになる。
     * コマ単位の操作なのでUndoは効かない
     */
    const pasteWay = () => {
        const { width, height, frames } = anime;
        const srcY = anime.waysOrder.findIndex((v) => v.key === sourceWayKey);
        const dstY = Math.floor($activeIndex / frames);
        if (srcY === -1 || srcY === dstY) return;
        const src = wayLabel(anime.waysOrder[srcY]);
        const dst = wayLabel(anime.waysOrder[dstY]);
        if (!confirm(`${dst}の全コマを${src}のコマで上書きしますか？`)) return;

        // 編集中のコマはoekaki側にしか無いので先に戻しておく
        anime.layersByI.set($activeIndex, oekaki.getLayers());

        // 絵は左上から width×height ドット分
        const dotSize = oekaki.getDotSize();
        const w = width * dotSize;
        const h = height * dotSize;
        for (let x = 0; x < frames; x++) {
            const from = anime.toI(x, srcY);
            const to = anime.toI(x, dstY);
            anime.activatedByI.delete(to);
            const layers = anime.layersByI.get(from) ?? [];
            if (!layers.length) {
                anime.layersByI.delete(to);
                anime.canvasByI.delete(to);
                anime.dataURLByI.delete(to);
                continue;
            }
            oekaki.setLayers(layers);
            const merged = oekaki.render();
            oekaki.setLayers([]);
            const layer = new oekaki.LayeredCanvas("レイヤー #1");
            const { ctx } = layer;
            ctx.save();
            if (pasteFlipped) {
                ctx.translate(w, 0);
                ctx.scale(-1, 1);
            }
            ctx.drawImage(merged, 0, 0, w, h, 0, 0, w, h);
            ctx.restore();
            layer.trace();
            layer.used = true;
            anime.layersByI.set(to, [layer]);
            const rendered = oekaki.render();
            anime.canvasByI.set(to, rendered);
            anime.dataURLByI.set(to, rendered.toDataURL("image/png"));
        }

        // 編集中のコマを差し替え後のものにする
        const now = anime.layersByI.get($activeIndex);
        oekaki.setLayers(now ?? []);
        activeLayer = now?.length
            ? now[now.length - 1]
            : new oekaki.LayeredCanvas("レイヤー #1");
    };

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

            <p class="opacity-60">方向の一括上書き</p>
            <p class="opacity-60 text-xs">
                選択中のコマの方向（{anime.ready
                    ? wayLabel(
                          anime.waysOrder[
                              Math.floor($activeIndex / anime.frames)
                          ],
                      )
                    : ""}）の全コマを、選んだ方向のコマ（全レイヤーを重ねた見た目）で上書きします
            </p>
            <select
                class="select select-bordered w-full bg-white"
                bind:value={sourceWayKey}
            >
                <option value="">コピー元の方向</option>
                {#each anime.ready ? anime.waysOrder : [] as way, y}
                    {#if y !== Math.floor($activeIndex / anime.frames)}
                        <option value={way.key}>{wayLabel(way)}</option>
                    {/if}
                {/each}
            </select>
            <label class="flex items-center space-x-2">
                <input
                    class="checkbox"
                    type="checkbox"
                    bind:checked={pasteFlipped}
                />
                <p>左右反転して貼る</p>
            </label>
            <div class="pt-2">
                <button
                    type="button"
                    class="w-full px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition disabled:opacity-50"
                    disabled={!sourceWayKey}
                    onclick={pasteWay}
                >
                    一括上書きペースト
                </button>
            </div>
        </article>
    {/snippet}
</Popover>
