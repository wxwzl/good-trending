CREATE TYPE "public"."crawler_status" AS ENUM('RUNNING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('X_PLATFORM', 'AMAZON');--> statement-breakpoint
CREATE TABLE "crawler_log" (
	"id" text PRIMARY KEY NOT NULL,
	"source_type" "source_type" NOT NULL,
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
CREATE TABLE "product_history" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"date" date NOT NULL,
	"price" numeric(10, 2),
	"rank" integer,
	"sales_count" integer,
	"review_count" integer,
	"rating" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_tag" (
	"product_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "product_tag_product_id_tag_id_pk" PRIMARY KEY("product_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "product_topic" (
	"product_id" text NOT NULL,
	"topic_id" text NOT NULL,
	CONSTRAINT "product_topic_product_id_topic_id_pk" PRIMARY KEY("product_id","topic_id")
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"image" text,
	"price" numeric(10, 2),
	"currency" text DEFAULT 'USD' NOT NULL,
	"source_url" text NOT NULL,
	"source_id" text NOT NULL,
	"source_type" "source_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_source_url_unique" UNIQUE("source_url")
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "tag_name_unique" UNIQUE("name"),
	CONSTRAINT "tag_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "topic" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "topic_name_unique" UNIQUE("name"),
	CONSTRAINT "topic_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "trend" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"date" date NOT NULL,
	"rank" integer NOT NULL,
	"score" real NOT NULL,
	"mentions" integer DEFAULT 0 NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"source_data" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_history" ADD CONSTRAINT "product_history_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_tag" ADD CONSTRAINT "product_tag_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_tag" ADD CONSTRAINT "product_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_topic" ADD CONSTRAINT "product_topic_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_topic" ADD CONSTRAINT "product_topic_topic_id_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topic"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trend" ADD CONSTRAINT "trend_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crawler_log_source_created_idx" ON "crawler_log" USING btree ("source_type","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "product_history_product_date_idx" ON "product_history" USING btree ("product_id","date");--> statement-breakpoint
CREATE INDEX "product_source_idx" ON "product" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "product_created_at_idx" ON "product" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "tag_slug_idx" ON "tag" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "topic_slug_idx" ON "topic" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "trend_product_date_idx" ON "trend" USING btree ("product_id","date");--> statement-breakpoint
CREATE INDEX "trend_date_rank_idx" ON "trend" USING btree ("date","rank");--> statement-breakpoint
CREATE INDEX "trend_date_score_idx" ON "trend" USING btree ("date","score");