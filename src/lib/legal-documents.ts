export const TERMS_VERSION = "2026-08-10";
export const PRIVACY_NOTICE_VERSION = "2026-08-10";

export type LegalBlock =
  | {
      type: "paragraph";
      text: string;
    }
  | {
      type: "list";
      items: string[];
    };

export type LegalSection = {
  heading?: string;
  blocks: LegalBlock[];
};

export type LegalDocument = {
  title: string;
  effectiveDate: string;
  sections: LegalSection[];
};

export const termsDocument: LegalDocument = {
  title: "Terms & Conditions",
  effectiveDate: "10-08-2026",
  sections: [
    {
      blocks: [
        {
          type: "paragraph",
          text: "Welcome to DJC Entertainment. These Terms & Conditions govern your use of our website and the submission of requests for entertainment event services.",
        },
        {
          type: "paragraph",
          text: "By submitting a booking request through our website, you confirm that you have read and agree to these Terms & Conditions.",
        },
      ],
    },
    {
      heading: "1. About the Service",
      blocks: [
        {
          type: "paragraph",
          text: "DJC Entertainment provides a platform for submitting requests for entertainment event services.",
        },
        {
          type: "paragraph",
          text: "The website allows customers to select available services, provide event details, receive an estimated service price, and submit a request for consideration.",
        },
        {
          type: "paragraph",
          text: "The website is intended to make the initial booking process easier. Final event arrangements are confirmed directly between the customer and DJC Entertainment.",
        },
      ],
    },
    {
      heading: "2. Booking Requests",
      blocks: [
        {
          type: "paragraph",
          text: "Submitting a request through the website does not automatically guarantee that your event has been fully confirmed.",
        },
        {
          type: "paragraph",
          text: "After receiving your request, DJC Entertainment may contact you using the phone number or WhatsApp details you provide to discuss and confirm the event.",
        },
        { type: "paragraph", text: "Final confirmation may depend on:" },
        {
          type: "list",
          items: [
            "Availability on the requested date",
            "The services requested",
            "Event requirements",
            "Location and transportation requirements",
            "Final pricing",
            "Any other arrangements agreed between you and DJC Entertainment.",
          ],
        },
        {
          type: "paragraph",
          text: "A booking is considered confirmed only after DJC Entertainment has communicated confirmation to you.",
        },
      ],
    },
    {
      heading: "3. Reservation Fee",
      blocks: [
        {
          type: "paragraph",
          text: "A reservation fee is required when submitting a booking request.",
        },
        {
          type: "paragraph",
          text: "The reservation fee is intended to help reserve capacity for your request and reduce spam or unserious booking requests.",
        },
        {
          type: "paragraph",
          text: "The reservation fee is not the full payment for the event.",
        },
        {
          type: "paragraph",
          text: "The amount of the reservation fee will be displayed on the website and may be changed by DJC Entertainment.",
        },
        {
          type: "paragraph",
          text: "The reservation fee is generally non-refundable once a booking request has been successfully submitted, except where DJC Entertainment is unable to provide the requested service or where a refund is otherwise agreed or required by applicable law.",
        },
      ],
    },
    {
      heading: "4. Pricing and Estimates",
      blocks: [
        {
          type: "paragraph",
          text: "Prices displayed on the website are estimates based on the services, event type and event size selected by the customer.",
        },
        {
          type: "paragraph",
          text: "The displayed estimate may not include transportation, travel, accommodation, additional equipment, special requirements, or other location-dependent costs.",
        },
        {
          type: "paragraph",
          text: "The final price will be discussed and agreed with the customer before the event is finalized.",
        },
        { type: "paragraph", text: "Prices may also be updated from time to time." },
      ],
    },
    {
      heading: "5. Availability",
      blocks: [
        {
          type: "paragraph",
          text: "Availability is subject to the capacity of DJC Entertainment and its service providers.",
        },
        {
          type: "paragraph",
          text: "A date that appears available when you begin a booking request is not guaranteed until your request has been reviewed and confirmed.",
        },
        {
          type: "paragraph",
          text: "DJC Entertainment may handle multiple events on the same date where sufficient personnel, equipment and other resources are available.",
        },
      ],
    },
    {
      heading: "6. Customer Responsibilities",
      blocks: [
        {
          type: "paragraph",
          text: "You are responsible for providing accurate and complete information when submitting a booking request.",
        },
        { type: "paragraph", text: "This includes, where applicable:" },
        {
          type: "list",
          items: [
            "Your name",
            "Phone or WhatsApp number",
            "Email address",
            "Event date",
            "Event type",
            "Event size",
            "County",
            "Town or centre",
            "Exact event location",
            "Services requested",
            "Any other information reasonably required to plan the event",
          ],
        },
        {
          type: "paragraph",
          text: "Providing inaccurate or incomplete information may affect the ability of DJC Entertainment to provide the requested services.",
        },
      ],
    },
    {
      heading: "7. Cancellation by the Customer",
      blocks: [
        {
          type: "paragraph",
          text: "If you no longer require the requested services, please contact DJC Entertainment as soon as possible.",
        },
        {
          type: "paragraph",
          text: "The reservation fee is generally non-refundable after a booking request has been successfully submitted.",
        },
        {
          type: "paragraph",
          text: "Any additional payments or cancellation arrangements made after the initial request may be subject to separate terms agreed between you and DJC Entertainment.",
        },
      ],
    },
    {
      heading: "8. Cancellation or Changes by the Business",
      blocks: [
        {
          type: "paragraph",
          text: "DJC Entertainment may decline, change or cancel a booking request where circumstances make it impossible or unreasonable to provide the requested services.",
        },
        { type: "paragraph", text: "This may include circumstances such as:" },
        {
          type: "list",
          items: [
            "Unexpected emergencies",
            "Equipment failure",
            "Unavailability of required personnel",
            "Safety concerns",
            "Unforeseen circumstances affecting the event",
          ],
        },
        {
          type: "paragraph",
          text: "Where DJC Entertainment is unable to provide the requested service and the reservation fee has already been paid, the customer will be eligible for a refund of that reservation fee, subject to applicable law and the circumstances of the cancellation.",
        },
        {
          type: "paragraph",
          text: "Where possible, DJC Entertainment may work with the customer to find an alternative arrangement.",
        },
      ],
    },
    {
      heading: "9. Transportation and Additional Costs",
      blocks: [
        {
          type: "paragraph",
          text: "Displayed service prices do not necessarily include transportation or travel costs.",
        },
        {
          type: "paragraph",
          text: "Depending on the event location, additional charges may apply for:",
        },
        {
          type: "list",
          items: [
            "Transportation",
            "Long-distance travel",
            "Accommodation",
            "Additional equipment",
            "Special event requirements",
            "Other agreed services",
          ],
        },
        {
          type: "paragraph",
          text: "Any additional charges should be communicated to and agreed with the customer before the relevant service is finalized.",
        },
      ],
    },
    {
      heading: "10. M-PESA and Third-Party Services",
      blocks: [
        {
          type: "paragraph",
          text: "Payments made through the website may be processed through M-PESA and other third-party payment or technology providers.",
        },
        {
          type: "paragraph",
          text: "DJC Entertainment is not responsible for interruptions, delays or failures caused by third-party systems, mobile networks, internet providers or payment service providers.",
        },
        {
          type: "paragraph",
          text: "A payment should only be considered successfully received when the relevant payment system and DJC Entertainment's records confirm the transaction.",
        },
      ],
    },
    {
      heading: "11. Website Availability",
      blocks: [
        {
          type: "paragraph",
          text: "We aim to keep the website available and functioning properly, but we do not guarantee that the website will always be available, uninterrupted or completely error-free.",
        },
        {
          type: "paragraph",
          text: "The website may occasionally be unavailable because of maintenance, technical problems, hosting issues, network problems or circumstances outside our reasonable control.",
        },
      ],
    },
    {
      heading: "12. Limitation of Responsibility",
      blocks: [
        {
          type: "paragraph",
          text: "DJC Entertainment will take reasonable steps to provide the services that have been agreed with the customer.",
        },
        {
          type: "paragraph",
          text: "However, we are not responsible for losses, delays or failures caused by circumstances beyond our reasonable control, including severe weather, accidents, venue restrictions, power failures, third-party failures, network failures, emergencies or other unforeseen circumstances.",
        },
        {
          type: "paragraph",
          text: "Nothing in these Terms & Conditions is intended to exclude or limit any rights or protections that cannot legally be excluded or limited under applicable Kenyan law.",
        },
      ],
    },
    {
      heading: "13. Changes to These Terms",
      blocks: [
        {
          type: "paragraph",
          text: "We may update these Terms & Conditions from time to time as the website or business develops.",
        },
        { type: "paragraph", text: "The latest version will be made available on the website." },
        {
          type: "paragraph",
          text: "Changes will not affect arrangements that have already been separately confirmed with a customer unless required by law or agreed with the customer.",
        },
      ],
    },
    {
      heading: "14. Governing Law",
      blocks: [
        { type: "paragraph", text: "These Terms & Conditions are governed by the laws of Kenya." },
        {
          type: "paragraph",
          text: "Any disputes will, where possible, first be addressed directly between the customer and DJC Entertainment.",
        },
        {
          type: "paragraph",
          text: "Nothing in these Terms prevents either party from exercising any rights or remedies available under applicable Kenyan law.",
        },
      ],
    },
    {
      heading: "15. Contact",
      blocks: [
        {
          type: "paragraph",
          text: "For questions, booking requests, cancellations or other concerns, please contact:",
        },
        { type: "paragraph", text: "DJC Entertainment" },
        { type: "paragraph", text: "Phone / WhatsApp: +254-705-306-521" },
        { type: "paragraph", text: "Email: CIPUENTERTAINMENT@GMAIL.COM" },
        { type: "paragraph", text: "Website: https://djc-ent.vercel.app" },
      ],
    },
  ],
};

export const privacyDocument: LegalDocument = {
  title: "Privacy Notice",
  effectiveDate: "10th August 2026",
  sections: [
    {
      blocks: [
        {
          type: "paragraph",
          text: "At DJC Entertainment, we respect your privacy and take reasonable steps to protect the personal information you provide when using our website.",
        },
        {
          type: "paragraph",
          text: "This Privacy Notice explains what information we collect, why we collect it, how we use it, and the choices and rights available to you.",
        },
      ],
    },
    {
      heading: "1. Information We Collect",
      blocks: [
        {
          type: "paragraph",
          text: "When you submit an event service request, we may collect information such as:",
        },
        {
          type: "list",
          items: [
            "Your name",
            "Phone or WhatsApp number",
            "Email address, where provided",
            "County",
            "Town or centre",
            "Exact event location",
            "Event date",
            "Event type",
            "Event size",
            "Services requested",
            "Information you provide about your event",
            "M-PESA/payment-related transaction information",
          ],
        },
        {
          type: "paragraph",
          text: "We only ask for information that is reasonably necessary to process and manage your request.",
        },
      ],
    },
    {
      heading: "2. How We Use Your Information",
      blocks: [
        { type: "paragraph", text: "We may use your information to:" },
        {
          type: "list",
          items: [
            "Process your event service request",
            "Contact you about your request",
            "Confirm event details",
            "Discuss pricing and availability",
            "Arrange and provide requested services",
            "Process and verify payments",
            "Communicate with you through phone, WhatsApp, email or other contact details you provide",
            "Manage bookings and business operations",
            "Prevent fraudulent, abusive or spam requests",
            "Maintain appropriate records",
            "Improve the website and our services",
            "Comply with applicable legal obligations",
          ],
        },
      ],
    },
    {
      heading: "3. Payment Information",
      blocks: [
        {
          type: "paragraph",
          text: "Payments made through the website may be processed through M-PESA or other payment providers.",
        },
        { type: "paragraph", text: "We do not ask for or store your M-PESA PIN." },
        {
          type: "paragraph",
          text: "Payment providers may process transaction information necessary to complete and verify your payment.",
        },
        {
          type: "paragraph",
          text: "We may retain information such as transaction references, payment amounts, payment status and related transaction details for booking, accounting, dispute-resolution and record-keeping purposes.",
        },
      ],
    },
    {
      heading: "4. Who May Receive Your Information",
      blocks: [
        {
          type: "paragraph",
          text: "Your information may be accessed by DJC Entertainment and individuals or service providers involved in processing and fulfilling your event request.",
        },
        { type: "paragraph", text: "This may include, where necessary:" },
        {
          type: "list",
          items: [
            "Event personnel",
            "DJs",
            "MCs",
            "Sound service providers",
            "Other entertainment service providers",
            "Payment providers",
            "Website hosting and technology providers",
            "Other service providers required to operate the website or fulfil your request",
          ],
        },
        { type: "paragraph", text: "We do not sell your personal information." },
      ],
    },
    {
      heading: "5. Communication",
      blocks: [
        {
          type: "paragraph",
          text: "When you provide your phone number or WhatsApp number, we may use it to contact you about your booking request and related event arrangements.",
        },
        { type: "paragraph", text: "This may include confirming:" },
        {
          type: "list",
          items: [
            "Your event date",
            "Event location",
            "Requested services",
            "Pricing",
            "Availability",
            "Payment",
            "Other details necessary to arrange your event",
          ],
        },
        {
          type: "paragraph",
          text: "We will not use your contact information for unrelated promotional communication without an appropriate lawful basis or consent where required.",
        },
      ],
    },
    {
      heading: "6. Data Security",
      blocks: [
        {
          type: "paragraph",
          text: "We take reasonable technical and organisational measures to protect personal information against unauthorized access, loss, misuse, alteration or disclosure.",
        },
        {
          type: "paragraph",
          text: "However, no internet-based system can be guaranteed to be completely secure.",
        },
      ],
    },
    {
      heading: "7. How Long We Keep Your Information",
      blocks: [
        {
          type: "paragraph",
          text: "We retain personal information only for as long as reasonably necessary for the purposes for which it was collected, including managing bookings, maintaining business records, resolving disputes, preventing fraud and complying with legal obligations.",
        },
        {
          type: "paragraph",
          text: "When information is no longer required, we will take reasonable steps to delete, anonymize or securely dispose of it where appropriate.",
        },
      ],
    },
    {
      heading: "8. Your Rights",
      blocks: [
        {
          type: "paragraph",
          text: "Subject to applicable law, you may have rights regarding your personal information, including the right to:",
        },
        {
          type: "list",
          items: [
            "Request access to personal information we hold about you",
            "Request correction of inaccurate or incomplete information",
            "Request deletion of personal information where legally applicable",
            "Object to certain processing",
            "Request restriction of certain processing",
            "Raise concerns about how your information is being handled",
          ],
        },
        {
          type: "paragraph",
          text: "To exercise a relevant right or ask a privacy question, contact us using the details below.",
        },
      ],
    },
    {
      heading: "9. Children's Information",
      blocks: [
        { type: "paragraph", text: "Our services are intended for adults." },
        {
          type: "paragraph",
          text: "We do not knowingly collect personal information directly from children for the purpose of using the website as customers.",
        },
        {
          type: "paragraph",
          text: "If you believe that a child has provided personal information to us without appropriate authorization, please contact us so that we can review the situation and take appropriate action.",
        },
      ],
    },
    {
      heading: "10. Cookies and Technical Information",
      blocks: [
        {
          type: "paragraph",
          text: "The website may use cookies, local storage or similar technical technologies where necessary to operate the website, maintain sessions, improve functionality, understand usage or provide security.",
        },
        {
          type: "paragraph",
          text: "Where additional consent is legally required for certain cookies or similar technologies, we will provide appropriate information and choices.",
        },
      ],
    },
    {
      heading: "11. Third-Party Services",
      blocks: [
        {
          type: "paragraph",
          text: "Our website may rely on third-party services such as payment providers, hosting providers, cloud database providers, communication services and other technology providers.",
        },
        {
          type: "paragraph",
          text: "These providers may process information on our behalf or as required to provide their services.",
        },
        {
          type: "paragraph",
          text: "We take reasonable steps to use reputable providers and protect information shared with them.",
        },
      ],
    },
    {
      heading: "12. Changes to This Privacy Notice",
      blocks: [
        {
          type: "paragraph",
          text: "We may update this Privacy Notice when our services, technology or legal obligations change.",
        },
        { type: "paragraph", text: "The latest version will always be made available on the website." },
      ],
    },
    {
      heading: "13. Contact Us",
      blocks: [
        {
          type: "paragraph",
          text: "If you have a question, concern or request relating to your personal information, please contact:",
        },
        { type: "paragraph", text: "DJC Entertainment" },
        { type: "paragraph", text: "Phone / WhatsApp: 0705306521" },
        { type: "paragraph", text: "Email: cipuentertainment@gmail.com" },
      ],
    },
  ],
};
