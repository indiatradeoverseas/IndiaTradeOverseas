import React from "react";
import { Link } from "react-router-dom";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-white text-gray-800 pt-12">
      <div className="absolute top-0 left-0 right-0 h-20 bg-black/55 backdrop-blur-sm z-40 pointer-events-none" />
      {/* Page Header */}
      <section className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Privacy Policy
          </h1>

          <p className="mt-4 max-w-3xl text-gray-600 leading-7">
            This Privacy Policy explains how India Trade Overseas collects,
            uses, protects, and handles information provided through its
            website and related business interactions.
          </p>

          <p className="mt-4 text-sm text-gray-500">
            Last Updated: 03 September 2026
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-10 leading-7">

          {/* 1. Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              1. Introduction
            </h2>

            <p>
              India Trade Overseas, operating under{" "}
              <strong>INDIA TRADE OVERSEAS</strong>, with its registered office
              at <strong>Vill-Deramari,Tola-Maujabari Panch-Deramari,Block-Khochadham Dist -
                Kishanganj, Bihar, 855107</strong> ("India Trade
              Overseas", "ITO", "we", "us", or "our"), respects the privacy of
              individuals who visit or interact with our website.
            </p>

            <p className="mt-4">
              This Privacy Policy explains what information we may collect,
              why we collect it, how it may be used, when it may be shared, and
              the measures we take to protect it.
            </p>

            <p className="mt-4">
              This policy applies to information collected through our website,
              including information submitted through contact forms, enquiry
              forms, quotation requests, and other website interactions.
            </p>
          </section>

          {/* 2. Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              2. Information We Collect
            </h2>

            <p>
              The information we collect depends on how you interact with our
              website and communicate with us.
            </p>

            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">
              2.1 Information You Provide
            </h3>

            <p>
              When you submit an enquiry, quotation request, contact form, or
              other information through our website, we may collect:
            </p>

            <ul className="mt-4 list-disc pl-6 space-y-2">
              <li>Name</li>
              <li>Email address</li>
              <li>Phone or mobile number</li>
              <li>Company or business name</li>
              <li>Business-related information</li>
              <li>Product or service requirements</li>
              <li>Product specifications</li>
              <li>Required quantity or volume</li>
              <li>Delivery or destination details</li>
              <li>Expected delivery timeline</li>
              <li>Enquiry or quotation details</li>
              <li>Any other information voluntarily submitted by you</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">
              2.2 Technical Information
            </h3>

            <p>
              When you visit our website, certain technical information may be
              collected automatically through website technologies and
              analytics tools. This may include information such as:
            </p>

            <ul className="mt-4 list-disc pl-6 space-y-2">
              <li>IP address</li>
              <li>Browser type</li>
              <li>Device type</li>
              <li>Operating system</li>
              <li>Pages visited</li>
              <li>Date and time of access</li>
              <li>Referring source or website</li>
              <li>Website interaction and usage information</li>
            </ul>
          </section>

          {/* 3. How Information Is Collected */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              3. How We Collect Information
            </h2>

            <p>
              Information may be collected through:
            </p>

            <ul className="mt-4 list-disc pl-6 space-y-2">
              <li>Contact forms</li>
              <li>Product enquiry forms</li>
              <li>Quotation request forms</li>
              <li>Service-related forms</li>
              <li>Communication initiated through our website</li>
              <li>Direct communication with our authorized representatives</li>
              <li>Cookies and similar website technologies</li>
              <li>Website analytics and performance tools</li>
            </ul>
          </section>

          {/* 4. Use of Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              4. How We Use Your Information
            </h2>

            <p>
              Information collected through the website may be used for the
              following purposes:
            </p>

            <ul className="mt-4 list-disc pl-6 space-y-2">
              <li>Responding to your enquiries.</li>
              <li>Responding to quotation requests.</li>
              <li>Understanding your product or service requirements.</li>
              <li>Providing product and service information.</li>
              <li>Preparing and communicating quotations.</li>
              <li>Communicating with prospective or existing customers.</li>
              <li>Coordinating supply, logistics, transportation, or related business services.</li>
              <li>Managing business communications and enquiries.</li>
              <li>Improving our website and user experience.</li>
              <li>Improving our products and services.</li>
              <li>Monitoring website performance.</li>
              <li>Maintaining website security.</li>
              <li>Preventing or investigating fraud, misuse, or unauthorized activity.</li>
              <li>Complying with applicable legal and regulatory requirements.</li>
              <li>Protecting our rights, property, users, and legitimate business interests.</li>
            </ul>
          </section>

          {/* 5. Enquiry and Quotation Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              5. Enquiries and Quotations
            </h2>

            <p>
              Information submitted through enquiry and quotation forms may be
              reviewed and processed by authorized personnel for the purpose of
              understanding your requirements and responding appropriately.
            </p>

            <p className="mt-4">
              Depending on the nature of your enquiry, information may be used
              to discuss product specifications, quantities, pricing,
              availability, destination, delivery requirements, logistics, and
              other relevant commercial details.
            </p>

            <p className="mt-4">
              An enquiry or quotation request submitted through the website
              does not by itself constitute acceptance of an order or create a
              binding commercial contract.
            </p>
          </section>

          {/* 6. Cookies and Analytics */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              6. Cookies and Analytics
            </h2>

            <p>
              Our website may use cookies and similar technologies to support
              website functionality, security, performance measurement, and
              analytics.
            </p>

            <p className="mt-4">
              We may use{" "}
              <strong>Google Analytics 4 (GA4)</strong> to understand website
              traffic, visitor interactions, and general usage patterns. This
              information helps us evaluate and improve website performance
              and user experience.
            </p>

            <p className="mt-4">
              We may also use{" "}
              <strong>Google Tag Manager (GTM)</strong> to manage website tags
              and related technologies. The information collected through
              individual tags depends on the services and configurations
              implemented on the website.
            </p>

            <p className="mt-4">
              You may manage or restrict cookies through your browser settings.
              Disabling certain cookies may affect the availability or
              functionality of some website features.
            </p>
          </section>

          {/* 7. Sharing of Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              7. Sharing and Disclosure of Information
            </h2>

            <p>
              We do not sell personal information collected through our website
              as a commercial product.
            </p>

            <p className="mt-4">
              Information may be shared where reasonably necessary for
              legitimate business, operational, contractual, security, or
              legal purposes.
            </p>

            <p className="mt-4">
              Depending on the circumstances, information may be shared with:
            </p>

            <ul className="mt-4 list-disc pl-6 space-y-2">
              <li>Authorized employees and representatives of ITO.</li>
              <li>Technology and website service providers.</li>
              <li>Hosting and infrastructure providers.</li>
              <li>Payment service providers or financial institutions, where applicable.</li>
              <li>Logistics and transportation partners where required for service fulfilment.</li>
              <li>Suppliers, business partners, or service providers where necessary to process a legitimate business requirement.</li>
              <li>Professional advisors where reasonably necessary.</li>
              <li>Government authorities, regulators, or law-enforcement agencies where legally required.</li>
            </ul>
          </section>

          {/* 8. Payment Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              8. Payment Information
            </h2>

            <p>
              Where payment is applicable to a transaction, payment-related
              information may be processed through authorized banking
              institutions, payment gateways, financial institutions, or other
              designated payment service providers.
            </p>

            <p className="mt-4">
              Payment information should only be provided through authorized
              payment channels communicated by India Trade Overseas.
            </p>

            <p className="mt-4">
              We will not request sensitive authentication credentials such as
              your OTP, ATM PIN, card PIN, CVV, password, or online-banking
              password through ordinary website enquiry or communication
              channels.
            </p>

            <p className="mt-4">
              You should never share such information with anyone claiming to
              represent India Trade Overseas.
            </p>

            <p className="mt-4">
              For detailed information regarding payment security and fraud
              prevention, please refer to our{" "}
              <strong><Link to="/fraud-payment-policy" className="underline hover:no-underline">Fraud & Payment Policy
    </Link></strong>.
            </p>
          </section>

          {/* 9. Data Security */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              9. Data Security
            </h2>

            <p>
              We take reasonable technical and organizational measures to
              protect information against unauthorized access, misuse,
              alteration, disclosure, loss, or destruction.
            </p>

            <p className="mt-4">
              Security measures may include appropriate access controls,
              authentication mechanisms, secure communication technologies,
              restricted access, monitoring, and other safeguards appropriate
              to the nature of the information.
            </p>

            <p className="mt-4">
              However, no internet transmission or electronic storage system can
              be guaranteed to be completely secure. Accordingly, while we take
              reasonable measures to protect information, absolute security
              cannot be guaranteed.
            </p>
          </section>

          {/* 10. Data Retention */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              10. Data Retention
            </h2>

            <p>
              We retain information for as long as reasonably necessary to
              fulfil the purposes for which it was collected and for legitimate
              business, contractual, security, dispute-resolution, accounting,
              legal, and regulatory requirements.
            </p>

            <p className="mt-4">
              The applicable retention period may vary depending on the nature
              of the information, the purpose for which it was collected, and
              applicable legal or business requirements.
            </p>
          </section>

          {/* 11. Privacy Rights and Choices */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              11. Privacy Rights and Choices
            </h2>

            <p>
              Subject to applicable law, individuals may have rights and
              choices concerning their personal information, which may include:
            </p>

            <ul className="mt-4 list-disc pl-6 space-y-2">
              <li>Requesting information about the processing of personal data.</li>
              <li>Requesting correction of inaccurate or incomplete information.</li>
              <li>Requesting deletion of personal information where legally applicable.</li>
              <li>Withdrawing consent where processing is based on consent.</li>
              <li>Raising a grievance or complaint regarding the handling of personal information.</li>
              <li>Exercising other rights available under applicable law.</li>
            </ul>

            <p className="mt-4">
              Requests may be submitted through the privacy or grievance
              contact details provided below. We may request reasonable
              information to verify the identity of the person making a
              request.
            </p>
          </section>

          {/* 12. Third Party Links */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              12. Third-Party Links and Services
            </h2>

            <p>
              Our website may contain links to third-party websites, services,
              platforms, applications, payment services, or other external
              resources.
            </p>

            <p className="mt-4">
              Third-party websites and services operate independently and may
              have their own privacy policies, terms, and data-handling
              practices.
            </p>

            <p className="mt-4">
              India Trade Overseas is not responsible for the privacy
              practices, security, content, or policies of third-party
              websites or services. Users should review the applicable
              third-party policies before providing information to such
              services.
            </p>
          </section>

          {/* 13. Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              13. Children's Privacy
            </h2>

            <p>
              Our website is primarily intended for business, commercial, and
              general informational purposes.
            </p>

            <p className="mt-4">
              We do not knowingly seek to collect personal information from
              children through the website where such collection is not
              permitted by applicable law.
            </p>
          </section>

          {/* 14. Changes to Policy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              14. Changes to This Privacy Policy
            </h2>

            <p>
              India Trade Overseas may update this Privacy Policy from time to
              time to reflect changes in our website, services, business
              practices, technology, applicable laws, or regulatory
              requirements.
            </p>

            <p className="mt-4">
              Any updated version will be published on this page together with
              the revised "Last Updated" date.
            </p>

            <p className="mt-4">
              We recommend reviewing this page periodically to remain informed
              about how information is handled.
            </p>
          </section>

          {/* 15. Contact */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              15. Contact Us
            </h2>

            <p>
              If you have any questions, concerns, privacy requests, or
              grievances regarding this Privacy Policy or the handling of your
              personal information, you may contact us using the following
              details:
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

              <p>
                <strong>Privacy / Grievance Contact:</strong>{" "}
                Md. Ramiz Raza Khan / Founder / CEO
              </p>
            </div>
          </section>

          {/* 16. Governing Law */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              16. Governing Law
            </h2>

            <p>
              This Privacy Policy shall be governed by and interpreted in
              accordance with the applicable laws of India.
            </p>

            <p className="mt-4">
              Subject to applicable law, disputes arising in connection with
              this Privacy Policy shall be subject to the jurisdiction of the
              courts located at{" "}
              <strong>KISHANGANJ / BIHAR</strong>.
            </p>
          </section>

          {/* 17. Related Policies */}
          <section className="border-t border-gray-200 pt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Related Policies
            </h2>

            <p className="text-gray-600">
              This Privacy Policy should be read together with the other legal
              policies published by India Trade Overseas, including our Terms &
              Conditions, Fraud & Payment Policy, and Disclaimer.
            </p>
          </section>

        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;