import React from "react";
import { Link } from "react-router-dom";

const Terms = () => {
  return (
    <div className="min-h-screen bg-white text-gray-800 pt-12">
      <div className="absolute top-0 left-0 right-0 h-20 bg-black/55 backdrop-blur-sm z-40 pointer-events-none" />
      {/* Page Header */}
      <section className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Terms & Conditions
          </h1>

          <p className="mt-4 max-w-3xl text-gray-600 leading-7">
            These Terms & Conditions govern your access to and use of the
            India Trade Overseas website and the information and services
            provided through it.
          </p>

          <p className="mt-4 text-sm text-gray-500">
            Last Updated: 03 September 2026
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-10 leading-7">

          {/* 1. Acceptance */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              1. Acceptance of Terms
            </h2>

            <p>
              These Terms & Conditions ("Terms") govern your access to and use
              of the website operated by India Trade Overseas, under{" "}
              <strong>INDIA TRADE OVERSEAS</strong> ("India Trade Overseas",
              "ITO", "we", "us", or "our").
            </p>

            <p className="mt-4">
              By accessing, browsing, or using this website, you acknowledge
              that you have read, understood, and agreed to be bound by these
              Terms and any applicable policies referenced on this website.
            </p>

            <p className="mt-4">
              If you do not agree with these Terms, please do not use the
              website.
            </p>
          </section>

          {/* 2. Website Use */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              2. Website Use
            </h2>

            <p>
              The website is provided primarily for general information,
              business communication, product and service enquiries, and
              commercial interaction with India Trade Overseas.
            </p>

            <p className="mt-4">
              You agree to use the website only for lawful purposes and in a
              manner that does not violate applicable laws, regulations, or the
              rights of India Trade Overseas or any third party.
            </p>

            <p className="mt-4">
              You must not:
            </p>

            <ul className="mt-4 list-disc pl-6 space-y-2">
              <li>
                Use the website for any unlawful, fraudulent, or unauthorized
                purpose.
              </li>
              <li>
                Attempt to gain unauthorized access to the website, its
                systems, servers, databases, or other resources.
              </li>
              <li>
                Introduce malicious code, viruses, malware, or other harmful
                material.
              </li>
              <li>
                Interfere with the security, availability, or operation of the
                website.
              </li>
              <li>
                Use automated systems or methods to scrape, copy, or extract
                website content without authorization.
              </li>
              <li>
                Misrepresent your identity, organization, or authority.
              </li>
              <li>
                Use information obtained from the website for unlawful or
                unauthorized purposes.
              </li>
            </ul>
          </section>

          {/* 3. Website Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              3. Website Information
            </h2>

            <p>
              We make reasonable efforts to keep the information presented on
              the website accurate and useful. However, website content may
              change from time to time and may not always reflect the latest
              commercial, operational, product, pricing, or availability
              information.
            </p>

            <p className="mt-4">
              Information published on the website should not be treated as a
              guarantee that a particular product, service, specification,
              quantity, price, or delivery arrangement will be available.
            </p>

            <p className="mt-4">
              Users should contact India Trade Overseas directly to confirm
              current commercial information before making business decisions.
            </p>
          </section>

          {/* 4. Products and Services */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              4. Products and Services
            </h2>

            <p>
              India Trade Overseas may provide information relating to products
              and services including, where applicable, trade, supply,
              sourcing, export, logistics, transportation, and other business
              activities.
            </p>

            <p className="mt-4">
              Product descriptions, specifications, images, documents,
              quantities, quality information, availability, delivery
              arrangements, and other details displayed on the website are
              provided for general informational and business-enquiry purposes.
            </p>

            <p className="mt-4">
              Actual product or service terms may vary depending on the
              applicable transaction, supplier, customer requirements,
              destination, logistics arrangements, regulatory requirements,
              commercial negotiations, and written agreements between the
              relevant parties.
            </p>
          </section>

          {/* 5. Enquiries and Quotations */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              5. Enquiries and Quotations
            </h2>

            <p>
              Users may submit enquiries or quotation requests through forms or
              other communication channels available on the website.
            </p>

            <p className="mt-4">
              Submission of an enquiry or quotation request does not
              automatically create a confirmed order, purchase agreement,
              contract, or other binding commercial commitment.
            </p>

            <p className="mt-4">
              Any quotation provided by India Trade Overseas may be subject to
              availability, product specifications, quantity, destination,
              transportation, taxes, duties, payment terms, validity period,
              regulatory requirements, and other applicable commercial
              conditions.
            </p>

            <p className="mt-4">
              A quotation should not be treated as final acceptance of an order
              unless expressly confirmed by an authorized representative of
              India Trade Overseas in accordance with the applicable commercial
              process.
            </p>
          </section>

          {/* 6. Orders and Commercial Agreements */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              6. Orders and Commercial Agreements
            </h2>

            <p>
              Any purchase, sale, supply, export, logistics, transportation, or
              other commercial transaction shall be governed by the specific
              terms agreed between the relevant parties.
            </p>

            <p className="mt-4">
              Where applicable, a transaction may require written confirmation,
              purchase orders, invoices, agreements, shipping documents, or
              other commercial documentation.
            </p>

            <p className="mt-4">
              In the event of any conflict between these website Terms and a
              specific written commercial agreement, the applicable commercial
              agreement shall govern the relevant transaction to the extent
              permitted by law.
            </p>
          </section>

          {/* 7. Pricing, Taxes and Charges */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              7. Pricing, Taxes and Other Charges
            </h2>

            <p>
              Prices or price-related information displayed or communicated
              through the website may be subject to change and may depend on
              product specifications, quantity, destination, market conditions,
              transportation, logistics, taxes, duties, applicable charges,
              and other commercial factors.
            </p>

            <p className="mt-4">
              Unless expressly stated otherwise in a written quotation or
              commercial agreement, website prices should not be interpreted as
              final transaction prices.
            </p>

            <p className="mt-4">
              Applicable taxes, duties, transportation costs, handling charges,
              customs charges, or other costs may apply depending on the nature
              and destination of the transaction.
            </p>
          </section>

          {/* 8. Payment Terms */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              8. Payment Terms
            </h2>

            <p>
              Payment terms for a transaction will be determined according to
              the applicable quotation, invoice, purchase order, agreement, or
              other written commercial arrangement.
            </p>

            <p className="mt-4">
              Customers should make payments only through authorized payment
              channels communicated by India Trade Overseas.
            </p>

            <p className="mt-4">
              India Trade Overseas will not ask customers to disclose sensitive
              authentication credentials such as OTPs, PINs, CVVs, passwords,
              or banking credentials through ordinary communication channels.
            </p>

            <p className="mt-4">
              Customers should independently verify any unexpected request for
              payment, changes to bank details, or other payment instructions
              before transferring funds.
            </p>

            <p className="mt-4">
            Please refer to our{" "}
            <strong>
              <Link
                to="/fraud-payment-policy"
                className="underline hover:no-underline"
              >
                Fraud & Payment Policy
              </Link>
            </strong>{" "}
            for additional payment security guidance.
            </p>
          </section>

          {/* 9. Intellectual Property */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              9. Intellectual Property
            </h2>

            <p>
              Unless otherwise stated, the website and its content, including
              text, graphics, logos, images, designs, layouts, documents,
              branding, software, and other materials, are owned by or
              licensed to India Trade Overseas and are protected by applicable
              intellectual-property laws.
            </p>

            <p className="mt-4">
              You may access and use website content for legitimate personal or
              business enquiry purposes. You must not reproduce, distribute,
              modify, publish, transmit, sell, commercially exploit, or create
              derivative works from website content without prior written
              authorization, except where permitted by applicable law.
            </p>
          </section>

          {/* 10. Third Party Services */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              10. Third-Party Websites and Services
            </h2>

            <p>
              The website may contain links to third-party websites, services,
              platforms, payment providers, applications, or other external
              resources.
            </p>

            <p className="mt-4">
              Such third-party services operate independently and may be
              governed by their own terms, privacy policies, and other
              conditions.
            </p>

            <p className="mt-4">
              India Trade Overseas does not control and is not responsible for
              the content, availability, security, policies, or practices of
              third-party websites or services.
            </p>
          </section>

          {/* 11. User Submitted Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              11. Information Submitted by Users
            </h2>

            <p>
              When submitting information through our website, you represent
              that the information provided by you is accurate, complete, and
              provided lawfully.
            </p>

            <p className="mt-4">
              You should not submit confidential, sensitive, proprietary, or
              third-party information unless you are authorized to provide
              such information and the submission is necessary for the relevant
              business purpose.
            </p>
          </section>

          {/* 12. Availability */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              12. Website Availability
            </h2>

            <p>
              We aim to keep the website available and operational, but we do
              not guarantee that the website will always be uninterrupted,
              error-free, secure, or available at all times.
            </p>

            <p className="mt-4">
              Website availability may be affected by maintenance, technical
              issues, internet connectivity, hosting problems, security
              incidents, third-party services, or circumstances beyond our
              reasonable control.
            </p>
          </section>

          {/* 13. Disclaimer of Warranties */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              13. Disclaimer of Warranties
            </h2>

            <p>
              The website and its content are provided on an "as available" and
              "as is" basis to the extent permitted by applicable law.
            </p>

            <p className="mt-4">
              We do not guarantee that all website information will always be
              complete, accurate, current, uninterrupted, or free from errors.
            </p>

            <p className="mt-4">
              Information published on the website does not constitute a
              guarantee, warranty, promise, or binding representation regarding
              product quality, availability, pricing, delivery, performance,
              suitability, or any particular commercial outcome unless expressly
              confirmed in a written agreement.
            </p>
          </section>

          {/* 14. Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              14. Limitation of Liability
            </h2>

            <p>
              To the maximum extent permitted by applicable law, India Trade
              Overseas and its authorized representatives shall not be liable
              for indirect, incidental, consequential, special, or punitive
              losses arising from or related to the use of, or inability to
              use, the website or its information.
            </p>

            <p className="mt-4">
              This includes, where legally permissible, losses arising from
              reliance on website information, temporary website
              unavailability, technical interruptions, third-party services,
              unauthorized access, or other circumstances beyond our reasonable
              control.
            </p>

            <p className="mt-4">
              Nothing in these Terms is intended to exclude or limit liability
              that cannot legally be excluded or limited under applicable law.
            </p>
          </section>

          {/* 15. Indemnification */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              15. Indemnification
            </h2>

            <p>
              To the extent permitted by applicable law, you agree to
              indemnify and hold harmless India Trade Overseas, its
              representatives, employees, and authorized personnel from claims,
              losses, liabilities, damages, costs, or expenses arising from
              your unlawful use of the website, violation of these Terms, or
              infringement of the rights of another party.
            </p>
          </section>

          {/* 16. Suspension and Termination */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              16. Suspension or Termination of Access
            </h2>

            <p>
              We reserve the right to restrict, suspend, or terminate access to
              the website where reasonably necessary, including in cases of
              misuse, security concerns, unlawful activity, violation of these
              Terms, or operational requirements.
            </p>

            <p className="mt-4">
              Such action may be taken without prior notice where immediate
              action is reasonably necessary to protect the website, users,
              business interests, or security.
            </p>
          </section>

          {/* 17. Changes */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              17. Changes to These Terms
            </h2>

            <p>
              India Trade Overseas may modify or update these Terms from time
              to time to reflect changes in our website, services, business
              practices, technology, legal requirements, or regulatory
              obligations.
            </p>

            <p className="mt-4">
              Updated Terms will be published on this page together with a
              revised "Last Updated" date.
            </p>

            <p className="mt-4">
              Continued use of the website after changes are published
              constitutes acceptance of the updated Terms, to the extent
              permitted by applicable law.
            </p>
          </section>

          {/* 18. Governing Law */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              18. Governing Law and Jurisdiction
            </h2>

            <p>
              These Terms shall be governed by and interpreted in accordance
              with the applicable laws of India.
            </p>

            <p className="mt-4">
              Subject to applicable law, disputes arising out of or relating
              to these Terms or the use of the website shall be subject to the
              jurisdiction of the courts located at{" "}
              <strong>KISHANGANJ / BIHAR</strong>.
            </p>
          </section>

          {/* 19. Severability */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              19. Severability
            </h2>

            <p>
              If any provision of these Terms is determined to be invalid,
              unlawful, or unenforceable, the remaining provisions shall
              continue to remain in effect to the extent permitted by
              applicable law.
            </p>
          </section>

          {/* 20. Entire Understanding */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              20. Entire Understanding
            </h2>

            <p>
              These Terms, together with the applicable policies and specific
              written commercial agreements governing a transaction, constitute
              the applicable understanding regarding use of the website and
              related services, subject to any mandatory rights and obligations
              under applicable law.
            </p>
          </section>

          {/* 21. Contact */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              21. Contact Us
            </h2>

            <p>
              If you have questions regarding these Terms, the website, or our
              services, you may contact India Trade Overseas using the
              following official contact details:
            </p>

            <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-6 space-y-3">
              <p>
                <strong>Company:</strong>{" "}
                INDIA TRADE OVERSEAS
              </p>

              <p>
                <strong>Business Name:</strong>{" "}
                India Trade Overseas
              </p>

              <p>
                <strong>Registered Office:</strong>{" "}
                Vill-Deramari,Tola-Maujabari Panch-Deramari,Block-Khochadham Dist -
                Kishanganj, Bihar, 855107
              </p>

              <p>
                <strong>Email:</strong>{" "}
                info@indiatradeoverseas.com
              </p>

              <p>
                <strong>Phone:</strong>{" "}
                01169262028
              </p>
            </div>
          </section>

          {/* Related Policies */}
          <section className="border-t border-gray-200 pt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Related Policies
            </h2>

            <p className="text-gray-600">
              These Terms should be read together with the Privacy Policy,
              Fraud & Payment Policy, Disclaimer, and other policies published
              by India Trade Overseas.
            </p>
          </section>

        </div>
      </main>
    </div>
  );
};

export default Terms;