# 生产环境获取 Access Token 指南

在生产环境中获取 Shopify Access Token 有几种方法，选择最适合你环境的方式。

## 方法 1: 使用生产环境脚本（推荐）

这是最简单直接的方法，适合通过命令行访问生产服务器的情况。

### 步骤 1: 设置数据库连接

在生产服务器上设置 `DATABASE_URL` 环境变量：

```bash
# PostgreSQL 示例
export DATABASE_URL="postgresql://username:password@host:5432/database_name"

# MySQL 示例
export DATABASE_URL="mysql://username:password@host:3306/database_name"

# SQLite (单实例部署)
export DATABASE_URL="file:./prisma/production.sqlite"
```

### 步骤 2: 运行脚本

```bash
npm run get-token:prod
```

或者直接指定数据库URL：

```bash
DATABASE_URL="postgresql://user:pass@host:5432/db" npm run get-token:prod
```

### 输出示例

```
🔗 连接数据库: postgresql://user:****@host:5432/db

=== Shopify App Access Tokens ===

Session 1:
  Shop: your-shop.myshopify.com
  Access Token: shpua_xxxxxxxxxxxxx
  Scope: write_discounts,write_products
  Expires: Never
  Type: Offline
  Session ID: offline_your-shop.myshopify.com
  Verifying token...
  ✅ Token is VALID

=== Most Recent Offline Access Token ===
Shop: your-shop.myshopify.com
Access Token: shpua_xxxxxxxxxxxxx

✅ Token is valid and ready to use!

=== For Postman/API Testing ===
Header: X-Shopify-Access-Token
Value: shpua_xxxxxxxxxxxxx

Example URL:
https://your-shop.myshopify.com/admin/api/2025-10/shop.json
```

## 方法 2: 通过管理 API 端点

如果你需要通过 HTTP API 获取 token（例如从 CI/CD 或其他服务调用）。

### 步骤 1: 设置管理 API Key

在环境变量中设置：

```bash
export ADMIN_API_KEY="your-secret-api-key-here"
```

### 步骤 2: 调用 API

```bash
# 获取所有 shops 的 offline token
curl "https://your-app-domain.com/api/tokens?apiKey=your-secret-api-key-here"

# 获取特定 shop 的 token
curl "https://your-app-domain.com/api/tokens?shop=your-shop.myshopify.com&apiKey=your-secret-api-key-here"

# 获取所有 sessions（包括 online）
curl "https://your-app-domain.com/api/tokens?all=true&apiKey=your-secret-api-key-here"
```

### 响应示例

```json
{
  "shop": "your-shop.myshopify.com",
  "accessToken": "shpua_xxxxxxxxxxxxx",
  "scope": "write_discounts,write_products",
  "expires": null,
  "isOnline": false,
  "sessionId": "offline_your-shop.myshopify.com"
}
```

### 安全建议

⚠️ **重要**: 在生产环境中使用 API 端点时，请确保：

1. **使用强密码作为 ADMIN_API_KEY**
   ```bash
   # 生成随机密钥
   openssl rand -hex 32
   ```

2. **限制访问IP**（在应用层或通过防火墙）
   - 只允许特定IP访问 `/api/tokens` 端点

3. **使用HTTPS**
   - 永远不要在HTTP上传输token

4. **记录访问日志**
   - 监控所有对token端点的访问

5. **考虑使用更安全的认证方式**
   - JWT tokens
   - OAuth 2.0
   - 服务账户认证

## 方法 3: 直接查询数据库

如果你有直接访问生产数据库的权限。

### PostgreSQL

```sql
SELECT 
  shop,
  "accessToken",
  scope,
  "isOnline",
  expires
FROM "Session"
WHERE "isOnline" = false
ORDER BY id DESC
LIMIT 1;
```

### MySQL

```sql
SELECT 
  shop,
  accessToken,
  scope,
  isOnline,
  expires
FROM Session
WHERE isOnline = false
ORDER BY id DESC
LIMIT 1;
```

### SQLite

```sql
SELECT 
  shop,
  accessToken,
  scope,
  isOnline,
  expires
FROM Session
WHERE isOnline = 0
ORDER BY id DESC
LIMIT 1;
```

## 方法 4: 通过 Shopify Partner Dashboard

虽然 Partner Dashboard 不直接显示 access token，但你可以：

1. 登录 [Shopify Partner Dashboard](https://partners.shopify.com/)
2. 进入你的 App
3. 查看已安装的商店列表
4. 如果需要重新获取token，可以：
   - 卸载并重新安装app
   - 或者使用上述方法从数据库获取

## 常见问题

### Q: Token 显示无效怎么办？

A: 如果token验证失败，需要重新安装app：

1. 清除旧的sessions（如果可能）
2. 在Shopify商店中卸载app
3. 重新安装app
4. 这会生成新的有效token

### Q: 如何确保token安全？

A: 
- 不要在代码中硬编码token
- 使用环境变量或密钥管理服务（如 AWS Secrets Manager, HashiCorp Vault）
- 限制token的访问范围（scopes）
- 定期轮换token（重新安装app）

### Q: 生产环境使用什么数据库？

A: 推荐使用：
- **PostgreSQL** - 最常用，功能强大
- **MySQL** - 广泛支持
- **SQLite** - 仅适用于单实例部署

避免在生产环境使用SQLite，除非你的应用只运行在单个实例上。

### Q: 如何在不同环境之间切换？

A: 使用不同的 `DATABASE_URL` 环境变量：

```bash
# 开发环境
DATABASE_URL="file:./prisma/dev.sqlite" npm run get-token

# 生产环境
DATABASE_URL="postgresql://..." npm run get-token:prod
```

## 最佳实践

1. **自动化token获取**
   - 在CI/CD流程中自动获取token
   - 存储在安全的密钥管理服务中

2. **监控token有效性**
   - 定期验证token是否仍然有效
   - 设置告警当token失效时通知

3. **文档化**
   - 记录token的获取流程
   - 确保团队成员知道如何获取token

4. **备份**
   - 定期备份数据库（包含sessions）
   - 但要注意token的敏感性

## 相关文件

- `scripts/get-access-token.js` - 开发环境脚本
- `scripts/get-access-token-production.js` - 生产环境脚本
- `app/routes/api.tokens.jsx` - 管理API端点
- `POSTMAN_SETUP.md` - Postman配置指南




