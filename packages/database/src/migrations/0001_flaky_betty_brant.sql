CREATE TABLE "stocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"category" varchar(100),
	"quantity" integer DEFAULT 0,
	"price" real,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "growth_references" (
	"id" serial PRIMARY KEY NOT NULL,
	"months" integer NOT NULL,
	"gender" varchar(1) NOT NULL,
	"ideal_height_cm" numeric(5, 2),
	"ideal_weight_kg" numeric(5, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "courier_masters" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"contact_person" varchar(255),
	"phone" varchar(50),
	"tracking_url" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"detail" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dispensaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"password" text,
	"gender" varchar(20) DEFAULT 'Male',
	"mobile" varchar(50),
	"mobile2" varchar(50),
	"location" varchar(255),
	"city" varchar(100),
	"address" text,
	"about" text,
	"designation" varchar(100),
	"dept" varchar(100),
	"date_birth" date,
	"contact_number" varchar(50),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"ques" text NOT NULL,
	"detail" text,
	"ans" text NOT NULL,
	"display_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "case_frequency" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"frequency" text,
	"duration" varchar(255),
	"days" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "medicines" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"disease" text,
	"potency_id" integer,
	"type" varchar(100),
	"category" varchar(100),
	"price" real DEFAULT 0,
	"stock_level" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pdf_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_name" varchar(255) NOT NULL,
	"header_html" text,
	"footer_html" text,
	"margin" varchar(100),
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "potencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"detail" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referral_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(100),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "static_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "static_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "stickers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"detail" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "gender";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "mobile";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "city";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "address";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "about";--> statement-breakpoint
ALTER TABLE "appointments" DROP COLUMN "clinic_id";--> statement-breakpoint
ALTER TABLE "appointments" DROP COLUMN "assistant_doctor";--> statement-breakpoint
ALTER TABLE "case_datas" DROP COLUMN "age";--> statement-breakpoint
ALTER TABLE "case_datas" DROP COLUMN "blood_group";--> statement-breakpoint
ALTER TABLE "case_datas" DROP COLUMN "reference_type";--> statement-breakpoint
ALTER TABLE "case_datas" DROP COLUMN "abha_id";