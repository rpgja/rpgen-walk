<script lang="ts">
    import { SearchIcon } from "@lucide/svelte";
    import IconX from "@lucide/svelte/icons/x";
    import { Popover } from "@skeletonlabs/skeleton-svelte";

    let open = $state(false);

    let imageUrl = $state("");
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

    function handleUrlSubmit(event: Event) {
        event.preventDefault();
        const urlInput = new FormData(event.target as HTMLFormElement).get(
            "url",
        ) as string;
        if (urlInput) imageUrl = urlInput;
    }

    const handleImportButton = () => {
        if (!imageUrl) return;
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
            <p class="font-bold text-xl">キャラチップの読み込み</p>
            <button
                class="btn-icon hover:preset-tonal"
                onclick={() => {
                    open = false;
                }}><IconX /></button
            >
        </header>
        <article class="space-y-4">
            <p class="opacity-60">先にリサイズしてください</p>

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
                        class="input input-bordered w-full pl-8"
                        required
                    />
                </div>
                <button
                    class="btn bg-blue-600 text-white hover:bg-blue-700"
                    type="submit">表示</button
                >
            </form>

            <!-- Preview -->
            {#if imageUrl}
                <div class="mt-4 max-h-96 overflow-auto border rounded p-2">
                    <img
                        src={imageUrl}
                        alt="参考画像"
                        class="max-w-96 object-contain rounded border"
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
