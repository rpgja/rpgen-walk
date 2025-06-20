<script lang="ts">
    import * as anime from "$lib/anime";
    import { importImage } from "$lib/init";
    import * as schema from "$lib/schema";
    import {
        imageUrl,
        isAddEmptyLayer,
        isSimpleImport,
        opacity,
    } from "$lib/store";
    import { sanitizeImageURL } from "$lib/url";
    import { Trash2Icon } from "@lucide/svelte";
    import IconX from "@lucide/svelte/icons/x";
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

    function handleFileChange(event: Event) {
        const file = (event.target as HTMLInputElement)?.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                const result = v.safeParse(schema.ImageURL, reader.result);
                if (result.success) $imageUrl = result.output;
            };
            reader.readAsDataURL(file);
        }
    }

    const handleImportButton = async () => {
        if (!$imageUrl || !imageRef || imageRef.naturalWidth === 0) return;
        if (!confirm("歩行グラを読み込みますか？（※全てのデータは失われます）"))
            return;
        init();
        importImage(imageRef);
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
        { label: "袿姫", url: "https://rpgen.cc/dq/sAnims/res/2116.png" },
        { label: "残無", url: "https://rpgen.cc/dq/sAnims/res/2115.png" },
    ];
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
                        $imageUrl = v.url;
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
                        accept="image/*"
                        bind:this={fileInput}
                        onchange={handleFileChange}
                    />
                </label>
            </div>

            <!-- Preview -->
            {#if $imageUrl}
                <div class="mt-4 max-h-32 overflow-auto border rounded p-2">
                    <img
                        src={sanitizeImageURL($imageUrl)}
                        alt="インポート画像"
                        class="max-w-96 object-contain rounded border"
                        crossorigin="anonymous"
                        bind:this={imageRef}
                    />
                </div>
            {/if}

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
