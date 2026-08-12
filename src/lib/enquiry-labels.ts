export const ENQUIRY_TYPE_LABEL: Record<string, string> = {
  rfq: "RFQ",
  restock: "Restock",
  order: "Order",
  general_enquiry: "Enquiry",
  sample_request: "Sample",
};

export function enquiryTypeLabel(type: string) {
  return ENQUIRY_TYPE_LABEL[type] ?? "Sample";
}
