<script lang="ts">
  import IconX from "@lucide/svelte/icons/x";
  import { Popover } from "@skeletonlabs/skeleton-svelte";
  import * as anime from "../anime";

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
  {#snippet trigger()}初期化{/snippet}
  {#snippet content()}
    <header class="flex justify-between">
      <p class="font-bold text-xl">コマ数 / サイズ変更</p>
      <button
        class="btn-icon hover:preset-tonal"
        onclick={() => {
          open = false;
        }}><IconX /></button
      >
    </header>
    <article class="space-y-4">
      <p class="opacity-60">ツクールの規格に対応できます</p>

      <label class="flex flex-col">
        <span class="label-text font-medium">テンプレ</span>
        <select class="select select-bordered w-full bg-white">
          <option value="">自動入力</option>
          {#each [anime.RPGEN, anime.RPGMaker2000, anime.RPGMakerXP, anime.RPGMakerVX, anime.RPGMakerMV] as template}
            <option value={template.label}>{template.label}</option>
          {/each}
        </select>
      </label>

      <label class="flex flex-col gap-1">
        <span class="label-text font-medium">幅</span>
        <input
          class="input input-bordered w-full bg-white"
          type="text"
          placeholder="例: 48"
        />
      </label>

      <label class="flex flex-col gap-1">
        <span class="label-text font-medium">高さ</span>
        <input
          class="input input-bordered w-full bg-white"
          type="text"
          placeholder="例: 48"
        />
      </label>

      <label class="flex flex-col gap-1">
        <span class="label-text font-medium">コマ数</span>
        <input
          class="input input-bordered w-full bg-white"
          type="text"
          placeholder="例: 3"
        />
      </label>

      <label class="flex flex-col gap-1">
        <span class="label-text font-medium">方向転換</span>
        <input
          class="input input-bordered w-full bg-white"
          type="text"
          placeholder="例: WASDQEZC"
        />
        <p class="opacity-60 text-xs">WASD(前後左右)+QEZC(ナナメ)</p>
      </label>

      <div class="pt-2">
        <button
          type="button"
          class="btn btn-primary w-full bg-blue-500 text-white rounded hover:bg-blue-600"
          aria-label="submit"
        >
          初期化の実行
        </button>
      </div>
    </article>
  {/snippet}
</Popover>
