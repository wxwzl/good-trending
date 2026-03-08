如果我有个需求，每天会按热度登记前2000个商品，连续登记30天，最后要统计某个商品这30天内出现的次数，我该怎么设计这个数据的存储，用什么数据库，设计什么样的表？
你的需求本质是一个 “时间序列 TopN 统计 + 历史出现次数统计” 问题：

- 每天记录 Top 2000 商品
- 连续 30 天
- 查询 某个商品在这 30 天出现多少次
  数据规模其实很小：
  2000 \* 30 = 60000 条记录
  所以 绝大多数数据库都能轻松处理，关键在于 表设计和查询效率。
  我给你几个常见设计方案，从简单到高性能。

---

一、最简单方案（推荐）——关系型数据库
用 \*\*PostgreSQL / MySQL 都完全没问题。
表设计
CREATE TABLE product_hot_rank ( id BIGINT PRIMARY KEY AUTO_INCREMENT, stat_date DATE NOT NULL, -- 统计日期 product_id BIGINT NOT NULL, -- 商品ID rank INT NOT NULL, -- 排名 score DOUBLE, -- 热度值（可选） created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY uniq_date_product(stat_date, product_id), INDEX idx_product(product_id), INDEX idx_date(stat_date));
字段解释
字段说明stat_date当天榜单product_id商品rank排名score热度值

---

每天写入数据
每天跑任务：
2026-03-01 top20002026-03-02 top2000...
写入 2000 条。
30 天总计：
60000 rows

---

查询商品出现次数
SELECT COUNT(\*) FROM product_hot_rankWHERE product_id = 123AND stat_date >= CURRENT_DATE - INTERVAL 30 DAY;
时间复杂度：
O(logN)
因为：
idx_product

---

如果还要查出现在哪些天
SELECT stat_dateFROM product_hot_rankWHERE product_id = 123ORDER BY stat_date;

---

二、进一步优化（减少扫描）
可以增加 聚合表。
聚合表
CREATE TABLE product_hot_stat ( product_id BIGINT PRIMARY KEY, appear_count INT, last_update DATE);
每天更新：
INSERT INTO product_hot_stat(product_id, appear_count)VALUES (123,1)ON DUPLICATE KEY UPDATEappear_count = appear_count + 1;
查询：
SELECT appear_count FROM product_hot_statWHERE product_id=123
复杂度：
O(1)

---

三、如果榜单很大（百万级）
假设：
每天 100w
那就建议：
时序数据库
比如

- ClickHouse
- Apache Druid
  表：
  dateproduct_idrankscore
  ClickHouse 查询：
  SELECT count()FROM product_hot_rankWHERE product_id=123AND date >= today()-30

---

四、更极致方案（排行榜场景）
如果你的榜单 只存 Top2000，可以用：
Redis Sorted Set
使用：
ZSET
key：
hot:20260308
value：
ZADD hot:20260308 score productId
统计次数：
遍历 30 天：
EXISTS in ZSET
不过这种方式：

- 查询会多次访问
- 不适合复杂统计
  所以 Redis 不适合作为主存储。

---

五、最佳实践（推荐架构）
对于你的规模：
直接用关系型数据库即可
推荐：
PostgreSQL / MySQL
表：
product_hot_rank
数据量：
60000 rows
查询速度：
毫秒级
不需要：

- Redis
- ClickHouse
- 时序数据库

---

六、一个更高级的设计（很多人想不到）
可以把 30 天出现次数做成 滑动窗口：
product_idbitmap(30)
例如：
101101001...
每天左移一位。
这样：
bitcount(bitmap)
就是出现次数。
这种方案一般用：

- Redis Bitmap
- ClickHouse Bitmap
  适合 千万级商品统计。

---

七、总结
方案适合规模推荐MySQL / PostgreSQL10万级⭐⭐⭐⭐⭐Redis ZSET实时排行榜⭐⭐⭐ClickHouse亿级数据⭐⭐⭐⭐Bitmap超大规模统计⭐⭐⭐⭐⭐
对于你的需求：
60000 rows
MySQL 一张表就够了。

---

如果你愿意，我可以再给你一个 大厂常见的“热榜系统架构设计”（含：

- TopN 计算
- 滑动窗口
- Redis + MySQL
- 热榜 API
  很多推荐系统 / 电商榜单都这么做）。
  把 30 天出现次数做成 滑动窗口：这个是啥意思？
  “滑动窗口（Sliding Window）”在你的场景里意思是：
  只关注最近 30 天的数据，每过一天，窗口整体向前移动一天。
  也就是说：
  统计范围始终是：[today-29, today]
  而不是一直累积历史。

---

一、先用直觉理解滑动窗口
假设今天是：
2026-03-08
窗口范围：
2026-02-07 → 2026-03-08
明天：
2026-03-09
窗口变成：
2026-02-08 → 2026-03-09
变化：

- 新增一天- 移除最旧一天
  这就是：
  Sliding Window

---

二、为什么需要滑动窗口
因为你的需求是：
统计商品最近30天出现次数
而不是：
历史总次数
否则数据会无限增长。
滑动窗口的特点：
特点说明固定长度30天持续移动每天滑动自动淘汰旧数据第31天自动失效

---

三、普通数据库实现（最简单）
其实你前面那张表就是滑动窗口：
product_hot_rank
查询：
SELECT COUNT(\*)FROM product_hot_rankWHERE product_id = 123AND stat_date >= CURRENT_DATE - INTERVAL 30 DAY
这里：
CURRENT_DATE - 30
就是 滑动窗口边界。

---

四、更高级的滑动窗口实现（Bitmap）
当商品非常多时，可以用 位图存储30天状态。
比如：
product_id = 1001
存一个 30位二进制：
001011010101001000101010010101
每一位代表：
某一天是否上榜
例如：
1 = 出现0 = 没出现

---

举例
假设最近7天：
Day1 Day2 Day3 Day4 Day5 Day6 Day7 1 0 1 1 0 0 1
bitmap：
1011001
出现次数：
bitcount = 4

---

五、每天窗口怎么滑动
每天做一次：
第一步 左移一位
旧：1011001
左移：
0110010
最左边的旧数据被丢弃。

---

第二步 加入今天
假设今天出现：
0110011
如果没出现：
0110010

---

六、查询出现次数
只需要：
bitcount(bitmap)
例如：
0110011
统计：
4 次

---

七、这种设计的优势
如果有：
1000万商品
普通表：
2000 _ 30 = 60000 行
但如果是：
1000万商品
每天：
1000万 _ 30
就很大。
而 Bitmap：
每个商品只需要 30bit
空间：
30bit ≈ 4byte
1000万商品：
40MB

---

八、很多系统用这个
滑动窗口 + bitmap 常见于：

- 推荐系统
- 热榜系统
- 风控系统
- 用户活跃统计
  例如：
- Redis Bitmap
- ClickHouse Bitmap

---

九、总结
滑动窗口就是：
固定时间范围统计+ 每天移动+ 自动淘汰旧数据
你的需求：
最近30天出现次数
就是一个 典型 Sliding Window。

---

如果你愿意，我可以再讲一个 非常巧妙的“30天热榜统计架构”（大厂常见）：
它只需要：
1 张 MySQL 表+ 1 个 Redis key
就能支持：

- 每日 Top2000
- 任意商品30天出现次数
- 排名趋势图
  而且查询是：
  O(1)
  很多推荐系统都这么做。
  那60天呢也是二进制存储吗？
  是的，60 天也可以用二进制（Bitmap / Bitset）存储。核心思想其实没变：
  每一天用 1 bit 表示是否出现。
  所以：
  窗口需要的 bit30 天30 bit60 天60 bit90 天90 bit365 天365 bit

---

一、60 天 Bitmap 示例
假设某商品 60 天的出现情况：
010101001010101000010101001010101000010101001010101000010101
含义：
1 = 当天在 Top20000 = 没上榜
统计次数：
bitcount(bitmap)
例如：
bitcount = 23
说明 60 天出现 23 次。

---

二、60bit 占多少空间
计算一下：
60 bit = 7.5 byte
通常会存成：
8 byte (uint64)
所以：
商品数量占用空间1万商品80 KB10万商品800 KB100万商品8 MB
非常小。

---

三、滑动窗口怎么移动（60 天）
每天执行：
1 左移一位
bitmap <<= 1
旧数据被丢弃。

---

2 插入今天
如果今天上榜：
bitmap |= 1
如果没上榜：
bitmap |= 0

---

四、代码示例（JS）
你平时写 原生 JS 比较多，可以这么做：
let bitmap = 0n // BigIntfunction update(todayAppear) { bitmap = (bitmap << 1n) & ((1n << 60n) - 1n) if (todayAppear) { bitmap |= 1n }}
统计次数：
function bitcount(n) { let count = 0 while (n) { n &= n - 1n count++ } return count}

---

五、数据库怎么存
有三种方式：
1 MySQL BIGINT（推荐）
bitmap BIGINT UNSIGNED
60bit 完全够。

---

2 Redis Bitmap
使用：
SETBITBITCOUNT
例如：
SETBIT product:1001 0 1

---

3 位数组
BINARY(8)

---

六、Bitmap 的优点
非常适合：
最近N天统计
优点：
优点说明极省空间1天只用1bit查询快bitcount滑动窗口简单位移即可支持大规模千万商品

---

七、什么时候不用 Bitmap
如果你还需要：

- 排名
- 热度分数
- 当天榜单
  那还是需要一张表：
  daily_top_products
  Bitmap 只用于：
  出现次数统计

---

八、真实系统架构（推荐）
很多系统会这样设计：
MySQL daily_top_products (date, product_id, rank)Redis product:bitmap:60d
流程：
每天榜单生成 │ ├─ 写 MySQL (榜单历史) │ └─ 更新 Bitmap (统计出现次数)
查询次数：
BITCOUNT

---

九、其实 60 天还有更优雅的方法（大厂常用）
如果是 Top2000榜单，还有一种设计：
product_id+ 最近出现日期列表
例如：
product 123[1,3,4,10,20]
但 Bitmap 在统计上 更优雅。

---

✅ 结论
60 天窗口：
60 bit≈ 8 byte
完全适合 Bitmap 存储。

---

如果你愿意，我可以再给你讲一个 超级实用的技巧：
用一个 64bit 整数同时存 64 天热榜记录
很多推荐系统和广告系统都这么干，SQL 查询可以做到毫秒级统计。
Bitmap 具体内部是怎么计算，不是按二进制转10进制算法吗？
很多人第一次接触 Bitmap / Bitset 时都会误解成：
“是不是先把二进制转成十进制再计算？”
实际上 完全不是。
计算都是 直接在二进制位上进行的位运算（bitwise operations），不会做十进制转换。
核心是 CPU 的 位运算指令。

---

一、Bitmap 本质是什么
Bitmap 本质就是：
一段连续的 bit（0 或 1）
例如 8 天数据：
Day: 1 2 3 4 5 6 7 8Data: 1 0 1 1 0 0 1 0
存储：
10110010
在内存里其实就是：
1 byte

---

二、Bitmap 存储在内存里的样子
假设：
10110010
在内存里：
0b10110010
如果转十进制：
178
但系统不会去关心这个 178，它只看 bit 位。

---

三、Bitmap 常见操作
1 判断某一天是否出现
例如看 第3天
计算：
bitmap & (1 << 2)
解释：
bitmap 101100101<<2 00000100AND 00000000
结果：
0
说明 第3天没有出现。

---

2 设置某一天
例如：
第5天 = 1
操作：
bitmap |= (1 << 4)
计算：
bitmap 101100101<<4 00010000OR 10110010

---

3 清除某一天
bitmap &= ~(1 << day)

---

四、统计出现次数（bitcount）
这是最关键的操作。
例如：
10110010
统计有多少个 1。
结果：
4

---

方法1（经典算法）
Brian Kernighan 算法：
while (n) { n &= (n - 1); count++;}
原理：
每次 消掉最右侧的1。
示例：
1011001010110000101000001000000000000000
循环 4 次。

---

方法2（CPU 指令）
现代 CPU 有专门指令：
POPCNT
例如：
POPCNT 10110010
直接返回：
4
时间复杂度：
O(1)
这就是为什么 Bitmap 统计非常快。

---

五、滑动窗口是怎么实现的
例如 7 天窗口：
1011001
每天执行：
1 左移
bitmap << 1
计算：
1011001↓0110010
最左边被丢弃。

---

2 插入今天
如果今天出现：
bitmap |= 1
结果：
0110011

---

六、在数据库里的实现
例如 Redis Bitmap。
Redis 提供：
SETBITGETBITBITCOUNTBITOP
例如：
SETBIT product:1001 5 1
表示：
第5天出现
统计：
BITCOUNT product:1001

---

七、MySQL 里的实现
例如用 BIGINT：
bitmap BIGINT
更新：
UPDATE product_statSET bitmap = (bitmap << 1) | 1
统计：
SELECT BIT_COUNT(bitmap)FROM product_stat
MySQL 内部同样调用 CPU 的 popcount。

---

八、为什么 Bitmap 特别快
因为它是：
CPU 位运算
而不是：
循环数组字符串
例如统计：
30天出现次数
普通做法：
扫描30条记录
Bitmap：
1次 POPCNT

---

九、为什么很多系统喜欢 Bitmap
典型场景：

- 用户活跃统计
- 推荐系统
- 广告曝光
- 风控
  例如：
  用户365天登录记录
  只需要：
  365 bit ≈ 46 byte
  统计：
  BITCOUNT

---

十、总结
Bitmap 计算 不是二进制转十进制再算，而是：
CPU 位运算
核心操作：
AND &OR |SHIFT <<NOT ~POPCNT
所以 Bitmap 的优势是：
特点说明空间极小1天=1bit统计极快CPU指令适合滑动窗口左移即可

---

如果你愿意，我可以再讲一个 非常经典的设计：
为什么很多大厂的“用户连续登录7天/30天”统计都用 Bitmap，而不是数据库表
里面有一个非常巧妙的 连续登录检测算法，几乎所有大厂都会问这个面试题。
