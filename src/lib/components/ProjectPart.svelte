<script lang="ts">
    import * as anime from "$lib/anime";
    import {
        EXTENSION,
        applyProjectLayers,
        exportProject,
        readProject,
    } from "$lib/project";
    import { activeIndex, fps, preview } from "$lib/store";
    import * as unjStorage from "$lib/unj-storage.js";
    import IconX from "@lucide/svelte/icons/x";
    import * as oekaki from "@onjmin/oekaki";
    import { Popover } from "@skeletonlabs/skeleton-svelte";

    let {
        init,
        activeLayer = $bindable(),
        initTimestamp = $bindable(),
    } = $props();

    let open = $state(false);
    let busy = $state(false);
    let message = $state("");

    const download = (url: string, fileName: string) => {
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.click();
    };

    const handleSave = async () => {
        busy = true;
        message = "";
        try {
            const blob = await exportProject($activeIndex, $fps, $preview);
            const url = URL.createObjectURL(blob);
            download(url, `project${EXTENSION}`);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) {
            message = `保存に失敗しました: ${err instanceof Error ? err.message : err}`;
        } finally {
            busy = false;
        }
    };

    const handleOpen = async (event: Event) => {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        input.value = "";
        if (!file) return;
        busy = true;
        message = "";
        try {
            const loaded = await readProject(file);
            if (
                !confirm(
                    "プロジェクトを開きますか？（※今のデータは全て失われます）",
                )
            )
                return;
            const { project } = loaded;

            // キャンバス設定（コマ数・サイズ・方向）
            anime.init(
                project.width,
                project.height,
                project.frames,
                project.ways,
            );
            init();

            // プレビュー設定
            if (project.fps !== undefined) {
                $fps = project.fps;
                unjStorage.fps.value = String(project.fps);
            }
            if (project.preview !== undefined) {
                $preview = project.preview;
                unjStorage.preview.value = String(project.preview);
            }

            // 絵
            applyProjectLayers(loaded);
            const now = anime.layersByI.get(0);
            if (now) {
                oekaki.setLayers(now);
                activeLayer = now[now.length - 1];
            } else {
                activeLayer = new oekaki.LayeredCanvas("レイヤー #1");
            }
            initTimestamp = performance.now();
            open = false;
        } catch (err) {
            message = `読み込みに失敗しました: ${err instanceof Error ? err.message : err}`;
        } finally {
            busy = false;
        }
    };
</script>

<Popover
    {open}
    onOpenChange={(e) => (open = e.open)}
    positioning={{ placement: "top" }}
    triggerBase="btn preset-tonal"
    contentBase="card bg-surface-300 p-4 space-y-4 max-w-[320px] w-[320px]"
    arrow
    arrowBackground="!bg-surface-300 dark:!bg-surface-800"
>
    {#snippet trigger()}プロジェクト{/snippet}
    {#snippet content()}
        <header class="flex justify-between">
            <p class="font-bold text-xl">プロジェクトファイル</p>
            <button
                class="btn-icon hover:preset-tonal"
                onclick={() => {
                    open = false;
                }}><IconX /></button
            >
        </header>
        <article class="space-y-4">
            <div>
                <p class="opacity-60">
                    コマ数・サイズ・方向、FPS、プレビュー種別、
                </p>
                <p class="opacity-60">全コマのレイヤーをまとめて保存します。</p>
                <p class="opacity-60">開くと設定と絵がそのまま復元されます。</p>
            </div>

            <div class="pt-2">
                <button
                    type="button"
                    class="w-full px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition disabled:opacity-50"
                    disabled={busy}
                    onclick={handleSave}
                >
                    保存（{EXTENSION}）
                </button>
            </div>

            <label class="label">
                <span class="label-text">開く</span>
                <input
                    class="input"
                    type="file"
                    accept={EXTENSION}
                    disabled={busy}
                    onchange={handleOpen}
                />
            </label>

            {#if message}
                <p class="text-error-600 text-sm">{message}</p>
            {/if}
        </article>
    {/snippet}
</Popover>
