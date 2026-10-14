import {it,expect} from "vitest";
import {needsOperationReview} from "@/lib/portal/operation-review";
it("keeps paid orders awaiting execution in payment review",()=>{
  expect(needsOperationReview("payments","paid")).toBe(true);
  expect(needsOperationReview("payments","disputed")).toBe(true);
  expect(needsOperationReview("payments","declined")).toBe(false);
});
it("doesn't treat provider acceptance as an email failure or delivery",()=>{
  for(const status of ["accepted","delivered",undefined])expect(needsOperationReview("email",status)).toBe(false);
  expect(needsOperationReview("email","review_required")).toBe(true);
});
