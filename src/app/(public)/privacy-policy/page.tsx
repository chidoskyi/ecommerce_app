"use client";

import React from "react";
// import { Search, ShoppingCart, User, ChevronDown } from "lucide-react";
import Container from "@/components/reuse/Container";
// import Link from "next/link";
import Breadcrumb from "@/components/reuse/Breadcrumb";

const ReturnPolicyPage = () => {
  // const [newsletterEmail, setNewsletterEmail] = useState("");

  // const handleNewsletterSubmit = (e: React.FormEvent) => {
  //   e.preventDefault();
  //   console.log("Newsletter signup:", newsletterEmail);
  //   // Handle newsletter signup here
  // };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <Breadcrumb />

      {/* Main Content */}
      <Container className="mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-10">
          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            Return & Refund Policy
          </h1>

          {/* Introduction */}
          <p className="text-gray-700 mb-8 leading-relaxed">
            Thank you for choosing <strong>Shop Grocery</strong>! We strive to
            ensure you are completely satisfied with your purchases. If you are
            not happy with your order, we offer refunds for valid complaints
            made within <strong>24 hours</strong> of delivery.
          </p>

          {/* Eligibility Section */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Eligibility for Refunds & Returns
            </h2>
            <p className="text-gray-700 mb-4">
              To qualify for a refund or return:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                You must notify us within <strong>24 hours</strong> of receiving
                your order.
              </li>
              <li>
                <strong>Provide proof</strong> (photo/video) of the issue (e.g.,
                damaged or incorrect item).
              </li>
              <li>The product must be unused and in its original packaging.</li>
            </ul>
          </section>

          {/* Non-Refundable Items */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Non-Refundable Items
            </h2>
            <p className="text-gray-700 mb-4">
              The following items <strong>cannot</strong> be returned or
              refunded unless defective:
            </p>
          </section>

          {/* Process Steps */}
          <section className="mb-8">
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-4 mt-1">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">
                    Submit Evidence
                  </h3>
                  <p className="text-gray-700">
                    – Share photos/videos of the issue for verification.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-4 mt-1">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">
                    Approval & Return
                  </h3>
                  <p className="text-gray-700">
                    – If approved, we will provide return instructions.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-semibold mr-4 mt-1">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Refund Method</h3>
                  <p className="text-gray-700">
                    – Refunds will <strong>be</strong> issued via:
                  </p>
                  <ul className="list-disc pl-6 mt-2 space-y-1 text-gray-700">
                    <li>
                      <strong>shopgrocery Wallet Credit</strong> (for orders
                      below ₦5,000).
                    </li>
                    <li>
                      <strong>Bank Transfer</strong> (for orders above ₦5,000;
                      processed within 3-5 business days).
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Exceptions */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Exceptions
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                Refunds may take longer during holidays or banking delays.
              </li>
              <li>
                Return shipping costs are covered by{" "}
                <strong>Shopgrocery</strong> for defective/wrong items. If you
                change your mind, you bear return costs.
              </li>
            </ul>
          </section>

          {/* Contact Us */}
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Contact Us
            </h2>
            <p className="text-gray-700 mb-4">
              For questions or assistance, reach out via:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li>
                <strong>Email:</strong>{" "}
                <a
                  href="mailto:shopgroceryteam@gmail.com"
                  className="text-green-600 hover:underline"
                >
                  shopgroceryteam@gmail.com
                </a>
              </li>
              <li>
                <strong>Phone:</strong> +234 (0) 704 642 8747
              </li>
              <li>
                <strong>Offices:</strong>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>
                    <strong>Lagos:</strong> 38 Duro Oyedoyin, Surulere.
                  </li>
                  <li>
                    <strong>Ibadan:</strong> 10 Idera Estate, Elega, Akobo.
                  </li>
                  <li>
                    <strong>Abuja:</strong> Millennium Building, Opposite NNPC
                    Towers, Central Area.
                  </li>
                </ul>
              </li>
            </ul>
          </section>

          {/* Note */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 italic">
              <strong>Note:</strong> All refunds are evaluated case-by-case
              based on product availability and valid reasons.
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default ReturnPolicyPage;
