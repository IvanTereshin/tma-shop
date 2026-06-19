/** Minimal Telegram Bot API client covering the methods the shop needs. */

export interface LabeledPrice {
  label: string;
  amount: number;
}

export interface CreateInvoiceLinkParams {
  title: string;
  description: string;
  payload: string;
  currency: string;
  prices: LabeledPrice[];
  /** Empty string for Telegram Stars (XTR). */
  providerToken?: string;
}

interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

export class TelegramApi {
  constructor(
    private readonly botToken: string,
    private readonly baseUrl = 'https://api.telegram.org',
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async call<T>(method: string, body: unknown): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}/bot${this.botToken}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as TelegramResponse<T>;
    if (!data.ok || data.result === undefined) {
      throw new Error(`Telegram ${method} failed: ${data.description ?? res.statusText}`);
    }
    return data.result;
  }

  /** Returns an invoice link suitable for `WebApp.openInvoice`. */
  createInvoiceLink(params: CreateInvoiceLinkParams): Promise<string> {
    return this.call<string>('createInvoiceLink', {
      title: params.title,
      description: params.description,
      payload: params.payload,
      currency: params.currency,
      prices: params.prices,
      provider_token: params.providerToken ?? '',
    });
  }

  answerPreCheckoutQuery(
    preCheckoutQueryId: string,
    ok: boolean,
    errorMessage?: string,
  ): Promise<true> {
    return this.call<true>('answerPreCheckoutQuery', {
      pre_checkout_query_id: preCheckoutQueryId,
      ok,
      ...(errorMessage ? { error_message: errorMessage } : {}),
    });
  }
}
