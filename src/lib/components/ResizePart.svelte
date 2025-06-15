<script lang="ts">
  import * as anime from "$lib/anime";
  import * as unjStorage from "$lib/unj-storage.js";
  import IconX from "@lucide/svelte/icons/x";
  import { Popover } from "@skeletonlabs/skeleton-svelte";
  import * as v from "valibot";

  let { init } = $props();

  let open = $state(false);

  let selectedStandard = $state<string>();
  let width = $state(anime.defaultStandard.w);
  let height = $state(anime.defaultStandard.h);
  let frames = $state(anime.defaultStandard.frames);
  let ways = $state(anime.waysToStr(anime.defaultStandard.ways));

  let errors = $state(new Set<string>());

  export const ParamSchema = v.strictObject({
    width: v.pipe(
      v.unknown(),
      v.transform((input) => Number(input)),
      v.number(),
      v.integer(),
      v.minValue(16),
      v.maxValue(256),
    ),
    height: v.pipe(
      v.unknown(),
      v.transform((input) => Number(input)),
      v.number(),
      v.integer(),
      v.minValue(16),
      v.maxValue(256),
    ),
    frames: v.pipe(
      v.unknown(),
      v.transform((input) => Number(input)),
      v.number(),
      v.integer(),
      v.minValue(1),
      v.maxValue(8),
    ),
    ways: v.pipe(
      v.string(),
      v.trim(),
      v.regex(/^[a-z]+$/),
      v.check((input) => input.length === new Set(input).size),
    ),
  });
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
  {#snippet trigger()}リサイズ{/snippet}
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
        <select
          class="select select-bordered w-full bg-white"
          value={selectedStandard ?? anime.defaultStandard.label}
          onchange={(e) => {
            const template = anime.standards.find(
              (v) => v.label === e.currentTarget.value,
            );
            if (template) {
              width = template.w;
              height = template.h;
              frames = template.frames;
              ways = anime.waysToStr(template.ways);
              selectedStandard = template.label;
            }
          }}
        >
          <option value="">自動入力</option>
          {#each anime.standards as template}
            <option value={template.label}>{template.label}</option>
          {/each}
        </select>
      </label>

      <label class="flex flex-col gap-1">
        <span class="label-text font-medium">幅</span>
        <input
          class="input input-bordered w-full placeholder:opacity-40"
          class:bg-error-50={errors.has("width")}
          class:bg-white={!errors.has("width")}
          type="number"
          placeholder="例: 48"
          bind:value={width}
        />
      </label>

      <label class="flex flex-col gap-1">
        <span class="label-text font-medium">高さ</span>
        <input
          class="input input-bordered w-full bg-white placeholder:opacity-40"
          class:bg-error-50={errors.has("height")}
          class:bg-white={!errors.has("height")}
          type="number"
          placeholder="例: 48"
          bind:value={height}
        />
      </label>

      <label class="flex flex-col gap-1">
        <span class="label-text font-medium">コマ数</span>
        <input
          class="input input-bordered w-full bg-white placeholder:opacity-40"
          class:bg-error-50={errors.has("frames")}
          class:bg-white={!errors.has("frames")}
          type="number"
          placeholder="例: 3"
          bind:value={frames}
        />
      </label>

      <label class="flex flex-col gap-1">
        <span class="label-text font-medium">方向転換</span>
        <input
          class="input input-bordered w-full bg-white placeholder:opacity-40"
          class:bg-error-50={errors.has("ways")}
          class:bg-white={!errors.has("ways")}
          type="text"
          placeholder="例: wasdqezc"
          bind:value={ways}
        />
        <p class="opacity-60 text-xs">wasd(前後左右)+qezc(ナナメ)</p>
      </label>

      <div class="pt-2">
        <button
          type="button"
          class="btn btn-primary w-full bg-blue-500 text-white rounded hover:bg-blue-600"
          aria-label="submit"
          onclick={() => {
            const param = v.safeParse(ParamSchema, {
              width,
              height,
              frames,
              ways,
            });
            if (!param.success) {
              errors = new Set(
                param.issues.map((v) => v.path?.[0].key ?? "").map(String),
              );
              return;
            }
            errors = new Set();
            if (!confirm("初期化しますか？（※全てのデータは失われます）"))
              return;
            anime.init(
              param.output.width,
              param.output.height,
              param.output.frames,
              param.output.ways,
            );
            init();
            if (selectedStandard) unjStorage.standard.value = selectedStandard;
          }}
        >
          初期化の実行
        </button>
      </div>
    </article>
  {/snippet}
</Popover>
