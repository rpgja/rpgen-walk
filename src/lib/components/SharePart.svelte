<script lang="ts">
    import IconX from "@lucide/svelte/icons/x";
    import { Popover } from "@skeletonlabs/skeleton-svelte";

    let open = $state(false);

    const genURL = () => {};
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
            <p class="opacity-60">※レイヤー情報は共有できません</p>

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
        </article>
    {/snippet}
</Popover>
