<script lang="ts">
    import { base } from "$app/paths";
    import * as anime from "$lib/anime";
    import { fps, mode } from "$lib/store";
    import { sanitizeImageURL } from "$lib/url";
    import { Trash2Icon } from "@lucide/svelte";
    import IconX from "@lucide/svelte/icons/x";
    import { Popover } from "@skeletonlabs/skeleton-svelte";

    let open = $state(false);
    let imageUrl = $state("");
    let imageRef = $state<HTMLImageElement>();
    let sharedUrl = $state("");

    const genURL = () => {
        if (imageUrl && (!imageRef || imageRef.naturalWidth === 0)) return;
        const params = new URLSearchParams();
        params.set("w", String(anime.width));
        params.set("h", String(anime.height));
        params.set("frames", String(anime.frames));
        params.set("ways", anime.waysToStr(anime.waysOrder));
        params.set("fps", String($fps));
        params.set("mode", String($mode));
        if (imageUrl) params.set("url", encodeURIComponent(imageUrl));
        sharedUrl = `${window.location.origin}${base}/?${params.toString()}`;
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
    {#snippet trigger()}シェア{/snippet}
    {#snippet content()}
        <header class="flex justify-between">
            <p class="font-bold text-xl">共同編集用</p>
            <button
                class="btn-icon hover:preset-tonal"
                onclick={() => {
                    open = false;
                }}><IconX /></button
            >
        </header>
        <article class="space-y-4">
            <div>
                <p class="opacity-60">画像URL無しの場合</p>
                <p class="opacity-60">キャンバスサイズだけが共有されます。</p>
            </div>

            <div>
                <b>使用可能な画像URL</b>
                <p class="opacity-60">右クリック、画像リンクをコピー</p>
                <p class="opacity-60">※レイヤー情報は共有できません。</p>
            </div>

            <a
                href="https://imgur.com/upload"
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-800 hover:underline">画像アップローダー</a
            >

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

            <!-- Preview -->
            {#if imageUrl}
                <div class="mt-4 max-h-96 overflow-auto border rounded p-2">
                    <img
                        src={sanitizeImageURL(imageUrl)}
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
                    onclick={genURL}
                >
                    共有リンク生成
                </button>
            </div>

            <a
                href={sharedUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="block min-h-[2rem] max-w-full truncate text-blue-800 hover:underline"
                >{sharedUrl}</a
            >
        </article>
    {/snippet}
</Popover>
