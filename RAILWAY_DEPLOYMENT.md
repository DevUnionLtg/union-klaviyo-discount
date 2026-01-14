# Railway 部署指南

## Railway 环境变量配置

Railway **不会**自动识别项目中的环境变量，你必须在 Railway 面板中手动配置所有必需的环境变量。

### 必需的环境变量

在 Railway 项目的 **Variables** 标签页中，你需要设置以下环境变量：

| 环境变量名 | 说明 | 如何获取 |
|----------|------|---------|
| `SHOPIFY_API_KEY` | Shopify App 的 Client ID | 从 Shopify Partner Dashboard 或 `shopify.app.toml` 文件中的 `client_id` |
| `SHOPIFY_API_SECRET` | Shopify App 的 API Secret | 从 Shopify Partner Dashboard 获取 |
| `SHOPIFY_APP_URL` | 你的应用部署后的完整 URL | Railway 生成的域名，例如：`https://your-app.railway.app` |
| `SCOPES` | Shopify API 权限范围 | `write_discounts,write_products` |
| `NODE_ENV` | Node 环境 | `production` |
| `DATABASE_URL` | 数据库连接字符串 | 如果使用外部数据库，需要设置此项 |
| `PRISMA_CLIENT_ENGINE_TYPE` | Prisma 引擎类型 | `binary` (如果在 Windows ARM64 环境遇到问题) |
| `KLAVIYO_UPDATE_DISCOUNTCODE_ENDPOINT_URL` | Klaviyo webhook 端点 (可选) | 创建 discount 后发送数据的 Klaviyo/Azure 端点 URL（包含完整 URL 和 code 参数） |

### 在 Railway 中配置环境变量的步骤

#### 方法一：通过 Railway Web 界面

1. 登录 [Railway](https://railway.app/)
2. 打开你的项目
3. 点击你的服务（Service）
4. 点击 **Variables** 标签页
5. 点击 **Add Variable** 或 **Raw Editor**
6. 添加所有必需的环境变量

**Raw Editor 模式示例：**

```bash
SHOPIFY_API_KEY=your_api_key_here
SHOPIFY_API_SECRET=your_api_secret_here
SHOPIFY_APP_URL=https://your-app.railway.app
SCOPES=write_discounts,write_products
NODE_ENV=production
KLAVIYO_UPDATE_DISCOUNTCODE_ENDPOINT_URL=https://your-endpoint.azurewebsites.net/api/orders_create?code=YOUR_FUNCTION_KEY
```

⚠️ **安全提示**: 不要在代码或文档中包含真实的 API keys 或 secrets！

#### 方法二：通过 Railway CLI

```bash
# 安装 Railway CLI
npm i -g @railway/cli

# 登录
railway login

# 链接到你的项目
railway link

# 设置环境变量
railway variables set SHOPIFY_API_KEY=your_key_here
railway variables set SHOPIFY_API_SECRET=your_secret_here
railway variables set SHOPIFY_APP_URL=https://your-app.railway.app
railway variables set SCOPES=write_discounts,write_products
railway variables set NODE_ENV=production
railway variables set KLAVIYO_UPDATE_DISCOUNTCODE_ENDPOINT_URL=your_klaviyo_endpoint_url
```

### 获取 SHOPIFY_API_SECRET

1. 登录 [Shopify Partner Dashboard](https://partners.shopify.com/)
2. 选择你的 App
3. 点击 **Configuration**
4. 在 **Client credentials** 部分找到 **Client secret**
5. 复制这个值

### 获取 SHOPIFY_APP_URL

1. 在 Railway 中，部署你的应用
2. Railway 会生成一个域名，例如：`https://union-klaviyo-discount-production.up.railway.app`
3. 使用这个完整的 URL（包括 `https://`）

### 更新 Shopify App 配置

设置好 Railway 环境变量后，还需要更新 Shopify App 的配置：

1. 打开 `shopify.app.toml` 或相应的配置文件
2. 更新 `application_url` 和 `redirect_urls`：

```toml
application_url = "https://your-app.railway.app"

[auth]
redirect_urls = [ "https://your-app.railway.app/auth/callback" ]
```

3. 在 Shopify Partner Dashboard 中也需要更新相应的 URL：
   - App URL
   - Allowed redirection URL(s)

### 重新部署

1. 在 Railway 中设置好所有环境变量后
2. 触发重新部署（可以通过 Push 代码或手动重新部署）
3. 检查部署日志，确保没有环境变量相关的错误

### 常见问题

#### Q: 为什么 Railway 不能自动识别我的环境变量？

A: Railway 不会从你的代码或配置文件中自动提取环境变量。这是出于安全考虑，因为敏感信息（如 API secrets）不应该提交到代码库中。你必须在 Railway 的面板中手动设置。

#### Q: 本地开发时我不需要设置这些环境变量，为什么？

A: 本地开发时，Shopify CLI (`shopify app dev`) 会自动管理这些环境变量。但在生产环境部署时，你需要手动配置。

#### Q: 我可以使用 .env 文件吗？

A: 在 Railway 上不推荐使用 `.env` 文件。应该通过 Railway 的 Variables 功能设置环境变量。`.env` 文件也不应该提交到 Git 仓库中。

#### Q: SHOPIFY_APP_URL 应该包含 https:// 吗？

A: 是的，应该包含完整的 URL，例如：`https://your-app.railway.app`（不要在末尾加 `/`）

### 验证环境变量

部署后，你可以在 Railway 的服务日志中检查环境变量是否正确加载：

```bash
# 在 Railway 服务的 Deployment Logs 中查看
# 应该能看到应用成功启动，而不是 "empty appUrl configuration" 错误
```

### 数据库配置

如果你使用 SQLite（默认），需要确保：

1. 在部署前运行 `npm run build`
2. 在 Railway 启动命令中包含 Prisma 迁移：
   ```json
   "docker-start": "npm run setup && npm run start"
   ```
   其中 `setup` 会运行 `prisma generate && prisma migrate deploy`

对于生产环境，建议使用 Railway 提供的 PostgreSQL 数据库：

1. 在 Railway 项目中添加 PostgreSQL 服务
2. Railway 会自动生成 `DATABASE_URL` 环境变量
3. 更新 `prisma/schema.prisma`：
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

## 部署检查清单

- [ ] 在 Railway Variables 中设置 `SHOPIFY_API_KEY`
- [ ] 在 Railway Variables 中设置 `SHOPIFY_API_SECRET`
- [ ] 在 Railway Variables 中设置 `SHOPIFY_APP_URL`（使用 Railway 生成的域名）
- [ ] 在 Railway Variables 中设置 `SCOPES`
- [ ] 在 Railway Variables 中设置 `NODE_ENV=production`
- [ ] 在 Railway Variables 中设置 `KLAVIYO_UPDATE_DISCOUNTCODE_ENDPOINT_URL`（如果使用 Klaviyo webhook）
- [ ] 更新 `shopify.app.toml` 中的 URLs
- [ ] 在 Shopify Partner Dashboard 中更新 App URL 和 redirect URLs
- [ ] 配置数据库（SQLite 或 PostgreSQL）
- [ ] 重新部署应用
- [ ] 检查部署日志确认无错误
- [ ] 在 Shopify Admin 中测试安装应用

## 相关文档

- [Railway 环境变量文档](https://docs.railway.app/develop/variables)
- [Shopify App 部署文档](https://shopify.dev/docs/apps/launch/deployment)
- [Shopify App 环境变量设置](https://shopify.dev/docs/apps/launch/deployment/deploy-web-app/deploy-to-hosting-service#step-4-set-up-environment-variables)

