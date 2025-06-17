<script lang="ts">
  import { page } from "$app/state";
  import * as anime from "$lib/anime";
  import { importImage } from "$lib/init";
  import * as schema from "$lib/schema";
  import { fps, mode } from "$lib/store";
  import * as unjStorage from "$lib/unj-storage.js";
  import IconX from "@lucide/svelte/icons/x";
  import * as oekaki from "@onjmin/oekaki";
  import { Popover } from "@skeletonlabs/skeleton-svelte";
  import * as v from "valibot";

  let {
    init,
    activeLayer = $bindable(),
    initTimestamp = $bindable(),
  } = $props();

  let open = $state(false);
  let selectedStandard = $state<string>();
  let width = $state(anime.defaultStandard.w);
  let height = $state(anime.defaultStandard.h);
  let frames = $state(anime.defaultStandard.frames);
  let ways = $state(anime.waysToStr(anime.defaultStandard.ways));
  let errors = $state(new Set<string>());

  $effect(() => {
    const param = v.safeParse(ParamSchema, {
      width: page.url.searchParams.get("w"),
      height: page.url.searchParams.get("h"),
      frames: page.url.searchParams.get("frames"),
      ways: page.url.searchParams.get("ways"),
    });
    if (param.success) {
      width = param.output.width;
      height = param.output.height;
      frames = param.output.frames;
      ways = param.output.ways;
    }
    anime.init(width, height, frames, ways);
    init();

    const _url = v.safeParse(schema.ImageURL, page.url.searchParams.get("url"));
    if (_url.success) {
      (async () => {
        const image = await new Promise<HTMLImageElement>((resolve) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.crossOrigin = "anonymous";
          image.src = `https://api.allorigins.win/raw?url=${_url.output}`;
        });
        importImage(image);
        const now = anime.layersByI.get(0);
        if (now) {
          oekaki.setLayers(now);
          activeLayer = now[now.length - 1];
          initTimestamp = performance.now();
        }
      })();
    }

    const _fps = v.safeParse(schema.Fps, page.url.searchParams.get("fps"));
    if (_fps.success) fps.set(_fps.output);

    const _mode = v.safeParse(schema.Mode, page.url.searchParams.get("mode"));
    if (_mode.success) mode.set(_mode.output);
  });

  const ParamSchema = v.strictObject({
    width: schema.Width,
    height: schema.Height,
    frames: schema.Frames,
    ways: schema.Ways,
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
