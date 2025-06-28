<script lang="ts">
  import { SearchIcon, Trash2Icon } from "@lucide/svelte";

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

  const template = [
    { label: "鍵山雛", url: "https://i.imgur.com/Wd713Fe.png" },
    { label: "ドレミー", url: "https://i.imgur.com/vENwj1P.png" },
    { label: "八雲紫", url: "https://i.imgur.com/OLpXzvs.png" },
    { label: "カナ", url: "https://i.imgur.com/rgekbAz.png" },
    { label: "天子", url: "https://i.imgur.com/R6oYJge.png" },
    { label: "フラン", url: "https://i.imgur.com/Y126OqA.png" },
  ];
</script>

<div class="space-y-4 p-4 bg-surface-100 rounded-xl">
  <h2 class="text-lg font-semibold">模写用</h2>

  <label class="flex flex-col">
    <span class="label-text font-medium">テンプレ</span>
    <select
      class="select select-bordered w-full bg-white"
      onchange={(e) => {
        const v = template.find((v) => v.label === e.currentTarget.value);
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
      <span class="label-text">ローカル保存ファイルから読み込む</span>
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
        src={imageUrl}
        alt="模写用"
        class="w-full max-w-96 object-contain rounded border"
      />
    </div>
  {/if}
</div>
