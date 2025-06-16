<script lang="ts">
    import { exportAsAniPerWayZIP } from "$lib/ani";
    import * as anime from "$lib/anime";
    import { activeIndex } from "$lib/store";
    import { fps } from "$lib/store";
    import { randInt } from "$lib/util";
    import IconX from "@lucide/svelte/icons/x";
    import { Popover } from "@skeletonlabs/skeleton-svelte";
    import GIF from "gif.js";
    import JSZip from "jszip";

    let { width, height } = $props();

    let open = $state(false);

    const download = (url: string, fileName: string) => {
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        link.click();
    };

    const exportAsPNG = () => {
        const { width, height, frames, ways } = anime;

        // 出力先キャンバス（リサイズ用）
        const joinedCanvas = document.createElement("canvas");
        joinedCanvas.width = width * frames;
        joinedCanvas.height = height * ways;
        const ctx = joinedCanvas.getContext("2d", {
            willReadFrequently: true,
        });
        if (!ctx) return;

        // アンチエイリアス無効化（ドット絵向け）
        ctx.imageSmoothingEnabled = false;

        for (let y = 0; y < ways; y++) {
            for (let x = 0; x < frames; x++) {
                const i = anime.toI(x, y);
                const sourceCanvas = anime.canvasByI.get(i);
                if (!sourceCanvas) continue;

                // 各フレームを指定位置に描画
                ctx.drawImage(
                    sourceCanvas,
                    0,
                    0,
                    sourceCanvas.width,
                    sourceCanvas.height, // 元サイズ
                    x * width,
                    y * height,
                    width,
                    height, // 出力位置とサイズ
                );
            }
        }
        const url = joinedCanvas.toDataURL("image/png");
        download(url, "sprite_sheet.png");
    };

    const exportAsZIP = () => {
        const { width, height, frames, ways } = anime;
        const zip = new JSZip();

        for (let y = 0; y < ways; y++) {
            for (let x = 0; x < frames; x++) {
                const i = anime.toI(x, y);
                const sourceCanvas = anime.canvasByI.get(i);
                if (!sourceCanvas) continue;

                // 出力先キャンバス（リサイズ用）
                const resizedCanvas = document.createElement("canvas");
                resizedCanvas.width = width;
                resizedCanvas.height = height;
                const ctx = resizedCanvas.getContext("2d", {
                    willReadFrequently: true,
                });
                if (!ctx) continue;

                // アンチエイリアス無効化（ドット絵向け）
                ctx.imageSmoothingEnabled = false;

                // リサイズ描画（小さくしても補間されない）
                ctx.drawImage(
                    sourceCanvas,
                    0,
                    0,
                    sourceCanvas.width,
                    sourceCanvas.height, // 元サイズ
                    0,
                    0,
                    width,
                    height, // 出力サイズ（等倍など）
                );

                // ダウンロード
                const dataURL = resizedCanvas.toDataURL("image/png");
                const base64 = dataURL.split(",")[1];
                zip.file(`frame_${y + 1}_${x + 1}.png`, base64, {
                    base64: true,
                });
            }
        }

        zip.generateAsync({ type: "blob" }).then((blob) => {
            const url = URL.createObjectURL(blob);
            download(url, "frames.zip");
        });
    };

    const exportAsGIF = () => {
        const { frames } = anime;
        const i = Math.floor($activeIndex / frames) * frames;
        const bg = `${[...Array(3)].map(() => randInt(0, 4).toString(16).padStart(2, "0")).join("")}`;
        const gif = new GIF({
            workers: 2,
            quality: 10,
            width,
            height,
            workerScript: "gif.worker.js",
            transparent: `0x${bg}`,
        });
        const delay = (1000 / $fps) | 0;
        for (let x = 0; x < frames; x++) {
            const emptyCanvas = document.createElement("canvas");
            emptyCanvas.width = width;
            emptyCanvas.height = height;
            const ctx = emptyCanvas.getContext("2d", {
                willReadFrequently: true,
            });
            if (!ctx) return;
            ctx.fillStyle = `#${bg}`;
            ctx.fillRect(0, 0, width, height);
            const canvas = anime.canvasByI.get(i + x);
            if (canvas) ctx.drawImage(canvas, 0, 0);
            gif.addFrame(emptyCanvas, { delay });
        }
        gif.on("finished", (blob) => {
            const url = URL.createObjectURL(blob);
            download(url, `frames_${i + 1}.gif`);
        });
        gif.render();
    };

    const exportAsAni = async () => {
        const blob = await exportAsAniPerWayZIP(anime);
        const url = URL.createObjectURL(blob);
        download(url, "cursors.zip");
    };
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
    {#snippet trigger()}出力{/snippet}
    {#snippet content()}
        <header class="flex justify-between">
            <p class="font-bold text-xl">歩行グラの出力</p>
            <button
                class="btn-icon hover:preset-tonal"
                onclick={() => {
                    open = false;
                }}><IconX /></button
            >
        </header>
        <article class="space-y-4">
            <p class="opacity-60">ダウンロードします</p>
            <div class="pt-2">
                <button
                    type="button"
                    class="w-full px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition"
                    aria-label="submit"
                    onclick={exportAsAni}
                >
                    ANI出力
                </button>
            </div>
            <div class="pt-2">
                <button
                    type="button"
                    class="w-full px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition"
                    aria-label="submit"
                    onclick={exportAsGIF}
                >
                    GIF出力
                </button>
            </div>
            <div class="pt-2">
                <button
                    type="button"
                    class="w-full px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 transition"
                    aria-label="submit"
                    onclick={exportAsZIP}
                >
                    ZIP出力
                </button>
            </div>
            <div class="pt-2">
                <button
                    type="button"
                    class="w-full px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition"
                    aria-label="submit"
                    onclick={exportAsPNG}
                >
                    PNG出力
                </button>
            </div>
        </article>
    {/snippet}
</Popover>
