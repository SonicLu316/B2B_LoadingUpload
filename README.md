<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# B2B Loading Upload Project

這是一個使用 React 和 Vite 建置的專案。包含自動化部署至 GitHub Pages 的流程以及程式碼品質檢查工具。

## 🚀 專案啟動 (Getting Started)

請依照以下步驟在本地端啟動專案。

### 前置需求 (Prerequisites)

*   Node.js (建議 v18 或更高版本)
*   npm (隨附於 Node.js)

### 安裝 (Installation)

1.  複製專案 (Clone the repository):
    ```bash
    git clone <repository-url>
    ```
2.  進入專案目錄:
    ```bash
    cd <project-folder>
    ```
3.  安裝依賴套件:
    ```bash
    npm install
    ```

### 本地開發 (Running Locally)

啟動開發伺服器:

```bash
npm run dev
```

應用程式將在 `http://localhost:5173` (或 Vite 分配的其他埠號) 啟動。

### 程式碼品質檢查 (Code Quality)

本專案已設定 ESLint 和 Prettier。

*   **檢查程式碼 (Lint):**
    ```bash
    npm run lint
    ```
*   **格式化程式碼 (Format):**
    ```bash
    npm run format
    ```

### 建置生產版本 (Building for Production)

建置生產應用程式:

```bash
npm run build
```

建置產物將存放在 `dist` 目錄中。

## 🚢 部署 (Deployment - GitHub Pages)

本專案配置了 GitHub Actions 自動部署至 GitHub Pages。

### 設定步驟 (Setup)

1.  前往 GitHub 儲存庫的 **Settings** (設定)。
2.  點選左側選單的 **Pages** (位於 "Code and automation" 下)。
3.  在 **Build and deployment** (建置與部署) 區域:
    *   將 **Source** 設定為 **GitHub Actions**。
4.  將程式碼推送到 `main` 分支。GitHub Action 將會自動執行並部署您的網站。

## 🛠️ 技術棧 (Tech Stack)

*   **React** - UI 函式庫
*   **TypeScript** - 型別系統
*   **Vite** - 建置工具
*   **ESLint** - 程式碼檢查
*   **Prettier** - 程式碼格式化
*   **GitHub Actions** - CI/CD 自動化部署

## 📄 License

[License Name]
