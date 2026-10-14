// One contract for exact database counts and the visible operator queues.
export const operationReviewStates={
  payments:["paid","action_required","disputed"],
  email:["review_required","failed","bounced","deferred"],
  domains:["applying","review_required","rejected"],
} as const;
export function needsOperationReview(queue:keyof typeof operationReviewStates,status:unknown){
  return operationReviewStates[queue].some(value=>value===status);
}
