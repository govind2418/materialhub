import {
  pgTable,
  text,
  timestamp,
  uuid,
  pgEnum,
  jsonb,
  integer,
  boolean,
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

export const enquiryTypeEnum = pgEnum("enquiry_type", [
  "sample_request",
  "rfq",
  "restock",
  "order",
  "general_enquiry",
]);

export const teamMemberRoleEnum = pgEnum("team_member_role", [
  "distributor",
  "sales_rep",
]);

export const teamMemberStatusEnum = pgEnum("team_member_status", [
  "invited",
  "active",
]);

export const approvalStatusEnum = pgEnum("approval_status", [
  "pending",
  "approved",
  "rejected",
  "alternative_requested",
]);

export const sampleStatusEnum = pgEnum("sample_status", [
  "requested",
  "dispatched",
  "delivered",
  "approved",
  "rejected",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "pending",
  "manufacturer_verified",
  "platform_verified",
]);

export const paidStatusEnum = pgEnum("paid_status", ["unpaid", "paid"]);

export const relationTypeEnum = pgEnum("relation_type", [
  "alternative_to",
  "compatible_with",
  "used_with",
  "similar_to",
]);

export const editRequestStatusEnum = pgEnum("edit_request_status", [
  "pending",
  "approved",
  "rejected",
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
  certifications: jsonb("certifications").$type<string[]>(),
  installationGuideUrl: text("installation_guide_url"),
  verificationStatus: verificationStatusEnum("verification_status")
    .default("pending")
    .notNull(),
  pricePerSheet: integer("price_per_sheet"),
  fireRating: text("fire_rating"),
  moistureResistance: text("moisture_resistance"),
  maintenanceLevel: text("maintenance_level"),
  needsReview: boolean("needs_review").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cartItems = pgTable("cart_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  productId: uuid("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  quantity: integer("quantity").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const relatedProducts = pgTable("related_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  relatedProductId: uuid("related_product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  relationType: relationTypeEnum("relation_type").default("alternative_to").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const productEditRequests = pgTable("product_edit_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  proposedChanges: jsonb("proposed_changes").$type<Record<string, unknown>>().notNull(),
  status: editRequestStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
});

export const productVersions = pgTable("product_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const productDistributors = pgTable("product_distributors", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
  distributorUserId: uuid("distributor_user_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  architectUserId: uuid("architect_user_id")
    .references(() => users.id)
    .notNull(),
  name: text("name").notNull(),
  city: text("city"),
  shareToken: text("share_token").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const moodBoards = pgTable("mood_boards", {
  id: uuid("id").primaryKey().defaultRandom(),
  architectUserId: uuid("architect_user_id")
    .references(() => users.id)
    .notNull(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
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
  approvalStatus: approvalStatusEnum("approval_status").default("pending").notNull(),
  productVersionId: uuid("product_version_id").references(() => productVersions.id),
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
  type: enquiryTypeEnum("type").default("sample_request").notNull(),
  rfqId: uuid("rfq_id"),
  sampleStatus: sampleStatusEnum("sample_status"),
  assignedSalesRepUserId: uuid("assigned_sales_rep_user_id").references(() => users.id),
  lastContactedAt: timestamp("last_contacted_at"),
  paidStatus: paidStatusEnum("paid_status").default("unpaid").notNull(),
  quotedPrice: integer("quoted_price"),
  quotedDeliveryDays: integer("quoted_delivery_days"),
  freightCost: integer("freight_cost"),
  paymentTerms: text("payment_terms"),
  validUntil: timestamp("valid_until"),
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
  quantity: integer("quantity").default(1),
  productVersionId: uuid("product_version_id").references(() => productVersions.id),
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
  quantity: integer("quantity"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const manufacturerTeamMembers = pgTable("manufacturer_team_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  manufacturerId: uuid("manufacturer_id")
    .references(() => manufacturers.id, { onDelete: "cascade" })
    .notNull(),
  email: text("email").notNull(),
  userId: uuid("user_id").references(() => users.id),
  role: teamMemberRoleEnum("role").notNull(),
  status: teamMemberStatusEnum("status").default("invited").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectReferences = pgTable("project_references", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  category: text("category"),
  createdByManufacturerId: uuid("created_by_manufacturer_id").references(() => manufacturers.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const projectReferenceProducts = pgTable("project_reference_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectReferenceId: uuid("project_reference_id")
    .references(() => projectReferences.id, { onDelete: "cascade" })
    .notNull(),
  productId: uuid("product_id")
    .references(() => products.id, { onDelete: "cascade" })
    .notNull(),
});

export type BoqRow = {
  description: string;
  quantity: number;
  matchedProductId: string | null;
};

export const boqUploads = pgTable("boq_uploads", {
  id: uuid("id").primaryKey().defaultRandom(),
  architectUserId: uuid("architect_user_id")
    .references(() => users.id)
    .notNull(),
  filename: text("filename"),
  rows: jsonb("rows").$type<BoqRow[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
