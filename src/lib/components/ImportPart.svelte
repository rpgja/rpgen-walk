<script lang="ts">
    import { base } from "$app/paths";
    import { combineAniIconsToDataUrl } from "$lib/ani";
    import * as anime from "$lib/anime";
    import { importImage } from "$lib/init";
    import * as schema from "$lib/schema";
    import {
        analyzeSheet,
        applySheet,
        dotsToDataURL,
        imageToRaw,
        rowMapping,
    } from "$lib/sheet-import-frames";
    import type { SheetResult } from "$lib/sheet-import";
    import {
        imageUrl,
        isAddEmptyLayer,
        isSimpleImport,
        opacity,
    } from "$lib/store";
    import { Trash2Icon } from "@lucide/svelte";
    import IconX from "@lucide/svelte/icons/x";
    import { corsKiller } from "@onjmin/cors-killer";
    import * as oekaki from "@onjmin/oekaki";
    import { Popover } from "@skeletonlabs/skeleton-svelte";
    import { Slider } from "@skeletonlabs/skeleton-svelte";
    import * as v from "valibot";

    let {
        init,
        activeLayer = $bindable(),
        initTimestamp = $bindable(),
    } = $props();

    let open = $state(false);
    let imageRef = $state<HTMLImageElement>();
    let fileInput: HTMLInputElement;

    const handleFileChange = (event: Event) => {
        const file = (event.target as HTMLInputElement)?.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async () => {
                const result = v.safeParse(schema.ImageURL, reader.result);
                if (!result.success) return;
                if (/\.ani$/i.test(file.name)) {
                    const buffer = await file.arrayBuffer();
                    $imageUrl = await combineAniIconsToDataUrl(buffer);
                } else {
                    $imageUrl = result.output;
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleImportButton = async () => {
        if (!$imageUrl || !imageRef || imageRef.naturalWidth === 0) return;
        if (!confirm("歩行グラを読み込みますか？（※全てのデータは失われます）"))
            return;
        init();
        if (isSheetImport && sheet) applySheet(sheet, sheetOrder);
        else importImage(imageRef);
        const now = anime.layersByI.get(0);
        if (now) {
            oekaki.setLayers(now);
            activeLayer = now[now.length - 1];
            initTimestamp = performance.now();
        }
    };

    // ───────────────────────────────────────────────────────
    // 背景付きシートの切り分け取り込み
    // ───────────────────────────────────────────────────────

    /**
     * 背景を透過してコマごとに切り分ける（AI生成素材など、背景が単色で格子が揃っていない素材向け）
     */
    let isSheetImport = $state(false);
    /**
     * 背景とみなす色の許容誤差（0〜255）
     */
    let tolerance = $state(40);
    /**
     * 1ドットが何pxか（0なら自動で測る）
     */
    let pitchHint = $state(0);
    /**
     * シートの行の並び（方向のキー）。初期値は今の方向の並び
     */
    let sheetOrder = $state("");
    let sheet = $state<SheetResult | null>(null);
    /**
     * 取り込む前に見せる、コマごとの絵（行ごと）
     */
    let previews = $state<(string | null)[][]>([]);
    let analyzing = $state(false);
    /**
     * 画像の読み込み完了を知るためのカウンタ
     */
    let imageLoaded = $state(0);

    /**
     * 今の画像と設定で切り分け直し、プレビューを作る
     */
    const analyze = () => {
        sheet = null;
        previews = [];
        if (!isSheetImport || !imageRef || imageRef.naturalWidth === 0) return;
        if (!sheetOrder && anime.ready)
            sheetOrder = anime.waysToStr(anime.waysOrder);
        analyzing = true;
        try {
            const result = analyzeSheet(
                imageToRaw(imageRef),
                tolerance,
                $isSimpleImport,
                pitchHint,
            );
            sheet = result;
            // 1コマが 64px 前後に見える倍率
            const scale = Math.max(1, Math.round(64 / anime.height));
            previews = result.frames.map((row) =>
                row.map((dots) => (dots ? dotsToDataURL(dots, scale) : null)),
            );
        } catch (e) {
            console.error(e);
        } finally {
            analyzing = false;
        }
    };
    $effect(() => {
        isSheetImport;
        tolerance;
        pitchHint;
        $isSimpleImport;
        imageLoaded;
        analyze();
    });

    const sheetSummary = $derived.by(() => {
        if (!sheet) return "";
        const bg = sheet.background
            ? `rgb(${sheet.background.join(", ")})`
            : "透明";
        const cols = [...new Set(sheet.detectedCols)].join("・");
        const p = sheet.pitches;
        const pitch = p.length
            ? `${Math.min(...p).toFixed(2)}〜${Math.max(...p).toFixed(2)}px`
            : "-";
        return `背景: ${bg} / 検出: ${sheet.detectedRows}行 × ${cols}列 / 1ドット: ${pitch} / 絵: 最大 ${sheet.maxCols}×${sheet.maxRows}ドット`;
    });

    /**
     * 検出した行・列数やコマの大きさが今の設定と合わないときの注意
     */
    const sheetWarnings = $derived.by(() => {
        if (!sheet || !anime.ready) return [];
        const out: string[] = [];
        const { frames, ways, width, height } = anime;
        const cols = Math.max(0, ...sheet.detectedCols);
        if (cols > frames)
            out.push(
                `${cols}列を検出しましたがコマ数が${frames}なので、先頭${frames}列だけ取り込みます。全部入れるならリサイズでコマ数を${cols}にしてください`,
            );
        if (sheet.detectedRows > ways)
            out.push(
                `${sheet.detectedRows}行を検出しましたが方向が${ways}つなので、先頭${ways}行だけ取り込みます`,
            );
        if (sheet.detectedRows < ways || cols < frames)
            out.push("検出した行・列が足りないので、広い塊を等分しています");
        if (sheet.coarsened)
            out.push(
                `絵がコマ（${width}×${height}）に収まらないので粗くしています。先にリサイズで大きくしてください`,
            );
        if (rowMapping(sheetOrder).some((y) => y < 0))
            out.push("行の並びに今の方向に無い文字があります。その行は取り込みません");
        return out;
    });

    /**
     * 同梱素材（static/assets/mv 以下）。白背景の物は「背景を透過して切り分ける」で読み込む
     */
    const template = [
        ...["sheet-a", "sheet-b", "pose-a"],
        ...["a", "b", "c", "d", "e", "f", "g"].map((v) => `beat-${v}`),
    ]
        .map((v) => `roze/${v}`)
        .concat(
            ["a", "b", "c"].map((v) => `cookie/mgr-${v}`),
            ["a", "b", "c"].map((v) => `cookie/mot-${v}`),
            ["a", "b", "c", "d"].map((v) => `cookie/nyn-${v}`),
        )
        .map((label) => ({ label, path: `${base}/assets/mv/${label}.png` }));

    /**
     * 同じオリジンの画像（同梱素材）はプロキシを通さない
     */
    const toSrc = (url: string) => {
        try {
            if (new URL(url).origin === location.origin) return url;
        } catch {}
        return corsKiller(url);
    };
</script>

<Popover
    {open}
    onOpenChange={(e) => (open = e.open)}
    positioning={{ placement: "top" }}
    triggerBase="btn preset-tonal"
    contentBase="card bg-surface-300 p-4 space-y-4 max-w-[320px] w-[320px]"
    arrow
    arrowBackground="!bg-surface-300 dark:!bg-surface-800"
>
    {#snippet trigger()}読み込み{/snippet}
    {#snippet content()}
        <header class="flex justify-between">
            <p class="font-bold text-xl">歩行グラの読み込み</p>
            <button
                class="btn-icon hover:preset-tonal"
                onclick={() => {
                    open = false;
                }}><IconX /></button
            >
        </header>
        <article class="space-y-4">
            <p class="opacity-60">先にリサイズしてください</p>
            <a
                href="https://github.com/rpgja/rpgen-walk/tree/main?tab=readme-ov-file#%E5%90%8C%E6%A2%B1%E7%B4%A0%E6%9D%90%E3%81%AB%E3%81%A4%E3%81%84%E3%81%A6--about-included-assets"
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-800 hover:underline"
            >
                同梱素材の利用規約はこちら
            </a>
            <label class="flex flex-col">
                <span class="label-text font-medium">テンプレ</span>
                <select
                    class="select select-bordered w-full bg-white"
                    onchange={(e) => {
                        const v = template.find(
                            (v) => v.label === e.currentTarget.value,
                        );
                        if (!v) return;
                        $imageUrl = new URL(v.path, location.href).href;
                    }}
                >
                    <option value="">自動入力</option>
                    {#each template as v}
                        <option value={v.label}>{v.label}</option>
                    {/each}
                </select>
            </label>

            <div class="relative flex-1">
                <input
                    name="url"
                    type="url"
                    placeholder="画像のURLを入力"
                    class="input input-bordered w-full pr-8 bg-white"
                    bind:value={$imageUrl}
                />
                <Trash2Icon
                    class="absolute right-2 top-2.5 text-gray-400"
                    size={16}
                    onclick={() => {
                        $imageUrl = "";
                    }}
                />
            </div>

            <div>
                <label class="label">
                    <span class="label-text"
                        >ローカル保存ファイルから読み込む</span
                    >
                    <input
                        class="input"
                        type="file"
                        accept="image/*,.cur,.ani"
                        bind:this={fileInput}
                        onchange={handleFileChange}
                    />
                </label>
            </div>

            <!-- Preview -->
            {#if $imageUrl}
                <div class="mt-4 max-h-32 overflow-auto border rounded p-2">
                    <img
                        src={toSrc($imageUrl)}
                        alt="インポート画像"
                        class="max-w-96 object-contain rounded border"
                        crossorigin="anonymous"
                        bind:this={imageRef}
                        onload={() => imageLoaded++}
                    />
                </div>
            {/if}

            <div class="space-y-2">
                <label class="flex items-center space-x-2">
                    <input
                        class="checkbox"
                        type="checkbox"
                        bind:checked={isSheetImport}
                    />
                    <p>背景を透過して切り分ける</p>
                </label>
                {#if isSheetImport}
                    <p class="opacity-60 text-xs">
                        白などの単色背景の素材向け。コマの位置が揃っていなくても前景の切れ目で分け、1ドットが何pxかをコマごとに測って等倍にします
                    </p>
                    <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <label class="flex items-center gap-2">
                            背景の許容誤差
                            <input
                                class="input w-20 bg-white"
                                type="number"
                                min="0"
                                max="255"
                                bind:value={tolerance}
                            />
                        </label>
                        <label
                            class="flex items-center gap-2"
                            title="0なら自動で測る。コマによって絵が小さくなるなら、表示された範囲の値を入れて固定する"
                        >
                            1ドット(px)
                            <input
                                class="input w-20 bg-white"
                                type="number"
                                min="0"
                                max="32"
                                step="0.1"
                                bind:value={pitchHint}
                            />
                        </label>
                        <label
                            class="flex items-center gap-2"
                            title="シートの上の行から順に、どの方向か（w=後 a=左 s=前 d=右）。ツクール系の素材は sadw"
                        >
                            行の並び
                            <input
                                class="input w-24 bg-white"
                                type="text"
                                bind:value={sheetOrder}
                            />
                        </label>
                    </div>
                    {#if analyzing}
                        <p class="opacity-60 text-xs">切り分け中…</p>
                    {:else if sheet}
                        <p class="opacity-60 text-xs">{sheetSummary}</p>
                        {#each sheetWarnings as warning}
                            <p class="text-xs text-red-600">{warning}</p>
                        {/each}
                        <div
                            class="gimp-checkered-background max-h-48 overflow-auto border rounded p-1 space-y-1"
                        >
                            {#each previews as row, y}
                                <div class="flex gap-1">
                                    {#each row as src, x}
                                        {#if src}
                                            <img
                                                {src}
                                                alt="コマ {anime.toI(x, y) + 1}"
                                                title="コマ {anime.toI(x, y) + 1}"
                                                class="border border-gray-300"
                                            />
                                        {:else}
                                            <div
                                                class="w-16 h-16 border border-dashed border-gray-300 text-xs opacity-60 flex items-center justify-center"
                                            >
                                                無し
                                            </div>
                                        {/if}
                                    {/each}
                                </div>
                            {/each}
                        </div>
                    {/if}
                {/if}
            </div>

            <div class="space-y-0">
                <div class="flex items-center gap-4 max-w-[360px]">
                    <div
                        class="w-[20ch] flex justify-between font-mono text-sm tabular-nums"
                    >
                        <span class="text-left">不透明度</span>
                        <span class="text-right">{$opacity}%</span>
                    </div>
                    <Slider
                        value={[$opacity]}
                        onValueChange={(e) => ($opacity = e.value[0])}
                        markers={[25, 50, 75]}
                    />
                </div>
                <label class="flex items-center space-x-2">
                    <input
                        class="checkbox"
                        type="checkbox"
                        bind:checked={$isAddEmptyLayer}
                    />
                    <p>トレース台を追加する</p>
                </label>
                <label class="flex items-center space-x-2">
                    <input
                        class="checkbox"
                        type="checkbox"
                        bind:checked={$isSimpleImport}
                    />
                    <p>1枚絵として読み込む</p>
                </label>
            </div>

            <div class="pt-2">
                <button
                    type="button"
                    class="btn btn-primary w-full bg-blue-500 text-white rounded hover:bg-blue-600"
                    aria-label="submit"
                    onclick={handleImportButton}
                >
                    読み込む
                </button>
            </div>
        </article>
    {/snippet}
</Popover>
