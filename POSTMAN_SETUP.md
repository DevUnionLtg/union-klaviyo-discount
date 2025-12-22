# Postman 配置指南 - Shopify API Token

## 重要提示

你的 token 是有效的（已验证），但在 Postman 中需要正确配置才能使用。

## 正确的 Postman 配置

### 1. REST API 请求示例

**请求方法**: `GET`

**URL**: 
```
https://union-lighting-sandboxdev.myshopify.com/admin/api/2025-10/shop.json
```

**Headers** (必须设置):
```
X-Shopify-Access-Token: shpua_330204e8c427be72c98a3334a209a850
Content-Type: application/json
```

### 2. GraphQL API 请求示例

**请求方法**: `POST`

**URL**: 
```
https://union-lighting-sandboxdev.myshopify.com/admin/api/2025-10/graphql.json
```

**Headers**:
```
X-Shopify-Access-Token: shpua_330204e8c427be72c98a3334a209a850
Content-Type: application/json
```

**Body** (选择 `raw` 和 `JSON`):
```json
{
  "query": "{ shop { name email } }"
}
```

## 常见错误

### ❌ 错误 1: 使用 Authorization header
```
Authorization: Bearer shpua_330204e8c427be72c98a3334a209a850
```
**错误原因**: Shopify 不使用标准的 Authorization header

### ✅ 正确方式
```
X-Shopify-Access-Token: shpua_330204e8c427be72c98a3334a209a850
```

### ❌ 错误 2: API 版本错误
```
https://union-lighting-sandboxdev.myshopify.com/admin/api/2024-01/shop.json
```
**错误原因**: 使用了错误的 API 版本

### ✅ 正确方式
```
https://union-lighting-sandboxdev.myshopify.com/admin/api/2025-10/shop.json
```

### ❌ 错误 3: URL 格式错误
```
https://union-lighting-sandboxdev.myshopify.com/api/shop.json
```
**错误原因**: 缺少 `/admin/api/{version}/` 路径

### ✅ 正确方式
```
https://union-lighting-sandboxdev.myshopify.com/admin/api/2025-10/shop.json
```

## 快速测试

### 测试 1: 获取商店信息
- **Method**: `GET`
- **URL**: `https://union-lighting-sandboxdev.myshopify.com/admin/api/2025-10/shop.json`
- **Headers**: 
  - `X-Shopify-Access-Token`: `shpua_330204e8c427be72c98a3334a209a850`
  - `Content-Type`: `application/json`

### 测试 2: GraphQL 查询
- **Method**: `POST`
- **URL**: `https://union-lighting-sandboxdev.myshopify.com/admin/api/2025-10/graphql.json`
- **Headers**: 
  - `X-Shopify-Access-Token`: `shpua_330204e8c427be72c98a3334a209a850`
  - `Content-Type`: `application/json`
- **Body**:
```json
{
  "query": "{ shop { name email domain } }"
}
```

## Postman 环境变量设置（推荐）

在 Postman 中创建环境变量：

1. 点击右上角的 "Environments"
2. 创建新环境或编辑现有环境
3. 添加以下变量：

| Variable | Initial Value | Current Value |
|----------|---------------|---------------|
| `shop` | `union-lighting-sandboxdev.myshopify.com` | `union-lighting-sandboxdev.myshopify.com` |
| `access_token` | `shpua_330204e8c427be72c98a3334a209a850` | `shpua_330204e8c427be72c98a3334a209a850` |
| `api_version` | `2025-10` | `2025-10` |

然后在请求中使用：
- URL: `https://{{shop}}/admin/api/{{api_version}}/shop.json`
- Header: `X-Shopify-Access-Token: {{access_token}}`



