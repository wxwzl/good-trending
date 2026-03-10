# Ai Reddit 帖子商品智能分析需求（2026-03-10）

## 现状

爬取到reddit 的帖子后，只能通过搜索亚马逊网站的链接来识别，这个帖子是跟哪些商品相关

## 需求

引入ai 智能分析，支持kimi coding plan 和 阿里 百炼 coding plan,以及智谱 coding plan, apikey
和模型，以及是否开启ai 智能分析要支持环境变量。 通过reddit 帖子的title，内容和评论等进行智能分析出
有哪些商品关键词，然后去亚马逊上利用关键词去搜索相关的商品根据亚马逊上的寻找最好商品的排序规则，排序
找出头6个商品。这里如果分析出有多个关键词，要分别搜索这
几个关键词。找出商品后保存到数据（此处先不统计商品的商品出现统计表-product_appearance_stat里的历史出
现的次数，last7DaysBitmap这些字段，因为这里根据关键词搜索出来的商品不准确），再挨个以商品的名称为关
键词 去google搜索统计时间内的结果，根据结果再更新product_appearance_stat表里的商品数据以及商品社交提
及统计表-product_social_stat的信息。

第一点：社交提及统计 (crawlProductMentions)

增加 用商品名称搜索 google，不区分社交媒体平台，区分不同的时间段的结果数的字段

crawl-yesterday-stats │ 0 2 \* \* \* │ 每天凌晨2点 │ 昨天完整数据

crawl-product-mentions │ 0 5 \* \* \* │ 每天凌晨5点 │ 社交提及统计
