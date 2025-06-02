<script lang="ts">
  import { SearchIcon } from "@lucide/svelte";

  let imageUrl = "";
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
</script>

<div class="space-y-4 p-4 bg-surface-100 rounded-xl">
  <h2 class="text-lg font-semibold">参考画像</h2>

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
      <SearchIcon class="absolute left-2 top-2.5 text-gray-400" size={16} />
      <input
        name="url"
        type="url"
        placeholder="画像のURLを入力"
        class="input input-bordered w-full pl-8"
        required
      />
    </div>
    <button class="btn btn-primary" type="submit">表示</button>
  </form>

  <!-- Preview -->
  {#if imageUrl}
    <div class="mt-4 max-h-96 overflow-auto border rounded p-2">
      <img
        src={imageUrl}
        alt="参考画像"
        class="w-full max-w-96 object-contain rounded border"
      />
    </div>
  {/if}
</div>
