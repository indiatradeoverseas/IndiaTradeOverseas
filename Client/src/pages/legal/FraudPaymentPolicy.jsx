import React from "react";

const FraudPaymentPolicy = () => {
  return (
    <div className="min-h-screen bg-white text-gray-800 pt-12">
      <div className="absolute top-0 left-0 right-0 h-20 bg-black/55 backdrop-blur-sm z-40 pointer-events-none" />
      {/* Header */}
      <section className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Fraud & Payment Policy
          </h1>

          <p className="mt-4 text-gray-600 leading-7">
            This Fraud & Payment Policy explains how INDIA TRADE OVERSEAS
            ("Company", "we", "us", or "our") handles payment-related
            communications and provides guidance to help customers, suppliers,
            business partners, and other users protect themselves from
            fraudulent payment requests and impersonation attempts.
          </p>

          <p className="mt-3 text-sm text-gray-500">
            Last Updated: 03 September 2026
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 1. Purpose */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            1. Purpose of This Policy
          </h2>

          <p className="leading-7">
            INDIA TRADE OVERSEAS is committed to maintaining secure and
            transparent business and payment processes. Because payment fraud,
            phishing, impersonation, and unauthorized changes to payment
            instructions can occur in business transactions, customers and
            business partners should carefully verify payment-related
            communications before transferring funds.
          </p>

          <p className="mt-4 leading-7">
            This policy provides general precautions and procedures for
            identifying and responding to suspicious payment requests
            associated with our business.
          </p>
        </section>

        {/* 2. Authorized Payment Channels */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            2. Authorized Payment Channels
          </h2>

          <p className="leading-7">
            Payments should only be made through payment methods and bank
            account details officially communicated or confirmed by
            India Trade Overseas.
          </p>

          <p className="mt-4 leading-7">
            Before making a payment, customers, buyers, suppliers, or business
            partners should verify the relevant payment information against
            official transaction documents, quotations, invoices, purchase
            orders, contracts, or other authorized communications.
          </p>

          <p className="mt-4 leading-7">
            If you receive a request to make a payment to a new or different
            bank account, you should independently verify the request with our
            authorized representative before transferring any funds.
          </p>
        </section>

        {/* 3. Payment Verification */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            3. Verify Payment Requests
          </h2>

          <p className="leading-7">
            Please carefully review any payment request received in connection
            with our products, services, quotations, orders, invoices, or
            commercial transactions.
          </p>

          <p className="mt-4 leading-7">
            You should verify the following before making a payment:
          </p>

          <ul className="mt-4 list-disc pl-6 space-y-2 leading-7">
            <li>
              The identity of the person or representative requesting payment.
            </li>
            <li>
              The company name and contact details mentioned in the
              communication.
            </li>
            <li>
              The invoice, quotation, purchase order, or transaction reference.
            </li>
            <li>
              The beneficiary name and bank account details.
            </li>
            <li>
              Any change to previously communicated payment instructions.
            </li>
            <li>
              The amount, currency, payment purpose, and applicable transaction
              terms.
            </li>
          </ul>

          <p className="mt-4 leading-7">
            If anything appears unusual or inconsistent, do not proceed with
            the payment until the information has been independently verified.
          </p>
        </section>

        {/* 4. Bank Detail Changes */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            4. Changes to Bank Account Details
          </h2>

          <p className="leading-7">
            Fraudsters may attempt to impersonate employees, representatives,
            suppliers, or business partners and request that payments be sent
            to a different bank account.
          </p>

          <p className="mt-4 leading-7">
            Any request involving a change in bank account details, beneficiary
            information, payment instructions, or other material financial
            information should be independently verified through an official
            communication channel before payment.
          </p>

          <p className="mt-4 leading-7">
            Do not rely solely on an email, WhatsApp message, SMS, phone call,
            or other communication requesting an urgent change in payment
            details.
          </p>
        </section>

        {/* 5. Information Never to Share */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            5. Sensitive Payment Information
          </h2>

          <p className="leading-7">
            You should never disclose sensitive banking, payment, or account
            security information to an unknown or unauthorized person claiming
            to represent the Company.
          </p>

          <p className="mt-4 leading-7">
            In particular, do not share:
          </p>

          <ul className="mt-4 list-disc pl-6 space-y-2 leading-7">
            <li>OTP or one-time passwords.</li>
            <li>ATM, debit card, or credit card PINs.</li>
            <li>CVV or card security codes.</li>
            <li>Internet banking passwords.</li>
            <li>UPI PINs.</li>
            <li>Login passwords or authentication credentials.</li>
            <li>Banking or payment account security information.</li>
          </ul>

          <p className="mt-4 leading-7">
            We will not require you to disclose confidential authentication
            credentials such as your banking password, UPI PIN, card PIN, or
            OTP for the purpose of receiving a payment or completing a normal
            commercial enquiry.
          </p>
        </section>

        {/* 6. Fraud Warning Signs */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            6. Common Warning Signs of Fraud
          </h2>

          <p className="leading-7">
            The following circumstances may indicate a potentially fraudulent
            communication:
          </p>

          <ul className="mt-4 list-disc pl-6 space-y-2 leading-7">
            <li>
              Unexpected requests for urgent or immediate payment.
            </li>
            <li>
              Requests to transfer funds to an unfamiliar bank account.
            </li>
            <li>
              Sudden changes to previously confirmed bank details.
            </li>
            <li>
              Requests for OTPs, PINs, passwords, CVV numbers, or other
              confidential credentials.
            </li>
            <li>
              Messages containing suspicious links or attachments.
            </li>
            <li>
              Communications from unfamiliar email addresses or phone numbers
              claiming to represent the Company.
            </li>
            <li>
              Requests to bypass normal invoicing or verification procedures.
            </li>
            <li>
              Pressure, threats, or unusual urgency intended to prevent proper
              verification.
            </li>
            <li>
              Payment requests that do not match the relevant quotation,
              invoice, purchase order, or agreement.
            </li>
          </ul>
        </section>

        {/* 7. Official Communication */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            7. Official Communications
          </h2>

          <p className="leading-7">
            Business and payment-related communications should be verified
            through the official contact details published by India Trade Overseas.
          </p>

          <p className="mt-4 leading-7">
            If you receive a suspicious communication that appears to use our
            company name, logo, employee identity, email address, or other
            business information, please do not immediately respond, click
            links, open attachments, or make any payment.
          </p>

          <p className="mt-4 leading-7">
            Instead, contact us using the official contact information provided
            on our website or in previously verified business documentation.
          </p>
        </section>

        {/* 8. Payment Confirmation */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            8. Payment Confirmation
          </h2>

          <p className="leading-7">
            A payment request, payment instruction, or invoice does not by
            itself constitute confirmation that an order has been accepted,
            processed, dispatched, or completed.
          </p>

          <p className="mt-4 leading-7">
            Customers should retain appropriate payment records and wait for
            official confirmation from the Company regarding the applicable
            transaction, order, service, or delivery status.
          </p>

          <p className="mt-4 leading-7">
            Payment confirmation may be subject to verification and
            reconciliation with our financial and transaction records.
          </p>
        </section>

        {/* 9. What to Do If Fraud is Suspected */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            9. What to Do If You Suspect Fraud
          </h2>

          <p className="leading-7">
            If you believe that you have received a fraudulent payment request
            or have interacted with someone impersonating India Trade Overseas,
            take the following steps:
          </p>

          <ol className="mt-4 list-decimal pl-6 space-y-2 leading-7">
            <li>Do not make any further payment.</li>
            <li>Do not share OTPs, PINs, passwords, or banking credentials.</li>
            <li>
              Do not click suspicious links or download unknown attachments.
            </li>
            <li>
              Preserve relevant emails, messages, invoices, payment
              instructions, screenshots, and transaction information.
            </li>
            <li>
              Contact India Trade Overseas using an independently verified
              official contact channel.
            </li>
            <li>
              If money has already been transferred, immediately contact your
              bank or payment service provider and follow their fraud-reporting
              procedure.
            </li>
            <li>
              Where appropriate, report suspected financial fraud to the
              relevant law-enforcement or cybercrime authorities.
            </li>
          </ol>
        </section>

        {/* 10. Unauthorized Communications */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            10. Unauthorized or Fraudulent Communications
          </h2>

          <p className="leading-7">
            India Trade Overseas is not responsible for communications,
            payment instructions, bank details, invoices, quotations, or
            requests originating from unauthorized persons or fraudulent
            accounts impersonating the Company.
          </p>

          <p className="mt-4 leading-7">
            Customers and business partners are responsible for exercising
            reasonable care and verifying payment instructions before
            transferring funds.
          </p>
        </section>

        {/* 11. Third Party Payment Providers */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            11. Third-Party Payment Providers
          </h2>

          <p className="leading-7">
            Where payments are processed through banks, payment gateways,
            financial institutions, or other third-party service providers,
            those providers may have their own terms, privacy policies, fraud
            prevention procedures, and security requirements.
          </p>

          <p className="mt-4 leading-7">
            Customers should review the applicable terms and security guidance
            provided by the relevant payment provider before completing a
            transaction.
          </p>
        </section>

        {/* 12. Company Contact */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            12. Reporting a Suspicious Payment Request
          </h2>

          <p className="leading-7">
            If you receive a suspicious payment request or believe that
            someone is impersonating our Company, please contact us promptly
            using the following verified contact information:
          </p>

          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-6 space-y-3">
            <p>
              <strong>Company:</strong> India Trade Overseas
            </p>

            <p>
              <strong>Official Email:</strong> info@indiatradeoverseas@gmail.com
            </p>

            <p>
              <strong>Official Phone:</strong> 01169262028
            </p>

            <p>
              <strong>Registered Office:</strong> Vill-Deramari,Tola-Maujabari Panch-Deramari,Block-Khochadham Dist-Kishanganj, Bihar, 855107
            </p>
          </div>
        </section>

        {/* 13. No Guarantee */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            13. No Guarantee Against Fraud
          </h2>

          <p className="leading-7">
            While we take reasonable measures to protect our business
            communications and payment processes, no communication system,
            electronic transmission, or online transaction can be guaranteed to
            be completely secure.
          </p>

          <p className="mt-4 leading-7">
            Customers and business partners should independently verify
            payment-related information and remain alert to potential fraud,
            phishing, impersonation, and other security risks.
          </p>
        </section>

        {/* 14. Policy Updates */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            14. Changes to This Policy
          </h2>

          <p className="leading-7">
            We may update this Fraud & Payment Policy from time to time to
            reflect changes in our business processes, payment procedures,
            security practices, legal requirements, or other operational
            requirements.
          </p>

          <p className="mt-4 leading-7">
            Any updated version will be published on this website with a
            revised "Last Updated" date.
          </p>
        </section>

        {/* 15. Governing Law */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            15. Governing Law
          </h2>

          <p className="leading-7">
            This policy shall be interpreted in accordance with the applicable
            laws of India and, where applicable, the laws governing the
            Company's commercial transactions and operations.
          </p>

          <p className="mt-4 leading-7">
            Any dispute relating to this policy shall be subject to the
            jurisdiction of the competent courts at <strong>KISHANGANJ / BIHAR</strong>, unless otherwise agreed in a valid written
            commercial agreement.
          </p>
        </section>

        {/* 16. Contact */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            16. Contact Us
          </h2>

          <p className="leading-7">
            For questions regarding this Fraud & Payment Policy or to verify a
            payment-related communication, please contact:
          </p>

          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-6 space-y-3">
            <p>
              <strong>India Trade Overseas</strong>
            </p>

            <p>Vill-Deramari,Tola-Maujabari Panch-Deramari,Block-Khochadham Dist -
                Kishanganj, Bihar, 855107</p>

            <p>
              Email:{" "}
              <a
                href="mailto:info@indiatradeoverseas.com"
                className="text-blue-600 hover:underline"
              >
                info@indiatradeoverseas.com
              </a>
            </p>

            <p>
              Phone: 01169262028
            </p>

            <p>
              Attention: [Md. Ramiz Raza Khan / Founder / CEO]
            </p>
          </div>
        </section>

        {/* Related Policies */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Related Policies
          </h2>

          <p className="leading-7">
            Please also review our other legal policies:
          </p>

          <ul className="mt-4 list-disc pl-6 space-y-2 leading-7">
            <li>
              <a
                href="/privacy-policy"
                className="text-blue-600 hover:underline"
              >
                Privacy Policy
              </a>
            </li>

            <li>
              <a href="/terms" className="text-blue-600 hover:underline">
                Terms & Conditions
              </a>
            </li>

            <li>
              <a
                href="/disclaimer"
                className="text-blue-600 hover:underline"
              >
                Disclaimer
              </a>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
};

export default FraudPaymentPolicy;