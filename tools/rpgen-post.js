// RPGEN スプライトアニメのまとめ投稿パネル。
// https://rpgen.org/dq/sAnims/upload.php を開いた状態で、このファイルを <script> で読み込む。
// 画像とタイトルは、rpgen-post-prepare.py が作る post/ フォルダ（posts.json と PNG）を
// ユーザーがファイル選択で渡す。パスワード入力と投稿ボタンもユーザーが行う。
// 画像をコードに埋め込まないので、読み込みの1行は短いまま済む。
// posts.json の item に site（作者のサイト）があれば、投稿のあと そのアニメーションのページに設定する
// （投稿フォームには欄が無く、各ページの「編集」→ cons/updateAuthComments.php で入れる仕組みのため）。
(() => {
	const ID = "__rpost";
	document.getElementById(ID)?.remove();
	const box = document.createElement("div");
	box.id = ID;
	box.style.cssText =
		"position:fixed;top:10px;left:10px;right:10px;z-index:99999;background:#fff;color:#000;border:3px solid #e33;padding:12px;font:14px sans-serif;box-shadow:0 4px 16px #0008;max-height:90vh;overflow:auto";
	// ページが描画ショートカットのために document でキーを受け取るので、パネル内のキーはここで止める
	for (const t of ["keydown", "keypress", "keyup"])
		box.addEventListener(t, (e) => e.stopPropagation());
	box.innerHTML =
		"<b>RPGEN まとめ投稿</b> <button data-k=close>閉じる</button><br>" +
		'post フォルダの中身（posts.json と PNG）をすべて選択: <input data-k=files type=file multiple accept=".json,.png">' +
		'<div data-k=view style="margin-top:8px"></div>';
	document.body.appendChild(box);
	const $k = (k) => box.querySelector(`[data-k=${k}]`);
	$k("close").onclick = () => box.remove();
	const state = { state: "waiting-files", items: [], results: [] };
	window.__rpost = state;

	const readURL = (file) =>
		new Promise((r) => {
			const f = new FileReader();
			f.onload = () => r(f.result);
			f.readAsDataURL(file);
		});

	$k("files").onchange = async (ev) => {
		const files = [...ev.target.files];
		const byName = new Map(files.map((f) => [f.name, f]));
		const view = $k("view");
		const jsonFile = byName.get("posts.json");
		if (!jsonFile) {
			view.textContent = "posts.json が選ばれていません";
			return;
		}
		const man = JSON.parse(await jsonFile.text());
		const [fw, fh] = man.frame || [16, 16];
		const [tx, ty] = man.thumb || [0, 0];
		const items = [];
		for (const it of man.items) {
			const f = byName.get(it.file);
			if (!f) {
				view.textContent = `画像が選ばれていません: ${it.file}`;
				return;
			}
			const url = await readURL(f);
			const img = new Image();
			img.src = url;
			await img.decode();
			const c = document.createElement("canvas");
			c.width = fw;
			c.height = fh;
			c.getContext("2d").drawImage(img, tx, ty, fw, fh, 0, 0, fw, fh);
			items.push({
				title: it.title,
				site: it.site || "",
				file: it.file,
				url,
				thumb: c.toDataURL("image/png"),
				w: img.width,
				h: img.height,
			});
		}
		state.items = items.map(({ title, site, file, w, h }) => ({ title, site, file, w, h }));
		state.state = "ready";

		view.innerHTML = `<b>${man.label || ""} ${items.length}体</b><div data-k=list style="display:flex;flex-wrap:wrap;gap:8px;margin:8px 0"></div>削除/編集パスワード: <input data-k=pass type=password maxlength=8 style="width:120px"> <button data-k=go>${items.length}体を投稿する</button><div data-k=log style="margin-top:8px;white-space:pre"></div>`;
		items.forEach((it, i) => {
			const d = document.createElement("div");
			d.style.cssText = "text-align:center;font-size:12px";
			const img = document.createElement("img");
			img.src = it.url;
			img.style.cssText = `image-rendering:pixelated;width:${it.w * 2}px;background:#ddd`;
			d.append(img, document.createElement("br"), `${i + 1}. ${it.title}`);
			if (it.site) {
				const s = document.createElement("div");
				s.style.cssText = "font-size:10px;color:#555;max-width:160px;word-break:break-all";
				s.textContent = it.site;
				d.append(s);
			}
			$k("list").appendChild(d);
		});
		const log = (s) => {
			$k("log").textContent += `${s}\n`;
		};

		$k("go").onclick = async () => {
			const inp = $k("pass");
			const pass = inp.value.trim();
			if (!/^[0-9A-Za-z]{2,8}$/.test(pass)) {
				alert("パスワードは2〜8文字の英数字");
				return;
			}
			inp.value = "";
			$k("go").disabled = true;
			state.state = "posting";
			const page = async (n) => (await fetch(`/dq/sAnims/${n}/`, { cache: "no-store" })).text();
			const post = (url, data) =>
				new Promise((r) =>
					$.ajax({ type: "POST", url, data })
						.done((x) => r(String(x)))
						.fail(() => r("fail")),
				);
			// 投稿後の番号: 一覧ページの maxNum の次から、タイトルが一致するページを探す
			const top = await (await fetch("/dq/sAnims/", { cache: "no-store" })).text();
			let next = Number(top.match(/maxNum = (\d+)/)?.[1] || 0) + 1;
			for (const it of items) {
				const ret = await new Promise((r) =>
					$.ajax({
						type: "POST",
						url: "cons/uploadSAnim.php",
						data: {
							token: g_token,
							imgBaseThumb: it.thumb,
							imgBase: it.url,
							title: it.title,
							pass,
							modIdx: "",
							isAMod: false,
						},
					})
						.done((x) => r(String(x)))
						.fail(() => r("fail")),
				);
				const res = { title: it.title, ret };
				state.results.push(res);
				log(`${it.title}: ${ret === "0" ? "投稿OK" : `失敗 (${ret})`}`);
				if (ret !== "0") {
					log("ここで止めました");
					break;
				}
				if (next > 1) {
					for (let n = next; n < next + 6 && !res.num; n++) {
						const h = await page(n);
						if (h.includes(`<title>「${it.title}」`)) {
							res.num = n;
							res.token = h.match(/g_token = '([0-9a-f]+)'/)?.[1];
						}
					}
					if (res.num) next = res.num + 1;
					log(`  番号: ${res.num ?? "見つからない"}`);
				}
				if (it.site && res.num && res.token) {
					res.siteRet = await post("cons/updateAuthComments.php", {
						token: res.token,
						curDir: res.num,
						pass,
						website: it.site,
						authComment: "",
					});
					log(`  作者のサイト: ${res.siteRet === "0" ? "設定OK" : `失敗 (${res.siteRet})`}`);
				}
				await new Promise((r) => setTimeout(r, 1500));
			}
			state.state = "done";
			log("完了");
		};
	};
})();
