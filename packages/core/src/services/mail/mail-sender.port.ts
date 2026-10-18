/** A plain-text message; HTML mail is out of scope until a provider is chosen (spec › Q3). */
export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Port for outgoing e-mail (engineering standards › Dependency Inversion). Services depend on this
 * interface; the adapter is chosen by MAIL_ADAPTER in the container. A rejected `send` means the
 * message did not leave — callers treat it as "not sent".
 */
export interface MailSender {
  send(message: MailMessage): Promise<void>;
}
