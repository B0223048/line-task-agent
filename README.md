# Task Console V0.2 — GitHub Pages + Supabase

私人任務管理網頁。GitHub Pages 只提供靜態檔案，資料庫與登入由 Supabase 提供。**尚未串接 LINE 或 AI。**

## 部署前

1. 到 https://supabase.com 新建專案。
2. 到 SQL Editor 貼上 `schema.sql` 並執行。確認 `public.tasks` 已開啟 RLS，且只有 `authenticated` 有資料表 CRUD 權限。
3. 在 Authentication → Users 中建立自己的 Email／密碼帳號。建議關閉不需要的公開註冊入口，並啟用 MFA（若你的登入方式支援）。
4. 從 Supabase 的 Connect 或 API Keys 取得 Project URL 與 `sb_publishable_...` key，填入 `config.js`。**絕對不要放 `sb_secret_...`、`service_role` 或 DB 密碼**。
5. 將 `index.html`、`app.js`、`config.js` 放在 GitHub repository 根目錄（SQL 檔可選擇不部署），在 Repository → Settings → Pages 啟用 Deploy from branch。
6. 開啟 GitHub Pages URL 登入。手機與電腦共用同個帳號即可同步。

## 舊版備份遷移

先使用 V0.1 的「匯出 JSON」，登入 V0.2 後選「匯入 JSON」。匯入會以 ID upsert，不會自動刪除雲端原有任務。匯入前建議先備份。

## 安全限制

- GitHub Pages 是公開靜態網站，**登入與 RLS 只保護資料，不隱藏網站程式碼**。
- 此專案沒有本機端到端加密；Supabase 專案管理員仍可能讀到儲存內容。未經授權的 LINE／工作訊息不要上傳。
- 前端 publishable key 是公開的，這符合 Supabase 設計；資料安全仰賴 RLS 與正確的授權設定。
- 使用公開 CDN 載入 supabase-js；正式上線建議鎖定版本並採用打包／完整性保護流程。
- 目前每次最多載入 1000 筆任務。後續可加分頁、即時同步及本機離線快取。
- **未在真實 Supabase 帳號上完成端對端測試**；部署前應先用測試帳號驗證存取控制及各項操作。
