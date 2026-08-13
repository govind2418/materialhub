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

export const allocationStatusEnum = pgEnum("allocation_status", [
  "pending",
  "confirmed",
  "dispatched",
  "delivered",
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
  bio: text("bio"),
  publicProfileEnabled: boolean("public_profile_enabled").default(false).notNull(),
  publicSlug: text("public_slug").unique(),
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
  fscStatus: text("fsc_status"),
  recycledContentPercent: integer("recycled_content_percent"),
  vocRating: text("voc_rating"),
  imageSignature: jsonb("image_signature").$type<{ dHash: string; avgColor: [number, number, number] }>(),
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
  isPublicPortfolio: boolean("is_public_portfolio").default(false).notNull(),
  budget: integer("budget"),
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

export const orderAllocations = pgTable("order_allocations", {
  id: uuid("id").primaryKey().defaultRandom(),
  enquiryItemId: uuid("enquiry_item_id")
    .references(() => enquiryItems.id, { onDelete: "cascade" })
    .notNull(),
  distributorUserId: uuid("distributor_user_id")
    .references(() => users.id)
    .notNull(),
  quantity: integer("quantity").notNull(),
  status: allocationStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

export const guides = pgTable("guides", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  summary: text("summary"),
  content: text("content").notNull(),
  category: text("category"),
  published: boolean("published").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const searchLog = pgTable("search_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  query: text("query"),
  category: text("category"),
  finish: text("finish"),
  collection: text("collection"),
  resultCount: integer("result_count"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const boqUploads = pgTable("boq_uploads", {
  id: uuid("id").primaryKey().defaultRandom(),
  architectUserId: uuid("architect_user_id")
    .references(() => users.id)
    .notNull(),
  filename: text("filename"),
  rows: jsonb("rows").$type<BoqRow[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ExtractedProduct = {
  name: string;
  code: string | null;
  collection: string | null;
  category: string | null;
  woodSpecie: string | null;
  veneerThickness: string | null;
  base: string | null;
  finish: string | null;
  flexibility: string | null;
  weightPerPanel: string | null;
  panelSizes: string[] | null;
  pricePerSheet: number | null;
  certifications: string[] | null;
  fireRating: string | null;
  moistureResistance: string | null;
  maintenanceLevel: string | null;
};

export const catalogExtractions = pgTable("catalog_extractions", {
  id: uuid("id").primaryKey().defaultRandom(),
  manufacturerId: uuid("manufacturer_id")
    .references(() => manufacturers.id, { onDelete: "cascade" })
    .notNull(),
  filename: text("filename"),
  extractedProducts: jsonb("extracted_products").$type<ExtractedProduct[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const premiumMembershipStatusEnum = pgEnum("premium_membership_status", [
  "pending",
  "active",
  "expired",
  "rejected",
]);

export const premiumMemberships = pgTable("premium_memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  status: premiumMembershipStatusEnum("status").default("pending").notNull(),
  amount: integer("amount").default(50000).notNull(),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  activatedAt: timestamp("activated_at"),
  expiresAt: timestamp("expires_at"),
});

export const communityMessages = pgTable("community_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  message: text("message"),
  mediaUrl: text("media_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const directMessages = pgTable("direct_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderId: uuid("sender_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  recipientId: uuid("recipient_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  message: text("message"),
  mediaUrl: text("media_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
