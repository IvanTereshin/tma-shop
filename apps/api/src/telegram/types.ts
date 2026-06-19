/** Subset of Telegram Update fields relevant to the Stars payment flow. */
export interface SuccessfulPayment {
  currency: string;
  total_amount: number;
  invoice_payload: string;
  telegram_payment_charge_id: string;
  provider_payment_charge_id?: string;
}

export interface PreCheckoutQuery {
  id: string;
  from: { id: number };
  currency: string;
  total_amount: number;
  invoice_payload: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    successful_payment?: SuccessfulPayment;
  };
  pre_checkout_query?: PreCheckoutQuery;
}
