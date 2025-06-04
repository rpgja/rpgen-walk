<script lang="ts">
    import { SearchIcon } from "@lucide/svelte";
    import IconX from "@lucide/svelte/icons/x";
    import * as oekaki from "@onjmin/oekaki";
    import { Popover } from "@skeletonlabs/skeleton-svelte";
    import * as anime from "../anime";

    let {
        init,
        activeLayer = $bindable(),
        initTimestamp = $bindable(),
    } = $props();

    let open = $state(false);

    let imageUrl = $state("");
    let imageRef: HTMLImageElement | undefined = $state();
    let fileInput: HTMLInputElement;

    function handleUrlSubmit(event: Event) {
        event.preventDefault();
        const urlInput = new FormData(event.target as HTMLFormElement).get(
            "url",
        ) as string;
        if (urlInput)
            imageUrl = `https://api.allorigins.win/raw?url=${urlInput}`;
    }

    function handleFileChange(event: Event) {
        const file = (event.target as HTMLInputElement)?.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                imageUrl = reader.result as string;
            };
            reader.readAsDataURL(file);
        }
    }

    const handleImportButton = async () => {
        if (!imageUrl || !imageRef) return;
        if (!confirm("歩行グラを読み込みますか？（※全てのデータは失われます）"))
            return;
        init();
        const dotSize = oekaki.getDotSize();
        const { width, height, frames, ways } = anime;

        const canvas = document.createElement("canvas");
        canvas.width = width * frames;
        canvas.height = height * ways;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(imageRef, 0, 0);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

        for (let y = 0; y < ways; y++) {
            for (let x = 0; x < frames; x++) {
                const layer = new oekaki.LayeredCanvas("素材の味");

                // 全体シートの横幅ピクセル数
                const sheetWidth = width * frames; // 例: width=48, frames=8 なら 48*8 = 384px

                // 描画
                for (let o = 0; o < height; o++) {
                    for (let p = 0; p < width; p++) {
                        // ───────────────────────────────────────────────────────
                        // (1) ローカル座標 (p, o) → グローバル座標 (globalX, globalY)
                        // ───────────────────────────────────────────────────────
                        // フレーム (x, y) は左上から
                        //   X 軸方向に x * width だけずれている
                        //   Y 軸方向に y * height だけずれている
                        //
                        // したがって：
                        const globalX = x * width + p;
                        const globalY = y * height + o;
                        // globalX ∈ [0, sheetWidth - 1]
                        // globalY ∈ [0, (height * ways) - 1]

                        // ───────────────────────────────────────────────────────
                        // (2) (globalX, globalY) → data 配列上のインデックスに変換
                        // ───────────────────────────────────────────────────────
                        // ImageData.data は 1 行あたり「sheetWidth 個のピクセル × 4 要素(RGBA)」で並んでいるので、
                        //  - 1 行先頭のインデックスは globalY * (sheetWidth * 4)
                        //  - そこから globalX 分だけ、1 ピクセルあたり 4 要素ずつオフセット
                        //
                        // よって：
                        const index = (globalY * sheetWidth + globalX) * 4;

                        const [r, g, b, a] = data.subarray(index, index + 4);
                        if (!a) continue;
                        oekaki.color.value = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
                        layer.drawByDot(p * dotSize, o * dotSize);
                        layer.used = true;
                    }
                }

                // 反映
                const i = anime.toI(x, y);
                anime.layersByI.set(i, [layer]);
                anime.canvasByI.set(i, layer.canvas);
                const dataURL = layer.canvas.toDataURL("image/png");
                anime.dataURLByI.set(i, dataURL);
            }
        }
        const now = anime.layersByI.get(0);
        if (now) {
            oekaki.setLayers(now);
            activeLayer = now[now.length - 1];
            initTimestamp = performance.now();
        }
    };
</script>

<Popover
    {open}
    onOpenChange={(e) => (open = e.open)}
    positioning={{ placement: "top" }}
    triggerBase="btn preset-tonal"
    contentBase="card bg-surface-200-800 p-4 space-y-4 max-w-[320px]"
    arrow
    arrowBackground="!bg-surface-200 dark:!bg-surface-800"
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

            <form class="flex gap-2 items-center" onsubmit={handleUrlSubmit}>
                <div class="relative flex-1">
                    <SearchIcon
                        class="absolute left-2 top-2.5 text-gray-400"
                        size={16}
                    />
                    <input
                        name="url"
                        type="url"
                        placeholder="画像のURLを入力"
                        class="input input-bordered w-full pl-8 bg-white"
                        required
                    />
                </div>
                <button
                    class="btn bg-blue-600 text-white hover:bg-blue-700"
                    type="submit">表示</button
                >
            </form>

            <div>
                <label class="label">
                    <span class="label-text">File Input</span>
                    <input
                        class="file-input file-input-bordered w-full"
                        type="file"
                        accept="image/*"
                        bind:this={fileInput}
                        onchange={handleFileChange}
                    />
                </label>
            </div>

            <!-- Preview -->
            {#if imageUrl}
                <div class="mt-4 max-h-96 overflow-auto border rounded p-2">
                    <img
                        src={imageUrl}
                        alt="インポート画像"
                        class="max-w-96 object-contain rounded border"
                        crossorigin="anonymous"
                        bind:this={imageRef}
                    />
                </div>
            {/if}

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
