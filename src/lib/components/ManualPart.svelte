<script lang="ts">
    import IconX from "@lucide/svelte/icons/x";
    import { Popover } from "@skeletonlabs/skeleton-svelte";

    let open = $state(false);
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
    {#snippet trigger()}説明書{/snippet}
    {#snippet content()}
        <header class="flex justify-between">
            <p class="font-bold text-xl">操作方法</p>
            <button
                class="btn-icon hover:preset-tonal"
                onclick={() => {
                    open = false;
                }}><IconX /></button
            >
        </header>
        <article>
            <p class="opacity-60">右クリック：カラーピッカー</p>
            <p class="opacity-60">Ctrl + 1：ペン</p>
            <p class="opacity-60">Ctrl + 2：消しゴム</p>
            <p class="opacity-60">Ctrl + 3：カラーピッカー</p>
            <p class="opacity-60">Ctrl + 4：塗りつぶし</p>
            <p class="opacity-60">Ctrl + 5：ハンドツール</p>
            <p class="opacity-60">Ctrl + E：常に消しゴム</p>
            <p class="opacity-60">Ctrl + F：左右反転</p>
            <p class="opacity-60">Ctrl + G：グリッド表示</p>
            <p class="opacity-60">Ctrl + Z：戻す</p>
            <p class="opacity-60">Ctrl + Shift + Z：やり直す</p>
            <p class="opacity-60">Ctrl + S：保存</p>
            <p class="opacity-60">モニターサイズは24インチ以上推奨</p>
        </article>
    {/snippet}
</Popover>
