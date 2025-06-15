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
    contentBase="card bg-surface-300 p-4 space-y-4 max-w-[320px]"
    arrow
    arrowBackground="!bg-surface-300 dark:!bg-surface-800"
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
        <article class="opacity-60">
            <p>右クリック：カラーピッカー</p>
            <p>Ctrl + 1：ペン</p>
            <p>Ctrl + 2：消しゴム</p>
            <p>Ctrl + 3：カラーピッカー</p>
            <p>Ctrl + 4：塗りつぶし</p>
            <p>Ctrl + 5：ハンドツール</p>
            <p>Ctrl + E：常に消しゴム</p>
            <p>Ctrl + F：左右反転</p>
            <p>Ctrl + G：グリッド表示</p>
            <p>Ctrl + D：ダークモード</p>
            <p>Ctrl + O：オニオンスキン</p>
            <p>Ctrl + Z：戻す</p>
            <p>Ctrl + Shift + Z：やり直す</p>
            <p>Ctrl + S：保存</p>
            <p>Ctrl + C：コピー</p>
            <p>Ctrl + V：貼り付け</p>
            <p>画像ドロップ：貼り付け</p>
            <p>モニターサイズは24インチ以上推奨</p>
        </article>
    {/snippet}
</Popover>
