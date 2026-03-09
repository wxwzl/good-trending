CREATE TYPE "public"."crawler_status" AS ENUM('RUNNING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('REDDIT', 'X_PLATFORM', 'AMAZON');--> statement-breakpoint
CREATE TABLE "category" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"image_url" text,
	"search_keywords" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "category_name_unique" UNIQUE("name"),
	CONSTRAINT "category_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "category_heat_stat" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"stat_date" date NOT NULL,
	"reddit_result_count" integer DEFAULT 0 NOT NULL,
	"x_result_count" integer DEFAULT 0 NOT NULL,
	"yesterday_reddit_count" integer DEFAULT 0 NOT NULL,
	"yesterday_x_count" integer DEFAULT 0 NOT NULL,
	"last_7_days_reddit_count" integer DEFAULT 0 NOT NULL,
	"last_7_days_x_count" integer DEFAULT 0 NOT NULL,
	"crawled_product_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crawler_log" (
	"id" text PRIMARY KEY NOT NULL,
	"task_type" text NOT NULL,
	"source_type" "source_type" NOT NULL,
	"category_id" text,
	"status" "crawler_status" NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"duration" integer,
	"items_found" integer DEFAULT 0 NOT NULL,
	"items_saved" integer DEFAULT 0 NOT NULL,
	"errors" json,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_appearance_stat" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"last_7_days_bitmap" bigint DEFAULT 0 NOT NULL,
	"last_15_days_bitmap" bigint DEFAULT 0 NOT NULL,
	"last_30_days_bitmap" bigint DEFAULT 0 NOT NULL,
	"last_60_days_bitmap" bigint DEFAULT 0 NOT NULL,
	"last_update_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_appearance_stat_product_id_unique" UNIQUE("product_id")
);
--> statement-breakpoint
CREATE TABLE "product_category" (
	"product_id" text NOT NULL,
	"category_id" text NOT NULL,
	CONSTRAINT "product_category_product_id_category_id_pk" PRIMARY KEY("product_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "product_social_stat" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"stat_date" date NOT NULL,
	"today_reddit_count" integer DEFAULT 0 NOT NULL,
	"today_x_count" integer DEFAULT 0 NOT NULL,
	"yesterday_reddit_count" integer DEFAULT 0 NOT NULL,
	"yesterday_x_count" integer DEFAULT 0 NOT NULL,
	"this_week_reddit_count" integer DEFAULT 0 NOT NULL,
	"this_week_x_count" integer DEFAULT 0 NOT NULL,
	"this_month_reddit_count" integer DEFAULT 0 NOT NULL,
	"this_month_x_count" integer DEFAULT 0 NOT NULL,
	"last_7_days_reddit_count" integer DEFAULT 0 NOT NULL,
	"last_7_days_x_count" integer DEFAULT 0 NOT NULL,
	"last_15_days_reddit_count" integer DEFAULT 0 NOT NULL,
	"last_15_days_x_count" integer DEFAULT 0 NOT NULL,
	"last_30_days_reddit_count" integer DEFAULT 0 NOT NULL,
	"last_30_days_x_count" integer DEFAULT 0 NOT NULL,
	"last_60_days_reddit_count" integer DEFAULT 0 NOT NULL,
	"last_60_days_x_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"image" text,
	"price" numeric(10, 2),
	"currency" text DEFAULT 'USD' NOT NULL,
	"amazon_id" text,
	"source_url" text NOT NULL,
	"discovered_from" "source_type" NOT NULL,
	"first_seen_at" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_slug_unique" UNIQUE("slug"),
	CONSTRAINT "product_amazon_id_unique" UNIQUE("amazon_id")
);
--> statement-breakpoint
CREATE TABLE "trend_rank" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"period_type" text NOT NULL,
	"stat_date" date NOT NULL,
	"rank" integer NOT NULL,
	"score" real NOT NULL,
	"reddit_mentions" integer DEFAULT 0 NOT NULL,
	"x_mentions" integer DEFAULT 0 NOT NULL,
	"source_data" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "category_heat_stat" ADD CONSTRAINT "category_heat_stat_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_appearance_stat" ADD CONSTRAINT "product_appearance_stat_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_category" ADD CONSTRAINT "product_category_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_category" ADD CONSTRAINT "product_category_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_social_stat" ADD CONSTRAINT "product_social_stat_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend_rank" ADD CONSTRAINT "trend_rank_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "category_slug_idx" ON "category" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "category_heat_category_date_idx" ON "category_heat_stat" USING btree ("category_id","stat_date");--> statement-breakpoint
CREATE INDEX "category_heat_date_idx" ON "category_heat_stat" USING btree ("stat_date");--> statement-breakpoint
CREATE INDEX "crawler_log_task_source_created_idx" ON "crawler_log" USING btree ("task_type","source_type","created_at");--> statement-breakpoint
CREATE INDEX "crawler_log_status_idx" ON "crawler_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX "crawler_log_category_idx" ON "crawler_log" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "appearance_product_idx" ON "product_appearance_stat" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "social_stat_product_date_idx" ON "product_social_stat" USING btree ("product_id","stat_date");--> statement-breakpoint
CREATE INDEX "social_stat_date_idx" ON "product_social_stat" USING btree ("stat_date");--> statement-breakpoint
CREATE INDEX "product_slug_idx" ON "product" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "product_first_seen_idx" ON "product" USING btree ("first_seen_at");--> statement-breakpoint
CREATE UNIQUE INDEX "product_source_url_unique" ON "product" USING btree ("source_url");--> statement-breakpoint
CREATE UNIQUE INDEX "trend_rank_product_period_date_idx" ON "trend_rank" USING btree ("product_id","period_type","stat_date");--> statement-breakpoint
CREATE INDEX "trend_rank_period_date_rank_idx" ON "trend_rank" USING btree ("period_type","stat_date","rank");--> statement-breakpoint
CREATE INDEX "trend_rank_date_score_idx" ON "trend_rank" USING btree ("stat_date","score");