<script lang="ts">
    import { base } from "$app/paths";
    import * as anime from "$lib/anime";
    import CharaChipPanelPart from "$lib/components/CharaChipPanelPart.svelte";
    import ColorWheelPart from "$lib/components/ColorWheelPart.svelte";
    import ExportPart from "$lib/components/ExportPart.svelte";
    import ImportPart from "$lib/components/ImportPart.svelte";
    import InspoPart from "$lib/components/InspoPart.svelte";
    import LayerPanelPart from "$lib/components/LayerPanelPart.svelte";
    import ManualPart from "$lib/components/ManualPart.svelte";
    import PreviewPart from "$lib/components/PreviewPart.svelte";
    import ResizePart from "$lib/components/ResizePart.svelte";
    import { isOnionSkin } from "$lib/onion-skin";
    import { color } from "$lib/store";
    import * as unjStorage from "$lib/unj-storage.js";
    import {
        BombIcon,
        CheckIcon,
        Layers2Icon,
        MoonIcon,
        SunIcon,
    } from "@lucide/svelte";
    import { EyeIcon } from "@lucide/svelte";
    import { EditIcon } from "@lucide/svelte";
    import { LockIcon } from "@lucide/svelte";
    import IconEraser from "@lucide/svelte/icons/eraser";
    import IconFlipHorizontal from "@lucide/svelte/icons/flip-horizontal-2";
    import IconGrid from "@lucide/svelte/icons/grid";
    import IconMove from "@lucide/svelte/icons/move";
    import IconPaintBucket from "@lucide/svelte/icons/paint-bucket";
    import IconPen from "@lucide/svelte/icons/pen";
    import IconPipette from "@lucide/svelte/icons/pipette";
    import IconRedo from "@lucide/svelte/icons/redo";
    import IconSave from "@lucide/svelte/icons/save";
    import IconTrash2 from "@lucide/svelte/icons/trash-2";
    import IconUndo from "@lucide/svelte/icons/undo";
    import {
        mdiContentSaveOutline,
        mdiEraser,
        mdiEraserVariant,
        mdiEyedropper,
        mdiFlipHorizontal,
        mdiFormatColorFill,
        mdiGrid,
        mdiHandBackRight,
        mdiPen,
        mdiRedo,
        mdiTrashCanOutline,
        mdiUndo,
    } from "@mdi/js";
    import * as oekaki from "@onjmin/oekaki";
    import { Slider } from "@skeletonlabs/skeleton-svelte";
    import { Segment, Switch } from "@skeletonlabs/skeleton-svelte";
    import ColorPicker from "svelte-awesome-color-picker";

    const isMobile = globalThis.innerWidth < 768;

    let pointerupTimestamp = $state(0);
    const updatePointerupTimestamp = () => {
        setTimeout(() => {
            pointerupTimestamp = performance.now();
        });
    };
    $effect(() => {
        document.addEventListener("pointerup", updatePointerupTimestamp);
        return () =>
            document.removeEventListener("pointerup", updatePointerupTimestamp);
    });

    /**
     * PC版ショートカット
     */
    const handleKeyDown = async (e: KeyboardEvent) => {
        if (notDrawing(e)) return;
        if (!e.ctrlKey) return;
        let key = e.key;
        if (e.getModifierState("CapsLock")) {
            key = /[a-z]/.test(key) ? key.toUpperCase() : key.toLowerCase();
        }
        switch (key) {
            case "1":
                e.preventDefault();
                choiced = tool.pen.label;
                break;
            case "2":
                e.preventDefault();
                choiced = tool.eraser.label;
                break;
            case "3":
                e.preventDefault();
                choiced = tool.dropper.label;
                break;
            case "4":
                e.preventDefault();
                choiced = tool.fill.label;
                break;
            case "5":
                e.preventDefault();
                choiced = tool.translate.label;
                break;
            case "e":
                e.preventDefault();
                erasable = !erasable;
                break;
            case "f":
                e.preventDefault();
                flipped = !flipped;
                break;
            case "g":
                e.preventDefault();
                isGrid = !isGrid;
                break;
            case "d":
                e.preventDefault();
                isDark = !isDark;
                break;
            case "o":
                e.preventDefault();
                isOnionSkin.update((value) => !value);
                break;
            case "z":
                e.preventDefault();
                doAction(tool.undo.label);
                break;
            case "Z":
                e.preventDefault();
                doAction(tool.redo.label);
                break;
            case "s":
                e.preventDefault();
                doAction(tool.save.label);
                break;
            case "c": // クリップボードにコピー
                {
                    e.preventDefault();
                    const blob = await new Promise<Blob | null>((resolve) =>
                        oekaki.render().toBlob(resolve),
                    );
                    if (!blob) return;
                    const item = new ClipboardItem({ "image/png": blob });
                    await navigator.clipboard.write([item]);
                }
                break;
        }
    };
    $effect(() => {
        if (!upperLayer) return;
        window.removeEventListener("keydown", handleKeyDown);
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    });

    /**
     * 別の作業中
     */
    const notDrawing = (e: Event) => {
        const target = e.target as HTMLElement;
        return (
            !getSelection()?.isCollapsed ||
            target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable
        );
    };

    /**
     * PC版ショートカット
     */
    const handlePaste = async (e: ClipboardEvent) => {
        if (notDrawing(e)) return;
        if (!activeLayer || activeLayer?.locked) return;
        let imageItem: DataTransferItem | null = null;
        for (const v of e.clipboardData?.items ?? []) {
            if (v.kind === "file" && v.type.startsWith("image/")) {
                imageItem = v;
            }
        }
        if (!imageItem) return;
        const blob = imageItem.getAsFile();
        if (!blob) return;

        const dotSize = oekaki.getDotSize();
        const { width, height } = anime;

        const bitmap = await createImageBitmap(blob);
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = width;
        tempCanvas.height = height;
        const ctx = tempCanvas.getContext("2d");
        if (!ctx) return;
        // アンチエイリアス無効化（ドット絵向け）
        ctx.imageSmoothingEnabled = false;

        // 中央配置
        const ratio = Math.min(width / bitmap.width, height / bitmap.height);
        const w = bitmap.width * ratio;
        const h = bitmap.height * ratio;
        const offsetX = (width - w) / 2;
        const offsetY = (height - h) / 2;
        ctx.drawImage(bitmap, offsetX, offsetY, w, h);
        const { data } = ctx.getImageData(0, 0, width, height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 4;
                const [r, g, b, a] = data.subarray(index, index + 4);
                if (!a) continue;
                oekaki.color.value = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
                activeLayer.drawByDot(x * dotSize, y * dotSize);
                activeLayer.used = true;
            }
        }
        activeLayer?.trace();
        updatePointerupTimestamp();
    };
    $effect(() => {
        if (!upperLayer) return;
        window.removeEventListener("paste", handlePaste);
        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    });

    const dropper = (x: number, y: number) => {
        if (!activeLayer) return;
        const ctx = oekaki
            .render()
            .getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        const { data } = ctx.getImageData(0, 0, width, height);
        const index = (y * width + x) * 4;
        const hex = `#${Array.from(data.slice(index, index + 3))
            .map((v) => v.toString(16).padStart(2, "0"))
            .join("")}`;
        color.set(hex);
    };

    const fill = async (x: number, y: number) => {
        if (!activeLayer) return;
        const rgb = $color
            .slice(1)
            .match(/.{2}/g)
            ?.map((v) => Number.parseInt(v, 16));
        if (rgb?.length !== 3) return;
        const [r, g, b] = rgb;
        const data = oekaki.floodFill(
            activeLayer.data,
            width,
            height,
            x,
            y,
            erasable ? [0, 0, 0, 0] : [r, g, b, 255],
        );
        if (data) activeLayer.data = data;
    };

    let oekakiWrapper: HTMLElement | undefined = $state();
    let activeLayer: oekaki.LayeredCanvas | undefined = $state();
    let upperLayer: oekaki.LayeredCanvas | null = $state(null);
    let lowerLayer: oekaki.LayeredCanvas | null = $state(null);

    const height = isMobile
        ? Math.floor((globalThis.innerWidth * 0.9) / 48) * 48
        : 480;
    let width = height;
    let initTimestamp = $state(0);
    $effect(() => {
        init();
    });
    const init = async () => {
        if (!oekakiWrapper) return;
        initTimestamp = performance.now();
        const w = anime.width;
        const h = anime.height;
        width = Math.floor(height * (w / h));
        oekaki.init(oekakiWrapper, width, height);

        const upper = oekaki.upperLayer.value;
        const lower = oekaki.lowerLayer.value;
        upper?.canvas.classList.add("upper-canvas");
        lower?.canvas.classList.add("gimp-checkered-background");
        upperLayer = upper;
        lowerLayer = lower;
        if (upper) upper.opacity = 32;

        oekaki.setDotSize(1, h);
        document.documentElement.style.setProperty(
            "--grid-cell-size",
            `${oekaki.getDotSize()}px`,
        );

        activeLayer = new oekaki.LayeredCanvas("レイヤー #1");
    };

    $effect(() => {
        if (!upperLayer) return;
        document.addEventListener(
            "pointermove",
            (e) => {
                if (!upperLayer) return;
                const [x, y] = oekaki.getXY(e);
                upperLayer.clear();
                upperLayer.drawByDot(x, y);
            },
            { passive: true },
        );
    });

    // 描画イベント登録
    $effect(() => {
        if (!upperLayer) return;
        let prevX: number | null = null;
        let prevY: number | null = null;
        oekaki.onDraw((x, y, buttons) => {
            if (prevX === null) prevX = x;
            if (prevY === null) prevY = y;
            if (choiced === tool.dropper.label || (buttons & 2) !== 0) {
                dropper(x, y);
            } else {
                if (!activeLayer?.locked) {
                    if (choiced === tool.translate.label) {
                        activeLayer?.translateByDot(x - prevX, y - prevY);
                    } else {
                        const lerps = oekaki.lerp(x, y, prevX, prevY);
                        switch (choiced) {
                            case tool.pen.label:
                                for (const [x, y] of lerps) {
                                    erasable
                                        ? activeLayer?.eraseByDot(x, y)
                                        : activeLayer?.drawByDot(x, y);
                                }
                                break;
                            case tool.eraser.label:
                                for (const [x, y] of lerps) {
                                    activeLayer?.eraseByDot(x, y);
                                }
                                break;
                        }
                    }
                }
            }
            prevX = x;
            prevY = y;
        });
        const fin = () => {
            if (activeLayer?.modified()) {
                activeLayer.trace();
                addRecent();
            }
        };
        oekaki.onDrawn((x, y, buttons) => {
            prevX = null;
            prevY = null;
            if (activeLayer?.locked) return;
            if (choiced === tool.fill.label) fill(x, y);
            fin();
        });
        oekaki.onClick((x, y, buttons) => {});
    });

    // activeLayerが変わったときにstateを同期する
    $effect(() => {
        if (!activeLayer) return;
        opacity = [activeLayer.opacity];
        layerVisible = activeLayer.visible;
        layerName = activeLayer.name;
        layerNameDisabled = true;
        layerLocked = activeLayer.locked;
    });

    let opacity = $state([100]);
    let layerVisible = $state(true);
    let layerName = $state("");
    let layerNameDisabled = $state(true);
    let layerLocked = $state(false);
    $effect(() => {
        if (activeLayer) activeLayer.opacity = opacity[0];
    });
    $effect(() => {
        if (activeLayer) activeLayer.visible = layerVisible;
    });
    $effect(() => {
        if (activeLayer) activeLayer.name = layerName;
    });
    $effect(() => {
        if (activeLayer) activeLayer.locked = layerLocked;
    });
    $effect(() => {
        unjStorage.color.value = $color;
        oekaki.color.value = $color;
    });

    let recent: string[] = $state([]);
    const maxRecent = 32;
    const addRecent = () => {
        if (choiced === tool.translate.label) return;
        const idx = recent.indexOf($color);
        if (idx === 0) return;
        if (idx !== -1) recent.splice(idx, 1);
        recent.unshift($color);
        if (recent.length > maxRecent) recent.pop();
        recent = [...recent]; // 新しい配列を代入する（Svelte のリアクティブ性を保つため）
    };

    const tool = {
        // 描画系
        pen: { label: "ペン", mdi: mdiPen, icon: IconPen },
        eraser: { label: "消しゴム", mdi: mdiEraser, icon: IconEraser },
        dropper: {
            label: "カラーピッカー",
            mdi: mdiEyedropper,
            icon: IconPipette,
        },
        fill: {
            label: "塗りつぶし",
            mdi: mdiFormatColorFill,
            icon: IconPaintBucket,
        },
        translate: {
            label: "ハンドツール",
            mdi: mdiHandBackRight,
            icon: IconMove,
        },
        // 切り替え系
        erasable: {
            label: "常に消しゴム",
            mdi: mdiEraserVariant,
            icon: IconEraser,
        },
        flip: {
            label: "左右反転",
            mdi: mdiFlipHorizontal,
            icon: IconFlipHorizontal,
        },
        grid: { label: "グリッド線", mdi: mdiGrid, icon: IconGrid },
        // アクション系
        undo: { label: "戻る", mdi: mdiUndo, icon: IconUndo },
        redo: { label: "進む", mdi: mdiRedo, icon: IconRedo },
        save: {
            label: "画像を保存",
            mdi: mdiContentSaveOutline,
            icon: IconSave,
        },
        clear: { label: "全消し", mdi: mdiTrashCanOutline, icon: IconTrash2 },
    } as const;

    let choices = [
        tool.pen,
        tool.eraser,
        tool.dropper,
        tool.fill,
        tool.translate,
    ];
    let choiced: string = $state(unjStorage.tool.value ?? tool.pen.label);

    const mdi2DataUrl = (mdi: string) => {
        const style = `fill="${isDark ? "white" : "black"}" stroke="${isDark ? "black" : "white"}" stroke-width="1"`;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="${mdi}" ${style}/></svg>`;
        const base64 = btoa(svg);
        return `data:image/svg+xml;base64,${base64}`;
    };

    $effect(() => {
        unjStorage.tool.value = choiced;
        if (upperLayer) {
            const xy = choiced === tool.fill.label ? "21 19" : "3 21";
            const mdi = choices.find((v) => v.label === choiced)?.mdi;
            if (!mdi) return;
            upperLayer.canvas.style.cursor = `url('${mdi2DataUrl(mdi)}') ${xy}, auto`;
        }
    });

    let erasable = $state(false);
    let flipped = $state(false);
    $effect(() => {
        oekaki.flipped.value = flipped;
    });
    let isGrid = $state(true);
    let isDark = $state(false);
    $effect(() => {
        if (isDark) {
            document.body.classList.add("hg-paint-gimp-dark");
        } else {
            document.body.classList.remove("hg-paint-gimp-dark");
        }
    });

    let actions = [tool.undo, tool.redo, tool.save, tool.clear];
    const doAction = (action: string) => {
        switch (action) {
            case tool.undo.label:
                activeLayer?.undo();
                updatePointerupTimestamp();
                break;
            case tool.redo.label:
                activeLayer?.redo();
                updatePointerupTimestamp();
                break;
            case tool.save.label:
                {
                    const dataURL = oekaki.render().toDataURL("image/png");
                    const link = document.createElement("a");
                    link.href = dataURL;
                    link.download = "drawing.png";
                    link.click();
                }
                break;
            case tool.clear.label:
                activeLayer?.clear();
                activeLayer?.trace();
                break;
        }
    };
</script>

<div class="grid h-screen grid-rows-[auto_1fr_auto]">
    <!-- Header -->
    <header class="bg-surface-100 shadow flex flex-wrap items-center gap-3">
        <!-- タイトルは左寄せ、固定幅 -->
        <div
            class="flex-none px-8 bg-primary rounded select-none text-left font-bold text-success-700 flex items-center gap-2"
            style="min-width: 180px;"
        >
            <img
                src="{base}/midori.png"
                alt="Midori Icon"
                class="w-16 h-16 object-contain"
            />
            <!-- PCやタブレット幅で表示 -->
            <span class="hidden sm:inline">
                HGペイント（歩行グラフィックペイント）
            </span>
            <!-- スマホ幅で表示 -->
            <span class="sm:hidden flex flex-col">
                <span>HGペイント</span>
                <span>（歩行グラフィックペイント）</span>
            </span>
        </div>

        <!-- タイトル以降の要素を包むコンテナ、中央寄せ -->
        <div class="flex flex-1 flex-wrap justify-center items-center gap-3">
            <Switch
                controlActive="bg-secondary-500"
                checked={layerLocked}
                onCheckedChange={(e) => {
                    layerLocked = e.checked;
                }}
            >
                {#snippet inactiveChild()}
                    <LockIcon size="14" />
                {/snippet}
                {#snippet activeChild()}
                    <LockIcon size="14" />
                {/snippet}
            </Switch>
            <div class="input-group grid-cols-[1fr_auto]">
                <input
                    class="ig-input"
                    type="text"
                    placeholder="レイヤー名"
                    bind:value={layerName}
                    disabled={layerNameDisabled}
                    maxlength="32"
                />
                <button
                    class="ig-btn {layerNameDisabled ? '' : 'preset-filled'}"
                    title="レイヤー名の編集"
                    onclick={() => (layerNameDisabled = !layerNameDisabled)}
                >
                    {#if layerNameDisabled}
                        <EditIcon size={18} />
                    {:else}
                        <CheckIcon size={18} />
                    {/if}
                </button>
            </div>
            <button
                type="button"
                class="btn-icond btn-lg"
                onclick={() => {
                    if (
                        layerLocked ||
                        !activeLayer ||
                        (activeLayer.used &&
                            !confirm(`${activeLayer.name}を削除しますか？`))
                    )
                        return;
                    activeLayer.delete();
                    const { prev, next } = activeLayer;
                    if (next) activeLayer = next;
                    else if (prev) activeLayer = prev;
                    else {
                        oekaki.refresh();
                        activeLayer = new oekaki.LayeredCanvas("レイヤー #1");
                    }
                }}
            >
                <IconTrash2 size={18} />
            </button>
            <button
                type="button"
                class="btn-icond btn-lg"
                onclick={async () => {
                    if (
                        layerLocked ||
                        !activeLayer ||
                        !confirm("全レイヤーを削除しますか？")
                    )
                        return;
                    oekaki.setLayers([]);
                    oekaki.refresh();
                    activeLayer = new oekaki.LayeredCanvas("レイヤー #1");
                }}
            >
                <BombIcon size={18} />
            </button>
        </div>

        <Switch
            controlActive="bg-secondary-500"
            checked={layerVisible}
            onCheckedChange={(e) => {
                layerVisible = e.checked;
            }}
        >
            {#snippet inactiveChild()}
                <EyeIcon size="14" />
            {/snippet}
            {#snippet activeChild()}
                <EyeIcon size="14" />
            {/snippet}
        </Switch>

        <div
            class="w-[12ch] flex justify-between font-mono text-sm tabular-nums"
        >
            <span class="text-left">不透明度</span>
            <span class="text-right">{opacity}%</span>
        </div>
        <div class="my-2 w-full basis-full max-w-[300px] mt-2">
            <Slider
                value={opacity}
                onValueChange={(e) => (opacity = e.value)}
                markers={[25, 50, 75]}
            />
        </div>
    </header>

    <!-- Content Area -->
    <div class="grid grid-cols-1 md:grid-cols-[auto_1fr_auto]">
        <!-- Left Sidebar -->
        <aside class="bg-surface-200 p-4 space-y-4">
            <CharaChipPanelPart
                bind:activeLayer
                {initTimestamp}
                {pointerupTimestamp}
            />
        </aside>

        <!-- Main Canvas Area -->
        <main class="bg-white flex items-center justify-center gap-4">
            {#if !isMobile}
                <PreviewPart {initTimestamp} />
            {/if}
            <div
                class="relative"
                class:hg-paint-grid-mode={isGrid}
                bind:this={oekakiWrapper}
            ></div>
            {#if !isMobile}
                <InspoPart />
            {/if}
        </main>

        <!-- Right Sidebar -->
        <aside class="bg-surface-200 p-4 space-y-4">
            <ColorWheelPart />
            <LayerPanelPart bind:activeLayer {pointerupTimestamp} />
        </aside>
    </div>

    <!-- Footer Tool Selector -->
    <footer
        class="bg-surface-100 shadow p-2 flex flex-wrap items-center justify-center gap-2"
    >
        <Segment
            name="tool"
            value={choiced}
            onValueChange={(e) => {
                if (e.value) choiced = e.value;
            }}
        >
            {#each choices as choice}
                <Segment.Item value={choice.label}>
                    <choice.icon />
                </Segment.Item>
            {/each}
        </Segment>
        <nav class="btn-group preset-outlined-surface-200-800 flex gap-4">
            <Switch
                controlActive="bg-secondary-500"
                checked={erasable}
                onCheckedChange={(e) => {
                    erasable = e.checked;
                }}
            >
                {#snippet inactiveChild()}
                    <tool.erasable.icon size="14" />
                {/snippet}
                {#snippet activeChild()}
                    <tool.erasable.icon size="14" />
                {/snippet}
            </Switch>
            <Switch
                controlActive="bg-secondary-500"
                checked={flipped}
                onCheckedChange={(e) => {
                    flipped = e.checked;
                }}
            >
                {#snippet inactiveChild()}
                    <tool.flip.icon size="14" />
                {/snippet}
                {#snippet activeChild()}
                    <tool.flip.icon size="14" />
                {/snippet}
            </Switch>
            <Switch
                controlActive="bg-secondary-500"
                checked={isGrid}
                onCheckedChange={(e) => {
                    isGrid = e.checked;
                }}
            >
                {#snippet inactiveChild()}
                    <tool.grid.icon size="14" />
                {/snippet}
                {#snippet activeChild()}
                    <tool.grid.icon size="14" />
                {/snippet}
            </Switch>
            <Switch
                controlActive="bg-secondary-500"
                checked={isDark}
                onCheckedChange={(e) => {
                    isDark = e.checked;
                }}
            >
                {#snippet inactiveChild()}
                    <SunIcon size="14" />
                {/snippet}
                {#snippet activeChild()}
                    <MoonIcon size="14" />
                {/snippet}
            </Switch>
            <Switch
                controlActive="bg-secondary-500"
                checked={$isOnionSkin}
                onCheckedChange={(e) => {
                    isOnionSkin.set(e.checked);
                }}
            >
                {#snippet inactiveChild()}
                    <Layers2Icon size="14" />
                {/snippet}
                {#snippet activeChild()}
                    <Layers2Icon size="14" />
                {/snippet}
            </Switch>
        </nav>
        <nav class="btn-group preset-outlined-surface-200-800 flex gap-2">
            {#each actions as action}
                <button
                    type="button"
                    class="btn-icond btn-lg"
                    onclick={() => doAction(action.label)}
                >
                    <action.icon size={18} />
                </button>
            {/each}
        </nav>

        <ManualPart />
        <ResizePart {init} />
        <ImportPart {init} bind:activeLayer bind:initTimestamp />
        <ExportPart {width} {height} />

        <!-- カラーピッカー UI -->
        <div class="w-full text-left flex flex-wrap items-center gap-4">
            <!-- Skeleton ColorPicker -->
            <div
                class="rounded-full ring-2 ring-black ring-offset-2 ring-offset-white"
            >
                <ColorPicker label="" bind:hex={$color} isAlpha={false} />
            </div>
            <!-- Tailwind input[type=color] -->
            <input
                type="color"
                bind:value={$color}
                class="w-10 h-10 rounded-full border-none p-0"
            />
            <!-- 最近使った色 -->
            <div class="flex gap-2">
                {#each recent as _color}
                    <button
                        type="button"
                        aria-label="Select color"
                        class="w-8 h-8 rounded-full ring-2 ring-gray-200 hover:ring-primary-500 transition"
                        style="background-color:{_color};"
                        onclick={() => color.set(_color)}
                    ></button>
                {/each}
            </div>
        </div>
    </footer>
</div>

<style>
    :global(.color-picker-wrapper label) {
        border-radius: 50%;
        box-shadow:
            0 0 0 2px black,
            0 0 0 4px white;
    }
    :global(.hg-paint-grid-mode .upper-canvas) {
        opacity: 0.4;
        background-image: linear-gradient(to right, gray 1px, transparent 1px),
            linear-gradient(to bottom, gray 1px, transparent 1px);
        background-size: var(--grid-cell-size) var(--grid-cell-size);
    }
</style>
