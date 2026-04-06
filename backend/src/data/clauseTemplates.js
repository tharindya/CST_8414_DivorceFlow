const clauseTemplates = [
  {
    id: "general-property-division",
    title: "Property Division",
    category: "Property",
    jurisdiction: "General",
    reviewStatus: "REVIEW_REQUIRED",
    reviewedBy: "Pending legal review",
    reviewedOn: null,
    disclaimer:
      "This is drafting starter language and may require legal review before use.",
    description:
      "Allocates ownership, transfer, and division of property between the parties.",
    placeholders: [
      {
        key: "propertySummary",
        label: "Property to be divided",
        type: "textarea",
        required: true,
        placeholder: "List the key property items and who receives them",
      },
      {
        key: "transferDate",
        label: "Transfer or completion date",
        type: "text",
        required: false,
        placeholder: "e.g., within 30 days of signing",
      },
    ],
    buildContent(values) {
      return `The parties agree to divide property as follows:

${values.propertySummary || "[property division details]"}

Any required transfers, payments, or delivery of property will be completed ${values.transferDate || "within a reasonable time after signing this agreement"}.`;
    },
  },

  {
    id: "general-debt-division",
    title: "Debt Division",
    category: "Debt",
    jurisdiction: "General",
    reviewStatus: "REVIEW_REQUIRED",
    reviewedBy: "Pending legal review",
    reviewedOn: null,
    disclaimer:
      "This is drafting starter language and may require legal review before use.",
    description:
      "Allocates responsibility for loans, credit balances, and other shared debt.",
    placeholders: [
      {
        key: "debtSummary",
        label: "Debt allocation details",
        type: "textarea",
        required: true,
        placeholder: "Describe which debts exist and who will be responsible for each",
      },
      {
        key: "paymentTiming",
        label: "Payment timing",
        type: "text",
        required: false,
        placeholder: "e.g., immediately, within 60 days, monthly",
      },
    ],
    buildContent(values) {
      return `The parties agree to allocate debt responsibility as follows:

${values.debtSummary || "[debt allocation details]"}

Any agreed payments or account closures will be completed ${values.paymentTiming || "within a reasonable time after signing this agreement"}.`;
    },
  },

  {
    id: "general-child-support",
    title: "Child Support",
    category: "Support",
    jurisdiction: "General",
    reviewStatus: "REVIEW_REQUIRED",
    reviewedBy: "Pending legal review",
    reviewedOn: null,
    disclaimer:
      "This is drafting starter language and may require legal review before use.",
    description:
      "Defines child support obligations and payment structure.",
    placeholders: [
      {
        key: "childrenNames",
        label: "Child or children names",
        type: "text",
        required: true,
        placeholder: "e.g., Emma and Noah",
      },
      {
        key: "supportTerms",
        label: "Child support terms",
        type: "textarea",
        required: true,
        placeholder: "Describe the support amount, method, and schedule",
      },
    ],
    buildContent(values) {
      return `The parties agree that child support for ${values.childrenNames || "[children]"} will be arranged as follows:

${values.supportTerms || "[child support terms]"}`;
    },
  },

  {
    id: "ontario-parenting-plan",
    title: "Parenting Plan",
    category: "Custody",
    jurisdiction: "Ontario",
    reviewStatus: "REVIEW_REQUIRED",
    reviewedBy: "Pending legal review",
    reviewedOn: null,
    disclaimer:
      "This is drafting starter language and may require legal review before use.",
    description:
      "Defines parenting schedule, decision-making, holidays, and exchanges.",
    placeholders: [
      {
        key: "childrenNames",
        label: "Child or children names",
        type: "text",
        required: true,
        placeholder: "e.g., Emma and Noah",
      },
      {
        key: "primarySchedule",
        label: "Parenting schedule",
        type: "textarea",
        required: true,
        placeholder: "Describe weekday, weekend, and holiday schedule",
      },
      {
        key: "decisionMaking",
        label: "Decision-making responsibility",
        type: "textarea",
        required: true,
        placeholder: "Describe how major decisions will be made",
      },
      {
        key: "exchangeDetails",
        label: "Exchange arrangements",
        type: "textarea",
        required: false,
        placeholder: "Describe pickup/dropoff logistics",
      },
    ],
    buildContent(values) {
      return `The parties agree that the parenting arrangements for ${values.childrenNames || "[children]"} will be as follows:

Parenting Schedule:
${values.primarySchedule || "[parenting schedule]"}

Decision-Making Responsibility:
${values.decisionMaking || "[decision-making details]"}

Exchange Arrangements:
${values.exchangeDetails || "The parties will coordinate exchanges in a reasonable manner that supports the best interests of the child."}`;
    },
  },

  {
    id: "ontario-matrimonial-home",
    title: "Matrimonial Home",
    category: "Property",
    jurisdiction: "Ontario",
    reviewStatus: "REVIEW_REQUIRED",
    reviewedBy: "Pending legal review",
    reviewedOn: null,
    disclaimer:
      "This is drafting starter language and may require legal review before use.",
    description:
      "Addresses possession, occupancy, sale, or transfer of the matrimonial home.",
    placeholders: [
      {
        key: "homeAddress",
        label: "Address of matrimonial home",
        type: "text",
        required: true,
        placeholder: "Enter the home address",
      },
      {
        key: "homeTerms",
        label: "Home possession or sale terms",
        type: "textarea",
        required: true,
        placeholder: "Describe who remains, whether it will be sold, and related terms",
      },
    ],
    buildContent(values) {
      return `The parties agree that the matrimonial home located at ${values.homeAddress || "[address]"} will be dealt with as follows:

${values.homeTerms || "[matrimonial home terms]"}`;
    },
  },

  {
    id: "ontario-spousal-support",
    title: "Spousal Support Review",
    category: "Support",
    jurisdiction: "Ontario",
    reviewStatus: "REVIEW_REQUIRED",
    reviewedBy: "Pending legal review",
    reviewedOn: null,
    disclaimer:
      "This is drafting starter language and may require legal review before use.",
    description:
      "Defines whether spousal support will be paid and on what basis.",
    placeholders: [
      {
        key: "supportDecision",
        label: "Spousal support decision",
        type: "textarea",
        required: true,
        placeholder: "Describe whether support is payable and under what terms",
      },
      {
        key: "reviewDate",
        label: "Review date or review condition",
        type: "text",
        required: false,
        placeholder: "e.g., after 12 months, upon employment change",
      },
    ],
    buildContent(values) {
      return `The parties agree that spousal support will be addressed as follows:

${values.supportDecision || "[spousal support terms]"}

The parties agree to review this arrangement ${values.reviewDate || "if there is a material change in circumstances"}.`;
    },
  },
];

module.exports = { clauseTemplates };