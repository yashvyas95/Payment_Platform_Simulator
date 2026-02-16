export interface PaymentGatewayInterface {
  processPayment(request: PaymentRequest): Promise<PaymentResponse>;
  refundPayment(transactionId: string, amount: number): Promise<RefundResponse>;
  capturePayment(transactionId: string, amount: number): Promise<CaptureResponse>;
  getPaymentStatus(transactionId: string): Promise<PaymentStatusResponse>;
  verify3DSecure(data: ThreeDSecureData): Promise<ThreeDSecureResponse>;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  cardNumber: string;
  expMonth: number;
  expYear: number;
  cvv: string;
  cardholderName?: string;
  description?: string;
  metadata?: Record<string, any>;
  require3DSecure?: boolean;
  merchantId?: string;
  customerId?: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  authorizationCode?: string;
  status: string;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  threeDSecureRequired?: boolean;
  threeDSecureUrl?: string;
}

export interface RefundResponse {
  success: boolean;
  refundId: string;
  amount: number;
  status: string;
  errorMessage?: string;
}

export interface CaptureResponse {
  success: boolean;
  transactionId: string;
  capturedAmount: number;
  status: string;
}

export interface PaymentStatusResponse {
  transactionId: string;
  status: string;
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
}

export interface ThreeDSecureData {
  transactionId: string;
  paRes?: string;
  md?: string;
  authenticationValue?: string;
}

export interface ThreeDSecureResponse {
  success: boolean;
  authenticated: boolean;
  eci?: string;
  cavv?: string;
  xid?: string;
  status: string;
}

export enum PaymentGatewayType {
  STRIPE = 'STRIPE',
  PAYPAL = 'PAYPAL',
  RAZORPAY = 'RAZORPAY',
  SIMULATOR = 'SIMULATOR',
}
