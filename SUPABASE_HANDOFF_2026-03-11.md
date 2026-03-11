# xinjing ↔ Supabase 交接清单（给 Codex）

更新时间：2026-03-11

## 1) 已完成事项

1. Supabase 对接已接入项目环境变量（`.env.local`）。
2. 项目已新增 Supabase 客户端：
   - `lib/supabaseClient.ts`（前端 anon）
   - `lib/supabaseAdmin.ts`（服务端 service role）
3. Access 全量 14 表结构脚本已准备并执行：
   - `scripts/init_supabase_schema.sql`
4. Access 全表数据已通过 REST 导入 Supabase：
   - `scripts/import_access_to_supabase_rest.py`
5. Pixiv 图片已上传至 Supabase Storage：
   - bucket: `pixiv-images`
   - 上传结果：1024/1024，failed=0

## 2) 当前数据验收（REST 实测）

- users: 100
- artists: 100
- posts: 1000
- postattachments: 1000
- 其余表当前均为 0（agents/orders/products/commissionplans/postcomments/userfavorites/userfollows/worldbooks/charactercards/chatlogs）

> 注：PostgREST 返回 200/206 代表可访问；`content-range` 显示总行数。

## 3) 关键命名与兼容注意

### 表名（Supabase 端）
使用的是 Access 小写直转风格，**无下划线版本**：
- `postattachments`（不是 `post_attachments`）
- `postcomments`（不是 `post_comments`）
- `userfavorites`（不是 `user_favorites`）
- `userfollows`（不是 `user_follows`）
- `charactercards`（不是 `character_cards`）
- 其余：`users / artists / posts / agents / orders / products / commissionplans / worldbooks / chatlogs`

若后续要改成 snake_case，请统一做一次迁移并同步改代码/脚本。

### 主外键关系（已在 SQL 中定义）
- `artists.artistid -> users.userid`
- `posts.authorid -> users.userid`
- `postattachments.postid -> posts.postid`
- `postcomments.postid -> posts.postid`
- `postcomments.userid -> users.userid`
- `userfavorites(userid, postid)` 复合主键
- `userfollows(followerid, followeeid)` 复合主键
- `orders.planid -> commissionplans.planid`
- `orders.productid -> products.productid`
- `orders.buyerid/sellerid -> users.userid`
- `agents.creatorid -> users.userid`
- `agents.worldid -> worldbooks.worldid`
- `agents.cardid -> charactercards.cardid`
- `chatlogs.agentid -> agents.agentid`
- `chatlogs.userid -> users.userid`

## 4) 文件与脚本清单（Codex 续开发重点）

- Schema:
  - `scripts/init_supabase_schema.sql`
- 导入：
  - `scripts/import_access_to_supabase_rest.py`（全表）
  - `scripts/migrate_access_to_supabase.py`（旧版，依赖直连 Postgres，当前网络环境不稳定）
- Storage：
  - `scripts/upload_pixiv_images_to_storage.py`（已加重试/退避）

## 5) 已知问题 / 风险

1. 本机到 Supabase Postgres（5432/6543）曾持续出现连接被远端提前关闭，故本次采用 REST 导入。
2. 图片历史脏文件已隔离：
   - `E:\accessDB\pixiv_images_quarantine\20260311_171113`
3. 原始有效图片路径：
   - `E:\accessDB\pixiv_images`

## 6) 给 Codex 的建议下一步

1. 在业务代码中逐步替换本地 JSON 数据源（如 `data/*.json`）为 Supabase 查询。
2. 建一个统一的数据访问层（repository/service），避免页面直接写 SQL/REST。
3. 增加最小验收脚本：
   - 表计数检查
   - 外键孤儿检查
   - storage 文件可访问抽样检查
4. 若要长期稳定导入任务，优先使用 REST 或 Supabase Edge Function，避免依赖本机 Postgres 直连稳定性。
