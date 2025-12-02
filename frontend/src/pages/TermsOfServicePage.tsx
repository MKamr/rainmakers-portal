import { useEffect } from 'react';

export function TermsOfServicePage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 sm:p-8 lg:p-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            RAIN.CLUB TERMS OF SERVICE
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
            Operated by CRE Media III, LLC (a Florida limited liability company)
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
            <strong>Effective Date:</strong> November 28, 2025
          </p>

          <div className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              These Terms of Service ("Terms") are a legally binding contract between you ("you," "Rainmaker," or "member") 
              and CRE Media III, LLC, a Florida limited liability company ("CRE Media," "we," "us," or "our").
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              CRE Media owns and operates:
            </p>
            <ul className="list-disc pl-6 mb-6 text-gray-700 dark:text-gray-300 space-y-2">
              <li>The website Rain.club;</li>
              <li>The Rainmakers community and related portals, content, communications, and tools; and</li>
              <li>Any related software, systems, integrations, or services that link to or reference these Terms</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mb-8">
              (collectively, the "Service"). By clicking "I Accept," creating an account, purchasing a membership, 
              or otherwise accessing or using the Service in any way, you agree to be bound by these Terms and our 
              Privacy Policy, which is incorporated by reference. If you do not agree to these Terms, do not use the Service.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">1. OVERVIEW OF THE SERVICE</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">1.1 Rain.club / Rainmakers.</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Rain.club is an online education, community, and tools platform focused on commercial real estate capital markets. 
              Through the Service, users ("Rainmakers") may:
            </p>
            <ul className="list-disc pl-6 mb-6 text-gray-700 dark:text-gray-300 space-y-2">
              <li>Learn about capital markets and commercial real estate lending;</li>
              <li>Access training, scripts, templates, and related resources;</li>
              <li>Participate in community calls, chats, events, and discussions; and</li>
              <li>Refer potential borrowers, clients, and opportunities to CRE Media for potential commercial real estate financing.</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">1.2 No Guarantee of Deals or Income.</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We do not guarantee:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300 space-y-2">
              <li>That you will receive leads, appointments, or referrals;</li>
              <li>That any referral or lead will be accepted, underwritten, or closed; or</li>
              <li>That you will earn any income or referral fee.</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mb-8">
              Any earnings examples or discussions are illustrative only and are not promises or guarantees of results.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">1.3 Ownership of Platform, Clients, and Deals.</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              All rights, title, and interest in and to:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300 space-y-2">
              <li>The Service, Rain.club, Rainmakers, and all related brands;</li>
              <li>All software, code, tools, scripts, course materials, documents, and systems; and</li>
              <li>All clients, borrowers, lenders, investors, deals, and relationships that are processed through, introduced by, or managed via CRE Media (or its affiliates, including Hardwell Capital, LLC)</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              are and will remain exclusively owned by CRE Media III, LLC (or its licensors).
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              You do not acquire:
            </p>
            <ul className="list-disc pl-6 mb-8 text-gray-700 dark:text-gray-300 space-y-2">
              <li>Any ownership interest in CRE Media III, LLC, Hardwell Capital, LLC, or any affiliate;</li>
              <li>Any ownership or equity in any loan, property, fund, entity, or transaction; or</li>
              <li>Any right to use our intellectual property except as expressly allowed in these Terms.</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mb-8">
              All software and systems used in connection with the Service are owned by CRE Media III, LLC.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">2. ELIGIBILITY & RELATIONSHIP</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">2.1 Eligibility.</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              You represent and warrant that:
            </p>
            <ul className="list-disc pl-6 mb-8 text-gray-700 dark:text-gray-300 space-y-2">
              <li>You are at least 18 years old;</li>
              <li>You have the full right, power, and authority to enter into and comply with these Terms; and</li>
              <li>Your use of the Service complies with all applicable federal, state, and local laws and regulations, including any licensing or registration requirements in your jurisdiction.</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">2.2 Independent Contractor; No Employment.</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              You are an independent contractor, acting solely on your own behalf. These Terms do not create:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300 space-y-2">
              <li>An employer-employee relationship;</li>
              <li>A partnership, joint venture, or franchise; or</li>
              <li>An agency or representative relationship.</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mb-8">
              You have no authority to bind CRE Media III, LLC, Hardwell Capital, LLC, or any affiliate to any obligations, contracts, or representations.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">2.3 No Affiliation with Hardwell Capital / CRE Media as Employer.</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-8">
              Rainmakers are not employees, agents, or representatives of Hardwell Capital, LLC, CRE Media III, LLC, or any affiliate. 
              You may not represent yourself as an employee, agent, or representative of Hardwell Capital, CRE Media, or any affiliate.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">3. MEMBERSHIP & PAYMENTS</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Membership fees, payment terms, cancellation policies, and refund terms are as set forth in your membership agreement 
              or as displayed on the Service at the time of purchase. All fees are non-refundable unless otherwise stated.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">4. REFERRAL PROGRAM</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              The Rainmakers referral program, including eligibility for referral fees, payment terms, and program rules, 
              is subject to separate terms and conditions that may be provided to you separately or posted on the Service.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">5. USER CONTENT & CONDUCT</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              You are responsible for all content you post, upload, or share through the Service. You agree not to:
            </p>
            <ul className="list-disc pl-6 mb-8 text-gray-700 dark:text-gray-300 space-y-2">
              <li>Violate any laws or regulations;</li>
              <li>Infringe on the rights of others;</li>
              <li>Post false, misleading, or defamatory content;</li>
              <li>Spam, harass, or abuse other users;</li>
              <li>Attempt to gain unauthorized access to the Service; or</li>
              <li>Interfere with the operation of the Service.</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">6. INTELLECTUAL PROPERTY</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-8">
              All content, materials, and intellectual property on the Service are owned by CRE Media III, LLC or its licensors. 
              You may not copy, modify, distribute, or create derivative works from any content without our express written permission.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">7. TERMINATION</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We may suspend or terminate your access to the Service at any time, with or without cause or notice, 
              for any reason including violation of these Terms.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">8. DISCLAIMERS</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, 
              INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-8">
              We do not warrant that the Service will be uninterrupted, error-free, or secure. Your use of the Service is at your sole risk.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">9. LIMITATION OF LIABILITY</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              To the fullest extent permitted by law:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300 space-y-2">
              <li>In no event will CRE Media III, LLC, Hardwell Capital, LLC, or their owners, officers, members, employees, or agents be liable for any indirect, incidental, consequential, special, or punitive damages, including lost profits, lost opportunities, or lost data, arising from or related to your use of the Service or these Terms.</li>
              <li>Our total aggregate liability to you for any claims arising out of or relating to the Service or these Terms will not exceed the greater of: (a) the total amount of membership fees you have paid to CRE Media in the twelve (12) months preceding the claim, or (b) One Hundred U.S. Dollars (US $100).</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mb-8">
              Some jurisdictions do not allow certain limitations; in those jurisdictions, our liability will be limited to the maximum extent permitted by law.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">10. DISPUTE RESOLUTION; ARBITRATION; GOVERNING LAW</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">10.1 Governing Law.</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-8">
              These Terms are governed by the laws of the State of Florida, without regard to conflict-of-law principles, 
              and are intended to be enforceable in all 50 states of the United States to the maximum extent permitted by law.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">10.2 Mandatory Arbitration; Waiver of Jury Trial and Class Actions.</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Except where prohibited by law or where a small-claims court action is appropriate:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300 space-y-2">
              <li>Any dispute or claim arising out of or relating to these Terms or the Service shall be resolved by binding individual arbitration before a single arbitrator administered by the American Arbitration Association (AAA) under its applicable rules;</li>
              <li>You and CRE Media waive the right to a jury trial; and</li>
              <li>You and CRE Media agree that no class actions or representative actions may be brought, and that arbitration will be conducted only on an individual basis.</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">10.3 Venue.</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-8">
              The seat and venue of arbitration, and any permissible non-arbitration proceedings, will be in Miami-Dade County, Florida, 
              unless we both agree in writing to another location.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">11. MODIFICATION OF TERMS & SERVICE</h2>
            
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">11.1 Right to Modify Terms.</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We reserve the right to make any and all changes necessary at any time to these Terms, in our sole discretion.
            </p>
            <p className="text-gray-700 dark:text-gray-300 mb-8">
              When we change these Terms, we may post an updated version on Rain.club and update the Effective Date. 
              Continued use of the Service after updated Terms are posted constitutes your acceptance of the revised Terms.
            </p>

            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">11.2 Right to Modify or Discontinue Service.</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-8">
              We may modify, suspend, or discontinue any part of the Service, including any referral program, membership level, 
              or feature, at any time, with or without notice, and without liability to you.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">12. MISCELLANEOUS</h2>
            <ul className="list-disc pl-6 mb-8 text-gray-700 dark:text-gray-300 space-y-2">
              <li><strong>Entire Agreement:</strong> These Terms, together with our Privacy Policy and any written addenda we sign with you, constitute the entire agreement between you and CRE Media regarding the Service.</li>
              <li><strong>Severability:</strong> If any provision of these Terms is found invalid or unenforceable, the remaining provisions will remain in full force and effect.</li>
              <li><strong>No Assignment by You:</strong> You may not assign or transfer these Terms without our prior written consent. We may assign these Terms at any time.</li>
              <li><strong>No Waiver:</strong> Our failure to enforce any provision is not a waiver of our right to do so later.</li>
              <li><strong>Contact:</strong> You may contact us at support@rain.club for questions about these Terms.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

