<script lang="ts">
    import IconX from "@lucide/svelte/icons/x";
    import { Popover } from "@skeletonlabs/skeleton-svelte";
    import * as oekaki from "@onjmin/oekaki";
    import { untrack } from "svelte";
    import * as anime from "$lib/anime";
    import type { Rect } from "$lib/auto-anime";
    import {
        drawGuides,
        estimateParts,
        generateWay,
        presets,
        splitParts,
        type LayerOption,
        type Preset,
    } from "$lib/auto-anime-frames";
    import { activeIndex, thumbnailsVersion } from "$lib/store";
    import {
        flattenWithSync,
        isSyncFrame,
        isSyncWay,
        resetSyncBase,
        syncEdit,
    } from "$lib/sync-edit";

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
        $thumbnailsVersion++;
    };

    /**
     * 表示中のレイヤーを見た目どおり1枚に統合する（非表示のレイヤーは消える）
     *
     * 一括適用のトグルが有効なら、同じ方向・同じ番目のコマも統合する
     */
    const drawFlatten = () => {
        const synced = $isSyncWay || $isSyncFrame;
        const message = synced
            ? "このコマと一括適用先のコマのレイヤーを1枚に統合しますか？（元に戻せません）"
            : "このコマのレイヤーを1枚に統合しますか？（元に戻せません）";
        if (!confirm(message)) return;
        activeLayer = flattenWithSync();
        resetSyncBase(activeLayer);
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
        // 全レイヤーの反転なので一括適用の対象にしない
        resetSyncBase(activeLayer);
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
        syncEdit(activeLayer);
    };

    // ───────────────────────────────────────────────────────
    // アニメ差分の自動生成
    // ───────────────────────────────────────────────────────

    /**
     * 頭と胴の境目（この行から胴）
     */
    let neck = $state(0);
    /**
     * 胴と脚の境目（この行から脚）
     */
    let legsTop = $state(0);
    let estimated = $state(false);

    /**
     * 境目を推定し直して目安の線を引く
     */
    const estimate = () => {
        const parts = estimateParts();
        if (!parts) {
            alert("絵がありません");
            return;
        }
        neck = parts.neck;
        legsTop = parts.legsTop;
        estimated = true;
        drawGuides(neck, legsTop);
    };

    /**
     * 選択中のレイヤーを頭・胴・脚のレイヤーに分ける
     */
    const doSplit = () => {
        if (!activeLayer || activeLayer.locked) return;
        if (!(neck < legsTop)) {
            alert("首の行は脚の行より上にしてください");
            return;
        }
        if (
            !confirm(
                `${activeLayer.name}を 頭（〜${neck - 1}行）・胴（${neck}〜${legsTop - 1}行）・脚（${legsTop}行〜）に分けますか？（元に戻せません）`,
            )
        )
            return;
        const made = splitParts(activeLayer, neck, legsTop);
        if (!made) {
            alert("分けられる絵がありません（部位が1つしか無い）");
            return;
        }
        activeLayer = made;
        resetSyncBase(activeLayer);
        refreshLayers();
    };

    let preset = $state<Preset>("bounce");
    let amp = $state(1);
    /**
     * 編集中のコマのレイヤー（ポップオーバーを開いた時と、レイヤーが変わった時に取り直す）
     */
    let frameLayers = $state<oekaki.LayeredCanvas[]>([]);
    /**
     * レイヤーごとの動かし方（uuidで引く）
     */
    let layerOpts = $state<Record<string, { move: boolean; delay: number }>>(
        {},
    );
    let legsLayerUuid = $state("");

    const refreshLayers = () => {
        const list = oekaki.getLayers();
        frameLayers = list;
        const next: typeof layerOpts = {};
        for (const l of list) {
            // 脚は動かさず、髪は1コマ遅らせるのが初期値
            next[l.uuid] = layerOpts[l.uuid] ?? {
                move: !l.name.includes("脚"),
                delay: l.name.includes("髪") ? 1 : 0,
            };
        }
        layerOpts = next;
        if (!list.some((l) => l.uuid === legsLayerUuid))
            legsLayerUuid = list.find((l) => l.name.includes("脚"))?.uuid ?? "";
    };
    $effect(() => {
        activeLayer;
        // 取り直す中で読む layerOpts 等を依存にしない（書き換えて自分を呼び直してしまう）
        if (open) untrack(refreshLayers);
    });

    const presetHint = $derived(
        presets.find((p) => p.key === preset)?.hint ?? "",
    );
    const needsLayerTable = $derived(
        preset === "bounce" || preset === "sway" || preset === "breath",
    );

    /**
     * 編集中のコマを元に、同じ方向の全コマを生成する
     */
    const doGenerate = () => {
        if (!anime.ready) return;
        const label = presets.find((p) => p.key === preset)?.label ?? "";
        const way = wayLabel(
            anime.waysOrder[Math.floor($activeIndex / anime.frames)],
        );
        const note =
            preset === "walk"
                ? "このコマも含めて"
                : "このコマを起点に、ほかの";
        if (
            !confirm(
                `${way}の${note}全コマを「${label}」で生成しますか？（元に戻せません）`,
            )
        )
            return;

        // 瞬きは範囲選択があればその範囲を目とみなす
        let eyes: Rect | null = null;
        const sel = activeLayer?.selection;
        if (preset === "blink" && sel) {
            const dotSize = oekaki.getDotSize();
            eyes = {
                x: Math.round(sel.x / dotSize),
                y: Math.round(sel.y / dotSize),
                w: Math.round(sel.w / dotSize),
                h: Math.round(sel.h / dotSize),
            };
            activeLayer.deselect();
        }
        const layers: LayerOption[] = frameLayers.map((layer) => ({
            layer,
            ...(layerOpts[layer.uuid] ?? { move: true, delay: 0 }),
        }));
        const result = generateWay({
            preset,
            amp: Math.max(1, Math.round(amp)),
            layers,
            legsLayer:
                frameLayers.find((l) => l.uuid === legsLayerUuid) ?? null,
            eyes,
        });
        if (result.error) {
            alert(result.error);
            return;
        }
        activeLayer = result.activeLayer ?? activeLayer;
        resetSyncBase(activeLayer);
        refreshLayers();
    };
</script>

<Popover
    {open}
    onOpenChange={(e) => {
        open = e.open;
        if (open) refreshLayers();
    }}
    positioning={{ placement: "top" }}
    triggerBase="btn preset-tonal"
    contentBase="card bg-surface-300 p-4 space-y-4 max-w-[320px] max-h-[80vh] overflow-y-auto"
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
            <div class="pt-2">
                <button
                    type="button"
                    class="w-full px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition"
                    aria-label="submit"
                    title="表示中のレイヤーを見た目どおり1枚にまとめる。一括適用のトグルが有効なら連動先のコマも統合する"
                    onclick={drawFlatten}
                >
                    1枚に統合
                </button>
            </div>

            <p class="opacity-60">パーツ分割</p>
            <p class="opacity-60 text-xs">
                選択中のレイヤーを頭・胴・脚のレイヤーに分けます。境目は推定した行を初期値にして、ずれていたら直してください（赤=首、青=脚の目安線）
            </p>
            <div class="flex items-center gap-2 text-sm">
                <label class="flex items-center gap-1">
                    首
                    <input
                        class="input w-16 bg-white"
                        type="number"
                        min="0"
                        max={anime.ready ? anime.height : 0}
                        bind:value={neck}
                        oninput={() => drawGuides(neck, legsTop)}
                    />
                </label>
                <label class="flex items-center gap-1">
                    脚
                    <input
                        class="input w-16 bg-white"
                        type="number"
                        min="0"
                        max={anime.ready ? anime.height : 0}
                        bind:value={legsTop}
                        oninput={() => drawGuides(neck, legsTop)}
                    />
                </label>
                <button
                    type="button"
                    class="px-2 py-1 rounded bg-gray-500 text-white hover:bg-gray-600 transition"
                    onclick={estimate}
                >
                    {estimated ? "再推定" : "推定"}
                </button>
            </div>
            <div class="pt-2">
                <button
                    type="button"
                    class="w-full px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition disabled:opacity-50"
                    disabled={!estimated}
                    onclick={doSplit}
                >
                    頭・胴・脚に分ける
                </button>
            </div>

            <p class="opacity-60">動き付け</p>
            <p class="opacity-60 text-xs">
                このコマを起点に、同じ方向の全コマを生成します。パーツ分割しておくと部位ごとに動かせます
            </p>
            <select
                class="select select-bordered w-full bg-white"
                bind:value={preset}
            >
                {#each presets as p}
                    <option value={p.key}>{p.label}</option>
                {/each}
            </select>
            <p class="opacity-60 text-xs">{presetHint}</p>
            {#if preset !== "blink"}
                <label class="flex items-center gap-2 text-sm">
                    {preset === "walk" ? "持ち上げ（ドット）" : "振れ幅（ドット）"}
                    <input
                        class="input w-16 bg-white"
                        type="number"
                        min="1"
                        max="8"
                        bind:value={amp}
                    />
                </label>
            {/if}
            {#if needsLayerTable}
                <table class="w-full text-sm">
                    <thead class="opacity-60 text-xs">
                        <tr>
                            <th class="text-left">レイヤー</th>
                            <th>動かす</th>
                            <th>遅れ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each frameLayers as layer (layer.uuid)}
                            {#if layerOpts[layer.uuid]}
                                <tr>
                                    <td class="truncate max-w-[120px]"
                                        >{layer.name}</td
                                    >
                                    <td class="text-center">
                                        <input
                                            class="checkbox"
                                            type="checkbox"
                                            bind:checked={
                                                layerOpts[layer.uuid].move
                                            }
                                        />
                                    </td>
                                    <td class="text-center">
                                        <input
                                            class="input w-14 bg-white"
                                            type="number"
                                            min="0"
                                            max={anime.ready
                                                ? anime.frames - 1
                                                : 0}
                                            disabled={!layerOpts[layer.uuid]
                                                .move}
                                            bind:value={
                                                layerOpts[layer.uuid].delay
                                            }
                                        />
                                    </td>
                                </tr>
                            {/if}
                        {/each}
                    </tbody>
                </table>
            {/if}
            {#if preset === "walk"}
                <label class="flex items-center gap-2 text-sm">
                    脚のレイヤー
                    <select
                        class="select select-bordered flex-1 bg-white"
                        bind:value={legsLayerUuid}
                    >
                        <option value="">自動（絵の下の帯）</option>
                        {#each frameLayers as layer (layer.uuid)}
                            <option value={layer.uuid}>{layer.name}</option>
                        {/each}
                    </select>
                </label>
            {/if}
            <div class="pt-2">
                <button
                    type="button"
                    class="w-full px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition"
                    onclick={doGenerate}
                >
                    全コマを生成
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
