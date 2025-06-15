<script lang="ts">
    import * as anime from "$lib/anime";
    import { SearchIcon, Trash2Icon } from "@lucide/svelte";
    import IconX from "@lucide/svelte/icons/x";
    import * as oekaki from "@onjmin/oekaki";
    import { Popover } from "@skeletonlabs/skeleton-svelte";
    import { Slider } from "@skeletonlabs/skeleton-svelte";

    let {
        init,
        activeLayer = $bindable(),
        initTimestamp = $bindable(),
    } = $props();

    let open = $state(false);

    let imageUrl = $state("");
    let imageRef: HTMLImageElement | undefined = $state();
    let fileInput: HTMLInputElement;

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

    let opacity = $state([100]);
    let isAddEmptyLayer = $state(false);

    const handleImportButton = async () => {
        if (!imageUrl || !imageRef || imageRef.naturalWidth === 0) return;
        if (!confirm("歩行グラを読み込みますか？（※全てのデータは失われます）"))
            return;
        init();
        const dotSize = oekaki.getDotSize();
        const { width, height, frames, ways } = anime;

        const canvas = document.createElement("canvas");
        canvas.width = width * frames;
        canvas.height = height * ways;
        const ctx = canvas.getContext("2d", {
            willReadFrequently: true,
        });
        if (!ctx) return;
        ctx.drawImage(imageRef, 0, 0);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

        for (let y = 0; y < ways; y++) {
            for (let x = 0; x < frames; x++) {
                const layer = new oekaki.LayeredCanvas("素材の味");
                layer.opacity = opacity[0];

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
                layer.trace();

                // 反映
                const i = anime.toI(x, y);
                const layers = [layer];
                if (isAddEmptyLayer)
                    layers.push(new oekaki.LayeredCanvas("トレース台"));
                anime.layersByI.set(i, layers);
                const canvas = oekaki.render();
                anime.canvasByI.set(i, canvas);
                const dataURL = canvas.toDataURL("image/png");
                anime.dataURLByI.set(i, dataURL);
                oekaki.setLayers([]);
            }
        }
        const now = anime.layersByI.get(0);
        if (now) {
            oekaki.setLayers(now);
            activeLayer = now[now.length - 1];
            initTimestamp = performance.now();
        }
    };

    const template = [
        { label: "鍵山雛", url: "https://rpgen.cc/dq/sAnims/res/1920.png" },
        { label: "ドレミー", url: "https://rpgen.cc/dq/sAnims/res/1919.png" },
        { label: "八雲紫", url: "https://rpgen.cc/dq/sAnims/res/1282.png" },
        {
            label: "天子",
            url: "https://rpgen.cc/dq/sAnims/res/1891.png",
        },
        { label: "純狐", url: "https://rpgen.cc/dq/sAnims/res/1894.png" },
        {
            label: "ヘカーティア",
            url: "https://rpgen.cc/dq/sAnims/res/1884.png",
        },
        { label: "妹紅", url: "https://rpgen.cc/dq/sAnims/res/1874.png" },
        { label: "小鈴", url: "https://rpgen.cc/dq/sAnims/res/1526.png" },
        { label: "阿求", url: "https://rpgen.cc/dq/sAnims/res/1527.png" },
        { label: "マミゾウ", url: "https://rpgen.cc/dq/sAnims/res/1882.png" },
        { label: "袿姫", url: "https://rpgen.cc/dq/sAnims/res/2115.png" },
    ];
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
                        imageUrl = v.url;
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
                    bind:value={imageUrl}
                />
                <Trash2Icon
                    class="absolute right-2 top-2.5 text-gray-400"
                    size={16}
                    onclick={() => {
                        imageUrl = "";
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
                        src={imageUrl.startsWith("http")
                            ? `https://api.allorigins.win/raw?url=${imageUrl}`
                            : imageUrl}
                        alt="インポート画像"
                        class="max-w-96 object-contain rounded border"
                        crossorigin="anonymous"
                        bind:this={imageRef}
                    />
                </div>
            {/if}

            <div class="flex items-center gap-4 max-w-[360px]">
                <div
                    class="w-[20ch] flex justify-between font-mono text-sm tabular-nums"
                >
                    <span class="text-left">不透明度</span>
                    <span class="text-right">{opacity}%</span>
                </div>
                <Slider
                    value={opacity}
                    onValueChange={(e) => (opacity = e.value)}
                    markers={[25, 50, 75]}
                />
            </div>

            <label class="flex items-center space-x-2">
                <input
                    class="checkbox"
                    type="checkbox"
                    bind:checked={isAddEmptyLayer}
                />
                <p>トレース台を追加する</p>
            </label>

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
