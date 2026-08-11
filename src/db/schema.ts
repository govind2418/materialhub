import {
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "manufacturer",
  "architect",
  "distributor",
  "retailer",
  "sales_rep",
]);

export const enquiryStatusEnum = pgEnum("enquiry_status", [
  "new",
  "responded",
  "closed",
]);

export const stockStatusEnum = pgEnum("stock_status", [
  "in_stock",
  "low_stock",
  "out_of_stock",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").notNull().unique(),
  role: userRoleEnum("role").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  companyName: text("company_name"),
  phone: text("phone"),
  city: text("city"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const manufacturers = pgTable("manufacturers", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  ownerUserId: uuid("owner_user_id").references(() => users.id),
  logoUrl: text("logo_url"),
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  city: text("city"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  manufacturerId: uuid("manufacturer_id")
    .references(() => manufacturers.id)
    .notNull(),
  name: text("name").notNull(),
  code: text("code"),
  collection: text("collection"),
  category: text("category"),
  woodSpecie: text("wood_specie"),
  veneerThickness: text("veneer_thickness"),
  base: text("base"),
  finish: text("finish"),
  flexibility: text("flexibility"),
  weightPerPanel: text("weight_per_panel"),
  panelSizes: jsonb("panel_sizes").$type<string[]>(),
  imageUrl: text("image_url").notNull(),
  viewCount: integer("view_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const moodBoards = pgTable("mood_boards", {
  id: uuid("id").primaryKey().defaultRandom(),
  architectUserId: uuid("architect_user_id")
    .references(() => users.id)
    .notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const moodBoardItems = pgTable("mood_board_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  moodBoardId: uuid("mood_board_id")
    .references(() => moodBoards.id, { onDelete: "cascade" })
    .notNull(),
  productId: uuid("product_id")
    .references(() => products.id)
    .notNull(),
  note: text("note"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const enquiries = pgTable("enquiries", {
  id: uuid("id").primaryKey().defaultRandom(),
  architectUserId: uuid("architect_user_id")
    .references(() => users.id)
    .notNull(),
  manufacturerId: uuid("manufacturer_id")
    .references(() => manufacturers.id)
    .notNull(),
  moodBoardId: uuid("mood_board_id").references(() => moodBoards.id),
  message: text("message"),
  status: enquiryStatusEnum("status").default("new").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const enquiryItems = pgTable("enquiry_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  enquiryId: uuid("enquiry_id")
    .references(() => enquiries.id, { onDelete: "cascade" })
    .notNull(),
  productId: uuid("product_id")
    .references(() => products.id)
    .notNull(),
});

export const distributorInventory = pgTable("distributor_inventory", {
  id: uuid("id").primaryKey().defaultRandom(),
  distributorUserId: uuid("distributor_user_id")
    .references(() => users.id)
    .notNull(),
  productId: uuid("product_id")
    .references(() => products.id)
    .notNull(),
  status: stockStatusEnum("status").default("in_stock").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
