import type { Order } from "@/types";

const REFUND_CREATE_MUTATION = `
  mutation RefundCreate($input: RefundInput!) {
    refundCreate(input: $input) {
      refund {
        id
        note
        totalRefundedSet {
          presentmentMoney {
            amount
            currencyCode
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export interface RefundParams {
  orderId: string;
  lineItems: { lineItemId: string; quantity: number }[];
  note: string;
  restock: boolean;
  refundShipping: boolean;
}

export interface RefundResult {
  success: boolean;
  refundId: string | null;
  amount: number;
  error: string | null;
}

export async function processRefund(
  admin: any,
  params: RefundParams
): Promise<RefundResult> {
  try {
    const variables = {
      input: {
        orderId: params.orderId,
        note: params.note,
        refundLineItems: params.lineItems.map((li) => ({
          lineItemId: li.lineItemId,
          quantity: li.quantity,
          restockType: params.restock ? "RESTOCK" : "NO_RESTOCK",
        })),
        shipping: params.refundShipping
          ? { fullRefund: true }
          : undefined,
      },
    };

    const response = await admin.graphql(REFUND_CREATE_MUTATION, {
      variables,
    });

    const body = await response.json();

    if (body.data?.refundCreate?.userErrors?.length > 0) {
      const errors = body.data.refundCreate.userErrors;
      return {
        success: false,
        refundId: null,
        amount: 0,
        error: errors.map((e: any) => e.message).join(", "),
      };
    }

    const refund = body.data?.refundCreate?.refund;
    if (!refund) {
      return {
        success: false,
        refundId: null,
        amount: 0,
        error: "No refund data returned",
      };
    }

    return {
      success: true,
      refundId: refund.id,
      amount: parseFloat(refund.totalRefundedSet?.presentmentMoney?.amount || "0"),
      error: null,
    };
  } catch (error: any) {
    return {
      success: false,
      refundId: null,
      amount: 0,
      error: error.message || "Failed to process refund",
    };
  }
}

export async function getOrderRefunds(
  admin: any,
  orderId: string
): Promise<any[]> {
  const query = `
    query GetOrderRefunds($id: ID!) {
      order(id: $id) {
        refunds(first: 25) {
          edges {
            node {
              id
              createdAt
              note
              totalRefundedSet {
                presentmentMoney {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    }
  `;

  const response = await admin.graphql(query, {
    variables: { id: orderId },
  });

  const body = await response.json();
  return body.data?.order?.refunds?.edges?.map((e: any) => e.node) || [];
}
